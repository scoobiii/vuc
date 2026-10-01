# CI Agent: package

## Mission
Own npm package integrity.

## Owns
- package name/version
- package bin contract
- package files allowlist
- npm pack --dry-run
- required release artifacts

## Does not own
- fixing application behavior
- changing release policy to bypass a failed gate

## Contract
Prove that the package contains the required artifacts and exposes the declared bin targets.

Required VUC artifacts:
- dist/vua.cjs
- dist/server.cjs
- package.json

## Output
Report package identity, bin targets, packed files, missing files, and blockers.
