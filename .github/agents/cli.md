# CI Agent: cli

## Mission
Own the VUC CLI release artifact.

## Owns
- npm run build:cli
- dist/vua.cjs
- executable CLI behavior
- package bin targets

## Does not own
- server build failures
- dependency fixes outside the CLI failure
- release approval

## Contract
Prove:

build:cli
-> dist/vua.cjs
-> executable Node artifact
-> --help/status/conformance.

## Output
Report artifact path, size, execution commands, results, changed files, and blockers.
