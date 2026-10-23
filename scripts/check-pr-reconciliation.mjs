#!/usr/bin/env node
/**
 * VUC PR replacement reconciliation gate.
 * A green test suite is not evidence that a replacement PR contains the source PR's changes.
 * Every source file must have a disposition and a traceable evidence reference.
 */
import fs from 'node:fs';

const file = 'docs/reconciliation/pr-76-to-pr-91.json';
const allowed = new Set(['PORTED', 'PRESENT_IN_BASE', 'DROPPED_WITH_RATIONALE']);
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
if (manifest.schema_version !== 1 || manifest.source_pr !== 76 || manifest.target_pr !== 91) {
  throw new Error('RECONCILIATION_INVALID: unexpected schema/source/target');
}
if (!Array.isArray(manifest.files) || manifest.files.length !== 24) {
  throw new Error('RECONCILIATION_INVALID: expected inventory of all 24 files from PR #76');
}
const paths = manifest.files.map(x => x.path);
if (new Set(paths).size !== paths.length) {
  throw new Error('RECONCILIATION_INVALID: duplicate source file path');
}
const errors = [];
for (const item of manifest.files) {
  if (!allowed.has(item.status)) {
    errors.push(`${item.path}: unresolved status ${JSON.stringify(item.status)}`);
    continue;
  }
  if (typeof item.evidence !== 'string' || item.evidence.trim().length < 12) {
    errors.push(`${item.path}: evidence must identify a test, commit, or technical rationale`);
  }
  if (item.status === 'DROPPED_WITH_RATIONALE' && !/reason|rationale|discard|not needed|rejected/i.test(item.evidence)) {
    errors.push(`${item.path}: discarded change requires explicit rationale in evidence`);
  }
}
if (errors.length) {
  console.error('PR_RECONCILIATION_GATE=FAIL');
  for (const error of errors) console.error('UNRESOLVED ' + error);
  console.error(`Resolved ${manifest.files.filter(x => allowed.has(x.status) && x.evidence?.trim().length >= 12).length}/${manifest.files.length}`);
  process.exit(1);
}
console.log('PR_RECONCILIATION_GATE=PASS');
console.log(`Source PR #${manifest.source_pr} accounted for: ${manifest.files.length} files`);
