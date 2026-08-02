import { headers } from "next/headers";
import { getChatGPTUser, type ChatGPTUser } from "../chatgpt-auth";

const LOCAL_PREVIEW_USER: ChatGPTUser = {
  userId: "local-preview-user",
  displayName: "小事体验者",
  email: "preview@localhost",
  fullName: "小事体验者",
};

export async function getCurrentUser(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  if (user) return user;

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  if (host.startsWith("localhost:") || host.startsWith("127.0.0.1:")) {
    return LOCAL_PREVIEW_USER;
  }

  return null;
}

export async function requireApiUser(): Promise<
  | { user: ChatGPTUser; response?: never }
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
