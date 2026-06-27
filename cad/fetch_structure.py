#!/usr/bin/env python3
"""
Structure acquisition — stage 3 of the CADD pipeline.

Fetch a 3-D receptor structure for a target so downstream binding-site detection
and docking have coordinates to work on:

  * by PDB ID            -> download that entry from RCSB
  * by target / UniProt  -> pick the best experimental structure cross-referenced
                            in UniProt (X-ray, best resolution), else fall back to
                            the AlphaFold predicted model.

Stdlib only; no API key. Sources: UniProt, RCSB PDB, AlphaFold DB. Research only.

Usage:
  python3 cad/fetch_structure.py --target EGFR --out structures/
  python3 cad/fetch_structure.py --pdb 1M17 --out structures/
  python3 cad/fetch_structure.py --uniprot P00533 --format cif
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import mutations as _mut  # noqa: E402  (stdlib-only shared variant parser)

UNIPROT = "https://rest.uniprot.org/uniprotkb/search"
RCSB_FILES = "https://files.rcsb.org/download"
ALPHAFOLD = "https://alphafold.ebi.ac.uk/files"
ALPHAFOLD_API = "https://alphafold.ebi.ac.uk/api/prediction"
UA = "oncology-osint-cad/1.0 (research)"

# A structure covering at least this fraction of the protein is preferred over an isolated-domain
# fragment of better resolution. Transparent, editable design cutoff — not fitted data.
COVERAGE_MIN = 0.5
PLDDT_CONFIDENT = 70.0  # AlphaFold per-residue confidence; >=70 ≈ confident backbone (AlphaFold docs).


def _get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def _download(url: str, dest: str) -> bool:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    with open(dest, "wb") as fh:
        fh.write(data)
    return len(data) > 0


def _coverage_residues(chains: str) -> int:
    """Largest contiguous residue span in a UniProt PDB-xref 'Chains' value, e.g.
    'A/B=19-768' -> 750. 0 when no range is present (NMR/EM entries sometimes omit it)."""
    spans = re.findall(r"(\d+)-(\d+)", chains or "")
    return max((int(b) - int(a) + 1 for a, b in spans), default=0)


def _parse_pdb_xrefs(entry: dict, seq_len: int | None) -> list[dict]:
    """Extract PDB cross-references with method, resolution, AND sequence coverage — the
    'Chains' residue range UniProt records but the old code ignored, which is why a tiny
    high-resolution fragment could be chosen over a structure that actually spans the pocket."""
    pdbs = []
    for x in entry.get("uniProtKBCrossReferences", []):
        if x.get("database") != "PDB":
            continue
        props = {p["key"]: p["value"] for p in x.get("properties", [])}
        res = props.get("Resolution", "")
        try:
            res_num = float(res.split()[0]) if res and res[0].isdigit() else 9999.0
        except (ValueError, IndexError):
            res_num = 9999.0
        cov_res = _coverage_residues(props.get("Chains", ""))
        cov_frac = round(cov_res / seq_len, 3) if (seq_len and cov_res) else None
        pdbs.append({"id": x["id"], "method": props.get("Method", ""),
                     "resolution": res, "_res_num": res_num,
                     "coverage_residues": cov_res, "coverage_frac": cov_frac})
    return pdbs


def _mean_plddt(path: str) -> dict | None:
    """Read per-residue AlphaFold confidence (pLDDT, stored in the B-factor column) from a
    predicted model so a low-confidence structure is flagged instead of handed off silently."""
    vals = []
    try:
        with open(path) as fh:
            for line in fh:
                if line.startswith("ATOM") and line[12:16].strip() == "CA":
                    try:
                        vals.append(float(line[60:66]))
                    except ValueError:
                        continue
    except OSError:
        return None
    if not vals:
        return None
    confident = sum(1 for v in vals if v >= PLDDT_CONFIDENT)
    return {"mean_plddt": round(sum(vals) / len(vals), 1), "residues": len(vals),
            "pct_confident": round(100.0 * confident / len(vals), 1)}


def _ca_residues(path: str) -> dict[int, str]:
    """auth residue number -> 3-letter residue name, read from CA atoms (PDB or mmCIF). Used to
    spot-check whether a structure carries a requested mutant residue. Numbering is the structure's
    AUTHOR numbering, which for most human oncology targets aligns with UniProt but is NOT guaranteed
    — so callers report a finding, never silently assert a match."""
    try:
        text = open(path).read()
    except OSError:
        return {}
    out: dict[int, str] = {}
    if "_atom_site." in text:  # mmCIF
        lines = text.splitlines()
        cols, start = [], None
        for i, ln in enumerate(lines):
            if ln.strip() == "loop_":
                cols, j = [], i + 1
                while j < len(lines) and lines[j].lstrip().startswith("_"):
                    cols.append(lines[j].strip())
                    j += 1
                if any(c.startswith("_atom_site.") for c in cols):
                    start = j
                    break
        if start is None:
            return out
        idx = {c: k for k, c in enumerate(cols)}

        def ci(*names):
            for nm in names:
                if "_atom_site." + nm in idx:
                    return idx["_atom_site." + nm]
            return None

        c_atom, c_comp = ci("auth_atom_id", "label_atom_id"), ci("auth_comp_id", "label_comp_id")
        c_seq, c_group = ci("auth_seq_id", "label_seq_id"), ci("group_PDB")
        if None in (c_atom, c_comp, c_seq):
            return out
        for ln in lines[start:]:
            s = ln.strip()
            if not s or s[0] == "#" or s.startswith(("loop_", "_", "data_")):
                break
            p = ln.split()
            if len(p) < len(cols) or (c_group is not None and p[c_group] != "ATOM"):
                continue
            if p[c_atom].strip('"') != "CA":
                continue
            try:
                out[int(p[c_seq])] = p[c_comp]
            except ValueError:
                continue
    else:  # fixed-column PDB
        for line in text.splitlines():
            if line.startswith("ATOM") and line[12:16].strip() == "CA":
                try:
                    out[int(line[22:26])] = line[17:20].strip()
                except ValueError:
                    continue
    return out


def check_structure_mutations(path: str, variants: set[str]) -> list[dict]:
    """For each requested mutation token, report the residue the structure actually has at that
    position: {mutation, found_residue, found_one, status} where status is one of
    match / wildtype / other / unverifiable. Never asserts a match when the position isn't resolved.
    (Author-numbering caveat applies — this is an advisory check, not a guarantee.)"""
    res = _ca_residues(path)
    out = []
    for tok in sorted(variants):
        m = _mut.parse_mutation(tok)
        if not m:
            continue
        wt, pos, mut = m
        three = res.get(pos)
        one = _mut.three_to_one(three) if three else None
        status = ("unverifiable" if one is None else
                  "match" if one == mut else
                  "wildtype" if one == wt else "other")
        out.append({"mutation": tok, "found_residue": three, "found_one": one, "status": status})
    return out


def summarize_mutation_check(findings: list[dict]) -> str | None:
    """One honest line for the report from check_structure_mutations findings, or None if nothing
    to say. Matches → confirmation; wildtype/other → a loud 'NOT the mutant, supply a holo mutant'."""
    if not findings:
        return None
    parts = []
    for f in findings:
        mut, res1 = f["mutation"], (f["found_one"] or "?")
        if f["status"] == "match":
            parts.append(f"residue {mut[1:-1]} = {f['found_residue']} — matches {mut}")
        elif f["status"] == "wildtype":
            parts.append(f"residue {mut[1:-1]} = {f['found_residue']} (wild-type {res1}) — NOT {mut}; "
                         f"supply a {mut} holo PDB via --pdb")
        elif f["status"] == "other":
            parts.append(f"residue {mut[1:-1]} = {f['found_residue']} ({res1}) — neither {mut} nor "
                         f"wild-type; verify numbering")
        else:
            parts.append(f"residue {mut[1:-1]} not resolved in this structure — {mut} unverifiable")
    return "; ".join(parts) + " (author numbering — advisory)"


def _primary_gene(entry: dict) -> str | None:
    """The primary gene symbol UniProt records for an entry (genes[].geneName.value), or None."""
    for g in entry.get("genes") or []:
        gn = (g.get("geneName") or {}).get("value")
        if gn:
            return gn
    return None


def _pick_exact_gene(results: list[dict], name: str) -> dict | None:
    """From UniProt search hits, prefer the entry whose PRIMARY gene symbol equals the query
    (case-insensitive) so an ambiguous/substring name does not resolve to the wrong protein —
    mirrors target_report._rank_targets so every stage resolves the SAME protein. Falls back to
    the first hit when none match exactly; returns None for no hits."""
    if not results:
        return None
    q = name.strip().lower()
    for e in results:
        gn = _primary_gene(e)
        if gn and gn.strip().lower() == q:
            return e
    return results[0]


def resolve_uniprot(name: str) -> dict | None:
    """Resolve a target/gene name to a reviewed human UniProt entry + PDB xrefs (with coverage).
    Prefers the hit whose primary gene symbol exactly matches the query (case-insensitive) over an
    arbitrary substring match, so all stages resolve the same protein (see _pick_exact_gene)."""
    q = f"(gene:{name} OR protein_name:{name}) AND organism_id:9606 AND reviewed:true"
    url = f"{UNIPROT}?{urllib.parse.urlencode({'query': q, 'fields': 'accession,gene_primary,length,xref_pdb', 'size': 5, 'format': 'json'})}"
    results = _get_json(url).get("results", [])
    e = _pick_exact_gene(results, name)
    if not e:
        return None
    seq_len = (e.get("sequence") or {}).get("length")
    return {"accession": e.get("primaryAccession"), "length": seq_len,
            "pdbs": _parse_pdb_xrefs(e, seq_len)}


def alphafold_url(acc: str) -> str | None:
    """Resolve the current AlphaFold model URL via the API, so the version is never
    hardcoded — AlphaFold DB bumps the model over time (model_v4 -> v6 -> ...), and a
    pinned version 404s for *every* target once it moves. Falls back to probing recent
    versions newest-first if the API is unreachable."""
    try:
        data = _get_json(f"{ALPHAFOLD_API}/{acc}")
        if isinstance(data, list) and data and data[0].get("pdbUrl"):
            return data[0]["pdbUrl"]
    except Exception:
        pass
    for v in (6, 5, 4):
        url = f"{ALPHAFOLD}/AF-{acc}-F1-model_v{v}.pdb"
        try:
            req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20):
                return url
        except Exception:
            continue
    return None


def _rank_key(p: dict):
    """Ranking key shared by pick_best_pdb and pick_structure: prefer X-ray/EM; then SUBSTANTIAL
    coverage (>= COVERAGE_MIN) over isolated-domain fragments; then best resolution; then more
    coverage. When coverage is unknown it reduces to the prior resolution-only ordering."""
    method_pref = 0 if p["method"] in ("X-ray", "EM") else 1
    cov = p.get("coverage_frac") or 0.0
    substantial = 0 if cov >= COVERAGE_MIN else 1
    return (method_pref, substantial, p["_res_num"], -cov)


def pick_best_pdb(pdbs: list[dict]) -> dict | None:
    """Pick a structure for downstream docking. Prefer X-ray/EM; then structures that cover a
    SUBSTANTIAL fraction of the protein (>= COVERAGE_MIN) over isolated-domain fragments; then
    best resolution; then more coverage. This fixes the old resolution-only pick, which could
    return a tiny high-resolution fragment that omits the binding site. When coverage is unknown
    (no 'Chains' range or no sequence length) it gracefully reduces to the prior resolution-only
    ordering. PURE / no-network. NOTE: apo/holo state and mutations are NOT checked here — for the
    docking path use pick_structure(), which additionally prefers a holo entry. Verify the chosen
    entry covers the intended, ligandable site."""
    if not pdbs:
        return None
    return sorted(pdbs, key=_rank_key)[0]


def pick_structure(pdbs: list[dict], prefer_holo: bool = True, max_check: int = 6) -> dict | None:
    """Network-aware structure selection for the docking path. Ranks candidates with the SAME key
    as pick_best_pdb, then — when prefer_holo — returns the highest-ranked of the top `max_check`
    that is confirmed HOLO (has a non-solvent ligand making protein contacts), so the downstream
    binding-site / docking-box step isn't handed an apo entry (e.g. EGFR's 4UV7) that fails with
    "no non-solvent ligand". Falls back to the top-ranked candidate (marked apo) when none of the
    top-K is confirmed holo, or when prefer_holo is False.

    The returned dict is pick_best_pdb's entry plus `holo` (True / False / None-when-unrequested);
    on apo fallback it also carries a `holo_note` explaining the fallback.

    Holo is judged by a LAZY import of binding_site, kept at function scope to avoid a circular
    import (binding_site imports fetch_structure at function scope too). Network/parse errors while
    probing a candidate are swallowed (treated as 'unknown', skipped) so this never crashes."""
    if not pdbs:
        return None

    ranked = sorted(pdbs, key=_rank_key)
    top = ranked[0]
    if not prefer_holo:
        return {**top, "holo": None}

    import binding_site as bsm  # lazy: avoid circular import; binding_site imports us at fn scope too.
    for cand in ranked[:max_check]:
        try:
            lig = bsm.select_ligand(bsm.fetch_pdb_text(cand["id"]))
            if lig is not None and (lig.get("contacts", 0) or 0) > 0:
                return {**cand, "holo": True}
        except Exception:
            continue  # network/parse error -> unknown; skip, never crash.

    checked = min(max_check, len(ranked))
    note = (f"no confirmed holo structure among the top {checked} candidate(s) — using the "
            f"top-ranked entry {top['id']}, which may be apo (no bound ligand). The docking-box "
            f"step needs a co-crystal ligand; supply a holo PDB explicitly (--pdb) if so.")
    return {**top, "holo": False, "holo_note": note}


def run(args) -> int:
    os.makedirs(args.out, exist_ok=True)
    ext = "cif" if args.format == "cif" else "pdb"

    # Direct PDB ID
    if args.pdb:
        pid = args.pdb.upper()
        dest = os.path.join(args.out, f"{pid}.{ext}")
        url = f"{RCSB_FILES}/{pid}.{ext}"
        _download(url, dest)
        _report({"source": "RCSB PDB", "pdb_id": pid, "path": dest, "url": url}, args)
        return 0

    # Resolve target/UniProt. An allele-specific query ("KRAS G12C") resolves the BARE gene, then
    # the chosen structure is spot-checked for the requested mutant residue (see below).
    variants = _mut.parse_variants(args.target) if args.target else set()
    resolve_name = _mut.strip_variants(args.target) if (args.target and variants) else args.target
    acc = args.uniprot
    pdbs = []
    if not acc:
        uni = resolve_uniprot(resolve_name)
        if not uni:
            print(f"No reviewed human UniProt entry for '{resolve_name}'.", file=sys.stderr)
            return 1
        acc = uni["accession"]
        pdbs = uni["pdbs"]
    else:
        url = f"{UNIPROT}?{urllib.parse.urlencode({'query': f'accession:{acc}', 'fields': 'accession,length,xref_pdb', 'size': 1, 'format': 'json'})}"
        res = _get_json(url).get("results", [])
        if res:
            seq_len = (res[0].get("sequence") or {}).get("length")
            pdbs = _parse_pdb_xrefs(res[0], seq_len)

    # Holo-preferring selection for the target/UniProt path so the downstream docking-box step gets
    # a structure with a bound ligand rather than an apo entry (the --pdb path above is left as-is).
    best = pick_structure(pdbs)
    if best:
        dest = os.path.join(args.out, f"{best['id']}.{ext}")
        url = f"{RCSB_FILES}/{best['id']}.{ext}"
        _download(url, dest)
        cov = best.get("coverage_frac")
        holo = best.get("holo")
        # Allele check: does THIS structure actually carry the requested mutant residue? (advisory)
        mutation_check = check_structure_mutations(dest, variants) if variants else []
        mut_note = summarize_mutation_check(mutation_check)
        if holo is True:
            note = ("holo: a non-solvent ligand makes protein contacts (defines a docking box); "
                    "confirm it is the intended, ligandable site")
        elif holo is False:
            note = best.get("holo_note", "apo/holo state not confirmed — verify the binding site")
        else:
            note = ("apo/holo state NOT confirmed — confirm this entry covers the intended, "
                    "ligandable site")
        if mut_note:
            note = f"{mut_note}. {note}"
        elif not variants:
            note += "; mutations are NOT checked (no allele requested)"
        if cov is not None and cov < COVERAGE_MIN:
            note = (f"covers only ~{int(cov * 100)}% of the protein — likely a single domain/fragment; "
                    f"confirm it includes the binding site. {note}")
        _report({"source": "RCSB PDB", "uniprot": acc, "pdb_id": best["id"],
                 "method": best["method"], "resolution": best["resolution"],
                 "coverage_frac": cov, "holo": holo, "alternatives": len(pdbs), "path": dest, "url": url,
                 "mutation_check": mutation_check or None, "note": note}, args)
        return 0

    # Fall back to AlphaFold predicted model (current version resolved live, not pinned).
    url = alphafold_url(acc)
    if not url:
        print(f"No experimental PDB and no AlphaFold model for {acc}.", file=sys.stderr)
        return 1
    dest = os.path.join(args.out, f"AF-{acc}-F1.pdb")
    try:
        _download(url, dest)
    except urllib.error.HTTPError as e:
        print(f"AlphaFold model fetch failed for {acc} ({e}).", file=sys.stderr)
        return 1
    plddt = _mean_plddt(dest)
    note = ("Predicted model — only AlphaFold fragment F1 (proteins >~2700 aa are truncated). "
            "Validate confidence before docking.")
    if plddt:
        note = (f"Predicted model: mean pLDDT {plddt['mean_plddt']} over {plddt['residues']} residues, "
                f"{plddt['pct_confident']}% confident (>= {int(PLDDT_CONFIDENT)}); only fragment F1 "
                "(large proteins truncated). Low-pLDDT regions are unreliable for docking.")
    _report({"source": "AlphaFold DB (predicted model)", "uniprot": acc,
             "path": dest, "url": url, "plddt": plddt, "note": note}, args)
    return 0


def _report(info: dict, args) -> None:
    if args.json:
        print(json.dumps(info, indent=2))
        return
    print(f"\nFetched structure → {info['path']}")
    for k in ("source", "pdb_id", "uniprot", "method", "resolution", "coverage_frac",
              "holo", "plddt", "alternatives", "note"):
        if k in info and info[k] is not None:
            print(f"  {k}: {info[k]}")
    print(f"  url: {info['url']}")
    print("Next: detect a binding site (fpocket) and dock with cad/dock.py.")
    print("⚠️  Research only. Not validation, not medical advice.")


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Fetch a 3-D receptor structure (RCSB PDB / AlphaFold).")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--target", help="Target/gene name (e.g. EGFR).")
    g.add_argument("--uniprot", help="UniProt accession (e.g. P00533).")
    g.add_argument("--pdb", help="Specific PDB ID to download (e.g. 1M17).")
    p.add_argument("--out", default="structures", help="Output directory (default ./structures).")
    p.add_argument("--format", choices=["pdb", "cif"], default="pdb", help="File format.")
    p.add_argument("--json", action="store_true", help="Emit JSON.")
    args = p.parse_args(argv)
    try:
        return run(args)
    except urllib.error.URLError as e:
        print(f"Network error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
