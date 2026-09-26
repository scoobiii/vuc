# Termux GPU execution

The GPU matrix is implemented for a real Termux host. It is fail-closed: device enumeration is evidence of availability only and never becomes a GPU PASS by itself.

## Cells

- `gpu-js`: executes a real CUDA matrix workload when Termux exposes CUDA and Python/PyTorch.
- `gpu-bend`: requires the native Bend runner plus a CUDA-capable runtime. Detection alone returns `UNAVAILABLE`; it never claims certification.

## Run

```bash
npm ci
VUC_GPU_CELL=gpu-js npm run gpu:termux
VUC_GPU_CELL=gpu-bend npm run gpu:termux
```

The command emits `vuc-termux-gpu-execution-evidence/v1` with the host, detected backends, execution result and SHA-256 evidence digest.

## Backend policy

Supported probes are `vulkaninfo`, `clinfo`, and `nvidia-smi`. Vulkan/OpenCL enumeration is not itself a compute certification. A backend must execute the workload before the result can be `PASS`.

`VUC_ALLOW_UNAVAILABLE=true` is intended only for discovery/probing. It must not be used by a certification gate.

## CI

GitHub-hosted Linux runners are not Termux/Android GPU certification hosts. The certified GPU execution path therefore runs on the Termux device; CI may validate the evidence schema/hash but must not manufacture a PASS when the device is unavailable.
