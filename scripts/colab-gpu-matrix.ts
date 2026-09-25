import { GoogleColabAdapter } from '../src/vortex/adapters/google-colab-adapter.js';

const cell = process.env.VUC_GPU_CELL;
if (cell !== 'gpu-js' && cell !== 'gpu-bend') {
  throw new Error('VUC_GPU_CELL must be gpu-js or gpu-bend');
}

const accelerator = process.env.VUC_COLAB_ACCELERATOR ?? 'L4';
const adapter = new GoogleColabAdapter();

const gpuJs = `
import subprocess, json, time, platform
subprocess.run(["nvidia-smi", "-L"], check=True)
node = subprocess.run(["node", "--version"], text=True, capture_output=True, check=True)
cuda_probe = r"""
import json, time, torch
if not torch.cuda.is_available():
    raise SystemExit("CUDA is unavailable in the Colab runtime")
device = torch.device("cuda")
a = torch.ones((2048, 2048), device=device)
b = torch.ones((2048, 2048), device=device)
torch.cuda.synchronize()
t0 = time.perf_counter()
for _ in range(20):
    c = torch.mm(a, b)
torch.cuda.synchronize()
elapsed = (time.perf_counter() - t0) * 1000
print(json.dumps({
    "cuda": torch.version.cuda,
    "torch": torch.__version__,
    "device": torch.cuda.get_device_name(0),
    "matrix": "2048x2048",
    "iterations": 20,
    "elapsed_ms": elapsed,
    "checksum": float(c[0, 0].item())
}))
"""
probe = subprocess.run(["python", "-c", cuda_probe], text=True, capture_output=True, check=True)
cuda = json.loads(probe.stdout.strip().splitlines()[-1])
print("VUC_RESULT=" + json.dumps({
    "cell":"gpu-js",
    "status":"PASS",
    "gpu":cuda["device"],
    "node":node.stdout.strip(),
    "cuda":cuda["cuda"],
    "torch":cuda["torch"],
    "compute":"torch.mm on CUDA",
    "matrix":cuda["matrix"],
    "iterations":cuda["iterations"],
    "elapsed_ms":cuda["elapsed_ms"],
    "checksum":cuda["checksum"],
    "host":platform.platform()
}))
`;

const gpuBend = `
import hashlib, json, os, pathlib, subprocess, tempfile, time, urllib.request, tarfile
subprocess.run(["nvidia-smi", "-L"], check=True)
root = pathlib.Path("/tmp/vuc-bend")
root.mkdir(parents=True, exist_ok=True)
tar_path = root / "bend.tar.gz"
url = "https://github.com/bendlang/bend/releases/download/v2.0.25/bend-2.0.25-linux-x64.tar.gz"
expected = "91c0e2640f8d2e3e73fd3dd62ed4d178ce9a6f7ce8f8980b4dc4abf7a6f9ccd4"
if not tar_path.exists():
    urllib.request.urlretrieve(url, tar_path)
actual = hashlib.sha256(tar_path.read_bytes()).hexdigest()
if actual != expected:
    raise SystemExit("Bend release SHA-256 mismatch")
binroot = root / "bin"
if not (binroot / "bin" / "bend").exists():
    binroot.mkdir(parents=True, exist_ok=True)
    with tarfile.open(tar_path, "r:gz") as tf:
        tf.extractall(binroot)
bend = binroot / "bin" / "bend"
bend.chmod(0o755)
src = root / "gpu.bend"
src.write_text("""import Base

def pow2(+d: Nat) -> U32:
  match d:
    case 0n:
      1
    case 1n+p:
      a b = pow2(p) pow2(p)
      (a + b : U32)

def main() -> U32:
  pow2!(18n)
""")
exe = root / "gpu-bench"
subprocess.run([str(bend), str(src), "-o", str(exe)], check=True, text=True, capture_output=True)
t0 = time.perf_counter()
run = subprocess.run([str(exe), "--gpu", "1GB"], check=True, text=True, capture_output=True)
elapsed = (time.perf_counter()-t0)*1000
print("VUC_RESULT=" + json.dumps({"cell":"gpu-bend","status":"PASS","gpu":subprocess.check_output(["nvidia-smi","--query-gpu=name","--format=csv,noheader"], text=True).strip(),"bend":"2.0.25","result":run.stdout.strip(),"elapsed_ms":elapsed}))
`;

const code = cell === 'gpu-js' ? gpuJs : gpuBend;
const started = Date.now();
const runtime = await adapter.createGpuRuntime({ accelerator });
try {
  const execution = await adapter.executeCode(runtime.name, code, 300_000);
  const output = execution.stdout + execution.stderr;
  const marker = output.split('VUC_RESULT=').pop()?.trim();
  let result: unknown = undefined;
  if (marker) {
    try { result = JSON.parse(marker); } catch {}
  }
  if (execution.status !== 'ok' || !result) {
    throw new Error(`Colab ${cell} failed: ${output.slice(-4000)}`);
  }
  console.log(JSON.stringify({
    cell,
    status: 'PASS',
    accelerator,
    runtime: runtime.name,
    elapsed_ms: Date.now() - started,
    result,
  }));
} finally {
  await adapter.deleteRuntime(runtime.name).catch((error) => {
    console.error(`Colab runtime cleanup failed: ${String(error)}`);
  });
}
