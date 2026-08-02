import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { challenges, checkins, timerSessions } from "../../../../db/schema";
import { isHabitDate } from "../../../lib/dates";
import { requireApiUser } from "../../../lib/current-user";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const payload = (await request.json()) as {
    challengeId?: unknown;
    habitDate?: unknown;
  };
  const challengeId =
    typeof payload.challengeId === "string" ? payload.challengeId : "";
  if (!challengeId || !isHabitDate(payload.habitDate)) {
    return Response.json({ error: "计时信息不完整" }, { status: 400 });
  }

  const db = getDb();
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.id, challengeId),
        eq(challenges.userId, auth.user.userId),
        eq(challenges.status, "active"),
      ),
    )
    .limit(1);
  if (!challenge) {
    return Response.json({ error: "这件小事当前不可开始" }, { status: 404 });
  }

  const [done] = await db
    .select({ id: checkins.id })
    .from(checkins)
    .where(
      and(
        eq(checkins.challengeId, challengeId),
        eq(checkins.habitDate, payload.habitDate),
      ),
    )
    .limit(1);
  if (done) {
    return Response.json({ error: "今天已经完成过这一分钟了" }, { status: 409 });
  }

  const [current] = await db
    .select()
    .from(timerSessions)
    .where(
      and(
        eq(timerSessions.challengeId, challengeId),
        eq(timerSessions.userId, auth.user.userId),
        inArray(timerSessions.status, ["running", "paused"]),
      ),
    )
    .orderBy(desc(timerSessions.updatedAt))
    .limit(1);

  const nowMs = Date.now();
  if (current) {
    const pauseExpired =
      current.status === "paused" &&
      current.pausedAt &&
      nowMs - new Date(current.pausedAt).getTime() > 10 * 60 * 1000;
    const wrongDay = current.habitDate !== payload.habitDate;
    if (!pauseExpired && !wrongDay) {
      return Response.json({ session: current });
    }
    await db
      .update(timerSessions)
      .set({ status: "expired", updatedAt: new Date(nowMs).toISOString() })
      .where(eq(timerSessions.id, current.id));
  }

  const now = new Date(nowMs).toISOString();
  const session = {
    id: crypto.randomUUID(),
    challengeId,
    userId: auth.user.userId,
    habitDate: payload.habitDate,
    status: "running" as const,
    startedAt: now,
    remainingMs: 60000,
    pauseUsed: false,
    pausedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(timerSessions).values(session);
  return Response.json({ session }, { status: 201 });
}
