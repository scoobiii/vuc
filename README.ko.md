# VUC — Vortex Universal Connector

**언어 / Language:** [Português](./README.md) · [English](./README.en.md) · **한국어**

**거버넌스 실행 · Universal Connector · 암호학적 증거**

VUC는 Vortex 아키텍처의 실행 및 연결 계층입니다. CLI, MCP 통합, 어댑터와 검증 기능을 제공하며, 제한된 실행과 독립적으로 검증 가능한 증거가 필요한 Agent 워크로드를 지원합니다.

> **핵심 원칙:** 실행 증명은 안전성 증명이 아닙니다.

## Vortex / VUC / VUA

| 이름 | 역할 |
|---|---|
| **Vortex** | 공개 제품 및 사용자 인터페이스 |
| **VUC** | Universal Connector 및 실행 계층 |
| **VUA** | 레거시/내부 어댑터 및 거버넌스 호환 계층 |

호환성을 위해 npm 패키지는 **`@vucfoundation/vuc`**를 유지합니다.

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

Vortex 명령 별칭:

```bash
vortex status
vua status
vuc status
```

## 실행과 증거

Android/Termux, Alpine/Linux, ARM64, Windows, GitHub workflow 및 로컬 MCP 환경을 대상으로 합니다.

Capability 선언만으로는 실행 증거가 아닙니다. 실제 워크로드가 실행되고 검증 가능한 결과를 생성해야 측정된 capability로 취급합니다.

검증 모델에는 RFC 8785/JCS, Ed25519, SHA-256, 명시적 실행 증거, fail-closed 정책 및 독립 검증이 포함됩니다.

## 성능 방법론

```text
CPU × Bend × GPU
A23/Termux × Cloud Run
baseline → load → peak → recovery
p50 / p95 / p99 / throughput / errors
```

k6는 스크린샷이 아니라 기계 판독 가능한 성능 증거를 생성합니다.

## MCP

```text
inspect → propose → verify → execute → evidence
```

쓰기 작업에는 명시적인 capability와 권한이 필요하며 검증과 실행은 분리됩니다.

## 설치

```bash
npm install -g @vucfoundation/vuc
vua status
```

소스:

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

GPU/Bend 검증에서는 다음을 구분합니다:

```text
detected capability ≠ executed workload ≠ verified result
```

## 문서

- [Português](./README.md)
- [English](./README.en.md)
- [Documentation](./docs/README.md)

## License

MIT.
