import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import {
  createSession,
  displayNameFromEmail,
  hashPassword,
  normalizeEmail,
  validatePassword,
} from "../../../lib/auth";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; displayName?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不正确" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return Response.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
  }
  if (!validatePassword(body.password)) {
    return Response.json({ error: "密码需要 8—128 个字符" }, { status: 400 });
  }

  const requestedName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  const displayName = (requestedName || displayNameFromEmail(email)).slice(0, 30);
  const db = getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return Response.json({ error: "这个邮箱已经注册，可以直接登录" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  try {
    await db.insert(users).values({
      id: userId,
      email,
      displayName,
      passwordHash: await hashPassword(body.password),
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    return Response.json({ error: "这个邮箱已经注册，可以直接登录" }, { status: 409 });
  }

  await createSession(userId);
  return Response.json({ user: { email, displayName } }, { status: 201 });
}
