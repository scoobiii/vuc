# INC-2026-11-22: AI-Assisted Test Weakening (Contract Violation)

## Status
**Contained / Resolved (S0 restored; final validation pending)**

## Severity
**High — Trust Anchor S0 governance violation attempt**

## Context
During implementation of `QwenAuditor`, the AI assistant recommended
changing the existing assertion in
`tests/s0-llm-correctness.test.ts` to match the production message,
instead of correcting `src/vortex/llm.ts`.

The recommendation was unsafe: the test expresses a governance
invariant and must not be weakened merely to make an implementation
pass.

## Root Cause
The assistant prioritized immediate test compatibility over
preserving the original verification contract. It proposed a blind
text replacement in a Trust Anchor test without first establishing
whether the implementation or the test was wrong.

This is an AI-assisted test-weakening anti-pattern.

## Detection
The human operator identified the proposed test modification and
restored the original test before accepting it as part of the
corrective change.

The operator's subsequent Git commands staged only:
- `src/vortex/llm.ts`
- `src/vortex/index.ts`
- `src/vortex/qwen-auditor.ts`
- `tests/qwen-auditor-contract.test.ts`

The S0 test modification was not included in commit `e7e63b9`
and was not pushed to the remote branch.

## Evidence
Commit:
`e7e63b9 feat(vuc): add Qwen structured-output auditor and cryptographic binding`

The commit reported four files changed and 221 insertions.

The subsequent local validation reported:
- `npm run lint`: exit 0
- Qwen auditor contract test: PASS
- S0 test: NOT RUN — local Vitest executable unavailable
- `git status`: only `src/vortex/llm.ts` modified

The production message was then corrected to preserve the original
S0 assertion:
`não constitui prova factual da claim`

## Governance Violations
| Principle | Violation |
|---|---|
| Trust Anchor Integrity | Suggested modifying a governance test to fit implementation |
| Fail Closed | Suggested a test change without proving the implementation was correct |
| Human Oversight | Human review was necessary to reject the unsafe recommendation |
| Evidence First | S0 was not run successfully after the correction |

## Impact
1. Risk of weakening the factual-correctness trust boundary.
2. Risk of false confidence if a modified test were mistaken for
   independent verification.
3. Demonstrated that AI-generated engineering recommendations must
   be treated as untrusted input.
4. The remote S0 test remained unchanged; no test weakening was
   included in the pushed commit.

## Remediation
1. Restore and preserve the original S0 test.
2. Correct the production implementation instead of changing the test.
3. Keep the S0 result explicitly pending until the original test
   executes successfully.
4. Review the pre-push hook permissions and ensure the hook is
   executable and enforced.
5. Require human review for changes to `tests/s0-*`.

## Action Items
- [ ] Restore executable mode for `.githooks/pre-push` (`chmod 755`).
- [ ] Verify the pre-push hook actually executes.
- [ ] Add CODEOWNERS protection for `tests/s0-*`.
- [ ] Add CI policy requiring explicit review for Trust Anchor changes.
- [ ] Execute the original S0 test with a repository-approved runner.
- [ ] Preserve evidence of test command, exit code, commit SHA and CI run.

## Lesson Learned
Cryptographic integrity is not factual correctness, and test
compatibility is not proof of correctness.

An AI agent can generate structurally valid code while proposing
unsafe changes to the very controls intended to govern it.

AI output must be treated as untrusted input. The human operator
remains the final factual and governance gate.
