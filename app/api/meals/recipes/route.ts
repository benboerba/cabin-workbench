import { randomUUID } from "node:crypto";
import { getDb } from "../../../../db";
import { mealRecipes } from "../../../../db/schema";
import { requireApiUser } from "../../../lib/current-user";
import { isBobUser, isMealCategory, sanitizeMealImage } from "../../../lib/meals";

export async function POST(request: Request) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;
  if (!isBobUser(auth.user)) {
    return Response.json({ error: "只有 bob 可以添加菜谱" }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "菜谱内容不正确" }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const imageData = sanitizeMealImage(payload.imageData);
  if (!name || name.length > 40 || description.length > 160) {
    return Response.json({ error: "菜名或简介长度不正确" }, { status: 400 });
  }
  if (!isMealCategory(payload.category)) {
    return Response.json({ error: "请选择菜品分类" }, { status: 400 });
  }
  if (payload.imageData !== undefined && imageData === undefined) {
    return Response.json({ error: "图片格式不支持或图片过大" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const [recipe] = await getDb().insert(mealRecipes).values({
    id: randomUUID(),
    name,
    description,
    category: payload.category,
    imageData: imageData ?? null,
    isActive: true,
    createdByUserId: auth.user.userId,
    createdAt: now,
    updatedAt: now,
  }).returning();
  return Response.json({ recipe }, { status: 201 });
}
