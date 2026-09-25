import { GoogleColabAdapter } from '../src/vortex/adapters/google-colab-adapter.js';

const secretName = 'GOOGLE_COLAB_ACCESS_TOKEN';
const token = process.env[secretName];

if (!token) {
  console.error(JSON.stringify({
    ok: false,
    check: 'colab_preflight',
    error: 'missing_secret',
    secret_name: secretName,
  }));
  process.exit(2);
}

try {
  const adapter = new GoogleColabAdapter({ accessToken: token });
  const result = await adapter.preflight();

  console.log(JSON.stringify({
    ok: true,
    check: 'colab_preflight',
    authenticated: result.authenticated,
    api_reachable: result.apiReachable,
    gpu_specs_count: result.gpuSpecs.length,
    runtime_created: false,
    credential_material_returned: false,
  }));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const status = message.match(/Google Colab API (\\d{3})/)?.[1];

  let code = 'preflight_failed';
  let exitCode = 1;

  if (status === '401' || status === '403') {
    code = 'authentication_or_scope_rejected';
  } else if (status === '429') {
    code = 'rate_limited';
  } else if (status && /^5\\d{2}$/.test(status)) {
    code = 'colab_api_server_error';
  } else if (message.toLowerCase().includes('abort') || message.toLowerCase().includes('timeout')) {
    code = 'timeout';
  }

  console.error(JSON.stringify({
    ok: false,
    check: 'colab_preflight',
    error: code,
    ...(status ? { http_status: Number(status) } : {}),
    runtime_created: false,
    credential_material_returned: false,
  }));
  process.exit(exitCode);
}
