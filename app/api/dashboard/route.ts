import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  challenges,
  checkins,
  portalLinks,
  timerSessions,
} from "../../../db/schema";
import { requireApiUser } from "../../lib/current-user";
import { getGuestDashboard } from "../../lib/guest-data";
import { ensureDefaultPortalLinks } from "../../lib/portal-links";
import { getScheduleDashboard } from "../../lib/schedule-collaboration";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  if (auth.user.edition === "guest") return Response.json(getGuestDashboard());

  const db = getDb();
  await ensureDefaultPortalLinks(auth.user.userId);
  const [challengeRows, checkinRows, sessionRows, scheduleData, portalLinkRows] = await Promise.all([
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
    getScheduleDashboard(auth.user),
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
    scheduleItems: scheduleData.items,
    scheduleEntries: scheduleData.entries,
    friends: scheduleData.friends,
    notifications: scheduleData.notifications,
    portalLinks: portalLinkRows,
  });
}
