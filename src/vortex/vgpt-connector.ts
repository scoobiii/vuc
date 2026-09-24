/**
 * VGPT Connector Profile
 *
 * Product-facing MCP profile for GPT/ChatGPT-compatible hosts.
 * This module does not claim a live OpenAI connection.
 */
export interface VGPTConnectorProfile {
  id: 'vgpt';
  name: 'Vortex GPT Connector';
  protocol: 'MCP';
  transport: 'streamable-http';
  server_url: string;
  oauth: {
    required: true;
    protected_resource_metadata: string;
    authorization_server_metadata: string;
    scopes: string[];
    pkce: 'S256';
  };
  governance: {
    tenant_binding: true;
    capability_policy: true;
    sandbox: true;
    execution_proof: {
      required: true;
      algorithm: 'Ed25519';
      canonicalization: 'RFC8785';
      verification: 'independent';
    };
  };
  tools: string[];
  live_connection_verified: false;
}
export function createVGPTConnectorProfile(serverUrl: string): VGPTConnectorProfile {
  const normalized=serverUrl.replace(/\/$/,'');
  return {
    id:'vgpt', name:'Vortex GPT Connector', protocol:'MCP', transport:'streamable-http', server_url:normalized,
    oauth:{required:true,protected_resource_metadata:normalized+'/.well-known/oauth-protected-resource',authorization_server_metadata:normalized+'/.well-known/oauth-authorization-server',scopes:['mcp:read','mcp:write'],pkce:'S256'},
    governance:{tenant_binding:true,capability_policy:true,sandbox:true,execution_proof:{required:true,algorithm:'Ed25519',canonicalization:'RFC8785',verification:'independent'}},
    tools:['vua.adapters.list','vua.adapter.invoke','vortex.inspect','vortex.propose','vortex.verify','vortex.execute','vortex.branch.write'],
    live_connection_verified:false
  };
}
