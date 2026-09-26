# VUC — Vortex Universal Connector

[中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Português](README.md) | [Tiếng Việt](README.vi.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Bahasa Indonesia](README.id.md) | [Malay](README.ms.md) | **English**

**Pelaksanaan terkawal · Universal Connector · bukti kriptografi**

VUC ialah lapisan pelaksanaan dan sambungan dalam seni bina Vortex. Ia menyediakan CLI, integrasi MCP, adapter dan keupayaan pengesahan untuk workload Agent yang memerlukan pelaksanaan terkawal serta bukti yang boleh disahkan secara bebas.

> **Prinsip utama:** bukti pelaksanaan bukan bukti keselamatan.

## Vortex / VUC / VUA

| Nama | Peranan |
|---|---|
| **Vortex** | Produk dan antara muka awam |
| **VUC** | Lapisan Universal Connector dan pelaksanaan |
| **VUA** | Lapisan legacy/dalaman untuk adapter dan keserasian governance |

Pakej npm kekal **`@vucfoundation/vuc`** untuk keserasian.

## CLI

```bash
npx --yes @vucfoundation/vuc@1.0.1 status

vua status
vuc status
vua adapters
vua baseline
vua conformance
vua bench --iterations 500
vua mock audit
vua repo verify
```

Alias arahan Vortex:

```bash
vortex status
vua status
vuc status
```

## Pelaksanaan dan bukti

VUC menyasarkan Android/Termux, Alpine/Linux, ARM64, Windows, workflow GitHub dan runtime MCP tempatan.

Pengisytiharan capability bukan bukti pelaksanaan. Capability hanya dianggap diukur apabila workload benar-benar dilaksanakan dan menghasilkan keputusan yang boleh disahkan.

Model pengesahan merangkumi RFC 8785/JCS, Ed25519, SHA-256, bukti pelaksanaan eksplisit, polisi fail-closed dan pengesahan bebas.

## Metodologi prestasi

```text
CPU × Bend × GPU
A23/Termux × Cloud Run
baseline → load → peak → recovery
p50 / p95 / p99 / throughput / errors
```

k6 menghasilkan artifak yang boleh dibaca mesin, bukan hanya screenshot.

## MCP

```text
inspect → propose → verify → execute → evidence
```

Operasi tulis memerlukan capability dan kebenaran yang jelas; pengesahan dipisahkan daripada pelaksanaan.

## Pemasangan

```bash
npm install -g @vucfoundation/vuc
vua status
```

Daripada source:

```bash
git clone https://github.com/scoobiii/vuc.git
cd vuc
npm ci
npm run build:cli
node dist/vua.cjs status
```

## Termux

```bash
df -h
free -h
node -v
npm -v
vua status
vua baseline
vua adapters
vua conformance
```

Untuk GPU/Bend:

```text
detected capability ≠ executed workload ≠ verified result
```

## Dokumentasi

- [Português](./README.md)
- [English](./README.en.md)
- [Documentation](./docs/README.md)

## Lesen

MIT.
