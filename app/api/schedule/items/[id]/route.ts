import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { scheduleItems } from "../../../../../db/schema";
import { isHabitDate } from "../../../../lib/dates";
import { requireApiUser } from "../../../../lib/current-user";

const PRIORITIES = new Set(["important", "normal", "later"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const payload = (await request.json()) as Record<string, unknown>;
  const db = getDb();
  const [item] = await db
    .select()
    .from(scheduleItems)
    .where(and(eq(scheduleItems.id, id), eq(scheduleItems.userId, auth.user.userId)))
    .limit(1);
  if (!item) return Response.json({ error: "没有找到这个事项" }, { status: 404 });

  const now = new Date().toISOString();
  if (payload.action === "archive") {
    await db
      .update(scheduleItems)
      .set({ status: "archived", updatedAt: now })
      .where(eq(scheduleItems.id, id));
    return Response.json({ ok: true });
  }

  if (payload.action !== "update") {
    return Response.json({ error: "无法完成这个操作" }, { status: 400 });
  }
  const title = typeof payload.title === "string" ? payload.title.trim() : item.title;
  const note = typeof payload.note === "string" ? payload.note.trim() : item.note;
  const priority = typeof payload.priority === "string" && PRIORITIES.has(payload.priority)
    ? (payload.priority as "important" | "normal" | "later")
    : item.priority;
  const dueDate = payload.dueDate === "" || payload.dueDate == null ? null : payload.dueDate;
  if (!title || title.length > 80 || note.length > 2000) {
    return Response.json({ error: "名称或备注长度不正确" }, { status: 400 });
  }
  if (dueDate !== null && !isHabitDate(dueDate)) {
    return Response.json({ error: "截止日期格式不正确" }, { status: 400 });
  }

  const [updated] = await db
    .update(scheduleItems)
    .set({
      title,
      note,
      priority,
      repeatDaily: item.kind === "task" && payload.repeatDaily === true,
      dueDate: item.kind === "project" ? dueDate : null,
      updatedAt: now,
    })
    .where(eq(scheduleItems.id, id))
    .returning();
  return Response.json({ item: updated });
}
