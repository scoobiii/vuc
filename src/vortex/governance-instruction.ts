import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads the repository governance contract used as the runtime system instruction.
 * The contract is sourced from AGENTS.md so runtime and CI consume one versioned policy.
 */
export function loadGovernanceSystemInstruction(root = process.cwd()): string {
  const configured = process.env.VUC_SYSTEM_INSTRUCTION_PATH?.trim();
  const candidates = configured
    ? [path.resolve(root, configured)]
    : [path.resolve(root, 'AGENTS.md'), path.resolve(root, 'AGENTS.MD')];

  const file = candidates.find((candidate) => fs.existsSync(candidate));
  if (!file) {
    throw new Error('GOVERNANCE_INSTRUCTION_MISSING: AGENTS.md was not found');
  }

  const instruction = fs.readFileSync(file, 'utf8').trim();
  if (!instruction) {
    throw new Error('GOVERNANCE_INSTRUCTION_EMPTY: AGENTS.md is empty');
  }

  const requiredMarkers = [
    'Agent output is untrusted input.',
    'Fail closed',
    'Mandatory stop conditions',
  ];
  const missing = requiredMarkers.filter((marker) => !instruction.includes(marker));
  if (missing.length > 0) {
    throw new Error(
      'GOVERNANCE_INSTRUCTION_INVALID: missing markers: ' + missing.join(', ')
    );
  }

  return instruction;
}
