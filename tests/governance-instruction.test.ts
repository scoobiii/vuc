import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadGovernanceSystemInstruction } from '../src/vortex/governance-instruction.js';

const repositoryRoot = process.cwd();
const originalCwd = process.cwd();
const originalOverride = process.env.VUC_SYSTEM_INSTRUCTION_PATH;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vuc-governance-contract-'));

try {
  // The active package/checkout policy must resolve even when launched elsewhere.
  process.chdir(temp);
  delete process.env.VUC_SYSTEM_INSTRUCTION_PATH;
  const instruction = loadGovernanceSystemInstruction();
  assert.match(instruction, /Agent output is untrusted input\./);
  assert.match(instruction, /Fail closed/);
  assert.match(instruction, /Mandatory stop conditions/);

  // An explicit override is authoritative and invalid overrides fail closed.
  const validOverride = path.join(temp, 'custom-policy.md');
  fs.writeFileSync(validOverride, instruction);
  process.env.VUC_SYSTEM_INSTRUCTION_PATH = validOverride;
  assert.equal(loadGovernanceSystemInstruction(), instruction);

  process.env.VUC_SYSTEM_INSTRUCTION_PATH = path.join(temp, 'missing-policy.md');
  assert.throws(
    () => loadGovernanceSystemInstruction(),
    /GOVERNANCE_INSTRUCTION_MISSING/
  );

  // Verify the actual npm package manifest includes the policy file.
  process.env.VUC_SYSTEM_INSTRUCTION_PATH = '';
  const packed = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(packed.status, 0, `npm pack --dry-run failed:\n${packed.stderr}\n${packed.stdout}`);
  const report = JSON.parse(packed.stdout);
  assert.ok(
    report[0]?.files?.some((file: { path: string }) => file.path === 'AGENTS.md'),
    'npm pack dry-run omitted AGENTS.md from the package'
  );

  console.log('GOVERNANCE INSTRUCTION RESOLUTION: PASS');
  console.log('PACKAGE TARBALL INCLUDES AGENTS.md: PASS');
} finally {
  process.chdir(originalCwd);
  if (originalOverride === undefined) delete process.env.VUC_SYSTEM_INSTRUCTION_PATH;
  else process.env.VUC_SYSTEM_INSTRUCTION_PATH = originalOverride;
  fs.rmSync(temp, { recursive: true, force: true });
}
