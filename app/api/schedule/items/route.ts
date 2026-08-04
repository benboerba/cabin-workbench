import { getDb } from "../../../../db";
import { scheduleItems } from "../../../../db/schema";
import { isHabitDate } from "../../../lib/dates";
import { requireApiUser } from "../../../lib/current-user";

const PRIORITIES = new Set(["important", "normal", "later"]);

export async function POST(request: Request) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;
  const payload = (await request.json()) as Record<string, unknown>;
  const kind: "project" | "task" | null =
    payload.kind === "project" ? "project" : payload.kind === "task" ? "task" : null;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  const priority = typeof payload.priority === "string" && PRIORITIES.has(payload.priority)
    ? (payload.priority as "important" | "normal" | "later")
    : "normal";
  const dueDate = payload.dueDate === "" || payload.dueDate == null ? null : payload.dueDate;

  if (!kind || !title || title.length > 80) {
    return Response.json({ error: "请写下 1—80 个字的名称" }, { status: 400 });
  }
  if (!isHabitDate(payload.startDate) || (dueDate !== null && !isHabitDate(dueDate))) {
    return Response.json({ error: "日期格式不正确" }, { status: 400 });
  }
  if (dueDate && dueDate < payload.startDate) {
    return Response.json({ error: "截止日期不能早于开始日期" }, { status: 400 });
  }
  if (note.length > 2000) {
    return Response.json({ error: "备注不能超过 2000 个字" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    userId: auth.user.userId,
    kind,
    title,
    note,
    priority,
    repeatDaily: kind === "task" && payload.repeatDaily === true,
    startDate: payload.startDate,
    dueDate: kind === "project" ? dueDate : null,
    progress: 0,
    status: "active" as const,
    completedDate: null,
    createdAt: now,
    updatedAt: now,
  };
  await getDb().insert(scheduleItems).values(item);
  return Response.json({ item }, { status: 201 });
}
