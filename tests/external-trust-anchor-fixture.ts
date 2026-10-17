/**
 * Test-only trust anchor. The test harness pins the runtime identity in an
 * external file before loading proof-producing tests; a proof never supplies
 * or selects its own trust anchor.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CURRENT_IDENTITY } from '../src/vortex/gateway.js';

const trustDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vuc-test-trust-anchor-'));
const trustStore = path.join(trustDir, 'trust-store.json');
fs.writeFileSync(
  trustStore,
  JSON.stringify({ [CURRENT_IDENTITY.key_id]: CURRENT_IDENTITY.public_key }),
  { mode: 0o600 }
);
process.env.VUC_TRUST_STORE = trustStore;
delete process.env.VUC_TRUSTED_PUBLIC_KEY;
process.once('exit', () => fs.rmSync(trustDir, { recursive: true, force: true }));
