import sys, os, json, time
sys.path.insert(0, 'cad')
from multiprocessing import Pool
import binding_site as bsm
import validate as V

# Curated oncology co-crystal complexes (kinase inhibitors + a few others). Generous on purpose:
# a wrong/apo/RMSD-unmatchable entry self-filters (skip/error), so only real holo complexes score.
PDBS = [
    "1M17", "1XKK", "2ITY", "3POZ", "4HJO", "3W2S", "4I22", "2J5F", "4G5J",   # EGFR
    "1IEP", "2HYY", "3CS9", "3UE4", "2GQG", "1T46", "3G0E",                    # ABL / KIT
    "3OG7", "1UWH", "4RZV",                                                    # BRAF
    "2A4L", "1H1S", "1KE5", "4EK3", "5L2I",                                    # CDK2 / CDK6
    "2SRC", "1Y57",                                                            # SRC
    "1A9U", "1OUK", "3GCS",                                                    # p38
    "1UYL", "2FWZ", "1YET",                                                    # HSP90
    "3LQ8", "3KRR", "3H10", "4Z3V", "2XP2", "4XUF", "3ERT",                    # MET/JAK2/AURKA/BTK/ALK/FLT3/ERa
]


def detect_and_dock(pdb):
    try:
        txt = bsm.fetch_pdb_text(pdb)
        lig = bsm.select_ligand(txt)
        if not lig or not lig.get("resName"):
            return {"pdb": pdb, "skip": "no drug-like ligand detected"}
        r = V.redock_one(pdb, lig["resName"], f"/tmp/batch/{pdb}", cpu=1)
        return r
    except Exception as e:
        return {"pdb": pdb, "error": f"{type(e).__name__}: {str(e)[:80]}"}


if __name__ == "__main__":
    os.makedirs("/tmp/batch", exist_ok=True)
    workers = max(2, (os.cpu_count() or 4) // 2)   # leave half the cores for the user
    t0 = time.time()
    with Pool(workers) as p:
        results = p.map(detect_and_dock, PDBS)
    rmsds = [r["rmsd"] for r in results if "rmsd" in r]
    succ = [x for x in rmsds if x <= 2.0]
    summary = {
        "candidates": len(PDBS),
        "evaluable": len(rmsds),
        "skipped_or_errored": len(PDBS) - len(rmsds),
        "success_count": len(succ),
        "success_rate": round(len(succ) / len(rmsds), 3) if rmsds else None,
        "mean_rmsd": round(sum(rmsds) / len(rmsds), 3) if rmsds else None,
        "median_rmsd": round(sorted(rmsds)[len(rmsds) // 2], 3) if rmsds else None,
        "workers": workers, "minutes": round((time.time() - t0) / 60, 1),
    }
    json.dump({"summary": summary, "results": results}, open("/tmp/batch_results.json", "w"), indent=2)
    print(json.dumps(summary, indent=2))
    print("BATCH_DONE")
