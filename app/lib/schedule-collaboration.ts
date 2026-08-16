import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "../../db";
import {
  notifications,
  scheduleEntries,
  scheduleItems,
  scheduleParticipants,
  users,
} from "../../db/schema";
import type { AppUser } from "./auth";
import { getRegistrationUsernames } from "./auth";

type NotificationKind = typeof notifications.$inferInsert.kind;

export function getFriendUsernames(user: AppUser): string[] {
  if (user.edition !== "server") return [];
  return getRegistrationUsernames().filter((username) => username !== user.email);
}

export function sanitizeParticipantUsernames(
  value: unknown,
  currentUsername: string,
): string[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(
    getRegistrationUsernames().filter((username) => username !== currentUsername),
  );
  return Array.from(
    new Set(
      value.filter(
        (username): username is string =>
          typeof username === "string" && allowed.has(username),
      ),
    ),
  );
}

export async function getScheduleDashboard(user: AppUser) {
  const db = getDb();
  const sharedRows = await db
    .select({ itemId: scheduleParticipants.itemId })
    .from(scheduleParticipants)
    .where(eq(scheduleParticipants.username, user.email));
  const sharedIds = sharedRows.map((row) => row.itemId);
  const itemRows = await db
    .select()
    .from(scheduleItems)
    .where(
      sharedIds.length > 0
        ? or(
            eq(scheduleItems.userId, user.userId),
            inArray(scheduleItems.id, sharedIds),
          )
        : eq(scheduleItems.userId, user.userId),
    )
    .orderBy(desc(scheduleItems.createdAt));

  if (itemRows.length === 0) {
    await ensureTodayPendingNotifications(user.email, [], []);
    return {
      items: [],
      entries: [],
      participants: [],
      notifications: await getNotifications(user.email),
      friends: getFriendUsernames(user),
    };
  }

  const itemIds = itemRows.map((item) => item.id);
  const ownerIds = Array.from(new Set(itemRows.map((item) => item.userId)));
  const parentIds = Array.from(new Set(itemRows.map((item) => item.parentItemId).filter((id): id is string => Boolean(id))));
  const [entryRows, participantRows, ownerRows, parentRows] = await Promise.all([
    db
      .select()
      .from(scheduleEntries)
      .where(inArray(scheduleEntries.itemId, itemIds))
      .orderBy(desc(scheduleEntries.entryDate), desc(scheduleEntries.updatedAt))
      .limit(2000),
    db
      .select()
      .from(scheduleParticipants)
      .where(inArray(scheduleParticipants.itemId, itemIds)),
    db
      .select({ id: users.id, username: users.email })
      .from(users)
      .where(inArray(users.id, ownerIds)),
    parentIds.length > 0
      ? db
          .select({ id: scheduleItems.id, title: scheduleItems.title })
          .from(scheduleItems)
          .where(inArray(scheduleItems.id, parentIds))
      : Promise.resolve([]),
  ]);
  const actorIds = Array.from(new Set(entryRows.map((entry) => entry.userId)));
  const actorRows = actorIds.length > 0
    ? await db
        .select({ id: users.id, username: users.email })
        .from(users)
        .where(inArray(users.id, actorIds))
    : [];
  const usernamesByUserId = new Map(
    [...ownerRows, ...actorRows].map((row) => [row.id, row.username]),
  );
  const participantsByItemId = new Map<string, string[]>();
  const parentTitlesById = new Map(parentRows.map((row) => [row.id, row.title]));
  for (const participant of participantRows) {
    const current = participantsByItemId.get(participant.itemId) ?? [];
    current.push(participant.username);
    participantsByItemId.set(participant.itemId, current);
  }

  await ensureTodayPendingNotifications(user.email, itemRows, entryRows);

  return {
    items: itemRows.map((item) => ({
      ...item,
      ownerUsername: usernamesByUserId.get(item.userId) ?? "好友",
      participantUsernames: participantsByItemId.get(item.id) ?? [],
      isOwner: item.userId === user.userId,
      parentTitle: item.parentItemId ? parentTitlesById.get(item.parentItemId) ?? null : null,
    })),
    entries: entryRows.map((entry) => ({
      ...entry,
      actorUsername: usernamesByUserId.get(entry.userId) ?? "好友",
    })),
    participants: participantRows,
    notifications: await getNotifications(user.email),
    friends: getFriendUsernames(user),
  };
}

export async function getItemCollaborators(itemId: string) {
  const db = getDb();
  const [item] = await db
    .select()
    .from(scheduleItems)
    .where(eq(scheduleItems.id, itemId))
    .limit(1);
  if (!item) return null;
  const [owner] = await db
    .select({ username: users.email })
    .from(users)
    .where(eq(users.id, item.userId))
    .limit(1);
  const participantRows = await db
    .select({ username: scheduleParticipants.username })
    .from(scheduleParticipants)
    .where(eq(scheduleParticipants.itemId, itemId));
  return {
    item,
    ownerUsername: owner?.username ?? "",
    participantUsernames: participantRows.map((row) => row.username),
  };
}

