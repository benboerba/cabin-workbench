import { chatGPTSignInPath } from "./chatgpt-auth";
import { HabitApp } from "./components/HabitApp";
import { getCurrentUser } from "./lib/current-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="signin-shell">
        <section className="signin-card">
          <div className="brand-mark" aria-hidden="true">
            1′
          </div>
          <p className="eyebrow">一分小事</p>
          <h1>把重要的事，<br />缩小到一分钟。</h1>
          <p className="signin-copy">
            每天完成一件小事，连续二十一天。你的打卡、日历与备注都会安全地跟着你。
          </p>
          <a className="primary-button signin-button" href={chatGPTSignInPath("/")}>
            使用 ChatGPT 登录
          </a>
          <p className="privacy-note">登录后才能查看和保存你的私人记录</p>
        </section>
      </main>
    );
  }

  return (
    <HabitApp
      user={{
        displayName: user.displayName,
        email: user.email,
      }}
    />
  );
}
