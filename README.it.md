# VUC — Vortex Universal Connector

[中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Português](README.md) | [Tiếng Việt](README.vi.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Bahasa Indonesia](README.id.md) | [Malay](README.ms.md) | **English**

**Esecuzione governata · Universal Connector · prove crittografiche**

VUC è il livello di esecuzione e connessione dell’architettura Vortex. Fornisce CLI, integrazione MCP, adapter e strumenti di verifica per workload Agent che richiedono esecuzione controllata e prove verificabili in modo indipendente.

> **Principio fondamentale:** una prova di esecuzione non è una prova di sicurezza.

## Vortex / VUC / VUA

| Nome | Ruolo |
|---|---|
| **Vortex** | Prodotto e interfaccia pubblica |
| **VUC** | Livello Universal Connector ed esecuzione |
| **VUA** | Livello legacy/interno per adapter e compatibilità di governance |

Il pacchetto npm rimane **`@vucfoundation/vuc`** per compatibilità.

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

Alias del comando Vortex:

```bash
vortex status
vua status
vuc status
```

## Esecuzione e prove

VUC è progettato per Android/Termux, Alpine/Linux, ARM64, Windows, workflow GitHub e runtime MCP locali.

La dichiarazione di una capability non è una prova di esecuzione. Una capability è considerata misurata solo quando il workload viene realmente eseguito e produce un risultato verificabile.

Il modello di verifica include RFC 8785/JCS, Ed25519, SHA-256, prove di esecuzione esplicite, policy fail-closed e verifica indipendente.

## Metodologia delle prestazioni

```text
CPU × Bend × GPU
A23/Termux × Cloud Run
baseline → load → peak → recovery
p50 / p95 / p99 / throughput / errors
```

k6 produce artefatti leggibili dalle macchine, non solo screenshot.

## MCP

```text
inspect → propose → verify → execute → evidence
```

Le operazioni di scrittura richiedono capability e autorizzazione esplicite; verifica ed esecuzione sono separate.

## Installazione

```bash
npm install -g @vucfoundation/vuc
vua status
```

Da sorgente:

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

Per GPU/Bend:

```text
detected capability ≠ executed workload ≠ verified result
```

## Documentazione

- [Português](./README.md)
- [English](./README.en.md)
- [Documentation](./docs/README.md)

## Licenza

MIT.
