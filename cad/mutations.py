#!/usr/bin/env python3
"""
Mutation / variant parsing — a tiny shared helper so every stage handles an
allele-specific oncology query (e.g. "KRAS G12C", "EGFR L858R/T790M") the SAME way.

Oncology targets are usually pursued allele-by-allele: a KRAS G12C inhibitor is not a
KRAS G12D inhibitor, and an EGFR T790M/C797S resistance program is a different molecule
than first-line EGFR. A target string that carries a point-mutation token must therefore
be (a) stripped to its bare gene symbol before resolving the ChEMBL/UniProt target, and
(b) used to keep only the variant-specific assay records / confirm the variant residue in
a structure. This module is the single source of truth for both, so the regex never
diverges between virtual_triage, fetch_structure, target_report and run_pipeline.

Stdlib only. Research only; not medical advice.
"""

from __future__ import annotations

import re

# A point-mutation token: a 1-letter wild-type residue (or '*' stop), a 1-4 digit position, and a
# 1-letter mutant residue (or '*'). Examples it matches: G12C, L858R, T790M, V600E, C797S, Q61*.
# `_MUT_CORE` is the bare pattern (for fullmatch of a single token). `_MUT_RE` adds non-alphanumeric
# lookarounds — NOT \b, which can't anchor next to '*' (so 'Q61*' failed) and which would let the
# pattern fire on a fragment of a gene name (e.g. 'K3C' inside PIK3CA). The lookarounds require the
# token to stand alone (space/start/'/' boundaries), so ordinary symbols like MAP2K1, CDK4, PIK3CA
# do not match, while a free-standing 'G12C' or stop 'Q61*' does.
_AA = "ACDEFGHIKLMNPQRSTVWY*"
_MUT_CORE = re.compile(rf"([{_AA}])(\d{{1,4}})([{_AA}])")
_MUT_RE = re.compile(rf"(?<![A-Za-z0-9])([{_AA}])(\d{{1,4}})([{_AA}])(?![A-Za-z0-9])")

# 3-letter -> 1-letter amino-acid code (plus a few common modified/ambiguous residues), used to
# read a residue out of a PDB/mmCIF structure and compare it to a requested mutation.
THREE_TO_ONE = {
    "ALA": "A", "ARG": "R", "ASN": "N", "ASP": "D", "CYS": "C", "GLN": "Q", "GLU": "E",
    "GLY": "G", "HIS": "H", "ILE": "I", "LEU": "L", "LYS": "K", "MET": "M", "PHE": "F",
    "PRO": "P", "SER": "S", "THR": "T", "TRP": "W", "TYR": "Y", "VAL": "V",
    "MSE": "M", "SEC": "U", "PYL": "O",
}


def parse_mutation(token: str) -> tuple[str, int, str] | None:
    """Parse a single mutation token like 'G12C' -> ('G', 12, 'C'). None if it isn't one."""
    m = _MUT_CORE.fullmatch(token.strip().upper())
    if not m:
        return None
    return m.group(1), int(m.group(2)), m.group(3)


def parse_variants(text: str) -> set[str]:
    """All mutation tokens in a free-text string, normalised upper-case.

    'KRAS G12C' -> {'G12C'};  'EGFR L858R/T790M' -> {'L858R', 'T790M'};  'EGFR' -> set().
    ChEMBL records a combination assay's variant as e.g. 'C797S,L858R' (order varies), so callers
    test membership/subset against the *set*, which is order-independent.
    """
    if not text:
        return set()
    return {m.group(0).upper() for m in _MUT_RE.finditer(text.upper())}


def strip_variants(text: str) -> str:
    """The target string with its mutation tokens removed → the bare gene/protein name to resolve.

    'KRAS G12C' -> 'KRAS';  'EGFR L858R/T790M' -> 'EGFR'. Collapses the whitespace/separators a
    stripped token leaves behind. If nothing is left (the query was only a mutation), returns the
    original string unchanged so resolution still has something to work with.
    """
    if not text:
        return text
    stripped = _MUT_RE.sub(" ", text)
    stripped = re.sub(r"[\s/,;]+", " ", stripped).strip()
    return stripped or text.strip()


def three_to_one(resname: str) -> str | None:
    """3-letter residue code (e.g. 'CYS') -> 1-letter ('C'); None if unknown."""
    return THREE_TO_ONE.get((resname or "").strip().upper())
