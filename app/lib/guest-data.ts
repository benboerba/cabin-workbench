import { DEFAULT_PORTAL_LINKS } from "./portal-links";

export function getGuestDashboard() {
  const today = localDate();
  const now = new Date().toISOString();
  const readingId = "guest-habit-reading";
  const wordsId = "guest-habit-words";
  const projectId = "guest-project-workbench";
  const stageStructureId = "guest-project-workbench-structure";
  const stageInterfaceId = "guest-project-workbench-interface";
  const stageLaunchId = "guest-project-workbench-launch";
  const mailId = "guest-task-mail";
  const planId = "guest-task-plan";

  const challenges = [
    { id: readingId, title: "每天读一页书", status: "active", createdDate: addDays(today, -6), endedDate: null, createdAt: now, updatedAt: now },
    { id: wordsId, title: "记住三个新单词", status: "active", createdDate: addDays(today, -2), endedDate: null, createdAt: now, updatedAt: now },
  ];
  const checkins = [
    ...Array.from({ length: 6 }, (_, index) => guestCheckin(readingId, addDays(today, index - 6), `读完第 ${index + 1} 页，记住了一个新观点。`, now)),
    ...Array.from({ length: 2 }, (_, index) => guestCheckin(wordsId, addDays(today, index - 2), "resilient · curious · deliberate", now)),
  ];
  const scheduleItems = [
    { id: mailId, parentItemId: null, parentTitle: null, kind: "task", title: "早上查看邮件", note: "处理重要来信", priority: "normal", repeatDaily: true, startDate: addDays(today, -8), dueDate: null, progress: 0, status: "active", completedDate: null, ownerUsername: "游客", participantUsernames: [], isOwner: true, createdAt: now, updatedAt: now },
    { id: planId, parentItemId: null, parentTitle: null, kind: "task", title: "整理明天的三件要事", note: "下班前完成", priority: "important", repeatDaily: false, startDate: today, dueDate: today, progress: 0, status: "active", completedDate: null, ownerUsername: "游客", participantUsernames: [], isOwner: true, createdAt: now, updatedAt: now },
    { id: projectId, parentItemId: null, parentTitle: null, kind: "project", title: "搭建自己的木屋工作台", note: "先让最常用的流程顺手起来", priority: "important", repeatDaily: false, startDate: addDays(today, -12), dueDate: addDays(today, 14), progress: 65, status: "active", completedDate: null, ownerUsername: "游客", participantUsernames: [], isOwner: true, createdAt: now, updatedAt: now },
    { id: stageStructureId, parentItemId: projectId, parentTitle: "搭建自己的木屋工作台", kind: "project", title: "梳理工作台结构", note: "", priority: "important", repeatDaily: false, startDate: addDays(today, -12), dueDate: addDays(today, -5), progress: 100, status: "completed", completedDate: addDays(today, -5), ownerUsername: "游客", participantUsernames: [], isOwner: true, createdAt: now, updatedAt: now },
    { id: stageInterfaceId, parentItemId: projectId, parentTitle: "搭建自己的木屋工作台", kind: "project", title: "完成核心界面", note: "", priority: "important", repeatDaily: false, startDate: addDays(today, -4), dueDate: addDays(today, 4), progress: 70, status: "active", completedDate: null, ownerUsername: "游客", participantUsernames: [], isOwner: true, createdAt: now, updatedAt: now },
    { id: stageLaunchId, parentItemId: projectId, parentTitle: "搭建自己的木屋工作台", kind: "project", title: "测试并正式上线", note: "", priority: "important", repeatDaily: false, startDate: addDays(today, 5), dueDate: addDays(today, 14), progress: 0, status: "active", completedDate: null, ownerUsername: "游客", participantUsernames: [], isOwner: true, createdAt: now, updatedAt: now },
  ];
  const scheduleEntries = [
    { id: "guest-entry-mail", itemId: mailId, entryDate: today, action: "completed", previousProgress: null, progress: null, note: "重要邮件已处理", actorUsername: "游客", createdAt: now, updatedAt: now },
    { id: "guest-entry-project", itemId: projectId, entryDate: today, action: "touched", previousProgress: 50, progress: 65, note: "完成了游客体验页面", actorUsername: "游客", createdAt: now, updatedAt: now },
  ];
  const portalLinks = DEFAULT_PORTAL_LINKS.map((link, index) => ({
    id: `guest-link-${link.defaultKey}`,
    ...link,
    sortOrder: index,
    isDefault: true,
    isVisible: true,
    createdAt: now,
    updatedAt: now,
  }));

  return { challenges, checkins, sessions: [], scheduleItems, scheduleEntries, portalLinks, friends: [], notifications: [] };
}

function guestCheckin(challengeId: string, habitDate: string, note: string, now: string) {
  return { id: `guest-checkin-${challengeId}-${habitDate}`, challengeId, habitDate, note, timerStartedAt: now, completedAt: now, createdAt: now, updatedAt: now };
}

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return localDate(date);
}
