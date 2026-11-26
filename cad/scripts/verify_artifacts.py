#!/usr/bin/env python3
"""Independent, dependency-light checks for FreeCAD smoke artifacts."""
import hashlib
import json
import os
import pathlib
import sys

root = pathlib.Path(os.environ.get("VUC_CAD_OUT", "artifacts/cad"))
required = ["unit-box.FCStd", "unit-box.step", "unit-box.pdf", "cad-manifest.json"]
errors = []

for name in required:
    path = root / name
    if not path.is_file() or path.stat().st_size == 0:
        errors.append(f"missing/empty artifact: {path}")

if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)

manifest = json.loads((root / "cad-manifest.json").read_text())
if manifest.get("schema") != "vuc.cad.smoke-manifest.v1" or manifest.get("status") != "PASS":
    errors.append("manifest schema/status mismatch")
if manifest.get("solid_count") != 1:
    errors.append("manifest solid_count must equal 1")
if abs(float(manifest.get("volume_mm3", -1)) - 320000.0) > 1e-6:
    errors.append("manifest volume mismatch")
dims = manifest.get("bounding_box_mm", {})
for key, expected in (("x", 100.0), ("y", 80.0), ("z", 40.0)):
    if abs(float(dims.get(key, -1)) - expected) > 1e-6:
        errors.append(f"manifest bounding-box {key} mismatch")

step_text = (root / "unit-box.step").read_text(errors="replace").upper()
if "ISO-10303-21" not in step_text or "END-ISO-10303-21" not in step_text:
    errors.append("STEP file lacks ISO-10303-21 delimiters")
pdf = (root / "unit-box.pdf").read_bytes()
if not pdf.startswith(b"%PDF-"):
    errors.append("PDF signature missing")
fcstd = root / "unit-box.FCStd"
if fcstd.stat().st_size < 100:
    errors.append("FCStd unexpectedly small")

# Record immutable hashes for downstream CI artifact inspection.
hashes = {}
for name in required[:3]:
    digest = hashlib.sha256((root / name).read_bytes()).hexdigest()
    hashes[name] = {"sha256": digest, "bytes": (root / name).stat().st_size}
(root / "artifact-sha256.json").write_text(json.dumps({
    "schema": "vuc.cad.artifact-hashes.v1",
    "artifacts": hashes
}, indent=2, sort_keys=True) + "\n")

if errors:
    print("\\n".join(errors), file=sys.stderr)
    sys.exit(1)
print(json.dumps({"status": "PASS", "manifest": manifest, "hashes": hashes}, indent=2))
