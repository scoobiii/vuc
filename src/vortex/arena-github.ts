/**
 * VUC Universal Arena — real GitHub observation layer.
 *
 * Read-only by design:
 * GitHub -> live observation -> governed execution proof -> independent verification.
 * No fixture, synthetic CI result, PR result, SHA, or "PASS" is accepted here.
 */

import { executeVortexPipeline } from './gateway.js';
import { verifyExecutionProof } from './verifier.js';
import type { VortexRequest } from './types.js';

type GitHubRequestOptions = {
  owner: string;
  repo: string;
  token?: string;
};

function parseRepository(value: string): { owner: string; repo: string } {
  const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(value.trim());
  if (!match) throw new Error('INVALID_REPOSITORY: expected owner/repo');
  return { owner: match[1], repo: match[2] };
}

async function githubGet<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'VUC-Universal-Arena/1.0',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`https://api.github.com${path}`, {
    headers,
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.text();

  if (!response.ok) {
    const code =
      response.status === 404 ? 'GITHUB_NOT_FOUND' :
      response.status === 401 ? 'GITHUB_CREDENTIAL_INVALID' :
      response.status === 403 ? 'GITHUB_RATE_LIMITED' :
      'GITHUB_API_ERROR';
    throw new Error(`${code}: HTTP ${response.status} ${body.slice(0, 240)}`);
  }

  return JSON.parse(body) as T;
}

export async function inspectArenaTarget(repository: string, prNumber?: number) {
  const parsed = parseRepository(repository);
  const token = process.env.GITHUB_TOKEN;

  const repo = await githubGet<any>(
    `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
    token,
  );

  const defaultBranch = repo.default_branch;
  const branch = await githubGet<any>(
    `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/branches/${encodeURIComponent(defaultBranch)}`,
    token,
  );

  const sha = branch.commit?.sha;
  if (!sha) throw new Error('GITHUB_INVALID_STATE: default branch has no commit SHA');

  const checks = await githubGet<any>(
    `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/commits/${encodeURIComponent(sha)}/check-runs?per_page=100`,
    token,
  );

  let pullRequest: any = null;
  if (prNumber !== undefined) {
    pullRequest = await githubGet<any>(
      `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/pulls/${prNumber}`,
      token,
    );
  }

  const observedAt = new Date().toISOString();
  const checkRuns = Array.isArray(checks.check_runs)
    ? checks.check_runs.map((run: any) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        started_at: run.started_at,
        completed_at: run.completed_at,
        html_url: run.html_url,
      }))
    : [];

  const successCount = checkRuns.filter((r: any) => r.conclusion === 'success').length;
  const failureCount = checkRuns.filter((r: any) =>
    ['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure'].includes(r.conclusion),
  ).length;

  const observation = {
    source: 'GitHub API',
    repository: repo.full_name,
    repository_id: repo.id,
    visibility: repo.visibility,
    default_branch: defaultBranch,
    ref: `refs/heads/${defaultBranch}`,
    sha,
    observed_at: observedAt,
    github_authenticated: Boolean(token),
    checks: {
      total: checkRuns.length,
      success: successCount,
      failure: failureCount,
      runs: checkRuns,
    },
    pull_request: pullRequest
      ? {
          number: pullRequest.number,
          state: pullRequest.state,
          draft: pullRequest.draft,
          mergeable: pullRequest.mergeable,
          mergeable_state: pullRequest.mergeable_state,
          head_sha: pullRequest.head?.sha,
          base_sha: pullRequest.base?.sha,
          html_url: pullRequest.html_url,
        }
      : null,
  };

  const request: VortexRequest = {
    request_id: `arena-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    operation: 'inspect',
    target: {
      resource: `github://${repo.full_name}`,
      adapter: 'github',
      action: 'arena.inspect',
      repository: repo.full_name,
      ref: observation.ref,
      sha,
    },
    authorization: {
      principal_id: 'vuc-arena-player',
      agent_id: 'agent/vuc-universal-arena',
      policy_id: 'vuc-arena-read-only',
      policy_version: '1.0.0',
      capability: 'github.repository.read',
      scope: {
        repositories: [repo.full_name],
        resources: [`github://${repo.full_name}`],
      },
    },
    input: {
      repository: repo.full_name,
      ref: observation.ref,
      sha,
      pr_number: prNumber ?? null,
    },
  };

  const execution = await executeVortexPipeline(request, async () => observation);
  const proof = execution.execution_proof;
  const verification = proof ? verifyExecutionProof(proof) : null;

  if (!proof || !verification?.valid) {
    throw new Error(
      `ARENA_PROOF_REJECTED: ${verification?.reasons?.join('; ') || 'execution proof missing'}`,
    );
  }

  return {
    status: 'VERIFIED',
    observation,
    execution_proof: proof,
    verification,
    provenance: {
      source: 'GitHub API',
      repository: repo.full_name,
      ref: observation.ref,
      sha,
      observed_at: observedAt,
      placeholder_state: false,
      stale: false,
    },
  };
}

export { parseRepository };
