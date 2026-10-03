 * Resolve a public key from verifier-controlled trust anchors only.
 *
 * Caller-supplied/embedded public keys are intentionally NOT accepted: a
 * proof verifier must not let the subject of the proof select its own key.
 *
 * VUC_TRUST_STORE may point to a JSON object mapping key_id -> PEM public key,
 * or key_id -> { public_key: PEM }. The in-memory registry is never used
 * for verification and is not a trust anchor.
 */
export function resolvePublicKey(keyId: string): string | null {
  if (!keyId) return null;

  const trustStorePath = process.env.VUC_TRUST_STORE;
  if (trustStorePath) {
    try {
      const raw = fs.readFileSync(trustStorePath, 'utf8');
      const store = JSON.parse(raw) as Record<string, unknown>;
      const entry = store[keyId];
      const publicKey = typeof entry === 'string'
        ? entry
        : entry && typeof entry === 'object' && 'public_key' in entry
          ? (entry as { public_key?: unknown }).public_key
          : undefined;
      if (typeof publicKey === 'string' && publicKey.includes('PUBLIC KEY')) return publicKey;
    } catch {
      return null;
    }
  }

  return null;
}