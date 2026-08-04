"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { withBasePath } from "../lib/base-path";

type Mode = "login" | "register";

export function AuthForm() {
  const params = useSearchParams();
  const router = useRouter();
  const initialMode = useMemo<Mode>(
    () => (params.get("mode") === "register" ? "register" : "login"),
    [params],
  );
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const payload = {
      email: data.get("email"),
      password: data.get("password"),
      displayName: data.get("displayName"),
    };

    try {
      const response = await fetch(withBasePath(`/api/auth/${mode}`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "暂时无法继续，请稍后再试");
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "暂时无法继续，请稍后再试");
      setBusy(false);
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    router.replace(`/auth?mode=${nextMode}`, { scroll: false });
  }

  return (
    <section className="auth-card">
      <Link className="auth-back" href="/">← 返回木屋</Link>
      <div className="brand-mark" aria-hidden="true">1′</div>
      <p className="eyebrow">CABIN ACCOUNT</p>
      <h1>{mode === "login" ? "欢迎回到木屋" : "领取你的木屋钥匙"}</h1>
      <p className="auth-intro">
        {mode === "login"
          ? "用邮箱和密码进入，你的记录只会显示在自己的账户里。"
          : "不需要验证码。注册后即可保存一分小事、日程与自定义入口。"}
      </p>

      <div className="auth-tabs" aria-label="登录或注册">
        <button className={mode === "login" ? "active" : ""} type="button" onClick={() => switchMode("login")}>登录</button>
        <button className={mode === "register" ? "active" : ""} type="button" onClick={() => switchMode("register")}>注册</button>
      </div>

      <form className="auth-form" onSubmit={submit}>
        {mode === "register" && (
          <label>
            <span>你的称呼 <small>选填</small></span>
            <input name="displayName" type="text" maxLength={30} autoComplete="nickname" placeholder="例如：琴涵" />
          </label>
        )}
        <label>
          <span>邮箱</span>
          <input name="email" type="email" required autoComplete="email" placeholder="name@example.com" />
        </label>
        <label>
          <span>密码</span>
          <input name="password" type="password" required minLength={8} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="至少 8 个字符" />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={busy}>
          {busy ? "正在打开…" : mode === "login" ? "进入木屋" : "注册并进入"}
        </button>
      </form>
      <p className="privacy-note">密码会加密保存，公开代码仓库不包含任何用户数据或密钥</p>
    </section>
  );
}
