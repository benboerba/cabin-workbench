import { getDb } from "../../../../db";
import { scheduleItems } from "../../../../db/schema";
import { isHabitDate } from "../../../lib/dates";
import { requireApiUser } from "../../../lib/current-user";
import {
  replaceParticipants,
  sanitizeParticipantUsernames,
} from "../../../lib/schedule-collaboration";
import { parseScheduleStages } from "../../../lib/schedule-stages";

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
  const parsedStages = kind === "project"
    ? parseScheduleStages(payload.stages, payload.startDate as string, dueDate as string | null)
    : { stages: [], error: null };
  if (parsedStages.error) {
    return Response.json({ error: parsedStages.error }, { status: 400 });
  }

  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    userId: auth.user.userId,
    parentItemId: null,
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
  if (parsedStages.stages.length > 0) {
    await getDb().insert(scheduleItems).values(
      parsedStages.stages.map((stage) => ({
        id: crypto.randomUUID(),
        userId: auth.user.userId,
        parentItemId: item.id,
        kind: "project" as const,
        title: stage.title,
        note: "",
        priority,
        repeatDaily: false,
        startDate: stage.startDate,
        dueDate: stage.dueDate,
        progress: 0,
        status: "active" as const,
        completedDate: null,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }
  const participantUsernames = sanitizeParticipantUsernames(
    payload.participantUsernames,
    auth.user.email,
  );
  await replaceParticipants(
    item.id,
    auth.user.email,
    participantUsernames,
    item.title,
  );
  return Response.json(
    {
      item: {
        ...item,
        ownerUsername: auth.user.email,
        participantUsernames,
        isOwner: true,
        parentTitle: null,
      },
    },
    { status: 201 },
  );
}
