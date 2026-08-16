import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { scheduleEntries, scheduleItems } from "../../../../db/schema";
import { isHabitDate } from "../../../lib/dates";
import { requireApiUser } from "../../../lib/current-user";
import {
  isScheduleParticipant,
  markTodayPendingRead,
  notifyItemCollaborators,
} from "../../../lib/schedule-collaboration";

export async function POST(request: Request) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;
  const payload = (await request.json()) as Record<string, unknown>;
  const itemId = typeof payload.itemId === "string" ? payload.itemId : "";
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  if (!itemId || !isHabitDate(payload.entryDate) || note.length > 2000) {
    return Response.json({ error: "记录信息不完整" }, { status: 400 });
  }

  const db = getDb();
  const [item] = await db
    .select()
    .from(scheduleItems)
    .where(and(eq(scheduleItems.id, itemId), eq(scheduleItems.status, "active")))
    .limit(1);
  if (!item) return Response.json({ error: "这个事项已经结束" }, { status: 404 });
  const canUpdate =
    item.userId === auth.user.userId ||
    (await isScheduleParticipant(itemId, auth.user.email));
  if (!canUpdate) {
    return Response.json({ error: "没有权限更新这个日程" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const progress = item.kind === "project"
    ? Math.max(0, Math.min(100, Number(payload.progress ?? item.progress)))
    : null;
  if (item.kind === "project" && !Number.isFinite(progress)) {
    return Response.json({ error: "进度必须是 0—100 的数字" }, { status: 400 });
  }
  if (item.kind === "project" && progress === item.progress) {
    return Response.json(
      { error: "请先调整进度；增加或回调都算推进" },
      { status: 409 },
    );
  }
  const action = item.kind === "project" ? "touched" as const : "completed" as const;
  const entry = {
    id: crypto.randomUUID(),
    itemId,
    userId: auth.user.userId,
    entryDate: payload.entryDate,
    action,
    previousProgress: item.kind === "project" ? item.progress : null,
    progress,
    note,
    createdAt: now,
    updatedAt: now,
  };

  let saved: typeof scheduleEntries.$inferSelect;
  if (item.kind === "project") {
    [saved] = await db.insert(scheduleEntries).values(entry).returning();
  } else {
    const [existingEntry] = await db
      .select()
      .from(scheduleEntries)
      .where(and(eq(scheduleEntries.itemId, itemId), eq(scheduleEntries.entryDate, payload.entryDate as string)))
      .limit(1);
    if (existingEntry) {
      [saved] = await db
        .update(scheduleEntries)
        .set({ userId: auth.user.userId, action, progress, note, updatedAt: now })
        .where(eq(scheduleEntries.id, existingEntry.id))
        .returning();
    } else {
      [saved] = await db.insert(scheduleEntries).values(entry).returning();
    }
  }

  const shouldCompleteProject =
    item.kind === "project" && progress === 100 && payload.completeProject === true;
  if (item.kind === "project") {
    await db
      .update(scheduleItems)
      .set({
        progress: progress ?? item.progress,
        status: shouldCompleteProject ? "completed" : "active",
        completedDate: shouldCompleteProject ? payload.entryDate : null,
        updatedAt: now,
      })
      .where(eq(scheduleItems.id, itemId));
  } else if (!item.repeatDaily) {
    await db
      .update(scheduleItems)
      .set({ status: "completed", completedDate: payload.entryDate, updatedAt: now })
      .where(eq(scheduleItems.id, itemId));
  }

  await markTodayPendingRead(itemId);
  await notifyItemCollaborators({
    itemId,
    actorUsername: auth.user.email,
    kind: item.kind === "project" ? "progress" : "changed",
    title:
      item.kind === "project"
        ? `${auth.user.email} 更新了项目进度`
        : `${auth.user.email} 完成了关联日程`,
    body:
      item.kind === "project"
        ? `${item.title} · ${item.progress}% → ${progress}% · ${progress! > item.progress ? "向前推进" : "重新校准"}`
        : item.title,
  });

  return Response.json({
    entry: { ...saved, actorUsername: auth.user.email },
    itemCompleted:
      shouldCompleteProject || (item.kind === "task" && !item.repeatDaily),
  });
}
