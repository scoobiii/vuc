# VUC — Vortex Universal Connector

**Language / 言語:** [Português](./README.md) · [English](./README.en.md) · **日本語**

**ガバナンスされた実行 · Universal Connector · 暗号学的証拠**

VUC は Vortex アーキテクチャの実行・接続レイヤーです。CLI、MCP 統合、アダプター、検証機能を提供し、制御された実行と独立して検証可能な証拠を必要とする Agent ワークロードを対象とします。

> **基本原則:** 実行証明は安全性の証明ではありません。

## Vortex / VUC / VUA

| 名称 | 役割 |
|---|---|
| **Vortex** | 公開プロダクト／ユーザーインターフェース |
| **VUC** | Universal Connector と実行レイヤー |
| **VUA** | 旧来／内部アダプター・ガバナンス互換レイヤー |

互換性のため npm パッケージは **`@vucfoundation/vuc`** を維持します。

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

Vortex コマンドエイリアス：

```bash
vortex status
vua status
vuc status
```

## 実行と証拠

対象環境は Android/Termux、Alpine/Linux、ARM64、Windows、GitHub ワークフロー、ローカル MCP ランタイムなどです。

Capability の宣言だけでは実行証拠になりません。実際にワークロードを実行し、検証可能な結果を生成した場合に測定済みとします。

検証モデルには RFC 8785/JCS、Ed25519、SHA-256、明示的な実行証拠、fail-closed ポリシー、独立検証を含みます。

## パフォーマンス

```text
CPU × Bend × GPU
A23/Termux × Cloud Run
baseline → load → peak → recovery
p50 / p95 / p99 / throughput / errors
```

k6 はスクリーンショットではなく機械可読なベンチマーク証拠を生成します。

## MCP

```text
inspect → propose → verify → execute → evidence
```

書き込み操作には明示的な capability と認可が必要で、検証と実行は分離されます。

## インストール

```bash
npm install -g @vucfoundation/vuc
vua status
```

ソースから：

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

GPU/Bend では次を区別します：

```text
detected capability ≠ executed workload ≠ verified result
```

## ドキュメント

- [Português](./README.md)
- [English](./README.en.md)
- [Documentation](./docs/README.md)

## License

MIT.
