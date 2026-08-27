import { and, eq, isNull, like } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "../../../db";
import { notifications, toolUsage } from "../../../db/schema";
import { requireApiUser } from "../../lib/current-user";

export const dynamic = "force-dynamic";

const TOOL_KEYS = ["habit", "schedule", "meal", "pindou", "favorites"] as const;
type ToolKey = (typeof TOOL_KEYS)[number];

function isToolKey(value: unknown): value is ToolKey {
  return typeof value === "string" && TOOL_KEYS.includes(value as ToolKey);
}

async function listUsage(userId: string) {
  return getDb()
    .select({
      toolKey: toolUsage.toolKey,
      openCount: toolUsage.openCount,
      firstSeenAt: toolUsage.firstSeenAt,
      lastOpenedAt: toolUsage.lastOpenedAt,
      isFolded: toolUsage.isFolded,
    })
    .from(toolUsage)
    .where(eq(toolUsage.userId, userId));
}

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const now = new Date().toISOString();
  if (auth.user.edition === "guest") {
    return Response.json({
      usage: TOOL_KEYS.map((toolKey) => ({
        toolKey,
        openCount: 0,
        firstSeenAt: now,
        lastOpenedAt: null,
        isFolded: false,
      })),
    });
  }

  const db = getDb();
  await db.insert(toolUsage).values(
    TOOL_KEYS.map((toolKey) => ({
      id: randomUUID(),
      userId: auth.user.userId,
      toolKey,
      firstSeenAt: now,
      updatedAt: now,
    })),
  ).onConflictDoNothing();

  return Response.json({ usage: await listUsage(auth.user.userId) });
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;

  let body: { toolKey?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不正确" }, { status: 400 });
  }
  if (!isToolKey(body.toolKey)) {
    return Response.json({ error: "不支持这个工具" }, { status: 400 });
  }
  const action = body.action === undefined ? "use" : String(body.action);
  if (!["use", "open", "fold", "restore"].includes(action)) {
    return Response.json({ error: "不支持这个操作" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  if (action === "use" || action === "open") {
    await db.insert(toolUsage).values({
      id: randomUUID(),
      userId: auth.user.userId,
      toolKey: body.toolKey,
      openCount: 0,
      firstSeenAt: now,
      lastOpenedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [toolUsage.userId, toolUsage.toolKey],
      set: {
        lastOpenedAt: now,
        updatedAt: now,
      },
    });
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(and(
        eq(notifications.recipientUsername, auth.user.email),
        eq(notifications.kind, "tool_inactive"),
        like(notifications.uniqueKey, `tool-inactive:${auth.user.userId}:${body.toolKey}:%`),
        isNull(notifications.readAt),
      ));
  } else {
    const isFolded = action === "fold";
    await db.insert(toolUsage).values({
      id: randomUUID(),
      userId: auth.user.userId,
      toolKey: body.toolKey,
      openCount: 0,
      firstSeenAt: now,
      isFolded,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [toolUsage.userId, toolUsage.toolKey],
      set: { isFolded, updatedAt: now },
    });
  }

  const [usage] = await db
    .select({
      toolKey: toolUsage.toolKey,
      openCount: toolUsage.openCount,
      firstSeenAt: toolUsage.firstSeenAt,
      lastOpenedAt: toolUsage.lastOpenedAt,
      isFolded: toolUsage.isFolded,
    })
    .from(toolUsage)
    .where(and(
      eq(toolUsage.userId, auth.user.userId),
      eq(toolUsage.toolKey, body.toolKey),
    ))
    .limit(1);

  return Response.json({ usage });
}
