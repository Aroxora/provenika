#!/usr/bin/env python3
"""
Cheminformatics filtering — real RDKit-based developability analysis.

Turns a SMILES (or a triage CSV from virtual_triage.py) into a genuine
medicinal-chemistry assessment:
  * physicochemical descriptors (MW, cLogP, TPSA, HBD/HBA, rotatable bonds,
    aromatic rings, fraction sp3 carbons, QED),
  * drug-likeness rule sets (Lipinski Ro5, Veber, Egan),
  * structural-alert screening (PAINS, Brenk) via RDKit FilterCatalog,
  * Bemis-Murcko scaffold,
  * optional ECFP4 Tanimoto similarity to a query molecule.

This is real computer-aided drug discovery (ligand-based triage / filtering),
not a template. Requires RDKit (`pip install rdkit`); exits with guidance if absent.

Usage:
  python3 cad/cheminformatics.py --smiles "CC(=O)Oc1ccccc1C(=O)O"
  python3 cad/cheminformatics.py --csv egfr_hits.csv --out egfr_annotated.csv
  python3 cad/cheminformatics.py --csv hits.csv --query "Cc1ccc(cc1)S(=O)(=O)N" --json

Refs: Lipinski 1997; Veber 2002; Egan 2000; Baell & Holloway 2010 (PAINS);
Brenk 2008; Bemis & Murcko 1996; QED Bickerton 2012.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys

try:
    from rdkit import Chem, DataStructs, RDLogger
    from rdkit.Chem import Descriptors, Crippen, rdMolDescriptors, QED, AllChem
    from rdkit.Chem.Scaffolds import MurckoScaffold
    from rdkit.Chem import FilterCatalog
    RDLogger.DisableLog("rdApp.*")
    _RDKIT = True
except Exception:
    _RDKIT = False

INSTALL = "RDKit is required: `pip install rdkit` (or conda install -c conda-forge rdkit)."


def _catalog(*cats) -> "FilterCatalog.FilterCatalog":
    params = FilterCatalog.FilterCatalogParams()
    for c in cats:
        params.AddCatalog(c)
    return FilterCatalog.FilterCatalog(params)


def _catalogs():
    P = FilterCatalog.FilterCatalogParams.FilterCatalogs
    return _catalog(P.PAINS), _catalog(P.BRENK)


def analyze(smiles: str, pains, brenk) -> dict | None:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    mw = Descriptors.MolWt(mol)
    logp = Crippen.MolLogP(mol)
    tpsa = rdMolDescriptors.CalcTPSA(mol)
    hbd = rdMolDescriptors.CalcNumHBD(mol)
    hba = rdMolDescriptors.CalcNumHBA(mol)
    rotb = rdMolDescriptors.CalcNumRotatableBonds(mol)
    arom = rdMolDescriptors.CalcNumAromaticRings(mol)
    fsp3 = rdMolDescriptors.CalcFractionCSP3(mol)
    qed = QED.qed(mol)
    heavy = mol.GetNumHeavyAtoms()

    # Drug-likeness rule sets
    ro5_viol = sum([mw > 500, logp > 5, hbd > 5, hba > 10])
    ro5 = ro5_viol <= 1
    veber = rotb <= 10 and tpsa <= 140
    egan = tpsa <= 131.6 and logp <= 5.88
    # Developability / tox-risk heuristics (descriptor-only, cited):
    gsk_ok = mw <= 400 and logp <= 4          # GSK 4/400 (Gleeson, Nat Rev Drug Discov 2008) — favorable ADMET
    pfizer_tox_risk = logp > 3 and tpsa < 75  # Pfizer 3/75 (Hughes, Bioorg Med Chem Lett 2008) — ~2.5x in-vivo tox risk

    pains_hits = [m.GetDescription() for m in pains.GetMatches(mol)]
    brenk_hits = [m.GetDescription() for m in brenk.GetMatches(mol)]
    scaffold = MurckoScaffold.MurckoScaffoldSmiles(mol=mol) or ""

    return {
        "smiles": Chem.MolToSmiles(mol),
        "mw": round(mw, 1), "clogp": round(logp, 2), "tpsa": round(tpsa, 1),
        "hbd": hbd, "hba": hba, "rotb": rotb, "aromatic_rings": arom, "heavy_atoms": heavy,
        "fraction_csp3": round(fsp3, 3), "qed": round(qed, 3),
        "ro5_violations": ro5_viol, "lipinski_ok": ro5, "veber_ok": veber, "egan_ok": egan,
        "gsk_ok": gsk_ok, "pfizer_tox_risk": pfizer_tox_risk,
        "pains_alerts": len(pains_hits), "pains": pains_hits[:5],
        "brenk_alerts": len(brenk_hits), "brenk": brenk_hits[:5],
        "murcko_scaffold": scaffold,
        "clean": ro5 and veber and len(pains_hits) == 0,
    }


def tanimoto(query: str, smiles: str) -> float | None:
    q = Chem.MolFromSmiles(query)
    m = Chem.MolFromSmiles(smiles)
    if q is None or m is None:
        return None
    fq = AllChem.GetMorganFingerprintAsBitVect(q, 2, 2048)
    fm = AllChem.GetMorganFingerprintAsBitVect(m, 2, 2048)
    return round(DataStructs.TanimotoSimilarity(fq, fm), 3)


def ligand_efficiency(pchembl: float, heavy_atoms: int) -> float | None:
    """LE = 1.37 * pChEMBL / heavy atoms (kcal/mol per heavy atom). Hopkins 2004."""
    return round(1.37 * pchembl / heavy_atoms, 3) if heavy_atoms else None


def lipophilic_efficiency(pchembl: float, clogp: float) -> float:
    """LLE (LipE) = pChEMBL - cLogP. Leeson & Springthorpe 2007."""
    return round(pchembl - clogp, 2)


def _f(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def cluster_indices(smiles_list: list[str], cutoff_dist: float = 0.35) -> list[int | None]:
    """Butina cluster a set of molecules by ECFP4 Tanimoto distance; returns a cluster
    id per input (0 = largest cluster). Members within ~(1-cutoff) similarity group
    together → chemotype/series detection. Ref: Butina, J Chem Inf Comput Sci 1999."""
    from rdkit.ML.Cluster import Butina
    mols = [Chem.MolFromSmiles(s) if s else None for s in smiles_list]
    fps = [AllChem.GetMorganFingerprintAsBitVect(m, 2, 2048) if m else None for m in mols]
    valid = [i for i, f in enumerate(fps) if f is not None]
    n = len(valid)
    out: list[int | None] = [None] * len(smiles_list)
    if n == 0:
        return out
    dists: list[float] = []
    for a in range(1, n):
        sims = DataStructs.BulkTanimotoSimilarity(fps[valid[a]], [fps[valid[b]] for b in range(a)])
        dists.extend(1.0 - s for s in sims)
    clusters = Butina.ClusterData(dists, n, cutoff_dist, isDistData=True)
    for cid, members in enumerate(clusters):
        for m in members:
            out[valid[m]] = cid
    return out


def collect_smiles(args) -> list[tuple[str, str, float | None]]:
    """Return list of (id, smiles, pchembl|None)."""
    if args.smiles:
        return [(args.smiles, args.smiles, args.pchembl)]
    rows: list[tuple[str, str, float | None]] = []
    with open(args.csv, newline="") as fh:
        rdr = csv.DictReader(fh)
        for r in rdr:
            smi = (r.get(args.smiles_col) or "").strip()
            if smi:
                rows.append((r.get("chembl_id") or r.get("name") or smi, smi,
                             _f(r.get("best_pchembl") or r.get("pchembl"))))
    return rows


_SDF_TAGS = ["id", "pchembl", "le", "lle", "qed", "mw", "clogp", "tpsa", "lipinski_ok",
             "veber_ok", "egan_ok", "gsk_ok", "pfizer_tox_risk", "pains_alerts",
             "brenk_alerts", "cluster", "murcko_scaffold"]


def write_sdf(results: list[dict], path: str) -> int:
    """Write the analyzed hits as 3-D structures with property tags, so they load directly
    into docking / visualization tools (PyMOL, Maestro, AutoDockTools, RDKit) — no manual
    SMILES→3D conversion. Returns the number written."""
    writer = Chem.SDWriter(path)
    written = 0
    try:
        for r in results:
            mol = Chem.MolFromSmiles(r.get("smiles", ""))
            if mol is None:
                continue
            mol = Chem.AddHs(mol)
            if AllChem.EmbedMolecule(mol, randomSeed=0xC0FFEE) != 0:
                continue  # embedding failed — skip rather than emit a 2-D/garbage conformer
            try:
                AllChem.MMFFOptimizeMolecule(mol)
            except Exception:  # pragma: no cover - force-field edge cases
                pass
            mol = Chem.RemoveHs(mol)
            mol.SetProp("_Name", str(r.get("id", "")))
            for k in _SDF_TAGS:
                if r.get(k) is not None:
                    mol.SetProp(k, str(r[k]))
            writer.write(mol)
            written += 1
    finally:
        writer.close()
    return written


def run(args) -> int:
    if not _RDKIT:
        print(INSTALL, file=sys.stderr)
        return 3
    pains, brenk = _catalogs()
    items = collect_smiles(args)
    if not items:
        print("No SMILES found (provide --smiles or --csv with a smiles column).", file=sys.stderr)
        return 1

    results = []
    for ident, smi, pchembl in items:
        a = analyze(smi, pains, brenk)
        if a is None:
            continue
        a["id"] = ident
        if pchembl is not None:
            a["pchembl"] = pchembl
            a["le"] = ligand_efficiency(pchembl, a["heavy_atoms"])
            a["lle"] = lipophilic_efficiency(pchembl, a["clogp"])
        if args.query:
            a["similarity"] = tanimoto(args.query, smi)
        results.append(a)

    # Chemotype clustering across the set (Butina on ECFP4).
    n_clusters = 0
    if len(results) > 1:
        ids = cluster_indices([r["smiles"] for r in results])
        for r, cid in zip(results, ids):
            r["cluster"] = cid
        n_clusters = len({c for c in ids if c is not None})

    if args.out:
        cols = ["id", "smiles", "mw", "clogp", "tpsa", "hbd", "hba", "rotb", "aromatic_rings",
                "heavy_atoms", "fraction_csp3", "qed", "pchembl", "le", "lle",
                "ro5_violations", "lipinski_ok", "veber_ok", "egan_ok", "gsk_ok", "pfizer_tox_risk",
                "pains_alerts", "brenk_alerts", "cluster", "murcko_scaffold", "clean"]
        if args.query:
            cols.append("similarity")
        with open(args.out, "w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
            w.writeheader()
            for r in results:
                w.writerow(r)
        if not args.json:
            print(f"Wrote {len(results)} annotated rows to {args.out}")

    if args.sdf:
        n = write_sdf(results, args.sdf)
        if not args.json:
            print(f"Wrote {n} 3-D structures to {args.sdf} (ready for docking/visualization tools).")

    if args.json:
        print(json.dumps({"count": len(results), "results": results,
                          "disclaimer": "RDKit cheminformatics triage on public/provided structures. "
                                        "Hypothesis-generation only; not validated, not medical advice."}, indent=2))
        return 0

    has_le = any("le" in r for r in results)
    print(f"\nCheminformatics analysis ({len(results)} molecule(s)):\n")
    hdr = f"{'id':<16} {'MW':>6} {'cLogP':>6} {'TPSA':>6} {'QED':>5}"
    if has_le:
        hdr += f" {'LE':>5} {'LLE':>6}"
    hdr += f" {'Ro5':>4} {'Veb':>4} {'PAINS':>5} {'Brenk':>5} {'Tox':>4}"
    if args.query:
        hdr += f" {'Sim':>5}"
    print(hdr)
    print("-" * len(hdr))
    for r in results:
        line = (f"{str(r['id'])[:16]:<16} {r['mw']:>6.0f} {r['clogp']:>6.2f} {r['tpsa']:>6.0f} "
                f"{r['qed']:>5.2f}")
        if has_le:
            le = r.get("le"); lle = r.get("lle")
            line += f" {(le if le is not None else 0):>5.2f} {(lle if lle is not None else 0):>6.2f}"
        line += (f" {('ok' if r['lipinski_ok'] else 'X'):>4} "
                 f"{('ok' if r['veber_ok'] else 'X'):>4} {r['pains_alerts']:>5} {r['brenk_alerts']:>5} "
                 f"{('RISK' if r.get('pfizer_tox_risk') else 'ok'):>4}")
        if args.query:
            line += f" {(r.get('similarity') or 0):>5.2f}"
        print(line)
    clean = sum(1 for r in results if r["clean"])
    print(f"\n{clean}/{len(results)} pass Ro5 + Veber with no PAINS alerts.")
    if n_clusters:
        print(f"{n_clusters} distinct chemotype cluster(s) (Butina, ECFP4) among {len(results)} compounds.")
    if has_le:
        print("LE = 1.37·pChEMBL/heavy-atoms (Hopkins 2004); LLE = pChEMBL − cLogP (Leeson 2007). Higher = better.")
    print("PAINS = pan-assay interference (Baell 2010); Brenk = unwanted-fragment alerts (Brenk 2008).")
    print("Tox = Pfizer 3/75 zone: cLogP>3 & TPSA<75 → ~2.5x in-vivo tox risk (Hughes 2008). "
          "GSK 4/400 developability flag (Gleeson 2008) in --json/--csv.")
    print("⚠️  Computational triage/filtering — needs assay/wet-lab confirmation. Not medical advice.")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="RDKit cheminformatics filtering for drug-discovery triage.")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--smiles", help="A single SMILES string to analyze.")
    g.add_argument("--csv", help="CSV with a SMILES column (e.g. virtual_triage.py output).")
    p.add_argument("--smiles-col", default="smiles", help="SMILES column name in --csv (default: smiles).")
    p.add_argument("--query", help="Optional SMILES; also report ECFP4 Tanimoto similarity to it.")
    p.add_argument("--pchembl", type=float, help="pChEMBL for --smiles, to compute LE/LLE.")
    p.add_argument("--out", help="Write an annotated CSV to this path.")
    p.add_argument("--sdf", help="Also write the hits as a 3-D SDF (with property tags) for docking/viz tools.")
    p.add_argument("--json", action="store_true", help="Emit JSON.")
    return run(p.parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
