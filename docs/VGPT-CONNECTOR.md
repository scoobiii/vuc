# Vortex GPT Connector (VGPT)

**Owner:** VUC / Vortex Foundation  
**Responsibility:** GPT/ChatGPT-compatible MCP entry point into governed execution  
**Version:** 1.0  
**Status:** implementation profile  
**Signature:** GoS3

## Purpose
VGPT is the product-facing name for the VUC MCP entry point used by GPT/ChatGPT-compatible hosts.

It is **not** a second execution engine and does not replace VUC.

\`GPT / AI host → VGPT (MCP) → VUC Gateway → policy / capability / tenant / sandbox → connector → real effect → ExecutionProof → Vortex Verify\`

The same VUC runtime remains usable by other MCP hosts.

## Machine-readable profile
Use \`createVGPTConnectorProfile("https://your-vuc.example")\`.

It declares MCP transport, OAuth authorization-code + PKCE S256, tenant binding, capability/policy enforcement, sandbox enforcement, mandatory Ed25519 + RFC 8785 ExecutionProof, independent verification, and governed VUC tools.

## What this closes
VGPT packages the existing tested MCP → VUC → real GitHub cloud read → ExecutionProof → independent verification contract as a named GPT-facing product entry point.

## What this does not claim
\`live_connection_verified=false\` is deliberate. A repository test is not evidence that ChatGPT is currently connected to a deployed VUC endpoint.

Live validation requires an HTTPS endpoint, OAuth client configuration, an MCP host connection, a real tool invocation, and captured/independently verified ExecutionProof.

No deployment is performed by this change.

## Acceptance
Run \`npm run test:vgpt-connector\`.

Expected markers: \`VGPT CONNECTOR PROFILE: PASS\`, \`protocol=MCP\`, \`oauth=PKCE_S256\`, \`tenant_binding=true\`, \`execution_proof=Ed25519+RFC8785\`, \`live_connection_verified=false\`.

## Positioning
VGPT is the **GPT-facing entry point**; VUC is the enforcement product. The downstream SaaS integrations remain governed connectors, not separate products.
