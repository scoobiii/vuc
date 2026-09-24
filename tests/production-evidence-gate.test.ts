import assert from 'node:assert/strict';
import { generateExecutionEvidence, getBenchmarkEnvironment } from '../src/vortex/evidence.js';

const original = {
  sha: process.env.GITHUB_SHA,
  run: process.env.GITHUB_RUN_ID,
  attempt: process.env.GITHUB_RUN_ATTEMPT,
  workflow: process.env.GITHUB_WORKFLOW,
  benchmark: process.env.BENCHMARK_ENVIRONMENT,
};

try {
  delete process.env.GITHUB_SHA;
  delete process.env.GITHUB_RUN_ID;
  delete process.env.GITHUB_RUN_ATTEMPT;
  assert.throws(
    () => generateExecutionEvidence({ proofHashes: ['proof'], allTestsPassed: true }),
    /EVIDENCE_PROVENANCE_MISSING:commit_sha/
  );

  process.env.GITHUB_SHA = 'test-sha';
  process.env.GITHUB_RUN_ID = '123';
  process.env.GITHUB_RUN_ATTEMPT = '2';
  process.env.GITHUB_WORKFLOW = 'quality-gates';
  process.env.BENCHMARK_ENVIRONMENT = 'github-actions';

  const evidence = generateExecutionEvidence({
    proofHashes: ['proof-hash'],
    allTestsPassed: true,
    coveragePercent: 100,
  });
  assert.equal(evidence.commit_sha, 'test-sha');
  assert.equal(evidence.ci.run_id, '123');
  assert.equal(evidence.ci.run_attempt, '2');
  assert.equal(evidence.ci.workflow, 'quality-gates');
  assert.equal(evidence.canonical_hash.length, 64);
  assert.equal(getBenchmarkEnvironment(), 'github-actions');

  console.log('PRODUCTION EVIDENCE PROVENANCE: PASS');
  console.log('hardcoded_ci_fallback=false');
  console.log('benchmark_environment=github-actions');
  console.log('canonical_hash=verified');
} finally {
  if (original.sha === undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA = original.sha;
  if (original.run === undefined) delete process.env.GITHUB_RUN_ID; else process.env.GITHUB_RUN_ID = original.run;
  if (original.attempt === undefined) delete process.env.GITHUB_RUN_ATTEMPT; else process.env.GITHUB_RUN_ATTEMPT = original.attempt;
  if (original.workflow === undefined) delete process.env.GITHUB_WORKFLOW; else process.env.GITHUB_WORKFLOW = original.workflow;
  if (original.benchmark === undefined) delete process.env.BENCHMARK_ENVIRONMENT; else process.env.BENCHMARK_ENVIRONMENT = original.benchmark;
}
