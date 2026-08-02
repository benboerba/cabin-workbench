import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { timerSessions } from "../../../../db/schema";
import { isHabitDate } from "../../../lib/dates";
import { requireApiUser } from "../../../lib/current-user";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const payload = (await request.json()) as {
    challengeId?: unknown;
    habitDate?: unknown;
  };
  if (
    typeof payload.challengeId !== "string" ||
    !isHabitDate(payload.habitDate)
  ) {
    return Response.json({ error: "计时信息不完整" }, { status: 400 });
  }

  const db = getDb();
  const [session] = await db
    .select()
    .from(timerSessions)
    .where(
      and(
        eq(timerSessions.challengeId, payload.challengeId),
        eq(timerSessions.userId, auth.user.userId),
        eq(timerSessions.status, "paused"),
      ),
    )
    .orderBy(desc(timerSessions.updatedAt))
    .limit(1);
  if (!session) {
    return Response.json({ error: "没有等待继续的倒计时" }, { status: 404 });
  }

  const nowMs = Date.now();
  const expired =
    !session.pausedAt ||
    nowMs - new Date(session.pausedAt).getTime() > 10 * 60 * 1000 ||
    session.habitDate !== payload.habitDate;
  if (expired) {
    await db
      .update(timerSessions)
      .set({ status: "expired", updatedAt: new Date(nowMs).toISOString() })
      .where(eq(timerSessions.id, session.id));
    return Response.json(
      { error: "暂停已超过十分钟，请重新开始这一分钟" },
      { status: 409 },
    );
  }

  const now = new Date(nowMs).toISOString();
  const [updated] = await db
    .update(timerSessions)
    .set({ status: "running", startedAt: now, pausedAt: null, updatedAt: now })
    .where(eq(timerSessions.id, session.id))
    .returning();
  return Response.json({ session: updated });
}
