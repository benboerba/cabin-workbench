import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { scheduleEntries, scheduleItems } from "../../../../db/schema";
import { isHabitDate } from "../../../lib/dates";
import { requireApiUser } from "../../../lib/current-user";

export async function POST(request: Request) {
  const auth = await requireApiUser();
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
    .where(
      and(
        eq(scheduleItems.id, itemId),
        eq(scheduleItems.userId, auth.user.userId),
        eq(scheduleItems.status, "active"),
      ),
    )
    .limit(1);
  if (!item) return Response.json({ error: "这个事项已经结束" }, { status: 404 });

  const now = new Date().toISOString();
  const progress = item.kind === "project"
    ? Math.max(0, Math.min(100, Number(payload.progress ?? item.progress)))
    : null;
  if (item.kind === "project" && !Number.isFinite(progress)) {
    return Response.json({ error: "进度必须是 0—100 的数字" }, { status: 400 });
  }
  const action = item.kind === "project" ? "touched" as const : "completed" as const;
  const entry = {
    id: crypto.randomUUID(),
    itemId,
    userId: auth.user.userId,
    entryDate: payload.entryDate,
    action,
    progress,
    note,
    createdAt: now,
    updatedAt: now,
  };

  const [saved] = await db
    .insert(scheduleEntries)
    .values(entry)
    .onConflictDoUpdate({
      target: [scheduleEntries.itemId, scheduleEntries.entryDate],
      set: { action, progress, note, updatedAt: now },
    })
    .returning();

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

  return Response.json({ entry: saved, itemCompleted: shouldCompleteProject || (item.kind === "task" && !item.repeatDaily) });
}
