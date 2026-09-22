# VUA Governance — ChatGPT/Codex Plugin Package

Portable Agent Plugins package for the VUA MCP server.

## Status

The VUC repository already contains the MCP server and HTTP/SSE transport. This directory adds the portable Agent Plugins packaging layer:

- plugin.json — portable plugin manifest
- mcp.json — MCP server connection
- skills/vua-governance/SKILL.md — governed agent workflow

The package format follows the current OpenAI Agent Plugins structure.

## Local test

Start the VUA server from the VUC repository:

    npm install
    npm run dev

The example currently points to:

    http://localhost:3000/mcp

For a ChatGPT-hosted connection, the MCP endpoint must be deployed at a reachable HTTPS URL and mcp.json must be changed to that URL.

## What VUA exposes

The existing VUA MCP layer provides governed operations including:

- LLM query/execution
- execution-proof validation
- repository inspection
- deterministic patch preparation
- governed branch/PR operations

The plugin does not replace VUA policy. It packages the connection so an agent host can discover and invoke the governed tools.

## Governance invariant

    observe
      -> authorize
      -> execute
      -> ExecutionProof
      -> independent verification
      -> propose patch
      -> PR
      -> CI / repository governance
      -> merge

An LLM's confidence is not execution evidence, and an agent recommendation is not a merge authorization.

## Production checklist

- Deploy VUA MCP behind HTTPS.
- Configure OAuth 2.1/resource metadata for authenticated user-specific or write operations.
- Replace the localhost URL in mcp.json.
- Verify tool schemas and security schemes.
- Run MCP Inspector/conformance tests.
- Test read-only tools first.
- Test write tools with explicit authorization.
- Require CI/repository protection before merge.
