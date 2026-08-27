import { and, count, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "../../../../../db";
import { mealRecipes, mealSelections } from "../../../../../db/schema";
import { requireApiUser } from "../../../../lib/current-user";
import { getTodayInShanghai } from "../../../../lib/meals";

export async function POST(
  _request: Request,
  context: { params: Promise<{ recipeId: string }> },
) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;
  const { recipeId } = await context.params;
  const db = getDb();
  const today = getTodayInShanghai();

  const [recipe] = await db.select().from(mealRecipes).where(eq(mealRecipes.id, recipeId)).limit(1);
  if (!recipe || !recipe.isActive) {
    return Response.json({ error: "这道菜今天暂时不能点" }, { status: 409 });
  }
  const [existing] = await db.select({ id: mealSelections.id }).from(mealSelections).where(and(
    eq(mealSelections.recipeId, recipeId),
    eq(mealSelections.userId, auth.user.userId),
    eq(mealSelections.mealDate, today),
  )).limit(1);
  if (existing) return Response.json({ ok: true });

  const [total] = await db.select({ value: count() }).from(mealSelections).where(and(
    eq(mealSelections.userId, auth.user.userId),
    eq(mealSelections.mealDate, today),
  ));
  if ((total?.value ?? 0) >= 6) {
    return Response.json({ error: "每人最多点 6 道菜" }, { status: 409 });
  }

  await db.insert(mealSelections).values({
    id: randomUUID(),
    recipeId,
    userId: auth.user.userId,
    mealDate: today,
  });
  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ recipeId: string }> },
) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;
  const { recipeId } = await context.params;
  await getDb().delete(mealSelections).where(and(
    eq(mealSelections.recipeId, recipeId),
    eq(mealSelections.userId, auth.user.userId),
    eq(mealSelections.mealDate, getTodayInShanghai()),
  ));
  return Response.json({ ok: true });
}
