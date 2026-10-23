# VUC Deterministic Runtime — CAD engines

**Owner:** VUC / GoS3  
**Status:** Backlog specification; implementation and merge are gated by required CI evidence  
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

## Backlog and merge policy

Documentation records requirements and dependencies; it is not evidence that a capability is implemented. Each phase below remains backlog until its acceptance criteria are demonstrated by a real CI run. Do not mark a phase delivered based on code presence, workflow creation, mocked output, or a green documentation-only check.

### Required merge gate for CAD runtime changes

A CAD runtime PR is mergeable only when all required existing VUC checks and the following evidence gates pass in GitHub Actions for the exact PR head commit:

1. **Real engine execution:** record the actual engine identity, version/build, platform, process exit status and logs. A mocked engine or fabricated manifest is not acceptable.
2. **Geometric and format validation:** assert fixture invariants with explicit tolerances; reopen or independently re-import STEP; validate PDF signature and page count; validate native project output where supported.
3. **Artifacts and hashes:** upload the outputs, logs and machine-readable manifest; calculate SHA-256 from the actual output bytes and verify the recorded hashes against those bytes.
4. **Verifiable ExecutionProof:** bind the request, runtime identity, execution result and artifact hashes; verify the signature and trusted key independently. Tampering with an artifact, manifest or proof must fail a negative test.
5. **Reproducible CI and regression safety:** a clean GitHub-hosted runner completes the workflow; relevant CAD tests pass; existing VUC CI, MCP contracts, governance and security checks remain green. Preserve evidence for both success and failure.

If any gate is missing, skipped, inconclusive or failing, the PR remains non-mergeable. Do not weaken existing branch protection, mark required checks successful manually, or disable security gates to obtain a green result. A passing smoke test proves only the tested fixture and engine configuration; it does not imply Rhino or Grasshopper is delivered.

### Backlog dependencies

| Item | Depends on | Exit condition |
|---|---|---|
| CAD-01 FreeCAD runner | Versioned environment and fixed fixture | Actual FreeCAD run and all geometry/export checks pass |
| CAD-02 Evidence manifest | CAD-01 | Output hashes and runtime identity independently checked |
| CAD-03 ExecutionProof | CAD-02 and existing VUC trust/proof contracts | Positive and tamper-negative verification tests pass |
| CAD-04 MCP tools | CAD-03 and audit of existing MCP registry | Contract tests pass without regression to existing tools |
| CAD-05 remote GitHub execution | CAD-04 and authenticated dispatch/poll/artifact retrieval | Only completed, verified runs can return PASS |
| CAD-06 Rhino runtime | Vendor support, license and compatible runner validated | Real licensed engine run and output validation pass |
| CAD-07 Grasshopper runtime | CAD-06, compatible plugins and pinned definition | Real definition run with pinned dependencies passes |
| CAD-08 binary provenance | Per-engine distribution and trust policy | Version, platform, digest and provenance evidence verified |

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
