import assert from "node:assert/strict";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = String(4400 + Math.floor(Math.random() * 400));
const baseUrl = `http://127.0.0.1:${port}`;
const dataPath = path.join(".codex_work", `local-smoke-${Date.now()}.db`);
let logs = "";
let child = startApp();
let challengeId = "";

try {
  await waitUntilReady(child);

  const home = await fetch(baseUrl);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /个人本地版/);
  assert.doesNotMatch(html, /邮箱登录/);

  const created = await fetch(`${baseUrl}/api/challenges`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: `本地写入测试 ${Date.now()}`,
      createdDate: localDate(),
    }),
  });
  const createdBody = await created.text();
  assert.equal(created.status, 201, createdBody);
  const { challenge } = JSON.parse(createdBody);
  challengeId = challenge.id;

  const dashboard = await fetch(`${baseUrl}/api/dashboard`);
  assert.equal(dashboard.status, 200);
  const data = await dashboard.json();
  assert.ok(data.challenges.some((item) => item.id === challenge.id));

  const onboarding = await fetch(`${baseUrl}/api/onboarding`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ version: 1 }),
  });
  assert.equal(onboarding.status, 200);

  await stopApp(child);
  child = startApp();
  await waitUntilReady(child);

  const restartedDashboard = await fetch(`${baseUrl}/api/dashboard`);
  assert.equal(restartedDashboard.status, 200);
  const restartedData = await restartedDashboard.json();
  assert.ok(restartedData.challenges.some((item) => item.id === challengeId));

  console.log(`Local smoke test passed: no-login access and restart-safe file persistence (${dataPath}).`);
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  await stopApp(child);
}

function startApp() {
  const processChild = spawn(process.execPath, ["scripts/local-start.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      LOCAL_PORT: port,
      LOCAL_DATA_PATH: dataPath,
      NO_OPEN: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  processChild.stdout.on("data", (chunk) => { logs += chunk.toString(); });
  processChild.stderr.on("data", (chunk) => { logs += chunk.toString(); });
  return processChild;
}

async function stopApp(processChild) {
  if (processChild.exitCode !== null) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 5000);
    processChild.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    processChild.kill("SIGTERM");
  });
}

async function waitUntilReady(processChild) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    if (processChild.exitCode !== null) throw new Error(`Local app exited early (${processChild.exitCode}).`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The local server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for the local app.");
}

function localDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
