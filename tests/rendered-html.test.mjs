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
  assert.match(app, /TOOLBOX · CABIN 01/);
  assert.match(app, /工作台主导航/);
  assert.match(app, /生活市集/);
  assert.match(app, /娱乐角/);
  assert.match(app, /恢复默认入口/);
  assert.match(styles, /cabin-window/);
  assert.match(app, /个人日程/);
  assert.match(app, /每天生成独立记录/);
  assert.match(app, /今天的推进已记录/);
  assert.match(app, /step="1"/);
  assert.match(app, /自定义项目进度百分比/);
  assert.match(app, /增加或回调都算推进/);
  assert.match(app, /进度修改记录/);
  assert.match(app, /所有项目成员可见/);
  assert.match(app, /formatProgressEntryTime\(entry\.createdAt\)/);
  assert.match(app, /entry\.itemId === projectUpdate\.id && entry\.progress !== null/);
  assert.match(app, /今天，给重要的小事/);
  assert.match(app, /正在坚持/);
  assert.match(app, /新手指引/);
  assert.match(app, /LONG TERM · 长线养成/);
  assert.match(app, /SHORT TERM · 短线执行/);
  assert.match(app, /进入一分小事/);
  assert.match(app, /进入个人日程/);
  assert.match(app, /借鉴主包的工作台/);
  assert.match(app, /workbench-account-menu/);
  assert.doesNotMatch(app, /ScheduleUtilityDock/);
  assert.match(app, /item\.parentItemId \? `\$\{item\.parentTitle \?\? "大项目"\} · 阶段` : "项目"/);
  assert.match(app, /\/downloads\/cabin-workbench-local(?:-\d{8})?\.zip/);
  assert.match(app, /\/downloads\/cabin-workbench-server(?:-\d{8})?\.zip/);
  assert.doesNotMatch(page, /借鉴主包的工作台/);
  assert.match(app, /小事日历/);
  assert.match(app, /紧急暂停/);
  assert.match(app, /游客体验不会保存打卡记录/);
  assert.match(app, /timer-end-button/);
  assert.match(app, /guest-timer-/);
  assert.match(app, /十分钟内回来/);
  assert.match(styles, /timer-overlay/);
  assert.match(styles, /guide-replay-button/);
  assert.match(styles, /guide-dialog/);
  assert.match(styles, /\.work-week-grid > button \{ display: flex; align-items: stretch; flex-direction: column; justify-content: flex-start;/);
  assert.match(portalLinks, /https:\/\/www\.taobao\.com\//);
  assert.match(portalLinks, /https:\/\/www\.jd\.com\//);
  assert.match(app, /前往\{link\.label\}/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
});

test("uses allowlisted username identity and durable server storage", async () => {
  const [page, app, authPage, layout, schema, auth, database, phrases, phraseRoute, gitignore] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/HabitApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/daily-phrases.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/daily-phrase/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.gitignore", import.meta.url), "utf8"),
  ]);

  assert.match(page, /getCurrentUser/);
  assert.match(page, /用户名登录/);
  assert.match(page, /注册账户/);
  assert.match(page, /游客体验/);
  assert.match(authPage, /redirect\("\/"\)/);
  assert.doesNotMatch(authPage, /redirect\(withBasePath/);
  assert.match(layout, /og-three-room-cabin\.png/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(layout, /width:\s*"device-width"/);
  assert.match(schema, /export const users/);
  assert.match(schema, /export const authSessions/);
  assert.match(schema, /export const challenges/);
  assert.match(schema, /export const checkins/);
  assert.match(schema, /export const timerSessions/);
  assert.match(schema, /export const scheduleItems/);
  assert.match(schema, /export const scheduleEntries/);
  assert.match(schema, /previousProgress/);
  assert.match(app, /全部推进记录/);
  assert.match(app, /entry\.actorUsername/);
  assert.match(app, /entry\.previousProgress/);
  assert.match(app, /relatedItemIds\.has\(entry\.itemId\)/);
  assert.match(app, /stageById\.get\(entry\.itemId\)/);
  assert.match(app, /阶段：\$\{stage\.title\}/);
  assert.match(schema, /export const scheduleParticipants/);
  assert.match(schema, /export const notifications/);
  assert.match(schema, /export const dailyPhraseStates/);
  assert.match(schema, /export const portalLinks/);
  assert.match(schema, /onboardingVersion/);
  assert.match(auth, /scrypt-v1/);
  assert.match(auth, /httpOnly:\s*true/);
  assert.match(auth, /timingSafeEqual/);
  assert.match(auth, /cabin_guest/);
  assert.match(auth, /REGISTRATION_USERNAMES/);
  assert.match(database, /better-sqlite3/);
  assert.match(database, /journal_mode = WAL/);
  assert.match(phrases, /倍返しだ/);
  assert.match(phrases, /يلا/);
  assert.match(phrases, /Поехали/);
  assert.match(phraseRoute, /swapCount/);
  assert.match(phraseRoute, /favoriteAt/);
  assert.match(phraseRoute, /learnedAt/);
  assert.match(gitignore, /\*\.pem/);
  assert.match(gitignore, /\/\.data\//);
});

test("supports collaborative project stages on the calendar", async () => {
  const [app, schema, itemRoute, collaboration, stageParser] = await Promise.all([
    readFile(new URL("../app/components/HabitApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/schedule/items/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/schedule-collaboration.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/schedule-stages.ts", import.meta.url), "utf8"),
  ]);

  assert.match(schema, /parentItemId/);
  assert.match(schema, /idx_schedule_items_parent_status/);
  assert.match(itemRoute, /isScheduleParticipant/);
  assert.match(itemRoute, /payload\.stages/);
  assert.match(itemRoute, /payload\.action === "restore"/);
  assert.match(itemRoute, /payload\.action === "delete"/);
  assert.match(itemRoute, /payload\.action === "convert_to_project"/);
  assert.match(collaboration, /syncParticipantRows/);
  assert.match(stageParser, /最多拆成 24 个阶段/);
  assert.match(app, /所有项目成员都能编辑项目、阶段和进度/);
  assert.match(app, /添加一个项目阶段/);
  assert.match(app, /item\.parentItemId \?\? item\.id/);
  assert.match(app, /项目阶段 ·/);
  assert.match(app, /scheduleItemsRelevantForDate\(calendarItems, entries, today, date\)/);
  assert.match(app, /if \(!item\.repeatDaily \|\| item\.kind !== "task"\)/);
  assert.match(app, /range: \{ startDate: occurrenceDate, endDate: occurrenceDate \}/);
  assert.match(app, /每日事项：\$\{segment\.item\.title\}/);
  assert.match(app, /scheduleItems=\{data\?\.scheduleItems \?\? \[\]\}/);
  assert.match(app, /项目已还原/);
  assert.match(app, /项目阶段和全部推进记录都会一起删除/);
  assert.match(app, /已转为项目，可以继续规划/);
  assert.match(app, />转为项目</);
});
