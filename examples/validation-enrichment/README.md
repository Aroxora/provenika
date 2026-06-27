# Ligand-based enrichment validation — does the *ranking* recover real actives?

Redocking (`examples/validation-redock/`) validates the docking **pose**. This validates the other
half of the pipeline — the part that decides which compounds to look at at all: can a structure-only
signal (ECFP4 similarity to known actives) **recover held-out actives out of a sea of decoys**? It is
the first honest, committed answer to "does the triage actually prioritise good compounds?"

## Why it is non-circular (the hard part)

The triage *score* is ~0.6·potency, so labelling actives/inactives by a pChEMBL threshold and then
scoring by that same potency is a **tautology** — it would give AUC ≈ 1.0 and prove nothing. So the
harness instead:

- **labels** by membership: known ChEMBL actives (binding, quality-gated, pChEMBL ≥ threshold) vs
  **property-matched, presumed-inactive decoys** (DUD-E-style — random in-MW-window molecules with no
  measured activity on the target);
- **scores** purely by **ECFP4 (Morgan r2, 2048-bit) max-Tanimoto to a held-out set of known actives**
  — the *queries* are the most-potent actives; the *scored* actives are disjoint from them, so
  similarity is not trivially 1.0;
- **holds potency out** of the score entirely, and a **leakage guard** asserts the score does not
  track the actives' potency (`|Spearman| ≤ 0.95`). For contrast the file also reports
  `circular_baseline_potency_auc` (the tautological ~1.0).

## The committed result (`EGFR.json`)

| Metric | Value |
|---|---|
| Queries (known actives, reference) | 5 |
| Scored actives / decoys | 60 / 240 |
| **ROC AUC** | **0.89** |
| **Enrichment factor @1% / @5%** | **5.0 / 5.0** (the max possible at 20 % active prevalence) |
| Leakage guard (Spearman score vs held-out potency) | 0.31 → **not leaking** |
| Circular potency-only baseline AUC | 1.00 (shown only to prove what we are *not* doing) |

**AUC 0.89** means a random known active is ranked above a random decoy ~89 % of the time by structure
alone — a real, non-trivial signal. It is a necessary, **not** sufficient, check: it does not prove any
molecule binds, and the decoys are *assumed* inactive. Research only; not medical advice.

## Reproduce / re-prove

```bash
# Re-derive the headline AUC/EF from the committed file's own rows — offline, no network:
python3 -c "import sys;sys.path.insert(0,'cad');import validate as V;\
print(V.recheck_enrichment_file('examples/validation-enrichment/EGFR.json'))"

# Regenerate live from ChEMBL (decoy sampling varies, so the AUC moves a little run to run):
python3 cad/validate.py --enrichment-ligand EGFR --min-pchembl 7.5 \
    --out-file examples/validation-enrichment/EGFR.json
```
