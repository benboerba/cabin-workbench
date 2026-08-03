import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { users } from "../../../db/schema";
import { requireApiUser } from "../../lib/current-user";
import { ONBOARDING_VERSION } from "../../lib/onboarding";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  let body: { version?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不正确" }, { status: 400 });
  }

  if (body.version !== ONBOARDING_VERSION) {
    return Response.json({ error: "引导版本不正确" }, { status: 400 });
  }

  await getDb()
    .update(users)
    .set({
      onboardingVersion: ONBOARDING_VERSION,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, auth.user.userId));

  return Response.json({ onboardingVersion: ONBOARDING_VERSION });
}
