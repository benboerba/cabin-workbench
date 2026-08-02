import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("builds the complete one-minute habit experience", async () => {
  const [page, app, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/HabitApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /一分小事/);
  assert.match(app, /今天，给重要的小事/);
  assert.match(app, /正在坚持/);
  assert.match(app, /小事日历/);
  assert.match(app, /紧急暂停/);
  assert.match(app, /十分钟内回来/);
  assert.match(styles, /timer-overlay/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
});

test("uses private identity and durable storage", async () => {
  const [page, layout, hosting, schema] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /getCurrentUser/);
  assert.match(page, /chatGPTSignInPath/);
  assert.match(layout, /og\.png/);
  assert.match(hosting, /"d1":\s*"DB"/);
  assert.match(schema, /export const challenges/);
  assert.match(schema, /export const checkins/);
  assert.match(schema, /export const timerSessions/);
});
