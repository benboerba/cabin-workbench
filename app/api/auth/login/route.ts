import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import {
  createSession,
  normalizeEmail,
  validatePassword,
  verifyPassword,
} from "../../../lib/auth";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不正确" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email || !validatePassword(body.password)) {
    return Response.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return Response.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  await createSession(user.id);
  return Response.json({
    user: { email: user.email, displayName: user.displayName },
  });
}
