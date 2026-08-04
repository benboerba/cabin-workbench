import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeMajor = Number(process.versions.node.split(".")[0]);
const port = String(process.env.LOCAL_PORT || "4310");
const host = "127.0.0.1";
const url = `http://${host}:${port}`;
const dataPath = path.resolve(
  root,
  process.env.LOCAL_DATA_PATH || path.join("local-data", "cabin-workbench.db"),
);
const nextBinary = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);

if (!Number.isFinite(nodeMajor) || nodeMajor < 22) {
  console.error(`个人本地版需要 Node.js 22 或更高版本，当前是 ${process.versions.node}。`);
  process.exit(1);
}

if (!existsSync(nextBinary)) {
  console.log("首次启动：正在自动准备运行环境…");
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const installCode = await run(npmCommand, ["install", "--no-audit", "--no-fund"]);
  if (installCode !== 0) process.exit(installCode ?? 1);
}

console.log("\n木屋工作台 · 个人本地版");
console.log(`访问地址：${url}`);
console.log(`数据文件：${dataPath}`);
console.log("按 Ctrl+C 可停止运行。\n");

const child = spawn(nextBinary, ["dev", "--webpack", "--hostname", host, "--port", port], {
  cwd: root,
  env: {
    ...process.env,
    APP_MODE: "local",
    DATABASE_PATH: dataPath,
    COOKIE_SECURE: "false",
    NEXT_PUBLIC_BASE_PATH: "",
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: "inherit",
});

let stopped = false;
child.on("exit", (code, signal) => {
  stopped = true;
  if (signal) process.exitCode = 0;
  else process.exitCode = code ?? 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!stopped) child.kill(signal);
  });
}

if (process.env.NO_OPEN !== "1" && process.env.CI !== "true") {
  void openWhenReady();
}

async function openWhenReady() {
  for (let attempt = 0; attempt < 120 && !stopped; attempt += 1) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) {
        const command = process.platform === "darwin"
          ? ["open", [url]]
          : process.platform === "win32"
            ? ["cmd", ["/c", "start", "", url]]
            : ["xdg-open", [url]];
        spawn(command[0], command[1], { stdio: "ignore", detached: true }).unref();
        return;
      }
    } catch {
      // The local server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

function run(command, args) {
  return new Promise((resolve) => {
    const processChild = spawn(command, args, { cwd: root, stdio: "inherit" });
    processChild.on("exit", (code) => resolve(code));
    processChild.on("error", () => resolve(1));
  });
}
