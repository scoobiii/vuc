# VUC — Vortex Universal Connector

**Langues / Language:** [Português](./README.md) · [English](./README.en.md) · **Français**

**Exécution gouvernée · Universal Connector · preuves cryptographiques**

VUC est la couche d’exécution et de connexion de l’architecture Vortex. Elle fournit une CLI, une intégration MCP, des adaptateurs et des fonctions de vérification pour les workloads Agent nécessitant une exécution contrôlée et des preuves vérifiables indépendamment.

> **Principe central :** une preuve d’exécution n’est pas une preuve de sécurité.

## Vortex / VUC / VUA

| Nom | Rôle |
|---|---|
| **Vortex** | Produit et interface publique |
| **VUC** | Couche Universal Connector et exécution |
| **VUA** | Couche legacy/interne d’adaptateurs et de compatibilité de gouvernance |

Le package npm reste **`@vucfoundation/vuc`** pour préserver la compatibilité.

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

Alias de commande Vortex :

```bash
vortex status
vua status
vuc status
```

## Exécution et preuves

VUC cible Android/Termux, Alpine/Linux, ARM64, Windows, les workflows GitHub et les runtimes MCP locaux.

Une déclaration de capability n’est pas une preuve d’exécution. Une capability n’est considérée comme mesurée que lorsque le workload s’exécute réellement et produit un résultat vérifiable.

Le modèle de vérification utilise RFC 8785/JCS, Ed25519, SHA-256, des preuves d’exécution explicites, des politiques fail-closed et une vérification indépendante.

## Méthodologie de performance

```text
CPU × Bend × GPU
A23/Termux × Cloud Run
baseline → load → peak → recovery
p50 / p95 / p99 / throughput / errors
```

k6 produit des artefacts lisibles par machine plutôt que de dépendre de captures d’écran.

## MCP

```text
inspect → propose → verify → execute → evidence
```

Les opérations d’écriture nécessitent une capability et une autorisation explicites. La vérification est séparée de l’exécution.

## Installation

```bash
npm install -g @vucfoundation/vuc
vua status
```

Depuis les sources :

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

Pour GPU/Bend :

```text
detected capability ≠ executed workload ≠ verified result
```

## Documentation

- [Português](./README.md)
- [English](./README.en.md)
- [Documentation](./docs/README.md)

## Licence

MIT.
