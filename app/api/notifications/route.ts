import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { notifications } from "../../../db/schema";
import { requireApiUser } from "../../lib/current-user";
import { getNotifications } from "../../lib/schedule-collaboration";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  if (auth.user.edition === "guest") {
    return Response.json({ notifications: [] });
  }
  return Response.json({
    notifications: await getNotifications(auth.user.email),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;
  const payload = (await request.json()) as Record<string, unknown>;
  const now = new Date().toISOString();
  const db = getDb();

  if (payload.all === true) {
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(
          eq(notifications.recipientUsername, auth.user.email),
          isNull(notifications.readAt),
        ),
      );
    return Response.json({ ok: true });
  }

  const id = typeof payload.id === "string" ? payload.id : "";
  if (!id) {
    return Response.json({ error: "没有找到这条提醒" }, { status: 400 });
  }
  await db
    .update(notifications)
    .set({ readAt: now })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientUsername, auth.user.email),
      ),
    );
  return Response.json({ ok: true });
}
