import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { portalLinks } from "../../../db/schema";
import { requireApiUser } from "../../lib/current-user";
import { ensureDefaultPortalLinks } from "../../lib/portal-links";

const CATEGORIES = new Set(["life", "entertainment"]);

function safeUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ writable: true });
  if (auth.response) return auth.response;
  const payload = (await request.json()) as Record<string, unknown>;
  const action = typeof payload.action === "string" ? payload.action : "create";
  const db = getDb();
  await ensureDefaultPortalLinks(auth.user.userId);

  if (action === "reorder") {
    const category = typeof payload.category === "string" && CATEGORIES.has(payload.category)
      ? (payload.category as "life" | "entertainment")
      : null;
    const orderedIds = Array.isArray(payload.orderedIds)
      ? payload.orderedIds.filter((id): id is string => typeof id === "string")
      : [];
    if (!category || !orderedIds.length || orderedIds.length > 12) {
      return Response.json({ error: "入口顺序不正确" }, { status: 400 });
    }
    const rows = await db
      .select({ id: portalLinks.id })
      .from(portalLinks)
      .where(and(
        eq(portalLinks.userId, auth.user.userId),
        eq(portalLinks.category, category),
        eq(portalLinks.isVisible, true),
      ));
    if (rows.length !== orderedIds.length || rows.some((row) => !orderedIds.includes(row.id))) {
      return Response.json({ error: "入口列表已经变化，请刷新后再试" }, { status: 409 });
    }
    const now = new Date().toISOString();
    for (const [sortOrder, id] of orderedIds.entries()) {
      await db
        .update(portalLinks)
        .set({ sortOrder, updatedAt: now })
        .where(and(eq(portalLinks.id, id), eq(portalLinks.userId, auth.user.userId)));
    }
    return Response.json({ ok: true });
  }

  if (action === "restore-defaults") {
    const category = typeof payload.category === "string" && CATEGORIES.has(payload.category)
      ? (payload.category as "life" | "entertainment")
      : null;
    if (!category) return Response.json({ error: "房间信息不正确" }, { status: 400 });
    const rows = await db
      .select()
      .from(portalLinks)
      .where(eq(portalLinks.userId, auth.user.userId))
      .orderBy(asc(portalLinks.sortOrder));
    const hiddenDefaults = rows.filter((row) => row.category === category && row.isDefault && !row.isVisible);
    const visibleCounts = {
      life: rows.filter((row) => row.category === "life" && row.isVisible).length,
      entertainment: rows.filter((row) => row.category === "entertainment" && row.isVisible).length,
    };
    if (visibleCounts[category] + hiddenDefaults.length > 12) {
      return Response.json({ error: "请先移除一些自定义入口，再恢复默认入口" }, { status: 400 });
    }
    const now = new Date().toISOString();
    let nextOrder = rows
      .filter((row) => row.category === category && row.isVisible)
      .reduce((highest, row) => Math.max(highest, row.sortOrder), -1) + 1;
    for (const row of hiddenDefaults) {
      await db
        .update(portalLinks)
        .set({ isVisible: true, sortOrder: nextOrder++, updatedAt: now })
        .where(and(eq(portalLinks.id, row.id), eq(portalLinks.userId, auth.user.userId)));
    }
    return Response.json({ ok: true });
  }

  const category = typeof payload.category === "string" && CATEGORIES.has(payload.category)
    ? (payload.category as "life" | "entertainment")
    : null;
  const label = typeof payload.label === "string" ? payload.label.trim() : "";
  const url = safeUrl(payload.url);
  const icon = typeof payload.icon === "string" ? Array.from(payload.icon.trim()).slice(0, 2).join("") : "↗";
  const color = typeof payload.color === "string" && /^#[0-9a-f]{6}$/i.test(payload.color)
    ? payload.color
    : category === "life" ? "#ad713d" : "#6f6b92";
  if (!category || !label || label.length > 30 || !url) {
    return Response.json({ error: "请填写正确的名称和网页地址" }, { status: 400 });
  }
  const categoryRows = await db
    .select()
    .from(portalLinks)
    .where(and(
      eq(portalLinks.userId, auth.user.userId),
      eq(portalLinks.category, category),
      eq(portalLinks.isVisible, true),
    ));
  if (categoryRows.length >= 12) {
    return Response.json({ error: "每个房间最多放置 12 个入口" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const link = {
    id: crypto.randomUUID(),
    userId: auth.user.userId,
    category,
    label,
    url,
    icon: icon || label.slice(0, 1),
    color,
    sortOrder: categoryRows.reduce((highest, row) => Math.max(highest, row.sortOrder), -1) + 1,
    defaultKey: null,
    isDefault: false,
    isVisible: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(portalLinks).values(link);
  return Response.json({ link }, { status: 201 });
}
