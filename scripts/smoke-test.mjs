import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4271";
const password = `Test-${randomUUID()}-Aa1!`;

async function register(username) {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (response.status !== 201) {
    assert.fail(`registration failed (${response.status}): ${await response.text()}`);
  }
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie?.startsWith("cabin_session="), "registration did not set a session cookie");
  return { username, cookie };
}

async function request(path, cookie, init = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      cookie,
    },
  });
}

const first = await register("smoke-first");
const habitDate = new Date().toISOString().slice(0, 10);
const created = await request("/api/challenges", first.cookie, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ title: "账户隔离检查", createdDate: habitDate }),
});
if (created.status !== 201) {
  assert.fail(`challenge creation failed (${created.status}): ${await created.text()}`);
}
const { challenge } = await created.json();

const firstDashboard = await request("/api/dashboard", first.cookie);
assert.equal(firstDashboard.status, 200);
const firstData = await firstDashboard.json();
assert.ok(firstData.challenges.some((item) => item.id === challenge.id));

const second = await register("smoke-second");
const secondDashboard = await request("/api/dashboard", second.cookie);
assert.equal(secondDashboard.status, 200);
const secondData = await secondDashboard.json();
assert.ok(!secondData.challenges.some((item) => item.id === challenge.id));

const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: first.username, password: "definitely-wrong" }),
});
assert.equal(badLogin.status, 401);

console.log("Smoke test passed: registration, sessions, writes, and account isolation.");
