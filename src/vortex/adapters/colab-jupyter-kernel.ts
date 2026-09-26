import crypto from 'node:crypto';

export interface ColabConnectionInfo {
  token: string;
  expireTime: string;
  url: string;
}

export interface ColabExecutionResult {
  status: 'ok' | 'error';
  stdout: string;
  stderr: string;
  result?: unknown;
  error?: { name?: string; value?: string; traceback?: string[] };
  executionMs: number;
}

type KernelMessage = {
  msg_type?: string;
  parent_header?: { msg_id?: string };
  content?: Record<string, unknown>;
  channel?: string;
};

export class ColabJupyterKernelClient {
  constructor(
    private readonly connection: ColabConnectionInfo,
    private readonly timeoutMs = 120_000,
  ) {}

  async execute(code: string): Promise<ColabExecutionResult> {
    if (!code.trim()) throw new Error('Colab execution code must not be empty.');
    const base = this.connection.url.replace(/\/$/, '');
    const headers = {
      Authorization: `token ${this.connection.token}`,
      'X-Colab-Runtime-Proxy-Token': this.connection.token,
    };
    const start = Date.now();

    const kernelsResponse = await fetch(`${base}/api/kernels`, { headers });
    if (!kernelsResponse.ok) throw new Error(`Colab kernels GET failed: ${kernelsResponse.status}`);
    const kernels = await kernelsResponse.json() as Array<{ id: string }>;
    let kernelId = kernels[0]?.id;

    if (!kernelId) {
      const create = await fetch(`${base}/api/kernels`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'python3' }),
      });
      if (!create.ok) throw new Error(`Colab kernel creation failed: ${create.status}`);
      const created = await create.json() as { id: string };
      kernelId = created.id;
    }

    const sessionId = crypto.randomUUID();
    const wsUrl = this.websocketUrl(base, kernelId, sessionId);
    return new Promise<ColabExecutionResult>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const stdout: string[] = [];
      const stderr: string[] = [];
      let executeReply = false;
      let idle = false;
      let settled = false;

      const finish = (value: ColabExecutionResult) => {
        if (settled) return;
        settled = true;
        try { ws.close(); } catch {}
        resolve(value);
      };
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        try { ws.close(); } catch {}
        reject(error);
      };
      const timer = setTimeout(() => fail(new Error('Colab Jupyter execution timed out.')), this.timeoutMs);

      ws.onopen = () => {
        const msgId = crypto.randomUUID();
        ws.send(JSON.stringify({
          header: {
            msg_id: msgId,
            username: 'vuc',
            session: sessionId,
            msg_type: 'execute_request',
            version: '5.3',
          },
          parent_header: {},
          metadata: {},
          content: { code, silent: false, store_history: false, allow_stdin: false },
          channel: 'shell',
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data)) as KernelMessage;
          if (message.parent_header?.msg_id === undefined) return;
          const content = message.content ?? {};
          switch (message.msg_type) {
            case 'stream': {
              const name = content.name === 'stderr' ? stderr : stdout;
              name.push(String(content.text ?? ''));
              break;
            }
            case 'execute_result':
            case 'display_data':
              if (message.msg_type === 'execute_result') stdout.push(String((content.data as Record<string, unknown> | undefined)?.['text/plain'] ?? ''));
              break;
            case 'error':
              stderr.push(String(content.evalue ?? ''));
              break;
            case 'execute_reply':
              executeReply = true;
              if (content.status === 'error') stderr.push(String(content.evalue ?? 'remote execution error'));
              break;
            case 'status':
              idle = content.execution_state === 'idle';
              break;
          }
          if (executeReply && idle) {
            clearTimeout(timer);
            const hasError = stderr.length > 0 && /error|exception|traceback/i.test(stderr.join('\\n'));
            finish({
              status: hasError ? 'error' : 'ok',
              stdout: stdout.join(''),
              stderr: stderr.join(''),
              executionMs: Date.now() - start,
            });
          }
        } catch (error) {
          clearTimeout(timer);
          fail(error instanceof Error ? error : new Error(String(error)));
        }
      };

      ws.onerror = () => {
        clearTimeout(timer);
        fail(new Error('Colab Jupyter websocket error.'));
      };
      ws.onclose = () => {
        clearTimeout(timer);
        if (!settled) fail(new Error('Colab Jupyter websocket closed before idle.'));
      };
    });
  }

  private websocketUrl(base: string, kernelId: string, sessionId: string): string {
    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = `${url.pathname.replace(/\/$/, '')}/api/kernels/${encodeURIComponent(kernelId)}/channels`;
    url.searchParams.set('session_id', sessionId);
    url.searchParams.set('token', this.connection.token);
    return url.toString();
  }
}
