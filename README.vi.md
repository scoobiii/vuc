# VUC — Vortex Universal Connector

**Ngôn ngữ / Language:** [Português](./README.md) · [English](./README.en.md) · **Tiếng Việt**

**Thực thi có quản trị · Universal Connector · bằng chứng mật mã**

VUC là lớp thực thi và kết nối của kiến trúc Vortex. Nó cung cấp CLI, tích hợp MCP, adapter và khả năng xác minh cho các workload Agent cần thực thi có kiểm soát và bằng chứng có thể xác minh độc lập.

> **Nguyên tắc cốt lõi:** bằng chứng thực thi không phải là bằng chứng an toàn.

## Vortex / VUC / VUA

| Tên | Vai trò |
|---|---|
| **Vortex** | Sản phẩm và giao diện công khai |
| **VUC** | Lớp Universal Connector và thực thi |
| **VUA** | Lớp adapter/quản trị legacy và tương thích nội bộ |

Gói npm hiện tại vẫn là **`@vucfoundation/vuc`** để bảo đảm tương thích.

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

Alias lệnh Vortex:

```bash
vortex status
vua status
vuc status
```

## Thực thi và bằng chứng

VUC hướng tới Android/Termux, Alpine/Linux, ARM64, Windows, GitHub workflows và MCP runtime cục bộ.

Khai báo capability không phải bằng chứng thực thi. Capability chỉ được xem là đã đo khi workload thực sự chạy và tạo ra kết quả có thể xác minh.

Mô hình xác minh sử dụng RFC 8785/JCS, Ed25519, SHA-256, bằng chứng thực thi rõ ràng, chính sách fail-closed và xác minh độc lập.

## Phương pháp hiệu năng

```text
CPU × Bend × GPU
A23/Termux × Cloud Run
baseline → load → peak → recovery
p50 / p95 / p99 / throughput / errors
```

k6 tạo artifact máy có thể đọc thay vì chỉ dựa vào ảnh chụp.

## MCP

```text
inspect → propose → verify → execute → evidence
```

Thao tác ghi yêu cầu capability và quyền rõ ràng; xác minh được tách khỏi thực thi.

## Cài đặt

```bash
npm install -g @vucfoundation/vuc
vua status
```

Từ source:

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

Với GPU/Bend:

```text
detected capability ≠ executed workload ≠ verified result
```

## Tài liệu

- [Português](./README.md)
- [English](./README.en.md)
- [Documentation](./docs/README.md)

## License

MIT.
