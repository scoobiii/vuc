# Gemini S0 Benchmark

Responsibility: VUC Benchmark / governed model evaluation.

- Benchmark: VUC-S0-1.0
- Script version: 1.0.1
- Default model: `gemini-3.8-flash`
- Environment target: Debian
- VUC mode: OFF for this baseline
- Date convention: UTC
- Secret handling: `GEMINI_API_KEY` is read from the environment, sent via the `x-goog-api-key` header using curl's stdin config, and never written to JSON or placed in the request URL/command arguments.
- The script does not persist Gemini `thoughtSignature`.

Run:

```bash
chmod +x gemini_s0_bench.sh
./gemini_s0_bench.sh
```

The output JSON records prompt/output SHA-256 hashes, latency, finish reason and token usage. The benchmark intentionally separates model output integrity from factual correctness; a valid API response is not evidence that a claim is true.

Security note: do not commit `GEMINI_API_KEY`, paste it into logs, or reuse a key that has been exposed. Revoke exposed keys and create a replacement.
