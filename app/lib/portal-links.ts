import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { portalLinks } from "../../db/schema";

export const DEFAULT_PORTAL_LINKS = [
  { category: "life", defaultKey: "taobao", label: "淘宝", url: "https://www.taobao.com/", icon: "淘", color: "#f05a28" },
  { category: "life", defaultKey: "jd", label: "京东", url: "https://www.jd.com/", icon: "京", color: "#d92b35" },
  { category: "life", defaultKey: "pinduoduo", label: "拼多多", url: "https://www.pinduoduo.com/", icon: "拼", color: "#e33b38" },
  { category: "life", defaultKey: "douyin-shop", label: "抖音商城", url: "https://www.douyin.com/channel/300203", icon: "抖", color: "#252127" },
  { category: "life", defaultKey: "tmall", label: "天猫", url: "https://www.tmall.com/", icon: "猫", color: "#d72f2f" },
  { category: "life", defaultKey: "vip", label: "唯品会", url: "https://www.vip.com/", icon: "唯", color: "#d44191" },
  { category: "life", defaultKey: "suning", label: "苏宁易购", url: "https://www.suning.com/", icon: "苏", color: "#7562c8" },
  { category: "life", defaultKey: "dewu", label: "得物", url: "https://www.dewu.com/", icon: "得", color: "#2b9e99" },
  { category: "entertainment", defaultKey: "bilibili", label: "哔哩哔哩", url: "https://www.bilibili.com/", icon: "B", color: "#e8789d" },
  { category: "entertainment", defaultKey: "douyin", label: "抖音", url: "https://www.douyin.com/", icon: "抖", color: "#252127" },
  { category: "entertainment", defaultKey: "weibo", label: "微博", url: "https://weibo.com/", icon: "微", color: "#e65b38" },
  { category: "entertainment", defaultKey: "xiaohongshu", label: "小红书", url: "https://www.xiaohongshu.com/explore", icon: "小", color: "#ef4050" },
  { category: "entertainment", defaultKey: "tencent-video", label: "腾讯视频", url: "https://v.qq.com/", icon: "腾", color: "#30a967" },
  { category: "entertainment", defaultKey: "iqiyi", label: "爱奇艺", url: "https://www.iqiyi.com/", icon: "爱", color: "#57b542" },
  { category: "entertainment", defaultKey: "youku", label: "优酷", url: "https://www.youku.com/", icon: "优", color: "#3975d6" },
  { category: "entertainment", defaultKey: "mgtv", label: "芒果TV", url: "https://www.mgtv.com/", icon: "芒", color: "#f0a23a" },
] as const;

export async function ensureDefaultPortalLinks(userId: string) {
  const db = getDb();
  const existing = await db
    .select()
    .from(portalLinks)
    .where(eq(portalLinks.userId, userId));
  const existingKeys = new Set(existing.map((link) => link.defaultKey).filter(Boolean));
  const missing = DEFAULT_PORTAL_LINKS.filter((link) => !existingKeys.has(link.defaultKey));
  if (!missing.length) return;

  const now = new Date().toISOString();
  const nextOrders = {
    life: existing.filter((link) => link.category === "life").reduce((highest, link) => Math.max(highest, link.sortOrder), -1) + 1,
    entertainment: existing.filter((link) => link.category === "entertainment").reduce((highest, link) => Math.max(highest, link.sortOrder), -1) + 1,
  };
  const visibleCounts = {
    life: existing.filter((link) => link.category === "life" && link.isVisible).length,
    entertainment: existing.filter((link) => link.category === "entertainment" && link.isVisible).length,
  };
  for (const link of missing) {
    const isVisible = visibleCounts[link.category] < 12;
    if (isVisible) visibleCounts[link.category] += 1;
    await db.insert(portalLinks).values({
      id: crypto.randomUUID(),
      userId,
      ...link,
      sortOrder: nextOrders[link.category]++,
      isDefault: true,
      isVisible,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function getVisiblePortalLinks(userId: string) {
  await ensureDefaultPortalLinks(userId);
  return getDb()
    .select()
    .from(portalLinks)
    .where(and(eq(portalLinks.userId, userId), eq(portalLinks.isVisible, true)))
    .orderBy(asc(portalLinks.category), asc(portalLinks.sortOrder), asc(portalLinks.createdAt));
}
