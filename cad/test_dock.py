#!/usr/bin/env python3
"""
Offline tests for the docking-box handling in cad/dock.py.

The bug this guards against: the "blind box" branch passed `--autobox`, a flag stock
AutoDock Vina does not support, so the documented no-`--center` path errored out instead of
docking. dock.py now builds an explicit whole-receptor box from coordinates.

Pure stdlib, no network, no Vina/Open Babel needed (only the box math is exercised).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import dock  # noqa: E402

DOCK_SRC = (Path(__file__).parent / "dock.py").read_text()


def _atom(serial, x, y, z, rec="ATOM"):
    return (f"{rec:<6}{serial:>5} {'C':<4}{'':1}{'ALA':>3} {'A':1}{serial:>4}"
            f"{'':4}{x:8.3f}{y:8.3f}{z:8.3f}{1.0:6.2f}{0.0:6.2f}{'':10}{'C':>2}")


def test_no_autobox_flag_anywhere():
    """Regression guard: the unsupported Vina flag must never reappear."""
    assert "--autobox" not in DOCK_SRC, "dock.py reintroduced the unsupported --autobox flag"


def test_box_cmd_builds_explicit_vina_args():
    cmd = dock._box_cmd([1.0, 2.0, 3.0], [10.0, 11.0, 12.0])
    assert cmd == ["--center_x", "1.0", "--center_y", "2.0", "--center_z", "3.0",
                   "--size_x", "10.0", "--size_y", "11.0", "--size_z", "12.0"]
    # Vina requires center+size; both must be present.
    assert "--center_x" in cmd and "--size_x" in cmd


def test_receptor_bbox_center_and_size(tmpfile="/tmp/provenika-dock-test.pdb"):
    # Atoms spanning x[0,10] y[0,20] z[-4,6] → center (5,10,1), size extent+2*margin(5)=+10.
    lines = [
        _atom(1, 0.0, 0.0, -4.0),
        _atom(2, 10.0, 20.0, 6.0),
        _atom(3, 5.0, 10.0, 1.0),
    ]
    Path(tmpfile).write_text("\n".join(lines) + "\n")
    center, size = dock.receptor_bbox(tmpfile)
    assert center == [5.0, 10.0, 1.0], center
    assert size == [20.0, 30.0, 20.0], size


def test_receptor_bbox_reads_hetatm_too(tmpfile="/tmp/provenika-dock-test2.pdb"):
    Path(tmpfile).write_text("\n".join([
        _atom(1, 0.0, 0.0, 0.0, rec="HETATM"),
        _atom(2, 4.0, 4.0, 4.0, rec="HETATM"),
    ]) + "\n")
    center, size = dock.receptor_bbox(tmpfile)
    assert center == [2.0, 2.0, 2.0]
    assert size == [14.0, 14.0, 14.0]  # extent 4 + 2*5


def test_receptor_bbox_none_on_empty(tmpfile="/tmp/provenika-dock-test3.pdb"):
    Path(tmpfile).write_text("REMARK no atoms here\n")
    assert dock.receptor_bbox(tmpfile) is None
    assert dock.receptor_bbox("/no/such/file.pdb") is None


def test_scaled_exhaustiveness_scales_with_volume():
    # A ~focused box (20³=8000 Å³) stays at the base effort; a big box gets proportionally more.
    assert dock.scaled_exhaustiveness([20, 20, 20]) == 8           # 8000/8000 = 1 -> max(8,1)
    assert dock.scaled_exhaustiveness([60, 60, 60]) == 27          # 216000/8000 = 27
    assert dock.scaled_exhaustiveness([10, 10, 10], 8) == 8        # tiny box never drops below base
    assert dock.scaled_exhaustiveness(["x", 1, 1]) == 8            # bad input -> base, never crashes


def test_blind_axis_cap_present():
    # The guard constant must exist so an oversized whole-receptor blind box is flagged unreliable.
    assert dock.BLIND_AXIS_CAP == 30.0


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
        print(f"  ok  {t.__name__}")
    print(f"dock: {len(tests)} tests passed")


if __name__ == "__main__":
    main()
