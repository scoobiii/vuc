# CI Agent: dependency

## Mission
Own dependency graph, npm lockfile, and reproducible installation failures.

## Owns
- package.json / package-lock.json dependency consistency
- npm ci failures caused by dependency metadata
- missing optional packages in the lockfile
- lockfile rewrites and reproducibility

## Does not own
- native runtime failures after a package is correctly installed
- application/build logic
- release approval

## Contract
Prove: package manifest -> lockfile -> npm ci -> installed package.

## Failure rule
A green x64 install does not prove ARM64 dependency correctness.

## Output
Report the exact package, version, platform, lockfile path, command, observed error, minimal change, and verification.
