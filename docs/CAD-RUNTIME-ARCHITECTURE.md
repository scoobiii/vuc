# VUC Deterministic Runtime — CAD engines

**Owner:** VUC / GoS3  
**Status:** Architecture proposal; FreeCAD smoke CI is the first implementation slice  
**Target repository:** `scoobiii/vuc`

## Decision

VUC is the control plane and evidence verifier. CAD engines are isolated, versioned execution backends. The LLM may propose a typed operation but is not the executor and cannot assert success without runtime evidence.

The intended engine matrix is:

| Engine | Runtime packaging | Initial CI target | Constraints |
|---|---|---|---|
| Bend / HVM | Existing binary/runtime distribution | Existing project-specific runner | Preserve existing ABI, provenance and proof contracts |
| FreeCAD | Versioned package or environment; capture binary/build identity | GitHub-hosted Linux | Headless execution must prove Part/TechDraw/STEP/PDF functionality |
| Rhino | Licensed runtime and version-specific deployment | Dedicated compatible runner after licensing validation | Do not assume an unrestricted Linux binary or license-free CI |
| Grasshopper | Versioned definition plus compatible Rhino execution host/plugins | Same validated host as its Rhino dependency | Grasshopper is not an independent native CAD engine binary; definitions, plugins and Rhino version must be pinned |

## Trust boundaries

1. LLM outputs are untrusted requests, never execution results.
2. VUC validates a versioned operation schema, allowed engine, dimensions/units, resource budget and permitted outputs.
3. A worker launches a fixed engine entry point. Do not pass arbitrary shell commands or arbitrary LLM-generated Python into a privileged process.
4. Worker records engine identity, build/version, input and parameter hashes, exit status, stdout/stderr, output paths and output hashes.
5. Independent validators reopen or parse outputs and check domain invariants.
6. ExecutionProof binds the request, actual execution record and verified artifacts. Signing keys remain outside the CAD worker; signature verification is a separate step.
7. Failed, missing, timed-out or unverifiable execution is FAIL/CLOSED. No synthetic success or fallback output.

## Artifact layout

```text
artifacts/cad/<run-id>/
  request.json
  runtime.json
  stdout.log
  stderr.log
  model.FCStd
  model.step
  drawing.pdf
  validation.json
  artifact-sha256.json
  execution-proof.json
```

Only outputs applicable to the requested operation are required. A failed run retains logs and a failure manifest without fabricating model artifacts.

## Determinism contract

Determinism applies to normalized inputs, declared operation semantics and expected geometric invariants. Binary-identical exports are not assumed across OS, engine builds, exporters or plugin versions.

Validation should cover, as appropriate:
- canonicalized request and parameter hashes;
- engine name, exact version/build and platform;
- units, tolerance and coordinate system;
- topology counts, solid count, bounding box, volume and surface area within explicit tolerances;
- successful reopen/reimport of STEP;
- PDF signature, page count and drawing metadata;
- SHA-256 for each produced artifact;
- signed proof verification against an explicitly trusted public key.

## CI rollout

### Phase 1 — FreeCAD (current PR)
A fixed box fixture validates the runner, geometry, FCStd save, STEP export and TechDraw PDF. The job must run and pass before this slice is considered delivered.

### Phase 2 — VUC execution contract
Add typed CAD request/response schemas and a worker adapter, plus tests for invalid dimensions, unit ambiguity, timeout, missing output, corrupted output, tampered hashes and invalid signatures. Preserve all existing MCP tools and ExecutionProof schemas.

### Phase 3 — MCP surface
Expose narrowly scoped tools such as `cad.engines.list`, `cad.model.validate`, `cad.export.step`, and `cad.export.techdraw_pdf`. MCP routes requests to VUC policy and worker APIs; it must not itself pretend that a queued GitHub job has completed.

### Phase 4 — remote GitHub runner
A remote-run API must authenticate dispatch requests, return a run ID, poll actual job state, retrieve the exact run artifacts and verify their manifest. Do not return PASS until the run completed and artifacts passed validation.

### Phase 5 — Rhino and Grasshopper
Implement only after verifying vendor licensing, runner OS support, activation/seat policy, required plugins and unattended execution support. Use a separate runner label/environment when required. Pin Rhino build and plugin/definition hashes; test Grasshopper definitions against a known fixture.

### Phase 6 — binary provenance
For each distributable binary, record source revision, release/version, target OS/architecture, SHA-256 and signing/provenance metadata where available. Do not label a downloaded executable as official or trusted solely because its filename looks correct.

## Acceptance criteria

- Existing VUC CI and MCP contracts remain green.
- Each engine has an explicit supported-platform and licensing matrix.
- A clean runner reproduces the same normalized request and geometric invariants.
- Artifact checks are independent of the LLM and do not rely solely on its stdout claims.
- A tampered artifact or proof fails verification.
- CI uploads logs/manifests on both success and failure.
- No Rhino/Grasshopper capability is marked implemented until an actual licensed runner job passes.
