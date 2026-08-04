import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("builds the pixel-cabin workbench and both tools", async () => {
  const [page, app, styles, portalLinks] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/HabitApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/portal-links.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /一分小事/);
  assert.match(page, /木屋工作台/);
  assert.match(app, /WELCOME HOME/);
  assert.match(app, /打开木屋工具箱/);
  assert.match(app, /木屋玄关/);
  assert.match(app, /生活市集/);
  assert.match(app, /娱乐角/);
  assert.match(app, /恢复默认入口/);
  assert.match(styles, /cabin-window/);
  assert.match(app, /个人日程/);
  assert.match(app, /每天生成独立记录/);
  assert.match(app, /今天的推进已记录/);
  assert.match(app, /今天，给重要的小事/);
  assert.match(app, /正在坚持/);
  assert.match(app, /新手指引/);
  assert.match(app, /LONG TERM · 长线养成/);
  assert.match(app, /SHORT TERM · 短线执行/);
  assert.match(app, /进入一分小事/);
  assert.match(app, /进入个人日程/);
  assert.match(app, /借鉴主包的工作台/);
  assert.match(app, /\/downloads\/cabin-workbench-local\.zip/);
  assert.match(app, /\/downloads\/cabin-workbench-server\.zip/);
  assert.match(app, /小事日历/);
  assert.match(app, /紧急暂停/);
  assert.match(app, /十分钟内回来/);
  assert.match(styles, /timer-overlay/);
  assert.match(styles, /guide-replay-button/);
  assert.match(styles, /guide-dialog/);
  assert.match(portalLinks, /https:\/\/www\.taobao\.com\//);
  assert.match(portalLinks, /https:\/\/www\.jd\.com\//);
  assert.match(app, /前往\{link\.label\}/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
});

test("uses email identity and durable server storage", async () => {
  const [page, layout, schema, auth, database, gitignore] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../.gitignore", import.meta.url), "utf8"),
  ]);

  assert.match(page, /getCurrentUser/);
  assert.match(page, /邮箱登录/);
  assert.match(page, /注册账户/);
  assert.match(page, /游客体验/);
  assert.match(layout, /og-three-room-cabin\.png/);
  assert.match(schema, /export const users/);
  assert.match(schema, /export const authSessions/);
  assert.match(schema, /export const challenges/);
  assert.match(schema, /export const checkins/);
  assert.match(schema, /export const timerSessions/);
  assert.match(schema, /export const scheduleItems/);
  assert.match(schema, /export const scheduleEntries/);
  assert.match(schema, /export const portalLinks/);
  assert.match(schema, /onboardingVersion/);
  assert.match(auth, /scrypt-v1/);
  assert.match(auth, /httpOnly:\s*true/);
  assert.match(auth, /timingSafeEqual/);
  assert.match(auth, /cabin_guest/);
  assert.match(database, /better-sqlite3/);
  assert.match(database, /journal_mode = WAL/);
  assert.match(gitignore, /\*\.pem/);
  assert.match(gitignore, /\/\.data\//);
});
