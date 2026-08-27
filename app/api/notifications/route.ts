import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { notifications, toolUsage } from "../../../db/schema";
import { requireApiUser } from "../../lib/current-user";
import { getNotifications } from "../../lib/schedule-collaboration";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  if (auth.user.edition === "guest") {
    return Response.json({ notifications: [] });
  }
  await ensureInactiveToolNotifications(auth.user.userId, auth.user.email);
  return Response.json({
    notifications: await getNotifications(auth.user.email),
  });
}

const TOOL_NAMES = {
  habit: "一分小事",
  schedule: "个人日程",
  meal: "今晚吃什么",
  pindou: "拼豆识图",
  favorites: "灵感库",
} as const;

function shanghaiDay(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function dayNumber(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

async function ensureInactiveToolNotifications(userId: string, username: string) {
  const db = getDb();
  const usageRows = await db
    .select({
      toolKey: toolUsage.toolKey,
      firstSeenAt: toolUsage.firstSeenAt,
      lastOpenedAt: toolUsage.lastOpenedAt,
      isFolded: toolUsage.isFolded,
    })
    .from(toolUsage)
    .where(eq(toolUsage.userId, userId));
  const todayNumber = dayNumber(shanghaiDay(new Date()));
  const now = new Date().toISOString();

  for (const usage of usageRows) {
    if (usage.isFolded) continue;
    const reference = usage.lastOpenedAt ?? usage.firstSeenAt;
    const idleDays = Math.max(0, todayNumber - dayNumber(shanghaiDay(reference)));
    if (idleDays <= 7) continue;
    await db.insert(notifications).values({
      id: randomUUID(),
      recipientUsername: username,
      actorUsername: null,
      itemId: null,
      kind: "tool_inactive",
      title: `${TOOL_NAMES[usage.toolKey]}已 ${idleDays} 天未使用`,
      body: "打开使用状态，决定是否收进不常用。",
      uniqueKey: `tool-inactive:${userId}:${usage.toolKey}:${reference}`,
      readAt: null,
      createdAt: now,
    }).onConflictDoUpdate({
      target: notifications.uniqueKey,
      set: {
        title: `${TOOL_NAMES[usage.toolKey]}已 ${idleDays} 天未使用`,
        body: "打开使用状态，决定是否收进不常用。",
      },
    });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;
  const payload = (await request.json()) as Record<string, unknown>;
  const now = new Date().toISOString();
  const db = getDb();

  if (payload.all === true) {
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(
          eq(notifications.recipientUsername, auth.user.email),
          isNull(notifications.readAt),
        ),
      );
    return Response.json({ ok: true });
  }

  const id = typeof payload.id === "string" ? payload.id : "";
  if (!id) {
    return Response.json({ error: "没有找到这条提醒" }, { status: 400 });
  }
  await db
    .update(notifications)
    .set({ readAt: now })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientUsername, auth.user.email),
      ),
    );
  return Response.json({ ok: true });
}
