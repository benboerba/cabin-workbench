import { getSessionUser, type AppUser } from "./auth";

export async function getCurrentUser(): Promise<AppUser | null> {
  return getSessionUser();
}

export async function requireApiUser(): Promise<
  | { user: AppUser; response?: never }
  | { user?: never; response: Response }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      response: Response.json({ error: "请先登录后再继续" }, { status: 401 }),
    };
  }
  return { user };
}
