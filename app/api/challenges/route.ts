import { and, count, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { challenges } from "../../../db/schema";
import { isHabitDate } from "../../lib/dates";
import { requireApiUser } from "../../lib/current-user";

export async function POST(request: Request) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;

  const payload = (await request.json()) as {
    title?: unknown;
    createdDate?: unknown;
  };
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (!title || title.length > 60) {
    return Response.json(
      { error: "请用 1—60 个字写下这件小事" },
      { status: 400 },
    );
  }
  if (!isHabitDate(payload.createdDate)) {
    return Response.json({ error: "日期格式不正确" }, { status: 400 });
  }

  const db = getDb();
  const [activeCount] = await db
    .select({ value: count() })
    .from(challenges)
    .where(
      and(
        eq(challenges.userId, auth.user.userId),
        eq(challenges.status, "active"),
      ),
    );
  if ((activeCount?.value ?? 0) >= 3) {
    return Response.json(
      { error: "最多同时进行三件小事，先完成或结束其中一件吧" },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const challenge = {
    id: crypto.randomUUID(),
    userId: auth.user.userId,
    title,
    status: "active" as const,
    createdDate: payload.createdDate,
    endedDate: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(challenges).values(challenge);
  return Response.json({ challenge }, { status: 201 });
}
