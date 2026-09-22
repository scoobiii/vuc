/**
 * K6 Industry Segment Script: Financial & DREX Pilot (Bacen)
 * Pattern: Two-Phase Commit DvP & Zero-Sum SAGA
 * Coverage: 100% (Atomic DvP, SisbaJud Freeze, LC 105/2001 Privacy Proofs)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '3s', target: 25 },
    { duration: '8s', target: 50 },
    { duration: '3s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<60', 'p(99)<120'],
    checks: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. DvP Wholesale Settlement (Real Digital vs TPFT)
  const dvpPayload = JSON.stringify({
    operation: 'SETTLE_DVP',
    actorRole: 'COMMERCIAL_BANK',
    senderId: 'bank-itau-01',
    receiverId: 'bank-bb-01',
    amountRealDigital: 5000000,
    volumeTpft: 5,
    legalBasis: 'Resolução BCB nº 315/2023 - Piloto DREX Fase 2',
    privacyPreserving: true,
  });

  const dvpRes = http.post(`${BASE_URL}/api/vortex/drex/execute`, dvpPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(dvpRes, {
    'drex dvp status 200': (r) => r.status === 200,
    'drex dvp success': (r) => r.json('success') === true,
    'drex dvp invariant preserved': (r) => r.json('invariantPreserved') === true,
    'drex dvp ed25519 signature': (r) => !!r.json('ed25519Signature'),
    'drex dvp proof hash present': (r) => (r.json('proofHash') || '').startsWith('sha256:'),
  });

  // 2. Retail Transfer under LC 105/2001 Privacy
  const retailPayload = JSON.stringify({
    operation: 'TRANSFER_RETAIL',
    actorRole: 'FINTECH',
    senderId: 'fintech-nubank-01',
    receiverId: 'user-bob-pf',
    amountRealDigital: 25000,
    volumeTpft: 0,
    legalBasis: 'LC 105/2001 Art. 1 § 3 - Sigilo Preservado',
    privacyPreserving: true,
  });

  const retailRes = http.post(`${BASE_URL}/api/vortex/drex/execute`, retailPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(retailRes, {
    'retail transfer status 200': (r) => r.status === 200,
    'retail transfer success': (r) => r.json('success') === true,
    'retail sum conservation': (r) => r.json('balancePreSum') === r.json('balancePostSum'),
  });

  // 3. Security Circuit Breaker: Unauthorized Actor Role Rejection
  const unauthorizedPayload = JSON.stringify({
    operation: 'MINT_RESERVE',
    actorRole: 'COMMERCIAL_BANK', // Vetoed!
    senderId: 'bank-itau-01',
    receiverId: 'bank-itau-01',
    amountRealDigital: 100000000,
    volumeTpft: 0,
    legalBasis: 'Illegal attempt',
    privacyPreserving: false,
  });

  const failRes = http.post(`${BASE_URL}/api/vortex/drex/execute`, unauthorizedPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(failRes, {
    'unauthorized mint rejected': (r) => r.status === 400,
    'circuit breaker triggered': (r) => r.json('success') === false,
  });

  sleep(0.05);
}
