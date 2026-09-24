#!/usr/bin/env node
const base = (process.env.VUC_PUBLIC_URL || '').replace(/\/$/, '');
if (!base) {
  console.error('VUC_PUBLIC_URL is required');
  process.exit(2);
}
const checks = [
  ['/health', 200],
  ['/ready', 200],
  ['/api/openapi.json', 200],
];
let failed = 0;
for (const [path, expected] of checks) {
  const response = await fetch(base + path);
  const body = await response.text();
  const ok = response.status === expected;
  console.log(JSON.stringify({ path, status: response.status, expected, ok }));
  if (!ok) {
    console.error(body.slice(0, 1000));
    failed++;
  }
}
if (failed) process.exit(1);
console.log(JSON.stringify({ gate: 'cloud-run-https-smoke', status: 'PASS', base_url: base }));
