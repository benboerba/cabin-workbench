import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { challenges, timerSessions } from "../../../../db/schema";
import { isHabitDate } from "../../../lib/dates";
import { requireApiUser } from "../../../lib/current-user";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const payload = (await request.json()) as {
    action?: unknown;
    endedDate?: unknown;
  };
  if (payload.action !== "archive" || !isHabitDate(payload.endedDate)) {
    return Response.json({ error: "无法完成这个操作" }, { status: 400 });
  }

  const db = getDb();
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.id, id),
        eq(challenges.userId, auth.user.userId),
      ),
    )
    .limit(1);
  if (!challenge || challenge.status !== "active") {
    return Response.json({ error: "这件小事已经结束" }, { status: 404 });
  }

  const now = new Date().toISOString();
  await db
    .update(challenges)
    .set({ status: "archived", endedDate: payload.endedDate, updatedAt: now })
    .where(eq(challenges.id, id));
  await db
    .update(timerSessions)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(timerSessions.challengeId, id),
        inArray(timerSessions.status, ["running", "paused"]),
      ),
    );

  return Response.json({ ok: true });
}
