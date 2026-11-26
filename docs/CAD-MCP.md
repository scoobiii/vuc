# VUC CAD: FreeCAD, MCP, STEP and PDF

**Owner:** VUC / GoS3  
**Status:** Phase 1 — reproducible FreeCAD runner smoke test  
**Scope:** FreeCAD only; Rhino/Grasshopper is explicitly out of scope for this phase.

## Architecture

The existing `bin/mcp-server.js` remains the MCP entry point. CAD execution is isolated in a dedicated worker and CI workflow. Do not expose arbitrary shell commands or arbitrary client-supplied Python through MCP.

Phase 1 validates that a GitHub-hosted Linux runner can install FreeCAD, generate a known solid, save FCStd, export STEP, create a TechDraw drawing and export PDF. Phase 2 can wire validated operations into the existing MCP tool registry after this workflow is stable.

## Reproduce locally (Ubuntu/Debian with GUI libraries)

Install FreeCAD, Xvfb and Poppler tools using the OS package manager, then run:

```bash
mkdir -p artifacts/cad
VUC_CAD_OUT="$PWD/artifacts/cad" xvfb-run -a freecad cad/scripts/freecad_smoke.FCMacro
VUC_CAD_OUT="$PWD/artifacts/cad" python3 cad/scripts/verify_artifacts.py
```

The FreeCAD macro must run under a FreeCAD Python environment; a generic system Python cannot import FreeCAD unless the distribution explicitly configures its module paths.

## Artifact contract

- `unit-box.FCStd`: native FreeCAD document
- `unit-box.step`: ISO-10303-21 exchange file
- `unit-box.pdf`: TechDraw drawing
- `cad-manifest.json`: version and geometric assertions
- `artifact-sha256.json`: SHA-256 for the three output files

The fixture is a 100 × 80 × 40 mm box. Expected volume is 320,000 mm³ and exactly one solid. CI checks STEP delimiters, PDF signature, non-empty FCStd, manifest values and output hashes. Binary hashes are evidence for a specific run, not a promise that independent FreeCAD builds serialize byte-identically.

## Security requirements before MCP exposure

1. Accept a versioned JSON schema, not arbitrary source code.
2. Reject paths outside a per-run temporary directory.
3. Use fixed command templates and a time limit.
4. Do not expose secrets to CAD worker processes.
5. Fail closed if FreeCAD, TechDraw, export or verification is unavailable.
6. Treat uploaded CAD documents as untrusted input.
7. Do not report an export as successful until independent artifact checks pass.

## Phase 2 MCP contract (not yet implemented)

Candidate tools: `cad.freecad.status`, `cad.model.validate`, `cad.export.step`, and `cad.export.techdraw_pdf`. These must be added to the existing MCP registry, preserve existing tools, use bounded arguments, and return artifact metadata plus verifiable execution evidence. They must not claim to have run a GitHub job unless a real dispatch/poll mechanism has completed successfully.

## Known limitations

- This phase does not call Rhino or Rhino.Compute.
- A passing smoke test proves only the fixed fixture and export path, not arbitrary user models.
- FreeCAD package availability and GUI/TechDraw dependencies can change with runner images. The workflow logs package and FreeCAD versions; if installation is unavailable, CI fails instead of silently skipping CAD.
