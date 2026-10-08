import assert from 'node:assert/strict';
import { classifyLLMClaimVerification } from '../src/vortex/llm.js';

console.log('S0 LLM correctness gate regression');

const cryptographicProof = {
  valid: true,
  status: 'VERIFIED' as const,
};

const unverified = classifyLLMClaimVerification(cryptographicProof);
assert.equal(unverified.status, 'UNVERIFIED');
assert.equal(unverified.cryptographic_proof_valid, true);
assert.equal(unverified.factual_correctness_verified, false);
assert.match(unverified.reason, /não constitui prova factual/i);

const noProof = classifyLLMClaimVerification(undefined);
assert.equal(noProof.status, 'UNVERIFIED');
assert.equal(noProof.cryptographic_proof_valid, false);
assert.equal(noProof.factual_correctness_verified, false);

console.log('PASS: ExecutionProof válido não pode ser promovido a prova factual sem correctness gate independente.');
