import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  challenges,
  checkins,
  portalLinks,
  scheduleEntries,
  scheduleItems,
  timerSessions,
} from "../../../db/schema";
import { requireApiUser } from "../../lib/current-user";
import { ensureDefaultPortalLinks } from "../../lib/portal-links";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const db = getDb();
  await ensureDefaultPortalLinks(auth.user.userId);
  const [challengeRows, checkinRows, sessionRows, scheduleItemRows, scheduleEntryRows, portalLinkRows] = await Promise.all([
    db
      .select()
      .from(challenges)
      .where(eq(challenges.userId, auth.user.userId))
      .orderBy(desc(challenges.createdAt)),
    db
      .select()
      .from(checkins)
      .where(eq(checkins.userId, auth.user.userId))
      .orderBy(desc(checkins.habitDate), desc(checkins.completedAt))
      .limit(1000),
    db
      .select()
      .from(timerSessions)
      .where(
        and(
          eq(timerSessions.userId, auth.user.userId),
          inArray(timerSessions.status, ["running", "paused"]),
        ),
      )
      .orderBy(desc(timerSessions.updatedAt)),
    db
      .select()
      .from(scheduleItems)
      .where(eq(scheduleItems.userId, auth.user.userId))
      .orderBy(desc(scheduleItems.createdAt)),
    db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.userId, auth.user.userId))
      .orderBy(desc(scheduleEntries.entryDate), desc(scheduleEntries.updatedAt))
      .limit(2000),
    db
      .select()
      .from(portalLinks)
      .where(and(eq(portalLinks.userId, auth.user.userId), eq(portalLinks.isVisible, true)))
      .orderBy(portalLinks.category, portalLinks.sortOrder, portalLinks.createdAt),
  ]);

  return Response.json({
    challenges: challengeRows,
    checkins: checkinRows,
    sessions: sessionRows,
    scheduleItems: scheduleItemRows,
    scheduleEntries: scheduleEntryRows,
    portalLinks: portalLinkRows,
  });
}
