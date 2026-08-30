import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { mealRecipes } from "../../../../../db/schema";
import { requireApiUser } from "../../../../lib/current-user";
import { isBobUser } from "../../../../lib/meals";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const [recipe] = await getDb().select({
    imageData: mealRecipes.imageData,
    isActive: mealRecipes.isActive,
    updatedAt: mealRecipes.updatedAt,
  }).from(mealRecipes).where(eq(mealRecipes.id, id)).limit(1);

  if (!recipe?.imageData || (!recipe.isActive && !isBobUser(auth.user))) {
    return new Response(null, { status: 404 });
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(recipe.imageData);
  if (!match) return new Response(null, { status: 404 });

  const etag = `"meal-${id}-${recipe.updatedAt}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const image = Buffer.from(match[2], "base64");
  return new Response(image, {
    headers: {
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Length": String(image.byteLength),
      "Content-Type": match[1],
      ETag: etag,
    },
  });
}
