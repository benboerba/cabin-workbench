import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import {
  createSession,
  normalizeUsername,
  validatePassword,
  verifyPassword,
} from "../../../lib/auth";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不正确" }, { status: 400 });
  }

  const username = normalizeUsername(body.username);
  if (!username || !validatePassword(body.password)) {
    return Response.json({ error: "用户名或密码不正确" }, { status: 401 });
  }

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, username))
    .limit(1);
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return Response.json({ error: "用户名或密码不正确" }, { status: 401 });
  }

  await createSession(user.id);
  return Response.json({
    user: { email: user.email, displayName: user.displayName },
  });
}
