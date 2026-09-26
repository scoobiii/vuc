# VUC — Vortex Universal Connector

**语言 / Language:** [Português](./README.md) · [English](./README.en.md) · **中文**

**可治理执行 · 通用连接器 · 加密证据**

VUC 是 Vortex 架构中的执行与连接层。它提供 CLI、MCP 集成、适配器以及验证能力，用于需要受控执行和可独立验证证据的 Agent 工作负载。

> **核心原则：** 执行证明不等于安全证明。

## Vortex / VUC / VUA

| 名称 | 角色 |
|---|---|
| **Vortex** | 公共产品与用户接口 |
| **VUC** | 通用连接器与执行层 |
| **VUA** | 旧版/内部适配器与治理兼容层 |

当前 npm 包保持为 `@vucfoundation/vuc`，以保证兼容性。

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

Vortex 命令别名正在加入，同时保持现有命令兼容：

```bash
vortex status
vua status
vuc status
```

## 执行与证据

VUC 面向 Android/Termux、Alpine/Linux、ARM64、Windows、GitHub 工作流和本地 MCP 运行环境。

能力声明不是执行证据。只有工作负载真正执行并产生可验证结果时，能力才被视为已测量。

验证模型包括 RFC 8785/JCS、Ed25519、SHA-256、显式执行证据、fail-closed 策略以及独立验证。

## 性能方法

VUC 将测量与结论分离：

```text
CPU × Bend × GPU
A23/Termux × Cloud Run
baseline → load → peak → recovery
p50 / p95 / p99 / throughput / errors
```

k6 压测产生机器可读证据，而不是只依赖截图。

## MCP

治理执行流程：

```text
inspect → propose → verify → execute → evidence
```

写操作需要明确的能力和授权；验证与执行分离。

## 安装

```bash
npm install -g @vucfoundation/vuc
vua status
```

源码：

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

GPU/Bend 验证必须区分：

```text
detected capability
      ≠
executed workload
      ≠
verified result
```

## 文档

- [Português](./README.md)
- [English](./README.en.md)
- [Documentation](./docs/README.md)

## 许可证

MIT.
