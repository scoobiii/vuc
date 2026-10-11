import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads the versioned VUC governance contract.
 *
 * An explicit root is authoritative for checkout/preflight callers. Otherwise,
 * prefer the package containing the active CLI entrypoint, then the current
 * working directory. This lets an installed CLI work from any directory
 * without trusting an unrelated AGENTS.md in that directory.
 */
export function loadGovernanceSystemInstruction(root?: string): string {
  const configured = process.env.VUC_SYSTEM_INSTRUCTION_PATH?.trim();

  let effectiveRoot = root;
  if (!effectiveRoot) {
    try {
      // npm global commands may be symlinks (for example /usr/bin/vuc).
      // Resolve the real entrypoint before deriving the installed package root.
      const entry = process.argv[1] ? fs.realpathSync(path.resolve(process.argv[1])) : '';
      const entryParent = entry ? path.dirname(entry) : '';
      const possiblePackageRoot = entryParent ? path.dirname(entryParent) : '';
      const packageJson = possiblePackageRoot
        ? path.join(possiblePackageRoot, 'package.json')
        : '';
      const pkg = packageJson ? JSON.parse(fs.readFileSync(packageJson, 'utf8')) : null;
      effectiveRoot = pkg?.name === '@vucfoundation/vuc'
        ? possiblePackageRoot
        : process.cwd();
    } catch {
      effectiveRoot = process.cwd();
    }
  }

  const candidates = configured
    ? [path.resolve(root ?? process.cwd(), configured)]
    : [path.resolve(effectiveRoot, 'AGENTS.md'), path.resolve(effectiveRoot, 'AGENTS.MD')];

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
