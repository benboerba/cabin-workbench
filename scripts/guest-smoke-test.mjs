import assert from "node:assert/strict";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = String(4800 + Math.floor(Math.random() * 300));
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(path.join(root, "node_modules", ".bin", "next"), ["start", "--hostname", "127.0.0.1", "--port", port], {
  cwd: root,
  env: {
    ...process.env,
    APP_MODE: "server",
    DATABASE_PATH: path.join(root, ".codex_work", `guest-smoke-${Date.now()}.db`),
    COOKIE_SECURE: "false",
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let logs = "";
child.stdout.on("data", (chunk) => { logs += chunk.toString(); });
child.stderr.on("data", (chunk) => { logs += chunk.toString(); });

try {
  await waitUntilReady();

  const entry = await fetch(`${baseUrl}/guest`, { redirect: "manual" });
  assert.equal(entry.status, 303);
  assert.equal(entry.headers.get("location"), "/");
  const cookie = entry.headers.get("set-cookie")?.split(";", 1)[0];
  assert.equal(cookie, "cabin_guest=1");

  const home = await request("/", cookie);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /游客体验/);

  const dashboard = await request("/api/dashboard", cookie);
  assert.equal(dashboard.status, 200);
  const data = await dashboard.json();
  assert.ok(data.challenges.length >= 2);
  assert.ok(data.scheduleItems.some((item) => item.kind === "project"));
  assert.ok(data.portalLinks.length >= 8);

  const write = await request("/api/challenges", cookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "游客不能写入", createdDate: localDate() }),
  });
  assert.equal(write.status, 403);
  assert.match(await write.text(), /游客模式只能查看/);

  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `guest-conversion-${Date.now()}@example.com`,
      password: "Guest-Test-Password-2026!",
      displayName: "正式账户测试",
    }),
  });
  assert.equal(registration.status, 201, await registration.text());
  const accountCookie = registration.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(accountCookie?.startsWith("cabin_session="));
  const accountWrite = await request("/api/challenges", accountCookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "正式账户可以写入", createdDate: localDate() }),
  });
  assert.equal(accountWrite.status, 201);

  console.log("Guest smoke test passed: demo data is visible, guest writes are blocked, and account writes still work.");
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  child.kill("SIGTERM");
}

function request(pathname, cookie, init = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: { ...(init.headers ?? {}), cookie },
  });
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Server exited early (${child.exitCode}).`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The test server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for the guest test server.");
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
