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


def resolve_uniprot(name: str) -> dict | None:
    """Resolve a target/gene name to a reviewed human UniProt entry + PDB xrefs (with coverage)."""
    q = f"(gene:{name} OR protein_name:{name}) AND organism_id:9606 AND reviewed:true"
    url = f"{UNIPROT}?{urllib.parse.urlencode({'query': q, 'fields': 'accession,length,xref_pdb', 'size': 1, 'format': 'json'})}"
    results = _get_json(url).get("results", [])
    if not results:
        return None
    e = results[0]
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


def pick_best_pdb(pdbs: list[dict]) -> dict | None:
    """Pick a structure for downstream docking. Prefer X-ray/EM; then structures that cover a
    SUBSTANTIAL fraction of the protein (>= COVERAGE_MIN) over isolated-domain fragments; then
    best resolution; then more coverage. This fixes the old resolution-only pick, which could
    return a tiny high-resolution fragment that omits the binding site. When coverage is unknown
    (no 'Chains' range or no sequence length) it gracefully reduces to the prior resolution-only
    ordering. NOTE: apo/holo state and mutations are still NOT checked here — verify the chosen
    entry covers the intended, ligandable site."""
    if not pdbs:
        return None

    def rank(p):
        method_pref = 0 if p["method"] in ("X-ray", "EM") else 1
        cov = p.get("coverage_frac") or 0.0
        substantial = 0 if cov >= COVERAGE_MIN else 1
        return (method_pref, substantial, p["_res_num"], -cov)

    return sorted(pdbs, key=rank)[0]


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

    # Resolve target/UniProt
    acc = args.uniprot
    pdbs = []
    if not acc:
        uni = resolve_uniprot(args.target)
        if not uni:
            print(f"No reviewed human UniProt entry for '{args.target}'.", file=sys.stderr)
            return 1
        acc = uni["accession"]
        pdbs = uni["pdbs"]
    else:
        url = f"{UNIPROT}?{urllib.parse.urlencode({'query': f'accession:{acc}', 'fields': 'accession,length,xref_pdb', 'size': 1, 'format': 'json'})}"
        res = _get_json(url).get("results", [])
        if res:
            seq_len = (res[0].get("sequence") or {}).get("length")
            pdbs = _parse_pdb_xrefs(res[0], seq_len)

    best = pick_best_pdb(pdbs)
    if best:
        dest = os.path.join(args.out, f"{best['id']}.{ext}")
        url = f"{RCSB_FILES}/{best['id']}.{ext}"
        _download(url, dest)
        cov = best.get("coverage_frac")
        note = ("apo/holo state and mutations are NOT checked — confirm this entry covers the "
                "intended, ligandable site")
        if cov is not None and cov < COVERAGE_MIN:
            note = (f"covers only ~{int(cov * 100)}% of the protein — likely a single domain/fragment; "
                    f"confirm it includes the binding site. {note}")
        _report({"source": "RCSB PDB", "uniprot": acc, "pdb_id": best["id"],
                 "method": best["method"], "resolution": best["resolution"],
                 "coverage_frac": cov, "alternatives": len(pdbs), "path": dest, "url": url,
                 "note": note}, args)
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
              "plddt", "alternatives", "note"):
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
