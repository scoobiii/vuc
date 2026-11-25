#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createPublicKey, verify } from 'node:crypto';

const file = process.argv[2];
if (!file) {
  console.error('Uso: node integrations/parametrix/verify-vuc-proof.mjs <proof.json>');
  process.exit(2);
}
const document = JSON.parse(readFileSync(file, 'utf8'));
const cert = document.certificate ?? document;
const required = ['hash_input', 'hash_output', 'hash_processo', 'assinatura_ed25519', 'public_key_pem'];
const missing = required.filter((key) => !cert[key]);
if (missing.length) {
  console.error(JSON.stringify({ valid: false, reason: `Campos ausentes: ${missing.join(', ')}` }));
  process.exit(1);
}
try {
  const message = Buffer.from(`${cert.hash_input}:${cert.hash_output}:${cert.hash_processo}`, 'utf8');
  const signature = Buffer.from(cert.assinatura_ed25519, 'base64url');
  const valid = verify(null, message, createPublicKey(cert.public_key_pem), signature);
  const result = { valid, vuc_id: cert.vuc_id ?? null, status: cert.status ?? null, reason: valid ? 'Ed25519 signature verified' : 'Invalid Ed25519 signature' };
  console.log(JSON.stringify(result, null, 2));
  process.exit(valid ? 0 : 1);
} catch (error) {
  console.error(JSON.stringify({ valid: false, reason: String(error) }));
  process.exit(1);
}
