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
import sys
import urllib.parse
import urllib.request

UNIPROT = "https://rest.uniprot.org/uniprotkb/search"
RCSB_FILES = "https://files.rcsb.org/download"
ALPHAFOLD = "https://alphafold.ebi.ac.uk/files"
UA = "oncology-osint-cad/1.0 (research)"


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


def resolve_uniprot(name: str) -> dict | None:
    """Resolve a target/gene name to a reviewed human UniProt entry + PDB xrefs."""
    q = f"(gene:{name} OR protein_name:{name}) AND organism_id:9606 AND reviewed:true"
    url = f"{UNIPROT}?{urllib.parse.urlencode({'query': q, 'fields': 'accession,xref_pdb', 'size': 1, 'format': 'json'})}"
    results = _get_json(url).get("results", [])
    if not results:
        return None
    e = results[0]
    pdbs = []
    for x in e.get("uniProtKBCrossReferences", []):
        if x.get("database") != "PDB":
            continue
        props = {p["key"]: p["value"] for p in x.get("properties", [])}
        res = props.get("Resolution", "")
        try:
            res_num = float(res.split()[0]) if res and res[0].isdigit() else 9999.0
        except (ValueError, IndexError):
            res_num = 9999.0
        pdbs.append({"id": x["id"], "method": props.get("Method", ""),
                     "resolution": res, "_res_num": res_num})
    return {"accession": e.get("primaryAccession"), "pdbs": pdbs}


def pick_best_pdb(pdbs: list[dict]) -> dict | None:
    """Prefer X-ray / EM with the best (lowest) resolution."""
    if not pdbs:
        return None
    def rank(p):
        prefer = 0 if p["method"] in ("X-ray", "EM") else 1
        return (prefer, p["_res_num"])
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
        url = f"{UNIPROT}?{urllib.parse.urlencode({'query': f'accession:{acc}', 'fields': 'accession,xref_pdb', 'size': 1, 'format': 'json'})}"
        res = _get_json(url).get("results", [])
        if res:
            for x in res[0].get("uniProtKBCrossReferences", []):
                if x.get("database") == "PDB":
                    props = {p["key"]: p["value"] for p in x.get("properties", [])}
                    rnum = 9999.0
                    try:
                        r = props.get("Resolution", "")
                        rnum = float(r.split()[0]) if r and r[0].isdigit() else 9999.0
                    except (ValueError, IndexError):
                        pass
                    pdbs.append({"id": x["id"], "method": props.get("Method", ""),
                                 "resolution": props.get("Resolution", ""), "_res_num": rnum})

    best = pick_best_pdb(pdbs)
    if best:
        dest = os.path.join(args.out, f"{best['id']}.{ext}")
        url = f"{RCSB_FILES}/{best['id']}.{ext}"
        _download(url, dest)
        _report({"source": "RCSB PDB", "uniprot": acc, "pdb_id": best["id"],
                 "method": best["method"], "resolution": best["resolution"],
                 "alternatives": len(pdbs), "path": dest, "url": url}, args)
        return 0

    # Fall back to AlphaFold model
    dest = os.path.join(args.out, f"AF-{acc}-F1.pdb")
    url = f"{ALPHAFOLD}/AF-{acc}-F1-model_v4.pdb"
    try:
        _download(url, dest)
    except urllib.error.HTTPError as e:
        print(f"No experimental PDB and no AlphaFold model for {acc} ({e}).", file=sys.stderr)
        return 1
    _report({"source": "AlphaFold DB (predicted model)", "uniprot": acc,
             "path": dest, "url": url,
             "note": "Predicted model — validate confidence (pLDDT) before docking."}, args)
    return 0


def _report(info: dict, args) -> None:
    if args.json:
        print(json.dumps(info, indent=2))
        return
    print(f"\nFetched structure → {info['path']}")
    for k in ("source", "pdb_id", "uniprot", "method", "resolution", "alternatives", "note"):
        if k in info:
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
