import { GoogleColabAdapter, type ColabAccelerator, type ColabShape } from './google-colab-adapter.js';
import type { IVUAAdapter, VUAAdapterMetadata } from './types.js';

export class VUAGoogleColabAdapter implements IVUAAdapter {
  private readonly options: ConstructorParameters<typeof GoogleColabAdapter>[0];
  private colab?: GoogleColabAdapter;
  public readonly metadata: VUAAdapterMetadata = {
    id: 'colab', name: 'Google Colab Runtime Adapter', environment: 'Google Colab Runtime API', version: '1.0.0', status: 'online',
    description: 'Governed Google Colab GPU runtime lifecycle adapter. No browser automation and no credential persistence.',
    capabilities: ['colab.read', 'colab.execute', 'colab.provision'],
    supportedActions: [
      { action: 'preflight', description: 'Verify authenticated Colab API and enumerate GPU runtime specs', risk: 'read', requiresApproval: false },
      { action: 'list_runtimes', description: 'List Colab runtimes', risk: 'read', requiresApproval: false },
      { action: 'get_connection', description: 'Read runtime connection metadata without returning the short-lived token', risk: 'read', requiresApproval: false },
      { action: 'create_gpu_runtime', description: 'Provision a real Colab GPU runtime', risk: 'write', requiresApproval: true },
      { action: 'delete_runtime', description: 'Delete a Colab runtime', risk: 'destructive', requiresApproval: true },
    ],
  };

  constructor(options: ConstructorParameters<typeof GoogleColabAdapter>[0] = {}) { this.options = options; }

  private get client(): GoogleColabAdapter {
    return (this.colab ??= new GoogleColabAdapter(this.options));
  }

  async executeAction(action: string, target: Record<string, unknown> = {}, payload: Record<string, unknown> = {}) {
    const auditLog = [`colab:${action}:started`];
    switch (action) {
      case 'preflight': { const result = await this.client.preflight(); auditLog.push('colab:preflight:remote_confirmed'); return { data: { ...result, external_effect: 'remote_confirmed' }, auditLog }; }
      case 'list_runtimes': { const runtimes = await this.colab.listRuntimes(); auditLog.push('colab:list_runtimes:remote_confirmed'); return { data: { runtimes, external_effect: 'remote_confirmed' }, auditLog }; }
      case 'get_connection': { const name = this.requireRuntimeName(target, payload); const c = await this.colab.getConnection(name); auditLog.push('colab:get_connection:remote_confirmed'); return { data: { runtime_name: name, url: c.url, expireTime: c.expireTime, token_present: Boolean(c.token), external_effect: 'remote_confirmed' }, auditLog }; }
      case 'create_gpu_runtime': {
        const runtime = await this.colab.createGpuRuntime({ accelerator: (payload.accelerator as ColabAccelerator | undefined) ?? 'L4', shape: (payload.shape as ColabShape | undefined) ?? 'SHAPE_STANDARD', runtimeId: payload.runtimeId as string | undefined, version: payload.version as string | undefined, requestId: payload.requestId as string | undefined });
        auditLog.push(`colab:create_gpu_runtime:remote_confirmed:${runtime.name}`);
        return { data: { runtime, external_effect: 'remote_confirmed', credential_material_returned: false }, auditLog };
      }
      case 'delete_runtime': { const name = this.requireRuntimeName(target, payload); await this.colab.deleteRuntime(name); auditLog.push(`colab:delete_runtime:remote_confirmed:${name}`); return { data: { runtime_name: name, deleted: true, external_effect: 'remote_confirmed' }, auditLog }; }
      default: throw new Error(`ACTION_NOT_SUPPORTED:colab:${action}`);
    }
  }

  async probeStatus() { try { const result = await this.colab.preflight(); return { status: 'online' as const, metrics: { authenticated: 1, gpu_specs: result.gpuSpecs.length } }; } catch { return { status: 'degraded' as const }; } }
  private requireRuntimeName(target: Record<string, unknown>, payload: Record<string, unknown>): string { const value = target.runtime_name ?? target.resource ?? payload.runtime_name ?? payload.resource; if (typeof value !== 'string' || !value) throw new Error('COLAB_RUNTIME_REQUIRED'); return value; }
}