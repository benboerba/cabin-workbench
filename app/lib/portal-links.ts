import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { portalLinks } from "../../db/schema";

export const DEFAULT_PORTAL_LINKS = [
  { category: "life", defaultKey: "taobao", label: "淘宝", url: "https://www.taobao.com/", icon: "淘", color: "#f05a28" },
  { category: "life", defaultKey: "jd", label: "京东", url: "https://www.jd.com/", icon: "京", color: "#d92b35" },
  { category: "life", defaultKey: "pinduoduo", label: "拼多多", url: "https://www.pinduoduo.com/", icon: "拼", color: "#e33b38" },
  { category: "life", defaultKey: "douyin-shop", label: "抖音商城", url: "https://www.douyin.com/channel/300203", icon: "抖", color: "#252127" },
  { category: "entertainment", defaultKey: "bilibili", label: "哔哩哔哩", url: "https://www.bilibili.com/", icon: "B", color: "#e8789d" },
  { category: "entertainment", defaultKey: "douyin", label: "抖音", url: "https://www.douyin.com/", icon: "抖", color: "#252127" },
  { category: "entertainment", defaultKey: "weibo", label: "微博", url: "https://weibo.com/", icon: "微", color: "#e65b38" },
  { category: "entertainment", defaultKey: "xiaohongshu", label: "小红书", url: "https://www.xiaohongshu.com/explore", icon: "小", color: "#ef4050" },
] as const;

export async function ensureDefaultPortalLinks(userId: string) {
  const db = getDb();
  const existing = await db
    .select({ id: portalLinks.id })
    .from(portalLinks)
    .where(eq(portalLinks.userId, userId))
    .limit(1);
  if (existing.length) return;

  const now = new Date().toISOString();
  await db.insert(portalLinks).values(
    DEFAULT_PORTAL_LINKS.map((link, index) => ({
      id: crypto.randomUUID(),
      userId,
      ...link,
      sortOrder: index % 4,
      isDefault: true,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export async function getVisiblePortalLinks(userId: string) {
  await ensureDefaultPortalLinks(userId);
  return getDb()
    .select()
    .from(portalLinks)
    .where(and(eq(portalLinks.userId, userId), eq(portalLinks.isVisible, true)))
    .orderBy(asc(portalLinks.category), asc(portalLinks.sortOrder), asc(portalLinks.createdAt));
}
