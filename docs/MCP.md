# VUC MCP Integration

This document is the canonical entry point for Model Context Protocol integration. It describes the implementation paths visible in this repository and deliberately distinguishes them from transports or deployment modes that need separate verification.

## Local stdio

The repository provides a local MCP server entry point:

```bash
vuc mcp
```

In a source checkout, `npm run vua -- mcp` is documented by [Onboarding](./ONBOARDING.md). The dedicated `bin/mcp-server.js` entry point also implements JSON-RPC 2.0 over stdio. Use the entry point appropriate to the installed package/version.

Example host configuration (adjust the absolute path for your checkout):

```json
{
  "mcpServers": {
    "vuc-local": {
      "command": "node",
      "args": ["/absolute/path/to/vuc/bin/mcp-server.js"]
    }
  }
}
```

The exact host configuration schema can vary. Check the host's current documentation and ensure Node.js and the repository dependencies are available to that process. Do not place API keys or private keys directly in a shared configuration file.

## Protocol methods

For an MCP server implementing the standard tools/list and tools/call contract, the host discovers tools and invokes a named tool using MCP JSON-RPC messages. The exact negotiated protocol version, initialization handshake, capabilities, and supported transport are implementation-dependent; inspect the running server and its tests rather than assuming every MCP feature is enabled.

The source includes tool contracts in `src/vortex/mcp-server.ts` such as:

- `vortex.inspect`
- `vortex.propose`
- `vortex.verify`
- `vortex.execute`
- `vortex.branch.write`

The separate `bin/mcp-server.js` entry point defines a tool set that includes `llm.query` and other LLM-oriented operations. These entry points are not interchangeable contracts; confirm the actual tools exposed by the selected server.

## Example discovery and invocation shape

At protocol level, clients use `tools/list` to discover available tools and `tools/call` to invoke one. A schematic JSON-RPC message is:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "vortex.inspect",
    "arguments": {
      "request_id": "unique-request-id",
      "input": {}
    }
  }
}
```

This is an illustrative protocol shape, not a guaranteed valid request for every tool: the required arguments are defined by the server's current input schema.

## HTTP, SSE and remote hosts

Do not assume that the stdio server also exposes HTTP, legacy SSE, or Streamable HTTP. The repository contains HTTP application code and an OAuth/tenant security specification, but each remote deployment must identify its actual route, transport, authentication middleware, and tests. See [OAuth 2.1 tenant security gate](./OAUTH21-TENANT-SECURITY-GATE.md).

## OAuth, PKCE, scopes and tenant binding

The detailed OAuth gate document describes authorization-code flow with PKCE S256, tenant binding, resource binding, and scopes including `mcp`, `mcp:read`, and `mcp:write`. Treat it as the detailed specification for that gate—not proof that a production identity provider, public tenant provisioning, or every remote MCP endpoint is deployed.

Before exposing a remote MCP service, verify at minimum:

- authentication and token validation;
- PKCE S256 for authorization-code flows;
- resource, tenant, principal, and scope binding;
- rejection of missing or mismatched authorization context;
- secrets handling and rate limiting;
- provider-side effect evidence where a tool mutates remote state.

## Governance and evidence

```text
MCP host → tool discovery → tool call → policy/authorization
         → connector/operation → actual result → proof/evidence
```

Tool discovery is not authorization. A successful `tools/call` response is not automatically proof of a remote side effect. See [Security](./SECURITY.md), [Connectors](./CONNECTORS.md), and [Evidence](./EVIDENCE.md).
