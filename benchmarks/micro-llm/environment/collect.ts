import { execFileSync } from "node:child_process";
import { cpus, totalmem } from "node:os";
import { statfsSync } from "node:fs";

function command(name: string, args: string[] = []): string {
  try { return execFileSync(name, args, { encoding: "utf8" }).trim(); }
  catch { return ""; }
}

const disk = statfsSync("/");
const result = {
  runner_os: process.env.RUNNER_OS ?? process.platform,
  runner_arch: process.env.RUNNER_ARCH ?? process.arch,
  cpu_cores: cpus().length,
  memory_bytes: totalmem(),
  disk_bytes: disk.blocks * disk.bsize,
  github_runner_name: process.env.RUNNER_NAME ?? "",
  github_repository: process.env.GITHUB_REPOSITORY ?? "",
  github_ref: process.env.GITHUB_REF ?? "",
  github_sha: process.env.GITHUB_SHA ?? "",
  github_run_id: process.env.GITHUB_RUN_ID ?? "",
  kernel: command("uname", ["-r"]),
  uname_arch: command("uname", ["-m"]),
  nproc: command("nproc"),
  free: command("free", ["-b"]),
  df: command("df", ["-B1", "/"])
};

console.log(JSON.stringify(result, null, 2));
