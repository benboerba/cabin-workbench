import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import {
  canRegisterUsername,
  createSession,
  hashPassword,
  normalizeUsername,
  validatePassword,
} from "../../../lib/auth";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不正确" }, { status: 400 });
  }

  const username = normalizeUsername(body.username);
  if (
    !username ||
    !validatePassword(body.password) ||
    !canRegisterUsername(username)
  ) {
    return Response.json({ error: "暂时无法注册，请检查信息" }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, username))
    .limit(1);
  if (existing) {
    return Response.json({ error: "暂时无法注册，请检查信息" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  try {
    await db.insert(users).values({
      id: userId,
      email: username,
      displayName: username,
      passwordHash: await hashPassword(body.password),
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    return Response.json({ error: "暂时无法注册，请检查信息" }, { status: 400 });
  }

  await createSession(userId);
  return Response.json(
    { user: { username, displayName: username } },
    { status: 201 },
  );
}