export async function isScheduleParticipant(itemId: string, username: string) {
  const [row] = await getDb()
    .select({ id: scheduleParticipants.id })
    .from(scheduleParticipants)
    .where(
      and(
        eq(scheduleParticipants.itemId, itemId),
        eq(scheduleParticipants.username, username),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function replaceParticipants(
  itemId: string,
  ownerUsername: string,
  nextUsernames: string[],
  itemTitle: string,
) {
  const db = getDb();
  const currentRows = await db
    .select()
    .from(scheduleParticipants)
    .where(eq(scheduleParticipants.itemId, itemId));
  const current = new Set(currentRows.map((row) => row.username));
  const next = new Set(nextUsernames);
  const added = nextUsernames.filter((username) => !current.has(username));
  const removed = currentRows.filter((row) => !next.has(row.username));
  const now = new Date().toISOString();

  if (removed.length > 0) {
    await db
      .delete(scheduleParticipants)
      .where(inArray(scheduleParticipants.id, removed.map((row) => row.id)));
  }
  if (added.length > 0) {
    await db.insert(scheduleParticipants).values(
      added.map((username) => ({
        id: crypto.randomUUID(),
        itemId,
        username,
        createdAt: now,
        updatedAt: now,
      })),
    );
    await createNotifications(
      added.map((username) => ({
        recipientUsername: username,
        actorUsername: ownerUsername,
        itemId,
        kind: "shared" as const,
        title: `${ownerUsername} 关联了新的日程`,
        body: itemTitle,
      })),
    );
  }
  if (removed.length > 0) {
    await createNotifications(
      removed.map((row) => ({
        recipientUsername: row.username,
        actorUsername: ownerUsername,
        itemId,
        kind: "removed" as const,
        title: `${ownerUsername} 取消了日程关联`,
        body: itemTitle,
      })),
    );
  }

  const childRows = await db
    .select({ id: scheduleItems.id })
    .from(scheduleItems)
    .where(eq(scheduleItems.parentItemId, itemId));
  for (const child of childRows) {
    await syncParticipantRows(child.id, nextUsernames, now);
  }
  return { added, removed: removed.map((row) => row.username) };
}

async function syncParticipantRows(itemId: string, usernames: string[], now: string) {
  const db = getDb();
  const currentRows = await db
    .select()
    .from(scheduleParticipants)
    .where(eq(scheduleParticipants.itemId, itemId));
  const current = new Set(currentRows.map((row) => row.username));
  const next = new Set(usernames);
  const removedIds = currentRows.filter((row) => !next.has(row.username)).map((row) => row.id);
  const added = usernames.filter((username) => !current.has(username));
  if (removedIds.length > 0) {
    await db.delete(scheduleParticipants).where(inArray(scheduleParticipants.id, removedIds));
  }
  if (added.length > 0) {
    await db.insert(scheduleParticipants).values(
      added.map((username) => ({
        id: crypto.randomUUID(),
        itemId,
        username,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }
}

export async function notifyItemCollaborators({
  itemId,
  actorUsername,
  kind,
  title,
  body,
  excludeUsernames = [],
}: {
  itemId: string;
  actorUsername: string;
  kind: NotificationKind;
  title: string;
  body: string;
  excludeUsernames?: string[];
}) {
  const collaboration = await getItemCollaborators(itemId);
  if (!collaboration) return;
  const recipients = Array.from(
    new Set([
      collaboration.ownerUsername,
      ...collaboration.participantUsernames,
    ]),
  ).filter(
    (username) =>
      username &&
      username !== actorUsername &&
      !excludeUsernames.includes(username),
  );
  await createNotifications(
    recipients.map((recipientUsername) => ({
      recipientUsername,
      actorUsername,
      itemId,
      kind,
      title,
      body,
    })),
  );
}

export async function markTodayPendingRead(itemId: string) {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(
      and(
        eq(notifications.itemId, itemId),
        eq(notifications.kind, "today_pending"),
        isNull(notifications.readAt),
      ),
    );
}

export async function getNotifications(username: string) {
  return getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.recipientUsername, username))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
}

async function ensureTodayPendingNotifications(
  username: string,
  items: Array<typeof scheduleItems.$inferSelect>,
  entries: Array<typeof scheduleEntries.$inferSelect>,
) {
  const today = shanghaiDate();
  const touchedToday = new Set(
    entries.filter((entry) => entry.entryDate === today).map((entry) => entry.itemId),
  );
  const parentIdsWithStages = new Set(
    items.map((item) => item.parentItemId).filter((id): id is string => Boolean(id)),
  );
  const pending = items.filter(
    (item) =>
      item.status === "active" &&
      item.startDate <= today &&
      !parentIdsWithStages.has(item.id) &&
      !touchedToday.has(item.id),
  );
  if (pending.length === 0) return;
  const now = new Date().toISOString();
  await getDb()
    .insert(notifications)
    .values(
      pending.map((item) => ({
        id: crypto.randomUUID(),
        recipientUsername: username,
        actorUsername: null,
        itemId: item.id,
        kind: "today_pending" as const,
        title: item.kind === "project" ? "今天还没有推进" : "今天还没有完成",
        body: item.title,
        uniqueKey: `today:${username}:${today}:${item.id}`,
        readAt: null,
        createdAt: now,
      })),
    )
    .onConflictDoNothing({ target: notifications.uniqueKey });
}

async function createNotifications(
  rows: Array<{
    recipientUsername: string;
    actorUsername: string | null;
    itemId: string | null;
    kind: NotificationKind;
    title: string;
    body: string;
  }>,
) {
  if (rows.length === 0) return;
  const now = new Date().toISOString();
  await getDb().insert(notifications).values(
    rows.map((row) => ({
      id: crypto.randomUUID(),
      ...row,
      uniqueKey: null,
      readAt: null,
      createdAt: now,
    })),
  );
}

function shanghaiDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
