import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { scheduleEntries, scheduleItems } from "../../../../../db/schema";
import { isHabitDate } from "../../../../lib/dates";
import { requireApiUser } from "../../../../lib/current-user";
import {
  getItemCollaborators,
  isScheduleParticipant,
  notifyItemCollaborators,
  replaceParticipants,
  sanitizeParticipantUsernames,
} from "../../../../lib/schedule-collaboration";
import { parseScheduleStages } from "../../../../lib/schedule-stages";

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
    .where(eq(scheduleItems.id, id))
    .limit(1);
  if (!item) return Response.json({ error: "没有找到这个事项" }, { status: 404 });
  const isOwner = item.userId === auth.user.userId;
  const canEdit = isOwner || (
    item.kind === "project" && await isScheduleParticipant(id, auth.user.email)
  );
  if (!canEdit) {
    return Response.json({ error: `没有权限编辑这个${item.kind === "project" ? "项目" : "事项"}` }, { status: 403 });
  }

  const now = new Date().toISOString();
  if (payload.action === "convert_to_project") {
    if (!isOwner) {
      return Response.json({ error: "只有事项创建者可以转为项目" }, { status: 403 });
    }
    if (item.kind !== "task" || item.status !== "active") {
      return Response.json({ error: "只有正在进行的事项可以转为项目" }, { status: 409 });
    }
    const projectStartDate = typeof payload.startDate === "string" ? payload.startDate : item.startDate;
    if (!isHabitDate(projectStartDate)) {
      return Response.json({ error: "项目开始日期格式不正确" }, { status: 400 });
    }
    const [updated] = await db
      .update(scheduleItems)
      .set({
        kind: "project",
        repeatDaily: false,
        startDate: projectStartDate,
        dueDate: null,
        progress: 0,
        status: "active",
        completedDate: null,
        updatedAt: now,
      })
      .where(eq(scheduleItems.id, id))
      .returning();
    const collaboration = await getItemCollaborators(id);
    await notifyItemCollaborators({
      itemId: id,
      actorUsername: auth.user.email,
      kind: "changed",
      title: `${auth.user.email} 把关联事项转成了项目`,
      body: item.title,
    });
    return Response.json({
      item: {
        ...updated,
        ownerUsername: auth.user.email,
        participantUsernames: collaboration?.participantUsernames ?? [],
        isOwner: true,
        parentTitle: null,
      },
    });
  }

  if (payload.action === "restore" || payload.action === "delete") {
    if (!isOwner) {
      return Response.json({ error: "只有项目创建者可以还原或删除项目" }, { status: 403 });
    }
    if (item.kind !== "project" || item.parentItemId) {
      return Response.json({ error: "只能处理完整的大项目" }, { status: 400 });
    }
    if (item.status === "active") {
      return Response.json({ error: "正在推进的项目不能还原或删除" }, { status: 409 });
    }

    if (payload.action === "restore") {
      await db
        .update(scheduleItems)
        .set({ status: "active", completedDate: null, updatedAt: now })
        .where(eq(scheduleItems.id, id));
      if (item.status === "archived") {
        await db
          .update(scheduleItems)
          .set({ status: "active", completedDate: null, updatedAt: now })
          .where(
            and(
              eq(scheduleItems.parentItemId, id),
              eq(scheduleItems.status, "archived"),
              eq(scheduleItems.updatedAt, item.updatedAt),
            ),
          );
      }
      await notifyItemCollaborators({
        itemId: id,
        actorUsername: auth.user.email,
        kind: "changed",
        title: `${auth.user.email} 还原了关联项目`,
        body: item.title,
      });
      return Response.json({ ok: true });
    }

    const childRows = await db
      .select({ id: scheduleItems.id })
      .from(scheduleItems)
      .where(eq(scheduleItems.parentItemId, id));
    const relatedIds = [id, ...childRows.map((row) => row.id)];
    await notifyItemCollaborators({
      itemId: id,
      actorUsername: auth.user.email,
      kind: "removed",
      title: `${auth.user.email} 永久删除了关联项目`,
      body: item.title,
    });
    await db.delete(scheduleEntries).where(inArray(scheduleEntries.itemId, relatedIds));
    await db.delete(scheduleItems).where(inArray(scheduleItems.id, relatedIds));
    return Response.json({ ok: true });
  }

  if (payload.action === "archive") {
    if (!isOwner) {
      return Response.json({ error: "只有项目创建者可以结束项目" }, { status: 403 });
    }
    await db
      .update(scheduleItems)
      .set({ status: "archived", updatedAt: now })
      .where(eq(scheduleItems.id, id));
    if (item.kind === "project" && !item.parentItemId) {
      await db
        .update(scheduleItems)
        .set({ status: "archived", updatedAt: now })
        .where(eq(scheduleItems.parentItemId, id));
    }
    await notifyItemCollaborators({
      itemId: id,
      actorUsername: auth.user.email,
      kind: "removed",
      title: `${auth.user.email} 结束了关联日程`,
      body: item.title,
    });
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
  const startDate = typeof payload.startDate === "string" ? payload.startDate : item.startDate;
  const dueDate = payload.dueDate === undefined
    ? item.dueDate
    : payload.dueDate === "" || payload.dueDate == null
      ? null
      : typeof payload.dueDate === "string"
        ? payload.dueDate
        : item.dueDate;
  if (!title || title.length > 80 || note.length > 2000) {
    return Response.json({ error: "名称或备注长度不正确" }, { status: 400 });
  }
  if (!isHabitDate(startDate) || (dueDate !== null && !isHabitDate(dueDate))) {
    return Response.json({ error: "项目日期格式不正确" }, { status: 400 });
  }
  if (dueDate && dueDate < startDate) {
    return Response.json({ error: "截止日期不能早于开始日期" }, { status: 400 });
  }
  const parsedStages = item.kind === "project" && !item.parentItemId && payload.stages !== undefined
    ? parseScheduleStages(payload.stages, startDate, dueDate as string | null)
    : { stages: [], error: null };
  if (parsedStages.error) {
    return Response.json({ error: parsedStages.error }, { status: 400 });
  }
  const currentStages = item.kind === "project" && !item.parentItemId && payload.stages !== undefined
    ? await db.select().from(scheduleItems).where(eq(scheduleItems.parentItemId, id))
    : [];
  const currentStageIds = new Set(currentStages.map((stage) => stage.id));
  if (parsedStages.stages.some((stage) => stage.id && !currentStageIds.has(stage.id))) {
    return Response.json({ error: "有一个项目阶段已不存在，请刷新后重试" }, { status: 409 });
  }

  const [updated] = await db
    .update(scheduleItems)
    .set({
      title,
      note,
      priority,
      repeatDaily: item.kind === "task" && payload.repeatDaily === true,
      startDate,
      dueDate: item.kind === "project" ? dueDate : null,
      updatedAt: now,
    })
    .where(eq(scheduleItems.id, id))
    .returning();

  if (item.kind === "project" && !item.parentItemId && payload.stages !== undefined) {
    const retainedIds = new Set<string>();
    for (const stage of parsedStages.stages) {
      if (stage.id) {
        retainedIds.add(stage.id);
        await db
          .update(scheduleItems)
          .set({
            title: stage.title,
            priority,
            startDate: stage.startDate,
            dueDate: stage.dueDate,
            updatedAt: now,
          })
          .where(eq(scheduleItems.id, stage.id));
      } else {
        const stageId = crypto.randomUUID();
        retainedIds.add(stageId);
        await db.insert(scheduleItems).values({
          id: stageId,
          userId: item.userId,
          parentItemId: id,
          kind: "project",
          title: stage.title,
          note: "",
          priority,
          repeatDaily: false,
          startDate: stage.startDate,
          dueDate: stage.dueDate,
          progress: 0,
          status: "active",
          completedDate: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    for (const stage of currentStages) {
      if (stage.status !== "archived" && !retainedIds.has(stage.id)) {
        await db
          .update(scheduleItems)
          .set({ status: "archived", updatedAt: now })
          .where(eq(scheduleItems.id, stage.id));
      }
    }
  }

  const collaboration = await getItemCollaborators(id);
  const ownerUsername = collaboration?.ownerUsername ?? auth.user.email;
  const participantUsernames = Array.isArray(payload.participantUsernames)
    ? sanitizeParticipantUsernames(payload.participantUsernames, ownerUsername)
    : collaboration?.participantUsernames ?? [];
  const participantChanges = await replaceParticipants(
    id,
    auth.user.email,
    participantUsernames,
    title,
  );
  await notifyItemCollaborators({
    itemId: id,
    actorUsername: auth.user.email,
    kind: "changed",
    title: `${auth.user.email} 更新了关联日程`,
    body: title,
    excludeUsernames: participantChanges.added,
  });
  return Response.json({
    item: {
      ...updated,
      ownerUsername,
      participantUsernames,
      isOwner,
    },
  });
}
