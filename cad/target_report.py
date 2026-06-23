#!/usr/bin/env python3
"""
Target dossier — stage 1 of the CADD pipeline ("is this target worth pursuing?").

Pulls a quick, cited druggability snapshot for a protein target from public
databases and tells you what to do next:

  * UniProt  — what the protein is, its length, function, and how many
               experimental PDB structures exist (does structure-based docking
               look feasible?).
  * ChEMBL   — how many potent measured ligands exist, the best potency on
               record, and the known drugs/mechanisms that already hit it
               (is it chemically tractable / already drugged?).

Everything is sourced from free public APIs; no key required. This is research
orientation, not validation and not medical advice.

Usage:
  python3 cad/target_report.py --target EGFR
  python3 cad/target_report.py --target "Bruton tyrosine kinase" --json
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

CHEMBL = "https://www.ebi.ac.uk/chembl/api/data"
UNIPROT = "https://rest.uniprot.org/uniprotkb/search"
UA = "oncology-osint-cad/1.0 (research)"


def _json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def _chembl(path: str, params: dict) -> dict:
    params = {**params, "format": "json"}
    return _json(f"{CHEMBL}/{path}?{urllib.parse.urlencode(params)}")


def resolve_target(name: str) -> dict | None:
    targets = _chembl("target/search", {"q": name, "limit": 25}).get("targets", [])
    if not targets:
        return None
    return sorted(
        targets,
        key=lambda t: (t.get("target_type") == "SINGLE PROTEIN", t.get("organism") == "Homo sapiens"),
        reverse=True,
    )[0]


def chembl_snapshot(tid: str) -> dict:
    # Total count of potent activity records (cheap: read page_meta only).
    acts = _chembl("activity", {"target_chembl_id": tid, "pchembl_value__isnull": "false", "limit": 1})
    total_potent = acts.get("page_meta", {}).get("total_count", 0)

    # Known drugs / mechanisms that act on this target.
    mech = _chembl("mechanism", {"target_chembl_id": tid, "limit": 50}).get("mechanisms", [])
    drugs = []
    seen = set()
    for m in mech:
        mid = m.get("molecule_chembl_id")
        if mid and mid not in seen:
            seen.add(mid)
            drugs.append({"molecule_chembl_id": mid,
                          "action_type": m.get("action_type"),
                          "mechanism": m.get("mechanism_of_action")})
    return {"potent_activity_records": total_potent, "known_mechanism_drugs": drugs}


def uniprot_summary(name: str) -> dict | None:
    q = f"(gene:{name} OR protein_name:{name}) AND organism_id:9606 AND reviewed:true"
    fields = "accession,id,protein_name,length,cc_function,xref_pdb"
    url = f"{UNIPROT}?{urllib.parse.urlencode({'query': q, 'fields': fields, 'size': 1, 'format': 'json'})}"
    results = _json(url).get("results", [])
    if not results:
        return None
    e = results[0]
    name_val = (e.get("proteinDescription", {}).get("recommendedName", {})
                .get("fullName", {}).get("value"))
    func = ""
    for c in e.get("comments", []):
        if c.get("commentType") == "FUNCTION" and c.get("texts"):
            func = c["texts"][0].get("value", "")
            break
    pdbs = [x["id"] for x in e.get("uniProtKBCrossReferences", []) if x.get("database") == "PDB"]
    return {
        "accession": e.get("primaryAccession"),
        "name": name_val,
        "length": e.get("sequence", {}).get("length"),
        "function": func,
        "pdb_count": len(pdbs),
        "pdb_examples": pdbs[:8],
    }


def _reason(e: Exception) -> str:
    code = getattr(e, "code", None)
    return f"HTTP {code}" if code else str(getattr(e, "reason", e))[:60]


def run(args) -> int:
    # ChEMBL gives tractability (ligands/drugs); UniProt gives function/structure. They are
    # independent public services — tolerate one being down so a single outage (e.g. a ChEMBL
    # 500) doesn't sink the whole dossier when the rest is reachable.
    target = chembl = None
    chembl_status = uni_status = "ok"
    try:
        target = resolve_target(args.target)
        if target:
            chembl = chembl_snapshot(target["target_chembl_id"])
    except urllib.error.URLError as e:
        chembl_status = f"unavailable ({_reason(e)})"

    try:
        uni = uniprot_summary(args.target)
    except urllib.error.URLError as e:
        uni, uni_status = None, f"unavailable ({_reason(e)})"

    # Resolved if EITHER source identified the target. Only give up if neither did.
    if not target and not uni:
        if chembl_status != "ok" or uni_status != "ok":
            print(f"Could not reach the public sources for '{args.target}' "
                  f"(ChEMBL: {chembl_status}; UniProt: {uni_status}). Upstream outage, not your "
                  "input — retry shortly.", file=sys.stderr)
            return 2
        print(f"No ChEMBL/UniProt target found for '{args.target}' (check the gene symbol / protein name).",
              file=sys.stderr)
        return 1

    tid = target["target_chembl_id"] if target else None
    chembl_block = chembl if chembl is not None else {"available": False, "status": chembl_status}
    degraded = {n: s for n, s in (("chembl", chembl_status), ("uniprot", uni_status)) if s != "ok"}

    if args.json:
        out = {
            "query": args.target,
            "chembl_target": ({"id": tid, "name": target.get("pref_name"),
                               "type": target.get("target_type"), "organism": target.get("organism")}
                              if target else None),
            "chembl": chembl_block,
            "uniprot": uni,
            "next": f"python3 cad/virtual_triage.py --target \"{args.target}\" --out hits.csv",
            "disclaimer": "Public-data orientation only. Not validation, not medical advice.",
        }
        if degraded:
            out["degraded"] = degraded
        print(json.dumps(out, indent=2))
        return 0

    if degraded:
        print(f"\n⚠️  Partial dossier — {', '.join(f'{k} {v}' for k, v in degraded.items())}. "
              "Retry for the missing parts.", file=sys.stderr)

    title = (target.get("pref_name") if target else None) or (uni.get("name") if uni else args.target)
    print(f"\n=== Target dossier: {title}{f' [{tid}]' if tid else ''} ===")
    if target:
        print(f"    {target.get('target_type')}, {target.get('organism')}\n")
    else:
        print()

    if uni:
        print(f"UniProt {uni['accession']} — {uni['name']} ({uni['length']} aa)")
        if uni["function"]:
            fn = uni["function"]
            print(f"  Function: {fn[:300]}{'…' if len(fn) > 300 else ''}")
        feasible = "yes" if uni["pdb_count"] else "no public structure"
        print(f"  Experimental PDB structures: {uni['pdb_count']} "
              f"(docking feasible: {feasible})")
        if uni["pdb_examples"]:
            print(f"  Example PDB IDs: {', '.join(uni['pdb_examples'])}")
    else:
        print("UniProt: no reviewed human entry matched (try the gene symbol).")

    print(f"\nChEMBL tractability:")
    drugs = []
    if chembl is None:
        print(f"  Unavailable — ChEMBL {chembl_status}. Ligand/drug tractability could not be fetched; retry.")
    else:
        print(f"  Potent measured activities on record: {chembl['potent_activity_records']:,}")
        drugs = chembl["known_mechanism_drugs"]
        if drugs:
            print(f"  Known drugs/modulators with a defined mechanism: {len(drugs)}")
            for d in drugs[:6]:
                print(f"    - {d['molecule_chembl_id']}: {d['action_type']} — {d['mechanism']}")
        else:
            print("  No catalogued mechanism-of-action drugs (may be novel/undrugged).")

    print("\nRead-out:")
    bits = []
    if chembl is not None:
        tract = chembl["potent_activity_records"]
        bits.append("rich ligand data" if tract > 500 else
                    "moderate ligand data" if tract > 50 else "sparse ligand data")
    else:
        bits.append("ligand data pending (ChEMBL unavailable)")
    if uni and uni["pdb_count"]:
        bits.append("structure available for docking")
    if drugs:
        bits.append(f"{len(drugs)} known modulator(s) — repurposing/SAR start points")
    print("  " + "; ".join(bits) + ".")
    print(f"\nNext: python3 cad/virtual_triage.py --target \"{args.target}\" --out hits.csv")
    print("⚠️  Public-data orientation only. Not validation, not medical advice.")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Public-data target dossier (UniProt + ChEMBL).")
    p.add_argument("--target", required=True, help="Protein/gene target name (e.g. EGFR, BTK).")
    p.add_argument("--json", action="store_true", help="Emit JSON instead of a report.")
    args = p.parse_args(argv)
    try:
        return run(args)
    except urllib.error.URLError as e:
        print(f"Network error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
