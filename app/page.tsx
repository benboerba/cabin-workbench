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
          <p className="eyebrow">浮岛工作台</p>
          <h1>长期的事慢慢生长，<br />眼前的事清楚推进。</h1>
          <p className="signin-copy">
            一个属于你的私人小世界：用“一分小事”坚持长期习惯，用“个人日程”安排事项与项目。
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
