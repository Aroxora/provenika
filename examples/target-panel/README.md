# Oncology target panel — ranked by human genetic support for cancer

Picking the target is the most consequential decision in a cancer program, and the strongest prior we
have for it is **human genetic evidence**: drug mechanisms with human genetic support are about **twice
as likely to win approval** ([Nelson et al., _Nat Genet_ 2015](https://www.nature.com/articles/ng.3314);
reinforced by [Minikel et al., _Nature_ 2024](https://www.nature.com/articles/s41586-024-07316-0)).

[`ranking.md`](ranking.md) ranks a curated panel of established oncogenes/drug targets by the strongest
**cancer** genetic-evidence score in the [Open Targets Platform](https://platform.opentargets.org), with
two fetched context columns:

- **Somatic (max)** — strongest somatic-mutation evidence across the target's cancer associations.
- **Clinical/drug (max)** — strongest clinical/known-drug precedent across them. High genetic + high
  clinical = a validated, already-drugged target; **high genetic + low/no clinical = a genetically-
  supported target that is not yet well-drugged** (the interesting opportunity).

Every number is **fetched live from Open Targets — none is computed, blended, or model-produced.** The
ranking key is Open Targets' own genetic-evidence score; we invent no composite that would imply a
prediction the data does not make.

## Honesty

Open Targets aggregates evidence; scores are heuristic weighted sums, **not outcome forecasts**. Human
genetic support raises a *population-level prior* of clinical success, not a per-program probability.
**Absence of genetic evidence is not evidence against a target** — many bona-fide oncogenes are somatic-
driven, and the read-out says so explicitly. Germline genetics also translates imperfectly to somatic
oncology. The panel is a curated comparison set, not a claim about "the best" targets. Research only —
not medical advice.

## Reproduce

```bash
make panel                                   # the default panel → ranking.json + ranking.md
python3 cad/target_panel.py --symbols KRAS,BRAF,EGFR,PIK3CA   # any targets you like
python3 cad/target_panel.py --json           # machine-readable, to stdout
```
