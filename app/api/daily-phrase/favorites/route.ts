import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "../../../../db";
import { dailyPhraseStates } from "../../../../db/schema";
import { requireApiUser } from "../../../lib/current-user";
import { getPhraseById } from "../../../lib/daily-phrases";

export const dynamic = "force-dynamic";

async function listFavorites(userId: string) {
  const states = await getDb()
    .select({
      phraseDate: dailyPhraseStates.phraseDate,
      phraseId: dailyPhraseStates.phraseId,
      favoriteAt: dailyPhraseStates.favoriteAt,
    })
    .from(dailyPhraseStates)
    .where(and(
      eq(dailyPhraseStates.userId, userId),
      isNotNull(dailyPhraseStates.favoriteAt),
    ))
    .orderBy(desc(dailyPhraseStates.favoriteAt));

  return states.flatMap((state) => {
    const phrase = getPhraseById(state.phraseId);
    return phrase ? [{ ...phrase, phraseDate: state.phraseDate, favoriteAt: state.favoriteAt as string }] : [];
  });
}

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  return Response.json({ favorites: await listFavorites(auth.user.userId) });
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;

  let body: { phraseDate?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不正确" }, { status: 400 });
  }
  if (typeof body.phraseDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.phraseDate)) {
    return Response.json({ error: "收藏日期不正确" }, { status: 400 });
  }

  await getDb()
    .update(dailyPhraseStates)
    .set({ favoriteAt: null, updatedAt: new Date().toISOString() })
    .where(and(
      eq(dailyPhraseStates.userId, auth.user.userId),
      eq(dailyPhraseStates.phraseDate, body.phraseDate),
    ));

  return Response.json({ favorites: await listFavorites(auth.user.userId) });
}
