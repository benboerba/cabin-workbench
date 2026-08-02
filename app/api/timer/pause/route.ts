import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { timerSessions } from "../../../../db/schema";
import { requireApiUser } from "../../../lib/current-user";

export async function POST(request: Request) {
  const auth = await requireApiUser();
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
    return Response.json({ error: "没有正在进行的倒计时" }, { status: 404 });
  }
  if (session.pauseUsed) {
    return Response.json({ error: "这次计时已经使用过暂停" }, { status: 409 });
  }

  const nowMs = Date.now();
  const elapsed = nowMs - new Date(session.startedAt).getTime();
  const remainingMs = Math.max(0, session.remainingMs - elapsed);
  if (remainingMs < 500) {
    return Response.json({ error: "这一分钟已经完成" }, { status: 409 });
  }
  const now = new Date(nowMs).toISOString();
  const [updated] = await db
    .update(timerSessions)
    .set({
      status: "paused",
      remainingMs,
      pauseUsed: true,
      pausedAt: now,
      updatedAt: now,
    })
    .where(eq(timerSessions.id, session.id))
    .returning();
  return Response.json({ session: updated });
}
