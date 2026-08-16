import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "../../../db";
import { dailyPhraseStates } from "../../../db/schema";
import { requireApiUser } from "../../lib/current-user";
import { getPhraseById, getPhraseForDate } from "../../lib/daily-phrases";

export const dynamic = "force-dynamic";

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function currentPhrase(userId: string, phraseDate: string) {
  const db = getDb();
  const [state] = await db
    .select()
    .from(dailyPhraseStates)
    .where(and(eq(dailyPhraseStates.userId, userId), eq(dailyPhraseStates.phraseDate, phraseDate)))
    .limit(1);
  const phrase = state ? getPhraseById(state.phraseId) : getPhraseForDate(phraseDate);
  return {
    phrase: phrase ?? getPhraseForDate(phraseDate),
    state: {
      swapCount: state?.swapCount ?? 0,
      learned: Boolean(state?.learnedAt),
      favorite: Boolean(state?.favoriteAt),
      swapsRemaining: Math.max(0, 2 - (state?.swapCount ?? 0)),
    },
  };
}

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  return Response.json(await currentPhrase(auth.user.userId, today()));
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;

  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不正确" }, { status: 400 });
  }
  if (!['swap', 'learn', 'favorite'].includes(String(body.action))) {
    return Response.json({ error: "不支持这个操作" }, { status: 400 });
  }

  const db = getDb();
  const phraseDate = today();
  const now = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(dailyPhraseStates)
    .where(and(eq(dailyPhraseStates.userId, auth.user.userId), eq(dailyPhraseStates.phraseDate, phraseDate)))
    .limit(1);
  const current = existing ? getPhraseById(existing.phraseId) : getPhraseForDate(phraseDate);
  const action = String(body.action);

  if (action === "swap" && (existing?.swapCount ?? 0) >= 2) {
    return Response.json({ error: "今天的两次换句机会已经用完啦" }, { status: 409 });
  }

  if (!existing) {
    const swapCount = action === "swap" ? 1 : 0;
    const phrase = action === "swap" ? getPhraseForDate(phraseDate, swapCount) : (current ?? getPhraseForDate(phraseDate));
    await db.insert(dailyPhraseStates).values({
      id: randomUUID(),
      userId: auth.user.userId,
      phraseDate,
      phraseId: phrase.id,
      swapCount,
      learnedAt: action === "learn" ? now : null,
      favoriteAt: action === "favorite" ? now : null,
      updatedAt: now,
    });
  } else if (action === "swap") {
    const swapCount = existing.swapCount + 1;
    await db.update(dailyPhraseStates).set({
      phraseId: getPhraseForDate(phraseDate, swapCount).id,
      swapCount,
      learnedAt: null,
      updatedAt: now,
    }).where(eq(dailyPhraseStates.id, existing.id));
  } else if (action === "learn") {
    await db.update(dailyPhraseStates).set({
      learnedAt: existing.learnedAt ? null : now,
      updatedAt: now,
    }).where(eq(dailyPhraseStates.id, existing.id));
  } else {
    await db.update(dailyPhraseStates).set({
      favoriteAt: existing.favoriteAt ? null : now,
      updatedAt: now,
    }).where(eq(dailyPhraseStates.id, existing.id));
  }

  return Response.json(await currentPhrase(auth.user.userId, phraseDate));
}
