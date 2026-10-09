# VUC Evidence and ExecutionProof

## Purpose

Evidence supports a specific, bounded claim about an operation. It should let a reviewer identify what was requested, what ran, what result was observed, and how the record can be independently checked.

## Evidence chain

A useful execution record may include:

- request/execution identifier;
- input and output hashes;
- target and operation;
- start/end time and exit status;
- stdout/stderr or a protected reference to them;
- environment/runtime identity;
- provider response or read-back for remote operations;
- policy/approval binding when required;
- proof schema/version, signer identity, public-key/trust-anchor reference, and signature;
- verification result and verifier version.

The exact fields depend on the proof schema and operation. Do not assume every record contains all of them.

## Cryptographic building blocks

- **SHA-256**: hashes bytes or canonical payloads according to the defined contract.
- **Ed25519**: verifies a digital signature under a public key.
- **JCS / RFC 8785**: canonicalizes JSON so implementations can agree on the bytes to hash/sign.
- **ExecutionProof**: the repository's proof record for a defined execution claim. Consult the current type, signer, verifier, and tests for the authoritative schema.

A field named `proof_hash` or `output_hash` is meaningful only when its exact input bytes and canonicalization procedure are specified.

## What a valid proof does—and does not—show

```text
valid signature + matching canonical payload
    → integrity/authenticity under the relevant key
    ≠ factual correctness of arbitrary output
    ≠ proof that an unobserved action occurred
    ≠ proof that a remote provider accepted a mutation
```

A cryptographically valid signature cannot make an unsupported LLM statement true. A successful local process cannot establish remote state without provider-side evidence or independent read-back.

## Evidence maturity labels

| Label | Meaning |
|---|---|
| `DOCUMENTED` | A document describes the capability or contract. |
| `IMPLEMENTED` | Code for the capability exists. |
| `EXECUTED` | The operation actually ran and produced an observable result. |
| `VERIFIED` | A specified verifier independently checked the claim against defined evidence and rules. |

These labels are not interchangeable and are not asserted to be a universal enum in all CLI/API responses.

## Logs versus evidence

A log is a record of messages. It can be useful diagnostic context, but a log line alone may be forgeable, incomplete, unbound to a target, or produced without independent verification.

```text
log ≠ automatically verifiable evidence
```

Preserve source, execution context, hashes, exit status, and the verification method. For remote mutations, retain the provider's authoritative response and relevant resource identifiers.

## External-effect evidence

For an external side effect, a robust evidence record should bind (where applicable):

1. provider and authenticated principal;
2. action and target resource;
3. base/head SHA or resource version before/after;
4. payload hash and approval binding;
5. actual provider response;
6. independent read-back or provider audit event when available.

If provider evidence is absent, report the external effect as unverified or unknown—not as successful merely because a request was sent.

## Verification workflow

1. Obtain the proof artifact from the actual run.
2. Validate its schema and required fields.
3. canonicalize the signed payload using the defined contract.
4. recompute hashes from the referenced bytes when available.
5. verify the signature against an independently trusted key.
6. check identity, authorization, target, time, and approval bindings.
7. validate the factual claim separately against appropriate evidence.
8. state precisely what was verified and what remains unknown.

The CLI documents `vuc verify proof.json`; use the syntax supported by the installed version.

## Related references

- [Architecture](./ARCHITECTURE.md)
- [Security](./SECURITY.md)
- [Certifiable Assurance Tests](./CERTIFIABLE_ASSURANCE_TESTS.md)
- [CI status](./CI-STATUS.md)
- [Glossary](./GLOSSARY.md)
