import { getSessionUser, type AppUser } from "./auth";

export async function getCurrentUser(): Promise<AppUser | null> {
  return getSessionUser();
}

export async function requireApiUser(options: { writable?: boolean } = {}): Promise<
  | { user: AppUser; response?: never }
  | { user?: never; response: Response }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      response: Response.json({ error: "请先登录后再继续" }, { status: 401 }),
    };
  }
  if (options.writable && user.edition === "guest") {
    return {
      response: Response.json(
        { error: "游客模式只能查看，登录或注册后才能保存" },
        { status: 403 },
      ),
    };
  }
  return { user };
}
