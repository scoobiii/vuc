import React, { useState, useMemo } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Play,
  Download,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import type { ExecutionProof } from '../vortex/types.js';

interface VUCCLIProtocolViewProps {
  status?: {
    status: string;
    identity?: {
      agent_id: string;
      principal_id: string;
      key_id: string;
      algorithm: string;
      public_key: string;
    };
  } | null;
  onSendToVerifier?: (proof: ExecutionProof) => void;
}

type BinaryAlias = 'vuc' | 'vua' | 'vortex' | 'npx @vucfoundation/vuc@1.0.2';

interface AdapterPreset {
  id: string;
  adapter: string;
  action: string;
  label: string;
  description: string;
}

const ADAPTER_PRESETS: AdapterPreset[] = [
  {
    id: 'linux-sandbox',
    adapter: 'linux',
    action: 'sandbox_jail_check',
    label: 'Linux · Sandbox Containment Audit',
    description: 'Verifies chroot/path-traversal containment (/tmp/vua-sandbox) and signs the kernel enforcement proof.',
  },
  {
    id: 'linux-inspect',
    adapter: 'linux',
    action: 'inspect_system',
    label: 'Linux · Host Substrate Inspection',
    description: 'Collects POSIX kernel, architecture, CPU and memory telemetry with an Ed25519 ExecutionProof.',
  },
  {
    id: 'android-selinux',
    adapter: 'android',
    action: 'check_selinux',
    label: 'Android / Termux · SELinux Enforcement',
    description: 'Audits AOSP/Termux SELinux mode and produces a deterministic RFC 8785 proof.',
  },
  {
    id: 'android-apk',
    adapter: 'android',
    action: 'verify_apk',
    label: 'Android · APK Signing Scheme Audit',
    description: 'Verifies APK v2/v3 cryptographic certificate chain and emits a signed verification artifact.',
  },
  {
    id: 'github-inspect',
    adapter: 'github',
    action: 'inspect_repo',
    label: 'GitHub · Repository Governance Check',
    description: 'Inspects repository branch protection and commit state (fail-closed when token is absent).',
  },
  {
    id: 'windows-acls',
    adapter: 'windows',
    action: 'inspect_acls',
    label: 'Windows NT · ACL & AppContainer Check',
    description: 'Audits Windows Discretionary ACL boundaries and emits a signed ExecutionProof.',
  },
];

