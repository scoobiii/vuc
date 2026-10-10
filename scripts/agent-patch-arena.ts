#!/usr/bin/env tsx
/**
 * Compatibility entry point for older CI callers.
 * The measured Python evaluator is the single source of benchmark verdicts.
 * No simulated metrics, signatures, or promotion side effects are generated here.
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const baseRef = process.env.GITHUB_BASE_REF
  ? `origin/${process.env.GITHUB_BASE_REF}`
  : 'origin/main';
const headRef = 'HEAD';
const outputPath = process.env.VUC_ARENA_OUTPUT || 'arena_output.json';

const child = spawnSync(
  'python3',
  ['scripts/agent-patch-arena.py', '--base', baseRef, '--head', headRef, '--output', outputPath],
  { encoding: 'utf8', stdio: 'inherit', env: process.env },
);

if (child.error) {
  console.error('Arena evaluator could not start:', child.error.message);
  process.exit(1);
}
if (child.status !== 0) {
  process.exit(child.status ?? 1);
}

try {
  const result = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  console.log(`INTENT_AWARE_VERDICT=${result.verdict}`);
  if (result.verdict === 'NEEDS_MANUAL_REVIEW') {
    console.log('MANUAL_REVIEW_REQUIRED=true');
  }
} catch (error) {
  console.error('Arena evidence missing or invalid JSON:', error);
  process.exit(1);
}
