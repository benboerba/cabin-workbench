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
          <p className="eyebrow">木屋工作台 · 工作 / 生活 / 娱乐</p>
          <h1>工作有序，生活方便，<br />娱乐自在。</h1>
          <p className="signin-copy">
            回到一座属于你的私人木屋：工作间收好“一分小事”和“个人日程”，生活市集快速抵达，娱乐角自在放松。
          </p>
          <div className="signin-actions">
            <a className="primary-button signin-button" href="/auth?mode=login">邮箱登录</a>
            <a className="secondary-button signin-button" href="/auth?mode=register">注册账户</a>
            <a className="guest-button signin-button" href="/guest"><span>◇</span> 游客体验 <small>只看不保存</small></a>
          </div>
          <details className="home-download-panel">
            <summary><span>↓</span><div><strong>借鉴主包的工作台</strong><small>下载完整代码，在自己的电脑或服务器上使用</small></div><b>＋</b></summary>
            <div className="home-download-options">
              <a href="/downloads/cabin-workbench-local.zip" download><span>⌂</span><div><strong>个人本地版</strong><small>无需登录 · 本地文件保存</small></div><b>下载 ↓</b></a>
              <a href="/downloads/cabin-workbench-server.zip" download><span>⇄</span><div><strong>多用户服务器版</strong><small>邮箱登录 · 账户数据隔离</small></div><b>下载 ↓</b></a>
            </div>
            <p>压缩包不包含任何用户记录、账号、密码或服务器密钥。</p>
          </details>
          <p className="privacy-note">无需验证码。游客可以查看功能，登录后才能保存自己的记录</p>
        </section>
      </main>
    );
  }

  return (
    <HabitApp
      user={{
        displayName: user.displayName,
        email: user.email,
        onboardingVersion: user.onboardingVersion,
        edition: user.edition,
      }}
    />
  );
}
