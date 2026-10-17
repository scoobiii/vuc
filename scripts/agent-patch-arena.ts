#!/usr/bin/env tsx
/**
 * Agent Patch Arena compatibility entry point.
 *
 * CI uses the measured Python evaluator with exact base/head refs. The
 * application endpoint cannot claim a benchmark verdict without those refs,
 * so the exported runtime function fails closed instead of returning simulated
 * throughput or latency metrics.
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

export async function runAgentPatchArena(_candidates?: unknown[]): Promise<Record<string, unknown>> {
  return {
    schema: 'vortex.patch-arena.runtime.v1',
    status: 'NOT_EXECUTED',
    verdict: 'NOT_EXECUTED',
    universal_subjection_rule_enforced: true,
    total_candidates: 0,
    superior_candidates: 0,
    leaderboard: [],
    winning_patch: null,
    evidence_hash: null,
    recommended_action: 'BLOCKED: runtime benchmark requires exact base/head revisions and must run in governed CI.',
    reason: 'No exact base/head revision pair was supplied; simulated metrics are forbidden.',
  };
}

function runMeasuredArena(): void {
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
    process.exitCode = 1;
    return;
  }
  if (child.status !== 0) {
    process.exitCode = child.status ?? 1;
    return;
  }

  try {
    const result = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    console.log(`INTENT_AWARE_VERDICT=${result.verdict}`);
    if (result.verdict === 'NEEDS_MANUAL_REVIEW') {
      console.log('MANUAL_REVIEW_REQUIRED=true');
    }
  } catch (error) {
    console.error('Arena evidence missing or invalid JSON:', error);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('agent-patch-arena.ts')) {
  runMeasuredArena();
}
