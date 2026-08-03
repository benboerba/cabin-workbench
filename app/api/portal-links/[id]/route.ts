import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { portalLinks } from "../../../../db/schema";
import { requireApiUser } from "../../../lib/current-user";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const db = getDb();
  const [link] = await db
    .select()
    .from(portalLinks)
    .where(and(eq(portalLinks.id, id), eq(portalLinks.userId, auth.user.userId)))
    .limit(1);
  if (!link) return Response.json({ error: "没有找到这个入口" }, { status: 404 });

  if (link.isDefault) {
    await db
      .update(portalLinks)
      .set({ isVisible: false, updatedAt: new Date().toISOString() })
      .where(and(eq(portalLinks.id, id), eq(portalLinks.userId, auth.user.userId)));
  } else {
    await db
      .delete(portalLinks)
      .where(and(eq(portalLinks.id, id), eq(portalLinks.userId, auth.user.userId)));
  }
  return Response.json({ ok: true });
}
