import { isHabitDate } from "./dates";

export type ScheduleStageInput = {
  id: string | null;
  title: string;
  startDate: string;
  dueDate: string;
};

export function parseScheduleStages(
  value: unknown,
  parentStartDate: string,
  parentDueDate: string | null,
): { stages: ScheduleStageInput[]; error: string | null } {
  if (value === undefined) return { stages: [], error: null };
  if (!Array.isArray(value)) return { stages: [], error: "项目阶段格式不正确" };
  if (value.length > 24) return { stages: [], error: "一个项目最多拆成 24 个阶段" };

  const stages: ScheduleStageInput[] = [];
  const ids = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      return { stages: [], error: "项目阶段信息不完整" };
    }
    const record = raw as Record<string, unknown>;
    const id = typeof record.id === "string" && record.id ? record.id : null;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const startDate = typeof record.startDate === "string" ? record.startDate : "";
    const dueDate = typeof record.dueDate === "string" ? record.dueDate : "";

    if (!title || title.length > 80) {
      return { stages: [], error: "每个阶段都需要 1—80 个字的名称" };
    }
    if (!isHabitDate(startDate) || !isHabitDate(dueDate)) {
      return { stages: [], error: "每个阶段都需要开始和结束日期" };
    }
    if (dueDate < startDate) {
      return { stages: [], error: `阶段「${title}」的结束日期不能早于开始日期` };
    }
    if (startDate < parentStartDate || (parentDueDate && dueDate > parentDueDate)) {
      return { stages: [], error: `阶段「${title}」需要安排在大项目日期范围内` };
    }
    if (id && ids.has(id)) {
      return { stages: [], error: "项目阶段不能重复" };
    }
    if (id) ids.add(id);
    stages.push({ id, title, startDate, dueDate });
  }

  stages.sort((left, right) => left.startDate.localeCompare(right.startDate) || left.dueDate.localeCompare(right.dueDate));
  return { stages, error: null };
}