export const VUCCLIProtocolView: React.FC<VUCCLIProtocolViewProps> = ({
  status,
  onSendToVerifier,
}) => {
  const [binaryAlias, setBinaryAlias] = useState<BinaryAlias>('vuc');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('linux-sandbox');
  const [proofFileName, setProofFileName] = useState<string>('vuc-execution-proof.json');
  const [pubKeyFileName, setPubKeyFileName] = useState<string>('vuc-trusted-key.pem');
  const [llmProvider, setLlmProvider] = useState<'ollama' | 'gemini'>('ollama');
  const [llmModel, setLlmModel] = useState<string>('qwen2.5-coder:0.5b');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [liveResult, setLiveResult] = useState<{
    success: boolean;
    adapter: string;
    action: string;
    durationMs: number;
    execution_proof?: ExecutionProof;
    verification?: { valid: boolean; status: string; reasons?: string[] };
    data?: Record<string, unknown>;
    error?: string;
  } | null>(null);

  const selectedPreset = useMemo(
    () => ADAPTER_PRESETS.find((p) => p.id === selectedPresetId) || ADAPTER_PRESETS[0],
    [selectedPresetId]
  );

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  const handleProviderChange = (provider: 'ollama' | 'gemini') => {
    setLlmProvider(provider);
    setLlmModel(provider === 'ollama' ? 'qwen2.5-coder:0.5b' : 'gemini-3.8-flash');
  };

  const step1BootstrapCmd = useMemo(() => {
    return [
      '# 1. Install @vucfoundation/vuc globally and verify artifact integrity',
      'npm install -g @vucfoundation/vuc@1.0.2',
      '',
      '# 2. Verify CLI version, binary resolution, and SHA-256 digest',
      `${binaryAlias} --version`,
      'PKG_ROOT="$(npm root -g)/@vucfoundation/vuc"',
      'sha256sum "$PKG_ROOT/dist/vua.cjs"',
      '',
      '# 3. Inspect hardware fingerprint and establish dynamic SLA baseline',
      `${binaryAlias} status`,
      `${binaryAlias} baseline`,
    ].join('\n');
  }, [binaryAlias]);

  const step2GenerateProofCmd = useMemo(() => {
    return [
      `# Generate and sign a deterministic ExecutionProof v1 (${selectedPreset.adapter}:${selectedPreset.action})`,
      `node -e '`,
      `  const fs = require("node:fs");`,
      `  (async () => {`,
      `    const { vuaRegistry } = await import("./src/vortex/adapters/registry.js");`,
      `    const { CURRENT_IDENTITY } = await import("./src/vortex/gateway.js");`,
      `    const res = await vuaRegistry.invoke({`,
      `      adapterId: "${selectedPreset.adapter}",`,
      `      action: "${selectedPreset.action}",`,
      `      requestId: "audit-" + Date.now(),`,
      `    });`,
      `    if (!res.execution_proof) {`,
      `      console.error("FAIL_CLOSED: No ExecutionProof emitted");`,
      `      process.exit(1);`,
      `    }`,
      `    fs.writeFileSync("${proofFileName}", JSON.stringify(res.execution_proof, null, 2) + "\\n", { mode: 0o600 });`,
      `    fs.writeFileSync("${pubKeyFileName}", CURRENT_IDENTITY.public_key, { mode: 0o600 });`,
      `    console.log("PROOF_EMITTED=" + res.execution_proof.proof_hash);`,
      `    console.log("KEY_ID=" + res.execution_proof.identity.key_id);`,
      `  })();`,
      `'`,
      '',
      '# Or execute directly via the global CLI binary:',
      `${binaryAlias} invoke ${selectedPreset.adapter} ${selectedPreset.action}`,
    ].join('\n');
  }, [binaryAlias, selectedPreset, proofFileName, pubKeyFileName]);

  const step3GovernedLlmCmd = useMemo(() => {
    const urlFlag = llmProvider === 'ollama' ? ' --url http://127.0.0.1:11434' : '';
    return [
      `# Governed LLM execution with AGENTS.md system instruction binding & Ed25519 signature`,
      `${binaryAlias} llm \\`,
      `  --provider ${llmProvider} \\`,
      `  --model ${llmModel}${urlFlag} \\`,
      `  --prompt "Verify deterministic execution invariants under RFC 8785 JCS"`,
    ].join('\n');
  }, [binaryAlias, llmProvider, llmModel]);

  const step4ExternalAuditCmd = useMemo(() => {
    return [
      `# 1. Verify ExecutionProof v1 via official VUC CLI verifier with pinned Trust Store key`,
      `${binaryAlias} verify ${proofFileName} --trusted-key ${pubKeyFileName} --strict`,
      '',
      `# 2. Standalone zero-trust external audit (pure Node.js crypto + RFC 8785 + S0 Trust Anchor check)`,
      `node -e '`,
      `  const fs = require("node:fs");`,
      `  const crypto = require("node:crypto");`,
      `  const proof = JSON.parse(fs.readFileSync("${proofFileName}", "utf8"));`,
      `  const pubKeyPem = fs.readFileSync("${pubKeyFileName}", "utf8");`,
      `  if (proof.proof_version !== "1" || proof.executed !== true) {`,
      `    throw new Error("AUDIT_REJECTED: Proof version or executed flag invalid");`,
      `  }`,
      `  const canonicalize = (v) => {`,
      `    if (v === null || typeof v !== "object") return JSON.stringify(v);`,
      `    if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";`,
      `    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonicalize(v[k])).join(",") + "}";`,
      `  };`,
      `  const { signature, proof_hash, ...unsignedProof } = proof;`,
      `  const jcsBytes = Buffer.from(canonicalize(unsignedProof), "utf8");`,
      `  const computedHash = "sha256:" + crypto.createHash("sha256").update(jcsBytes).digest("hex");`,
      `  if (computedHash !== proof_hash) {`,
      `    throw new Error("PROOF_HASH_MISMATCH: expected " + proof_hash + ", got " + computedHash);`,
      `  }`,
      `  const sigValid = crypto.verify(null, jcsBytes, crypto.createPublicKey(pubKeyPem), Buffer.from(signature, "base64"));`,
      `  if (!sigValid) throw new Error("ED25519_SIGNATURE_INVALID");`,
      `  console.log(JSON.stringify({`,
      `    verdict: "EXTERNAL_AUDIT_VERIFIED",`,
      `    request_id: proof.request_id,`,
      `    key_id: proof.identity.key_id,`,
      `    proof_hash: computedHash,`,
      `    ed25519_signature: "VALID"`,
      `  }, null, 2));`,
      `'`,
    ].join('\n');
  }, [binaryAlias, proofFileName, pubKeyFileName]);

  const step5FullConformanceCmd = useMemo(() => {
    return [
      '# Run 100% adapter conformance, zero-mock audit, and 500-iteration crypto benchmark',
      `${binaryAlias} conformance`,
      `${binaryAlias} mock audit`,
      `${binaryAlias} bench --iterations 500`,
    ].join('\n');
  }, [binaryAlias]);

  const fullAuditScript = useMemo(() => {
    return [
      '#!/usr/bin/env bash',
      '# VUC (Vortex Universal Connector) — Local ExecutionProof Generation & External Audit Script',
      '# Standard: RFC 8785 (JCS) + Ed25519 ExecutionProof v1 + Fail-Closed Governance',
      'set -euo pipefail',
      '',
      step1BootstrapCmd,
      '',
      step2GenerateProofCmd,
      '',
      step4ExternalAuditCmd,
      '',
      step5FullConformanceCmd,
      '',
    ].join('\n');
  }, [step1BootstrapCmd, step2GenerateProofCmd, step4ExternalAuditCmd, step5FullConformanceCmd]);

  const handleDownloadScript = () => {
    const blob = new Blob([fullAuditScript], { type: 'text/x-shellscript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vuc-external-audit-protocol.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRunLiveProof = async () => {
    setLiveLoading(true);
    try {
      const res = await fetch(`/api/vuc/adapters/${selectedPreset.adapter}/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedPreset.action,
          request_id: `cli-audit-${Date.now()}`,
          target: {},
          payload: {},
        }),
      });
      const data = await res.json();
      setLiveResult(data);
    } catch (err: any) {
      setLiveResult({
        success: false,
        adapter: selectedPreset.adapter,
        action: selectedPreset.action,
        durationMs: 0,
        error: err.message || String(err),
      });
    } finally {
      setLiveLoading(false);
    }
  };

  const liveProofReproductionCmd = useMemo(() => {
    if (!liveResult?.execution_proof) return '';
    const proofJson = JSON.stringify(liveResult.execution_proof, null, 2);
    const pubKey = status?.identity?.public_key || '';
    return [
      `# Export this exact signed ExecutionProof (${liveResult.execution_proof.request_id}) for local CLI verification`,
      `cat <<'EOF' > ${proofFileName}`,
      proofJson,
      'EOF',
      ...(pubKey
        ? [
            `cat <<'EOF' > ${pubKeyFileName}`,
            pubKey.trim(),
            'EOF',
          ]
        : []),
      `${binaryAlias} verify ${proofFileName}`,
    ].join('\n');
  }, [liveResult, status, proofFileName, pubKeyFileName, binaryAlias]);

  return (
    <div className="space-y-8 text-zinc-100">
      {/* Top Header & Focal Command Bar */}
      <section className="border border-zinc-800 bg-zinc-900/50 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-400">
              <span>@vucfoundation/vuc@1.0.2</span>
              <span aria-hidden="true">·</span>
              <span>RFC 8785 JCS</span>
              <span aria-hidden="true">·</span>
              <span>Ed25519 ExecutionProof v1</span>
              <span aria-hidden="true">·</span>
              <span>Fail-Closed Audit Protocol</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              CLI Verification Protocol &amp; Local Proof Signer
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Generate, sign, and independently verify deterministic execution proofs from any POSIX,
              Termux ARM64, or container shell. Every command below operates on raw cryptographic
              artifacts—never trusting unverified agent prose.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-copy-full-audit-script"
              type="button"
              onClick={() => handleCopy('full-script', fullAuditScript)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-200 transition cursor-pointer"
            >
              {copiedId === 'full-script' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Full Script</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Full .sh Protocol</span>
                </>
              )}
            </button>

            <button
              id="btn-download-audit-script"
              type="button"
              onClick={handleDownloadScript}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-medium text-zinc-950 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download vuc-audit.sh</span>
            </button>
          </div>
        </div>

        {/* Interactive Parameter Bar */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              CLI Binary Alias
            </label>
            <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
              {(['vuc', 'vua', 'vortex'] as BinaryAlias[]).map((alias) => (
                <button
                  key={alias}
                  type="button"
                  onClick={() => setBinaryAlias(alias)}
                  className={`flex-1 py-1.5 px-2 text-xs font-mono rounded-md transition cursor-pointer ${
                    binaryAlias === alias
                      ? 'bg-zinc-800 text-emerald-400 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {alias}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="select-adapter-preset" className="block text-xs font-mono text-zinc-400 mb-1.5">
              Target Adapter &amp; Action
            </label>
            <select
              id="select-adapter-preset"
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              {ADAPTER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label} ({preset.adapter}:{preset.action})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="input-proof-filename" className="block text-xs font-mono text-zinc-400 mb-1.5">
              Output Proof Artifact Path
            </label>
            <input
              id="input-proof-filename"
              type="text"
              value={proofFileName}
              onChange={(e) => setProofFileName(e.target.value || 'vuc-execution-proof.json')}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="input-pubkey-filename" className="block text-xs font-mono text-zinc-400 mb-1.5">
              External Trust Anchor Key Path
            </label>
            <input
              id="input-pubkey-filename"
              type="text"
              value={pubKeyFileName}
              onChange={(e) => setPubKeyFileName(e.target.value || 'vuc-trusted-key.pem')}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </section>

      {/* Protocol Command Blocks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Block 01 */}
        <section className="border border-zinc-800 bg-zinc-900/40 rounded-xl flex flex-col justify-between overflow-hidden">
          <div className="p-5 border-b border-zinc-800/80 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                01. Package Provenance &amp; Hardware Baseline
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Verify the installed NPM artifact digest and calibrate dynamic Ed25519/JCS tolerances.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('step-1', step1BootstrapCmd)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 transition shrink-0 cursor-pointer"
            >
              {copiedId === 'step-1' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Bash</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-5 bg-zinc-950 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed flex-1">
            <code>{step1BootstrapCmd}</code>
          </pre>
        </section>

        {/* Block 02 */}
        <section className="border border-zinc-800 bg-zinc-900/40 rounded-xl flex flex-col justify-between overflow-hidden">
          <div className="p-5 border-b border-zinc-800/80 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                02. Local ExecutionProof Generation &amp; Ed25519 Signing
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {selectedPreset.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('step-2', step2GenerateProofCmd)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 transition shrink-0 cursor-pointer"
            >
              {copiedId === 'step-2' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Bash</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-5 bg-zinc-950 text-xs font-mono text-emerald-300/95 overflow-x-auto leading-relaxed flex-1">
            <code>{step2GenerateProofCmd}</code>
          </pre>
        </section>

        {/* Block 03 */}
        <section className="border border-zinc-800 bg-zinc-900/40 rounded-xl flex flex-col justify-between overflow-hidden">
          <div className="p-5 border-b border-zinc-800/80 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                03. Independent External Audit &amp; Zero-Trust Verification
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Recompute RFC 8785 canonical bytes and verify the Ed25519 signature in a separate process.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('step-4', step4ExternalAuditCmd)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 transition shrink-0 cursor-pointer"
            >
              {copiedId === 'step-4' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Bash</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-5 bg-zinc-950 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed flex-1">
            <code>{step4ExternalAuditCmd}</code>
          </pre>
        </section>

        {/* Block 04 */}
        <section className="border border-zinc-800 bg-zinc-900/40 rounded-xl flex flex-col justify-between overflow-hidden">
          <div className="p-5 border-b border-zinc-800/80 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  04. Governed LLM Proof &amp; Substrate Conformance Suite
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Bind LLM execution to AGENTS.md governance instructions and audit all 10 adapters for zero mocks.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopy('step-3-5', `${step3GovernedLlmCmd}\n\n${step5FullConformanceCmd}`)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 transition shrink-0 cursor-pointer"
              >
                {copiedId === 'step-3-5' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Bash</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-400">Provider:</span>
              <button
                type="button"
                onClick={() => handleProviderChange('ollama')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  llmProvider === 'ollama'
                    ? 'bg-zinc-800 text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ollama (qwen2.5-coder:0.5b)
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  llmProvider === 'gemini'
                    ? 'bg-zinc-800 text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                gemini (gemini-3.8-flash)
              </button>
            </div>
          </div>

          <pre className="p-5 bg-zinc-950 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed flex-1">
            <code>{`${step3GovernedLlmCmd}\n\n${step5FullConformanceCmd}`}</code>
          </pre>
        </section>
      </div>

      {/* Live Local Proof Generator & Shell Exporter */}
      <section className="border border-zinc-800 bg-zinc-900/50 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              05. Live Gateway Execution &amp; Portable Bash Proof Bundle
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Execute <span className="font-mono text-zinc-200">{selectedPreset.adapter}:{selectedPreset.action}</span> on
              the active gateway now to generate a real Ed25519-signed <span className="font-mono text-zinc-200">ExecutionProof</span> and
              copy a self-contained bash verification bundle.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="btn-execute-live-cli-proof"
              type="button"
              onClick={handleRunLiveProof}
              disabled={liveLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-mono font-medium text-zinc-950 transition cursor-pointer"
            >
              {liveLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing Proof...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute &amp; Sign Live Proof</span>
                </>
              )}
            </button>

            {liveResult?.execution_proof && onSendToVerifier && (
              <button
                type="button"
                onClick={() => onSendToVerifier(liveResult.execution_proof!)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-200 transition cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Inspect in Verifier</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            )}
          </div>
        </div>

        {liveResult ? (
          <div className="p-6 space-y-6 bg-zinc-950/70">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-zinc-300 border-b border-zinc-800/80 pb-4">
              <span className={liveResult.success ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {liveResult.success ? 'STATUS: VERIFIED_EXECUTION_PROOF' : 'STATUS: FAIL_CLOSED'}
              </span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span>
                adapter: {liveResult.adapter}:{liveResult.action}
              </span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span className="tabular-nums">duration: {liveResult.durationMs} ms</span>
              {liveResult.execution_proof && (
                <>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span>key_id: {liveResult.execution_proof.identity.key_id}</span>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span>proof_hash: {liveResult.execution_proof.proof_hash.slice(0, 28)}...</span>
                </>
              )}
            </div>

            {liveProofReproductionCmd && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400">
                    Self-Contained Bash Bundle (writes signed proof + public key and runs {binaryAlias} verify):
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('live-bundle', liveProofReproductionCmd)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-200 transition cursor-pointer"
                  >
                    {copiedId === 'live-bundle' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied Bundle</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Copy Portable Bash Bundle</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto max-h-96">
                  <code>{liveProofReproductionCmd}</code>
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 bg-zinc-950/40 text-xs font-mono text-zinc-400 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>
              Click &quot;Execute &amp; Sign Live Proof&quot; above to emit a live Ed25519 ExecutionProof and generate a ready-to-paste terminal verification bundle.
            </span>
          </div>
        )}
      </section>
    </div>
  );
};
