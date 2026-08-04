import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { challenges, checkins, timerSessions } from "../../../../db/schema";
import { calculateStreak } from "../../../lib/dates";
import { requireApiUser } from "../../../lib/current-user";

export async function POST(request: Request) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;
  const { challengeId } = (await request.json()) as { challengeId?: unknown };
  if (typeof challengeId !== "string") {
    return Response.json({ error: "计时信息不完整" }, { status: 400 });
  }

  const db = getDb();
  const [session] = await db
    .select()
    .from(timerSessions)
    .where(
      and(
        eq(timerSessions.challengeId, challengeId),
        eq(timerSessions.userId, auth.user.userId),
        eq(timerSessions.status, "running"),
      ),
    )
    .orderBy(desc(timerSessions.updatedAt))
    .limit(1);
  if (!session) {
    return Response.json({ error: "没有可完成的倒计时" }, { status: 404 });
  }

  const nowMs = Date.now();
  const elapsed = nowMs - new Date(session.startedAt).getTime();
  if (elapsed + 700 < session.remainingMs) {
    return Response.json({ error: "这一分钟还没有结束" }, { status: 409 });
  }

  const [existing] = await db
    .select()
    .from(checkins)
    .where(
      and(
        eq(checkins.challengeId, challengeId),
        eq(checkins.habitDate, session.habitDate),
      ),
    )
    .limit(1);
  if (existing) {
    return Response.json({ checkin: existing, alreadyCompleted: true });
  }

  const now = new Date(nowMs).toISOString();
  const checkin = {
    id: crypto.randomUUID(),
    challengeId,
    userId: auth.user.userId,
    habitDate: session.habitDate,
    note: "",
    timerStartedAt: session.startedAt,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(checkins).values(checkin);
  await db
    .update(timerSessions)
    .set({ status: "completed", remainingMs: 0, updatedAt: now })
    .where(eq(timerSessions.id, session.id));

  const dates = await db
    .select({ habitDate: checkins.habitDate })
    .from(checkins)
    .where(eq(checkins.challengeId, challengeId));
  const streak = calculateStreak(
    dates.map((row) => row.habitDate),
    session.habitDate,
  );
  const challengeCompleted = streak >= 21;
  if (challengeCompleted) {
    await db
      .update(challenges)
      .set({ status: "completed", endedDate: session.habitDate, updatedAt: now })
      .where(
        and(
          eq(challenges.id, challengeId),
          eq(challenges.userId, auth.user.userId),
        ),
      );
  }

  return Response.json({ checkin, streak, challengeCompleted });
}
