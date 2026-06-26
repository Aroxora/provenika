#!/usr/bin/env python3
"""
Provenance — the anti-hallucination spine of the pipeline.

Core rule of this repo: **no FIGURE in a pipeline artifact originates from a
language model.** Every number is either (a) fetched live from a named public
database, or (b) computed by deterministic, open-source code whose formula is
cited. This module makes that auditable instead of merely promised.

Scope, stated honestly: this guarantee covers the *figures* in the machine-
readable artifacts (dossier.json, hits.csv, cost_benefit.json, the manifest).
It does NOT cover free-text narrative (SUMMARY.md prose, the read-out lines in
target_report.py) or the `cad/intel/` news digests from news_update.py — those
are search-derived *leads to verify*, never validated facts, and are labeled as
such where they appear. Re-check covered figures with `cad/verify.py`.

  * `SOURCES` — the single registry of the public databases we rely on, each
    with a stable docs URL and a function to build the exact record URL a human
    can open to confirm a figure by hand.
  * `Manifest` — an accumulator a tool stamps as it fetches; `write()` emits a
    machine-readable `provenance.json` listing every figure, its origin
    (`fetched` / `computed`), the source, and a re-verification URL.

It is standard-library only and has no opinion about *what* you fetch — it only
records *where every value came from* so `cad/verify.py` (and any human) can
re-pull and confirm it. Research only; not medical advice.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path

# --- The registry of public sources. Add a source here, nowhere else. --------
SOURCES = {
    "uniprot": {
        "name": "UniProt",
        "what": "Protein function, length, cross-referenced PDB structures",
        "docs": "https://www.uniprot.org/help/api",
        "entry": lambda acc: f"https://www.uniprot.org/uniprotkb/{acc}/entry",
    },
    "chembl": {
        "name": "ChEMBL (EMBL-EBI)",
        "what": "Measured bioactivity, drug-likeness properties, mechanisms",
        "docs": "https://www.ebi.ac.uk/chembl/api/data/docs",
        "entry": lambda cid: f"https://www.ebi.ac.uk/chembl/compound_report_card/{cid}/",
        "target": lambda tid: f"https://www.ebi.ac.uk/chembl/target_report_card/{tid}/",
        "activity_count": lambda tid: (
            "https://www.ebi.ac.uk/chembl/api/data/activity?"
            f"target_chembl_id={tid}&pchembl_value__isnull=false&limit=1&format=json"
        ),
        "mechanisms": lambda tid: (
            "https://www.ebi.ac.uk/chembl/api/data/mechanism?"
            f"target_chembl_id={tid}&limit=50&format=json"
        ),
    },
    "rcsb": {
        "name": "RCSB PDB",
        "what": "Experimental 3-D protein structures",
        "docs": "https://data.rcsb.org/",
        "entry": lambda pdb: f"https://www.rcsb.org/structure/{pdb}",
    },
    "alphafold": {
        "name": "AlphaFold DB (EMBL-EBI)",
        "what": "Predicted protein structures (model, not experiment)",
        "docs": "https://alphafold.ebi.ac.uk/",
        "entry": lambda acc: f"https://alphafold.ebi.ac.uk/entry/{acc}",
    },
    "benchmarks": {
        "name": "Published industry benchmarks",
        "what": "Clinical success / cost / duration priors (cost-benefit model)",
        "docs": "BIO/Informa CDSR 2011-2020; Wong, Siah & Lo 2019; DiMasi et al. 2016",
        "entry": lambda _=None: "https://doi.org/10.1093/biostatistics/kxx069",
    },
}

# Origin of a value. Only these two are legitimate; anything else is a bug.
FETCHED = "fetched"     # pulled live from a public source (URL recorded)
COMPUTED = "computed"   # deterministic open-source code from fetched inputs (formula cited)


@dataclass
class Figure:
    """One reported value and exactly where it came from."""
    name: str               # e.g. "pdb_structure_count"
    value: object           # the value as reported
    origin: str             # FETCHED or COMPUTED
    source: str             # SOURCES key or formula citation
    verify_url: str = ""    # a URL a human can open to confirm (FETCHED) or the ref (COMPUTED)
    note: str = ""

    def __post_init__(self):
        if self.origin not in (FETCHED, COMPUTED):
            raise ValueError(
                f"Figure {self.name!r}: origin must be {FETCHED!r} or {COMPUTED!r} "
                f"(a value may never originate from a model), got {self.origin!r}"
            )
        # Stronger write-time guarantee: a value at write time still can't be PROVEN to come from
        # its source (only verify.py's live re-fetch can do that), but every figure must at least
        # carry a re-verification reference — a verify URL (fetched) or a formula/source citation
        # (computed) — so nothing is recorded that a human or verify.py cannot independently re-check.
        if not self.verify_url:
            raise ValueError(
                f"Figure {self.name!r}: a {self.origin} value must carry a verify_url "
                "(re-verification URL for fetched, formula/source citation for computed) — "
                "an un-re-checkable figure is not auditable."
            )


@dataclass
class Manifest:
    """Accumulates the provenance of every figure produced by a run."""
    target: str
    stamp: str = ""                       # caller-supplied ISO date (no wall-clock here)
    figures: list = field(default_factory=list)

    def fetched(self, name, value, source, verify_url="", note="") -> "Manifest":
        self.figures.append(Figure(name, value, FETCHED, source, verify_url, note))
        return self

    def computed(self, name, value, formula_ref, note="") -> "Manifest":
        self.figures.append(Figure(name, value, COMPUTED, formula_ref, verify_url=formula_ref, note=note))
        return self

    def to_dict(self) -> dict:
        return {
            "target": self.target,
            "generated": self.stamp,
            "rule": "No value below originates from a language model: each is either "
                    "fetched live from a cited public source or computed by deterministic "
                    "open-source code. Re-check with cad/verify.py or by opening verify_url.",
            "sources": {k: {"name": v["name"], "what": v["what"], "docs": v["docs"]}
                        for k, v in SOURCES.items()},
            "figures": [asdict(f) for f in self.figures],
        }

    def write(self, out_dir) -> Path:
        path = Path(out_dir) / "provenance.json"
        path.write_text(json.dumps(self.to_dict(), indent=2))
        return path


def source_url(source_key: str, kind: str, ident) -> str:
    """Build a re-verification URL for a source, defensively (never raises)."""
    src = SOURCES.get(source_key, {})
    fn = src.get(kind)
    try:
        return fn(ident) if callable(fn) else ""
    except Exception:
        return ""
