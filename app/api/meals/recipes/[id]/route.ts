import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { mealRecipes } from "../../../../../db/schema";
import { requireApiUser } from "../../../../lib/current-user";
import { isBobUser, isMealCategory, sanitizeMealImage, sanitizeMealTutorialUrl } from "../../../../lib/meals";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;
  if (!isBobUser(auth.user)) {
    return Response.json({ error: "只有 bob 可以管理菜谱" }, { status: 403 });
  }

  const { id } = await context.params;
  const [existing] = await getDb().select().from(mealRecipes).where(eq(mealRecipes.id, id)).limit(1);
  if (!existing) return Response.json({ error: "没有找到这道菜" }, { status: 404 });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "菜谱内容不正确" }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : existing.name;
  const description = typeof payload.description === "string" ? payload.description.trim() : existing.description;
  const category = payload.category === undefined ? existing.category : payload.category;
  const imageData = sanitizeMealImage(payload.imageData);
  const tutorialUrl = sanitizeMealTutorialUrl(payload.tutorialUrl);
  if (!name || name.length > 40 || description.length > 160) {
    return Response.json({ error: "菜名或简介长度不正确" }, { status: 400 });
  }
  if (!isMealCategory(category)) {
    return Response.json({ error: "请选择菜品分类" }, { status: 400 });
  }
  if (payload.imageData !== undefined && imageData === undefined) {
    return Response.json({ error: "图片格式不支持或图片过大" }, { status: 400 });
  }
  if (payload.tutorialUrl !== undefined && tutorialUrl === undefined) {
    return Response.json({ error: "教程链接格式不正确，请填写 http 或 https 网页地址" }, { status: 400 });
  }

  const [recipe] = await getDb().update(mealRecipes).set({
    name,
    description,
    category,
    imageData: imageData === undefined ? existing.imageData : imageData,
    tutorialUrl: tutorialUrl === undefined ? existing.tutorialUrl : tutorialUrl,
    isActive: typeof payload.isActive === "boolean" ? payload.isActive : existing.isActive,
    updatedAt: new Date().toISOString(),
  }).where(eq(mealRecipes.id, id)).returning();
  return Response.json({ recipe });
}
