# Gemini S0 Benchmark

Responsibility: VUC Benchmark / governed model evaluation.

- Benchmark: VUC-S0-1.0
- Script version: 1.0.0
- Default model: `gemini-3.8-flash`
- Environment target: Debian
- VUC mode: OFF for this baseline
- Date convention: UTC
- Secret handling: `GEMINI_API_KEY` is read from the environment and is never written to JSON.
- The script does not persist Gemini `thoughtSignature`.

Run:

```bash
chmod +x gemini_s0_bench.sh
./gemini_s0_bench.sh
```

The output JSON records prompt/output SHA-256 hashes, latency, finish reason and token usage. The benchmark intentionally separates model output integrity from factual correctness; a valid API response is not evidence that a claim is true.
