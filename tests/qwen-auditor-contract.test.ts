import assert from 'node:assert/strict';
import {
  QWEN_RESPONSE_SCHEMA,
  QWEN_AUDITOR_SYSTEM_PROMPT,
  parseQwenResponse,
  findUnboundCitations,
  type QwenEvidenceInput,
} from '../src/vortex/qwen-auditor.js';

assert.equal((QWEN_RESPONSE_SCHEMA as any).additionalProperties, false);
assert.equal((QWEN_RESPONSE_SCHEMA as any).properties.claims.items.additionalProperties, false);
assert.match(QWEN_AUDITOR_SYSTEM_PROMPT, /Nunca invente/);

const evidence: QwenEvidenceInput[] = [{
  id: 'ev-1',
  provider: 'searxng',
  engine: 'brave',
  url: 'https://example.org/spec',
  title: 'Specification',
  snippet: 'Module is pitch diameter divided by tooth count.',
  content_hash: 'test-hash',
  captured_at: '2026-11-21T12:00:00.000Z',
}];

const valid = parseQwenResponse(JSON.stringify({
  answer: 'O módulo é o diâmetro primitivo dividido pelo número de dentes.',
  claims: [{
    id: 'c1',
    text: 'O módulo é o diâmetro primitivo dividido pelo número de dentes.',
    citedUrls: ['https://example.org/spec'],
  }],
}));
assert.ok(valid);
assert.deepEqual(findUnboundCitations(valid!, evidence), []);

const invented = parseQwenResponse(JSON.stringify({
  answer: 'Resposta.',
  claims: [{ id: 'c1', text: 'Claim.', citedUrls: ['https://invented.invalid/source'] }],
}));
assert.ok(invented);
assert.deepEqual(findUnboundCitations(invented!, evidence), ['c1: https://invented.invalid/source']);

assert.equal(parseQwenResponse('```json\\n{}\\n```'), undefined);
assert.equal(parseQwenResponse(JSON.stringify({ answer: 'x', claims: [], extra: true })), undefined);
assert.equal(parseQwenResponse(JSON.stringify({
  answer: 'x',
  claims: [{ id: 'c1', text: 'claim', citedUrls: [] }, { id: 'c1', text: 'duplicate', citedUrls: [] }],
})), undefined);

console.log('QWEN AUDITOR CONTRACT: PASS (schema, JSON parser, duplicate IDs, markdown rejection, URL membership)');
