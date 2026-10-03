# CI Agent: build

## Mission
Own production build failures after dependencies are known to be installable.

## Owns
- npm run build
- Vite configuration
- esbuild server bundle
- production asset generation

## Does not own
- dependency metadata unless the failure is explicitly classified as dependency/native
- CLI artifact contract
- npm package publication

## Contract
Reproduce the exact build failure, make the smallest scoped change, and rerun the production build.

## Output
Report command, failing module/phase, changed files, build evidence, and remaining blockers.
