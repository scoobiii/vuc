import crypto from 'node:crypto';
import { ColabJupyterKernelClient, type ColabExecutionResult } from './colab-jupyter-kernel.js';

export type ColabAccelerator = 'T4' | 'L4' | 'A100' | string;
export type ColabShape = 'SHAPE_STANDARD' | 'SHAPE_HIGHMEM';

export interface GoogleColabRuntime {
  name: string;
  runtimeSpec: { variant: string; accelerator: string; shape: string };
  connectionInfo?: { token: string; expireTime: string; url: string };
  version?: string;
}

export interface GoogleColabOperation {
  name: string;
  done?: boolean;
  error?: { code?: number; message?: string; [key: string]: unknown };
  response?: GoogleColabRuntime;
}

export interface GoogleColabAdapterOptions {
  accessToken?: string;
  apiBaseUrl?: string;
  requestTimeoutMs?: number;
  pollIntervalMs?: number;
  operationTimeoutMs?: number;
  userAgent?: string;
}

/**
 * Governed adapter for the Google Colab Runtime API.
 * Authentication is token-based: no Google password, browser automation,
 * or credential persistence. The access token must have the Colab scope.
 */
export class GoogleColabAdapter {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly pollIntervalMs: number;
  private readonly operationTimeoutMs: number;
  private readonly userAgent: string;

  constructor(options: GoogleColabAdapterOptions = {}) {
    const accessToken = options.accessToken ?? process.env.GOOGLE_COLAB_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error(
        'Google Colab authentication unavailable: provide GOOGLE_COLAB_ACCESS_TOKEN ' +
        'with the https://www.googleapis.com/auth/colaboratory scope.',
      );
    }
    this.accessToken = accessToken;
    this.baseUrl = (options.apiBaseUrl ?? 'https://colaboratory.googleapis.com/v1beta').replace(/\/$/, '');
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 1_000;
    this.operationTimeoutMs = options.operationTimeoutMs ?? 120_000;
    this.userAgent = options.userAgent ?? '@vortexfoundation/vuc GoogleColabAdapter';
  }

  async preflight(): Promise<{ authenticated: boolean; apiReachable: boolean; gpuSpecs: unknown[] }> {
    const specs = await this.listRuntimeSpecs();
    return { authenticated: true, apiReachable: true, gpuSpecs: specs };
  }

  async listRuntimeSpecs(): Promise<unknown[]> {
    const response = await this.request<{ runtimespecs?: unknown[] }>('/runtimespecs', { method: 'GET' });
    return response.runtimespecs ?? [];
  }

  async createGpuRuntime(options: {
    accelerator?: ColabAccelerator;
    shape?: ColabShape;
    runtimeId?: string;
    version?: string;
    requestId?: string;
  } = {}): Promise<GoogleColabRuntime> {
    const requestId = options.requestId ?? crypto.randomUUID();
    const runtimeId = options.runtimeId ?? `vuc-gpu-${crypto.randomUUID().slice(0, 8)}`;
    this.assertRuntimeId(runtimeId);
    this.assertUuid(requestId, 'requestId');

    const body = {
      runtimeSpec: {
        variant: 'VARIANT_GPU',
        accelerator: options.accelerator ?? 'L4',
        shape: options.shape ?? 'SHAPE_STANDARD',
      },
      ...(options.version ? { version: options.version } : {}),
    };

    const operation = await this.request<GoogleColabOperation>(
      `/runtimes?requestId=${encodeURIComponent(requestId)}&runtimeId=${encodeURIComponent(runtimeId)}`,
      { method: 'POST', body: JSON.stringify(body) },
    );

    const completed = await this.waitForOperation(operation.name);
    if (!completed.response) {
      throw new Error('Google Colab runtime creation completed without a runtime response.');
    }
    return completed.response;
  }

  async getRuntime(runtimeName: string): Promise<GoogleColabRuntime> {
    return this.request<GoogleColabRuntime>(`/${this.normalizeRuntimeName(runtimeName)}`, { method: 'GET' });
  }

  async listRuntimes(): Promise<GoogleColabRuntime[]> {
    const response = await this.request<{ runtimes?: GoogleColabRuntime[] }>('/runtimes', { method: 'GET' });
    return response.runtimes ?? [];
  }

  async deleteRuntime(runtimeName: string): Promise<void> {
    await this.request(`/${this.normalizeRuntimeName(runtimeName)}`, { method: 'DELETE' });
  }

  async executeCode(runtimeName: string, code: string, timeoutMs = 120_000): Promise<ColabExecutionResult> {
    const connection = await this.getConnection(runtimeName);
    return new ColabJupyterKernelClient(connection, timeoutMs).execute(code);
  }

  async executeOnEphemeralGpu(options: {
    accelerator?: ColabAccelerator;
    shape?: ColabShape;
    code: string;
    timeoutMs?: number;
  }): Promise<{ runtime: GoogleColabRuntime; execution: ColabExecutionResult }> {
    const runtime = await this.createGpuRuntime({
      accelerator: options.accelerator,
      shape: options.shape,
    });
    try {
      const execution = await this.executeCode(runtime.name, options.code, options.timeoutMs);
      return { runtime: { ...runtime, connectionInfo: undefined }, execution };
    } finally {
      await this.deleteRuntime(runtime.name).catch(() => undefined);
    }
  }

  async getConnection(runtimeName: string): Promise<NonNullable<GoogleColabRuntime['connectionInfo']>> {
    const runtime = await this.getRuntime(runtimeName);
    if (!runtime.connectionInfo) {
      throw new Error(`Google Colab runtime ${runtime.name} has no connectionInfo yet.`);
    }
    return runtime.connectionInfo;
  }

  private async waitForOperation(operationName: string): Promise<GoogleColabOperation> {
    const deadline = Date.now() + this.operationTimeoutMs;
    let operation = await this.getOperation(operationName);
    while (!operation.done) {
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for Google Colab operation ${operationName}.`);
      }
      await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
      operation = await this.getOperation(operationName);
    }
    if (operation.error) {
      throw new Error(
        `Google Colab operation failed [${operation.error.code ?? 'unknown'}]: ${operation.error.message ?? 'unknown error'}`,
      );
    }
    return operation;
  }

  private async getOperation(operationName: string): Promise<GoogleColabOperation> {
    if (!operationName.startsWith('operations/')) {
      throw new Error(`Invalid Google Colab operation name: ${operationName}`);
    }
    return this.request<GoogleColabOperation>(
      `https://colaboratory.googleapis.com/v1/${operationName}`,
      { method: 'GET' },
    );
  }

  private async request<T = Record<string, unknown>>(pathOrUrl: string, init: RequestInit): Promise<T> {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${this.baseUrl}${pathOrUrl}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': this.userAgent,
          ...(init.headers ?? {}),
        },
      });
      const text = await response.text();
      let payload: unknown = {};
      if (text) {
        try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
      }
      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload !== null && 'error' in payload
            ? JSON.stringify((payload as { error: unknown }).error)
            : text || response.statusText;
        throw new Error(`Google Colab API ${response.status}: ${message}`);
      }
      return payload as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private normalizeRuntimeName(value: string): string {
    return value.startsWith('runtimes/') ? value : `runtimes/${value}`;
  }

  private assertRuntimeId(value: string): void {
    if (!/^[a-z][a-z0-9-]{0,61}[a-z0-9]$/.test(value)) {
      throw new Error(`Invalid Colab runtimeId: ${value}`);
    }
  }

  private assertUuid(value: string, field: string): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new Error(`Invalid ${field}: expected UUID4.`);
    }
  }
}
