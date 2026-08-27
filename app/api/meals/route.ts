import { asc, eq, lt } from "drizzle-orm";
import { getDb } from "../../../db";
import { mealRecipes, mealSelections, users } from "../../../db/schema";
import { requireApiUser } from "../../lib/current-user";
import { getTodayInShanghai, isBobUser } from "../../lib/meals";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const db = getDb();
  const today = getTodayInShanghai();
  const canManage = isBobUser(auth.user);
  await db.delete(mealSelections).where(lt(mealSelections.mealDate, today));
  const [recipeRows, selectionRows] = await Promise.all([
    db.select().from(mealRecipes).orderBy(asc(mealRecipes.createdAt)),
    db
      .select({
        id: mealSelections.id,
        recipeId: mealSelections.recipeId,
        userId: mealSelections.userId,
        displayName: users.displayName,
        username: users.email,
        createdAt: mealSelections.createdAt,
      })
      .from(mealSelections)
      .innerJoin(users, eq(users.id, mealSelections.userId))
      .where(eq(mealSelections.mealDate, today))
      .orderBy(asc(mealSelections.createdAt)),
  ]);

  const selectionsByRecipe = new Map<string, typeof selectionRows>();
  for (const selection of selectionRows) {
    const current = selectionsByRecipe.get(selection.recipeId) ?? [];
    current.push(selection);
    selectionsByRecipe.set(selection.recipeId, current);
  }

  const recipes = recipeRows
    .filter((recipe) => canManage || recipe.isActive)
    .map((recipe) => ({
      ...recipe,
      selectors: (selectionsByRecipe.get(recipe.id) ?? []).map((selection) => ({
        userId: selection.userId,
        displayName: selection.displayName,
        username: selection.username,
      })),
      isSelectedByMe: (selectionsByRecipe.get(recipe.id) ?? []).some(
        (selection) => selection.userId === auth.user.userId,
      ),
    }));

  return Response.json({
    date: today,
    canManage,
    selectionLimit: 6,
    mySelectionCount: selectionRows.filter((selection) => selection.userId === auth.user.userId).length,
    recipes,
  });
}
