/**
 * VUC - Git Universal Adapter
 * Governed native Git connector.
 *
 * The connector exposes the installed Git command set (porcelain + plumbing)
 * through direct argv execution. No shell command strings are accepted.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { IVUAAdapter, VUAAdapterMetadata, VUAAdapterStatus } from './types.js';

const execFileAsync = promisify(execFile);

const READ_COMMANDS = new Set([
  'status','log','show','diff','shortlog','rev-parse','rev-list','cat-file',
  'ls-files','ls-tree','for-each-ref','name-rev','describe','merge-base',
  'cherry','range-diff','blame','annotate','grep','check-ignore','check-attr',
  'check-mailmap','check-ref-format','count-objects','verify-pack','fsck',
  'verify-commit','verify-tag','whatchanged','reflog','remote','branch','tag',
  'worktree','submodule','config','var','version','help','archive','bundle',
  'symbolic-ref','show-ref','ls-remote','hash-object','mktree','read-tree',
  'unpack-file','unpack-objects','index-pack','verify-index','commit-graph',
  'multi-pack-index'
]);

const WRITE_COMMANDS = new Set([
  'init','add','am','apply','commit','branch','checkout','switch','restore',
  'merge','cherry-pick','revert','reset','stash','tag','remote','fetch','pull',
  'push','rebase','notes','worktree','submodule','update-index','update-ref',
  'commit-tree','write-tree','mktag','fast-import','fast-export','filter-branch',
  'replace','reflog','pack-refs','repack','gc','prune','prune-packed',
  'maintenance','clean','sparse-checkout','bisect','bundle'
]);

const DESTRUCTIVE_COMMANDS = new Set([
  'reset','clean','rebase','filter-branch','replace','update-ref','checkout',
  'switch','restore','merge','cherry-pick','revert','push','receive-pack',
  'send-pack','fast-import','gc','prune','prune-packed'
]);

function commandRisk(command: string): 'read' | 'write' | 'destructive' {
  if (DESTRUCTIVE_COMMANDS.has(command)) return 'destructive';
  if (WRITE_COMMANDS.has(command)) return 'write';
  if (READ_COMMANDS.has(command)) return 'read';
  return 'write';
}

function validateCommand(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9-]*$/.test(value)) {
    throw new Error('INVALID_GIT_COMMAND: command must be a Git subcommand without shell syntax');
  }
  return value;
}

function validateArgs(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every(function (x) { return typeof x === 'string'; })) {
    throw new Error('INVALID_GIT_ARGS: args must be an array of strings; shell strings are forbidden');
  }
  return value as string[];
}

async function listGitCommands(): Promise<Set<string>> {
  const result = await execFileAsync(
    'git',
    ['--no-pager', '--list-cmds=main,others,nohelpers'],
    {
      timeout: 5000,
      maxBuffer: 512 * 1024,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1' }
    }
  );
  return new Set(
    String(result.stdout).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean)
  );
}

async function runGit(command: string, args: string[], cwd: string) {
  try {
    const result = await execFileAsync(
      'git',
      ['--no-pager', command].concat(args),
      {
        cwd,
        timeout: 120000,
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_PAGER: 'cat',
          GIT_CONFIG_NOSYSTEM: '1'
        }
      }
    );
    return {
      stdout: String(result.stdout || ''),
      stderr: String(result.stderr || ''),
      exitCode: 0
    };
  } catch (error: any) {
    return {
      stdout: String(error.stdout || ''),
      stderr: String(error.stderr || error.message || ''),
      exitCode: typeof error.code === 'number' ? error.code : 1
    };
  }
}

export class VUAGitAdapter implements IVUAAdapter {
  public metadata: VUAAdapterMetadata = {
    id: 'git',
    name: 'Git Universal Adapter',
    environment: 'POSIX Linux',
    version: '1.0.0',
    status: 'ready',
    description: 'Governed native Git connector exposing the installed Git command set through direct argv execution.',
    capabilities: [
      'git.read','git.write','git.destructive','git.command',
      'vua.adapter.read','vua.adapter.execute'
    ],
    supportedActions: [
      { action: 'version', description: 'Return installed Git version.', risk: 'read', requiresApproval: false },
      { action: 'read', description: 'Execute a read-only Git command.', risk: 'read', requiresApproval: false },
      { action: 'write', description: 'Execute a mutating Git command.', risk: 'write', requiresApproval: true },
      { action: 'destructive', description: 'Execute a destructive Git command.', risk: 'destructive', requiresApproval: true },
      { action: 'commands', description: 'List commands available in the installed Git binary.', risk: 'read', requiresApproval: false }
    ],
    systemMetrics: {
      execution: 'native git / execFile / no shell',
      command_model: 'porcelain + plumbing + installed builtins',
      prompt_mode: 'disabled',
      proof: 'VUC ExecutionProof v1'
    }
  };

  public async probeStatus(): Promise<{ status: VUAAdapterStatus; metrics?: Record<string, string | number> }> {
    const result = await runGit('version', [], process.cwd());
    return {
      status: result.exitCode === 0 ? 'online' : 'degraded',
      metrics: {
        git_version: result.stdout.trim() || 'unknown',
        native_exec: 'true',
        shell: 'false'
      }
    };
  }

  public async executeAction(
    action: string,
    target: Record<string, unknown> = {},
    payload: Record<string, unknown> = {}
  ): Promise<{ data: Record<string, unknown>; auditLog: string[] }> {
    const auditLog: string[] = ['[GIT-VUA] action=' + action];

    if (action === 'commands') {
      const commands = await listGitCommands();
      return {
        data: {
          success: true,
          authenticated: true,
          external_effect: 'local_only',
          execution_kind: 'capability',
          provider: 'git',
          command_count: commands.size,
          commands: Array.from(commands).sort()
        },
        auditLog
      };
    }

    const command = action === 'version'
      ? 'version'
      : validateCommand(payload.command || target.command);
    const args = action === 'version'
      ? []
      : validateArgs(payload.args || target.args || []);
    const cwd = String(payload.cwd || target.cwd || process.cwd());

    const risk = commandRisk(command);

    if (action === 'read' && risk !== 'read') {
      throw new Error('GIT_CAPABILITY_MISMATCH: ' + command + ' is classified as ' + risk);
    }
    if (action === 'write' && risk === 'read') {
      throw new Error('GIT_CAPABILITY_MISMATCH: ' + command + ' is read-only');
    }
    if (action === 'destructive' && risk !== 'destructive') {
      throw new Error('GIT_CAPABILITY_MISMATCH: ' + command + ' is not destructive');
    }

    const available = await listGitCommands();
    if (!available.has(command) && command !== 'version') {
      throw new Error('GIT_COMMAND_UNAVAILABLE: ' + command + ' is not provided by the installed Git binary');
    }

    auditLog.push('[GIT-VUA] executing git ' + command + ' (' + risk + ') in ' + cwd);
    const result = await runGit(command, args, cwd);
    const success = result.exitCode === 0;
    auditLog.push(
      success
        ? '[GIT-VUA] success: git ' + command
        : '[GIT-VUA] failed: git ' + command + ' exit=' + result.exitCode
    );

    return {
      data: {
        success,
        authenticated: true,
        external_effect: risk === 'read' ? 'local_only' : 'remote_possible',
        execution_kind: 'capability',
        provider: 'git',
        command,
        args,
        cwd,
        risk,
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      },
      auditLog
    };
  }
}
