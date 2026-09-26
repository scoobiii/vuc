# VUC — Vortex Universal Connector

**Bahasa / Language:** [Português](./README.md) · [English](./README.en.md) · **Bahasa Indonesia**

**Eksekusi terkelola · Universal Connector · bukti kriptografis**

VUC adalah lapisan eksekusi dan koneksi dalam arsitektur Vortex. VUC menyediakan CLI, integrasi MCP, adapter, dan kemampuan verifikasi untuk workload Agent yang membutuhkan eksekusi terkontrol serta bukti yang dapat diverifikasi secara independen.

> **Prinsip utama:** bukti eksekusi bukan bukti keamanan.

## Vortex / VUC / VUA

| Nama | Peran |
|---|---|
| **Vortex** | Produk dan antarmuka publik |
| **VUC** | Lapisan Universal Connector dan eksekusi |
| **VUA** | Lapisan legacy/internal untuk adapter dan kompatibilitas governance |

Package npm tetap **`@vucfoundation/vuc`** untuk kompatibilitas.

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

Alias perintah Vortex:

```bash
vortex status
vua status
vuc status
```

## Eksekusi dan bukti

VUC ditujukan untuk Android/Termux, Alpine/Linux, ARM64, Windows, workflow GitHub, dan runtime MCP lokal.

Deklarasi capability bukan bukti eksekusi. Capability dianggap terukur hanya ketika workload benar-benar dijalankan dan menghasilkan hasil yang dapat diverifikasi.

Model verifikasi mencakup RFC 8785/JCS, Ed25519, SHA-256, bukti eksekusi eksplisit, kebijakan fail-closed, dan verifikasi independen.

## Metodologi performa

```text
CPU × Bend × GPU
A23/Termux × Cloud Run
baseline → load → peak → recovery
p50 / p95 / p99 / throughput / errors
```

k6 menghasilkan artefak yang dapat dibaca mesin, bukan hanya screenshot.

## MCP

```text
inspect → propose → verify → execute → evidence
```

Operasi tulis membutuhkan capability dan otorisasi eksplisit; verifikasi dipisahkan dari eksekusi.

## Instalasi

```bash
npm install -g @vucfoundation/vuc
vua status
```

Dari source:

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

## Lisensi

MIT.
