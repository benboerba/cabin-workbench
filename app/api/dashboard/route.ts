import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { challenges, checkins, timerSessions } from "../../../db/schema";
import { requireApiUser } from "../../lib/current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const db = getDb();
  const [challengeRows, checkinRows, sessionRows] = await Promise.all([
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
  ]);

  return Response.json({
    challenges: challengeRows,
    checkins: checkinRows,
    sessions: sessionRows,
  });
}
