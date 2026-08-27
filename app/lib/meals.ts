import type { AppUser } from "./auth";

export const MEAL_CATEGORIES = ["meat", "vegetable", "staple", "soup", "other"] as const;
export type MealCategory = (typeof MEAL_CATEGORIES)[number];

export function isMealCategory(value: unknown): value is MealCategory {
  return typeof value === "string" && MEAL_CATEGORIES.includes(value as MealCategory);
}

export function isBobUser(user: AppUser) {
  return user.email.trim().toLowerCase() === "bob";
}

export function getTodayInShanghai(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function sanitizeMealImage(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  if (!/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)) return undefined;
  if (value.length > 1_400_000) return undefined;
  return value;
}

export function sanitizeMealTutorialUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length > 500) return undefined;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
