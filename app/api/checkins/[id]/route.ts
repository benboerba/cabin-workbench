import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { checkins } from "../../../../db/schema";
import { requireApiUser } from "../../../lib/current-user";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const { note } = (await request.json()) as { note?: unknown };
  if (typeof note !== "string" || note.length > 2000) {
    return Response.json(
      { error: "备注不能超过 2000 个字" },
      { status: 400 },
    );
  }

  const db = getDb();
  const [updated] = await db
    .update(checkins)
    .set({ note: note.trim(), updatedAt: new Date().toISOString() })
    .where(and(eq(checkins.id, id), eq(checkins.userId, auth.user.userId)))
    .returning();
  if (!updated) {
    return Response.json({ error: "没有找到这条记录" }, { status: 404 });
  }
  return Response.json({ checkin: updated });
}
