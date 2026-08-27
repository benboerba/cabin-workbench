"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ONBOARDING_VERSION } from "../lib/onboarding";
import { withBasePath } from "../lib/base-path";

type Challenge = {
  id: string;
  title: string;
  status: "active" | "completed" | "archived";
  createdDate: string;
  endedDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type Checkin = {
  id: string;
  challengeId: string;
  habitDate: string;
  note: string;
  timerStartedAt: string;
  completedAt: string;
};

type TimerSession = {
  id: string;
  challengeId: string;
  habitDate: string;
  status: "running" | "paused" | "completed" | "expired";
  startedAt: string;
  remainingMs: number;
  pauseUsed: boolean;
  pausedAt: string | null;
  updatedAt: string;
};

type DashboardData = {
  challenges: Challenge[];
  checkins: Checkin[];
  sessions: TimerSession[];
  scheduleItems: ScheduleItem[];
  scheduleEntries: ScheduleEntry[];
  portalLinks: PortalLink[];
  friends: string[];
  notifications: WorkbenchNotification[];
};

type WorkbenchNotification = {
  id: string;
  recipientUsername: string;
  actorUsername: string | null;
  itemId: string | null;
  kind: "today_pending" | "shared" | "progress" | "changed" | "removed" | "tool_inactive";
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type DailyPhraseData = {
  phrase: {
    id: string;
    language: string;
    country: string;
    flag: string;
    locale: string;
    text: string;
    pronunciation: string;
    meaning: string;
    context: string;
    source: string;
  };
  state: {
    swapCount: number;
    learned: boolean;
    favorite: boolean;
    swapsRemaining: number;
  };
};

type FavoritePhrase = DailyPhraseData["phrase"] & {
  phraseDate: string;
  favoriteAt: string;
};

type FavoritePhraseData = {
  favorites: FavoritePhrase[];
};

type WorkbenchToolKey = "habit" | "schedule" | "pindou" | "favorites";

type ToolUsageRecord = {
  toolKey: WorkbenchToolKey;
  openCount: number;
  firstSeenAt: string;
  lastOpenedAt: string | null;
  isFolded: boolean;
};

type ToolUsageData = {
  usage: ToolUsageRecord[];
};

type DeviceActivityOperation = {
  tool: string;
  arguments: string;
  command: string;
  output: string;
};

type DeviceActivityRecord = {
  id: number;
  instruction: string;
  timestamp: number;
  timeLabel: string;
  operations: DeviceActivityOperation[];
  result: string;
  assistantMessageId: number | null;
  delivery: {
    status: "sent" | "waiting" | "before_service";
    messageId: string;
    deliveredAt: string;
  };
};

type DeviceActivityData = {
  records: DeviceActivityRecord[];
  generatedAt: string;
  generatedLabel: string;
  wechatReady: boolean;
};

type PortalLink = {
  id: string;
  category: "life" | "entertainment";
  label: string;
  url: string;
  icon: string;
  color: string;
  sortOrder: number;
  defaultKey: string | null;
  isDefault: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

type ScheduleItem = {
  id: string;
  parentItemId: string | null;
  parentTitle: string | null;
  kind: "task" | "project";
  title: string;
  note: string;
  priority: "important" | "normal" | "later";
  repeatDaily: boolean;
  startDate: string;
  dueDate: string | null;
  progress: number;
  status: "active" | "completed" | "archived";
  completedDate: string | null;
  ownerUsername: string;
  participantUsernames: string[];
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

type ScheduleEntry = {
  id: string;
  itemId: string;
  entryDate: string;
  action: "completed" | "touched";
  previousProgress: number | null;
  progress: number | null;
  note: string;
  actorUsername: string;
  createdAt: string;
  updatedAt: string;
};

type UserSummary = {
  displayName: string;
  email: string;
  onboardingVersion: number;
  edition: "local" | "server" | "guest";
};

type WorkbenchTheme = "cabin" | "office";

const WORKBENCH_THEME_STORAGE_KEY = "cabin-workbench-theme";
const PINDOU_TOOL_PATH = "/pindou/index.html";
const FAVORITES_TOOL_PATH = "/favorites";
const WORKBENCH_TOOL_KEYS: WorkbenchToolKey[] = ["habit", "schedule", "pindou", "favorites"];
const DAY_MS = 24 * 60 * 60 * 1000;

const CHALLENGE_COLORS = ["#e36a44", "#5b8272", "#c49a45"];
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const PRIORITY_LABELS = { important: "重要", normal: "普通", later: "稍后" } as const;
const SCHEDULE_EVENT_COLORS = [
  "rgba(243, 191, 196, 0.78)",
  "rgba(246, 210, 181, 0.78)",
  "rgba(201, 199, 238, 0.78)",
  "rgba(189, 229, 211, 0.78)",
  "rgba(197, 220, 241, 0.78)",
  "rgba(243, 227, 169, 0.78)",
  "rgba(215, 231, 184, 0.78)",
  "rgba(229, 199, 227, 0.78)",
  "rgba(191, 225, 226, 0.78)",
  "rgba(239, 201, 184, 0.78)",
] as const;

function toLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value: string, amount: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return toLocalDate(date);
}

function openPindouTool() {
  window.location.assign(PINDOU_TOOL_PATH);
}

function openFavoritesTool() {
  window.location.assign(FAVORITES_TOOL_PATH);
}

function formatDay(value: string) {
  const date = parseDate(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatLongDay(value: string) {
  const date = parseDate(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatPortalHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function findToolUsage(usage: ToolUsageRecord[], toolKey: WorkbenchToolKey) {
  return usage.find((item) => item.toolKey === toolKey);
}

function isInfrequentTool(usage: ToolUsageRecord | undefined) {
  if (!usage) return false;
  return getToolIdleDays(usage) > 7;
}

function getToolIdleDays(usage: ToolUsageRecord) {
  const reference = new Date(usage.lastOpenedAt ?? usage.firstSeenAt);
  const current = new Date();
  const currentDay = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
  const referenceDay = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()).getTime();
  return Math.max(0, Math.round((currentDay - referenceDay) / DAY_MS));
}

function formatToolInactivity(usage: ToolUsageRecord) {
  const days = getToolIdleDays(usage);
  if (days === 0) return usage.lastOpenedAt ? "今天使用" : "今天尚未使用";
  return `${days} 天未使用`;
}

function getChallengeStreak(challengeId: string, checkins: Checkin[], today: string) {
  const dates = new Set(
    checkins
      .filter((item) => item.challengeId === challengeId)
      .map((item) => item.habitDate),
  );
  let ending = dates.has(today) ? today : addDays(today, -1);
  if (!dates.has(ending)) return 0;
  let streak = 0;
  while (dates.has(ending)) {
    streak += 1;
    ending = addDays(ending, -1);
  }
  return streak;
}

function isSessionUsable(session: TimerSession, today: string) {
  const now = Date.now();
  if (session.status === "running") {
    return now - new Date(session.startedAt).getTime() <= 2 * 60 * 1000;
  }
  return (
    session.status === "paused" &&
    session.habitDate === today &&
    Boolean(session.pausedAt) &&
    now - new Date(session.pausedAt as string).getTime() <= 10 * 60 * 1000
  );
}

function isBobUser(user: UserSummary) {
  return user.email.trim().toLowerCase() === "bob";
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(withBasePath(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "操作没有成功，请稍后再试");
  return result;
}

export function HabitApp({ user }: { user: UserSummary }) {
  const [activeTool, setActiveTool] = useState<"world" | "habit" | "schedule">("world");
  const [theme, setTheme] = useState<WorkbenchTheme>("cabin");
  const [guideOpen, setGuideOpen] = useState(user.onboardingVersion < ONBOARDING_VERSION);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [seenGuideVersion, setSeenGuideVersion] = useState(user.onboardingVersion);
  const toolUseDayRef = useRef<Partial<Record<WorkbenchToolKey, string>>>({});

  const markToolUsed = useCallback((toolKey: WorkbenchToolKey) => {
    if (user.edition === "guest") return;
    const usageDay = toLocalDate();
    if (toolUseDayRef.current[toolKey] === usageDay) return;
    toolUseDayRef.current[toolKey] = usageDay;
    void api("/api/tool-usage", {
      method: "POST",
      body: JSON.stringify({ toolKey, action: "use" }),
      keepalive: true,
    }).catch(() => {
      if (toolUseDayRef.current[toolKey] === usageDay) delete toolUseDayRef.current[toolKey];
    });
  }, [user.edition]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(WORKBENCH_THEME_STORAGE_KEY);
    if (savedTheme !== "cabin" && savedTheme !== "office") return;
    const task = window.setTimeout(() => setTheme(savedTheme), 0);
    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.workbenchTheme = theme;
  }, [theme]);

  useEffect(() => {
    const openSchedule = () => {
      markToolUsed("schedule");
      setActiveTool("schedule");
    };
    window.addEventListener("cabin:open-schedule", openSchedule);
    return () => window.removeEventListener("cabin:open-schedule", openSchedule);
  }, [markToolUsed]);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "cabin" ? "office" : "cabin";
      window.localStorage.setItem(WORKBENCH_THEME_STORAGE_KEY, next);
      return next;
    });
  }

  function rememberGuide() {
    setGuideOpen(false);
    if (seenGuideVersion >= ONBOARDING_VERSION) return;
    setSeenGuideVersion(ONBOARDING_VERSION);
    void api("/api/onboarding", {
      method: "POST",
      body: JSON.stringify({ version: ONBOARDING_VERSION }),
    }).catch(() => {
      setSeenGuideVersion(user.onboardingVersion);
    });
  }

  function startFromGuide(tool: "habit" | "schedule") {
    rememberGuide();
    markToolUsed(tool);
    setActiveTool(tool);
  }

  const currentView = activeTool === "habit"
    ? <HabitWorkspace user={user} theme={theme} onToggleTheme={toggleTheme} onBack={() => setActiveTool("world")} onUse={() => markToolUsed("habit")} />
    : activeTool === "schedule"
      ? <ScheduleWorkspace user={user} theme={theme} onToggleTheme={toggleTheme} onBack={() => setActiveTool("world")} onUse={() => markToolUsed("schedule")} />
      : (
        <WorldWorkbench
          user={user}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenGuide={() => setGuideOpen(true)}
          onOpenDownloads={() => setDownloadsOpen(true)}
          openHabit={() => setActiveTool("habit")}
          openSchedule={() => setActiveTool("schedule")}
          onUseTool={markToolUsed}
        />
      );

  return (
    <>
      {currentView}
      {user.edition !== "server" && (
        <div className={`local-edition-badge ${user.edition === "guest" ? "guest-edition-badge" : ""}`} title={user.edition === "guest" ? "游客模式不会保存任何操作" : "记录只保存在这台电脑的本地文件中"}>
          <span>●</span>
          <div><strong>{user.edition === "guest" ? "游客体验" : "个人本地版"}</strong><small>{user.edition === "guest" ? "只读模式 · 不保存数据" : "数据保存在此电脑"}</small></div>
        </div>
      )}
      {downloadsOpen && (
        <div className="download-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDownloadsOpen(false)}>
          <section className="download-modal" role="dialog" aria-modal="true" aria-labelledby="download-modal-title">
            <button className="download-modal-close" onClick={() => setDownloadsOpen(false)} aria-label="关闭">×</button>
            <p>PACK THE CABIN · SOURCE CODE</p>
            <h2 id="download-modal-title">把这座工作台带回去</h2>
            <span>2026 年 8 月 8 日最新版，已包含双风格界面与拼豆识图。压缩包只包含公开代码，不包含用户记录、账号、密码或服务器密钥。</span>
            <div className="global-download-options">
              <a href={withBasePath("/downloads/cabin-workbench-local-20260808.zip")} download><i>⌂</i><div><small>PERSONAL · LOCAL · 2026.08.08</small><strong>个人本地版</strong><p>无需登录，一条命令启动；数据保存在自己的电脑。</p></div><b>下载最新版 ↓</b></a>
              <a href={withBasePath("/downloads/cabin-workbench-server-20260808.zip")} download><i>⇄</i><div><small>MULTI-USER · SERVER · 2026.08.08</small><strong>多用户服务器版</strong><p>用户名登录与账户隔离，适合部署后分享给其他人。</p></div><b>下载最新版 ↓</b></a>
            </div>
          </section>
        </div>
      )}
      {guideOpen && (
        <OnboardingGuide
          onClose={rememberGuide}
          onOpenHabit={() => startFromGuide("habit")}
          onOpenSchedule={() => startFromGuide("schedule")}
        />
      )}
    </>
  );
}

const GUIDE_STEPS = [
  {
    key: "map",
    index: "01",
    eyebrow: "WELCOME · 工作台地图",
    title: "先看今天，再决定去哪里。",
    copy: "登录后会直接来到工作台。这里集中今天的日程、项目和习惯；生活与娱乐只保留为两个独立入口，辅助功能则收在头像菜单里。",
    points: ["工作台：长期习惯与短线日程", "生活：常用购物入口", "娱乐：常用内容与视频网站"],
  },
  {
    key: "habit",
    index: "02",
    eyebrow: "LONG TERM · 长线养成",
    title: "一分小事，把习惯缩小到一分钟。",
    copy: "选择一件值得坚持的小事，每天主动开始 60 秒。倒计时结束自动打卡，连续完成 21 天后再更换新习惯。",
    points: ["每天最多同时坚持 3 件", "中断后连续天数重新开始", "完成后可写备注并汇总复习"],
  },
  {
    key: "schedule",
    index: "03",
    eyebrow: "SHORT TERM · 短线执行",
    title: "个人日程，让眼前的事持续向前。",
    copy: "普通事项可以安排当天或每日重复；项目不拆子任务，只记录截止日期、优先级和你亲手更新的进度。",
    points: ["每日事项每天生成一条记录", "未结束的项目每天继续提醒", "当天推进过的项目会自动往后排"],
  },
  {
    key: "start",
    index: "04",
    eyebrow: "FIRST QUEST · 第一个任务",
    title: "现在，选择你的第一条路线。",
    copy: "想培养一个长期习惯，就从“一分小事”开始；想把今天和项目安排清楚，就进入“个人日程”。之后可以随时从头像菜单打开「新手指引」。",
    points: ["长线：一天一分钟，连续坚持 21 天", "短线：今天做什么，项目推进到哪里"],
  },
] as const;

function OnboardingGuide({
  onClose,
  onOpenHabit,
  onOpenSchedule,
}: {
  onClose: () => void;
  onOpenHabit: () => void;
  onOpenSchedule: () => void;
}) {
  const [step, setStep] = useState(0);
  const current = GUIDE_STEPS[step];
  const finalStep = step === GUIDE_STEPS.length - 1;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className="guide-overlay" role="presentation">
      <section className="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <aside className="guide-rail">
          <div className="guide-mark"><span>?</span><i /></div>
          <p>PLAYER GUIDE</p>
          <h3>木屋使用说明</h3>
          <ol aria-label="指引步骤">
            {GUIDE_STEPS.map((item, index) => (
              <li key={item.key} className={index === step ? "active" : index < step ? "done" : ""}>
                <button onClick={() => setStep(index)} aria-label={`查看第${index + 1}步：${item.title}`}>
                  <span>{index < step ? "✓" : item.index}</span>
                  <i />
                </button>
              </li>
            ))}
          </ol>
          <small>按 Esc 也可以退出</small>
        </aside>

        <div className="guide-content">
          <button className="guide-close" onClick={onClose} aria-label="关闭新手指引">×</button>
          <div className={`guide-scene guide-scene-${current.key}`} aria-hidden="true">
            {current.key === "map" && <><span className="guide-room">工</span><span className="guide-room">生</span><span className="guide-room">娱</span></>}
            {current.key === "habit" && <div className="guide-hourglass"><span>1′</span><i /><b /></div>}
            {current.key === "schedule" && <div className="guide-calendar"><span>今</span><i /><i /><i /></div>}
            {current.key === "start" && <div className="guide-compass"><span>长</span><i>短</i></div>}
          </div>

          <div className="guide-copy">
            <p>{current.eyebrow}</p>
            <h2 id="guide-title">{current.title}</h2>
            <span>{current.copy}</span>
            <ul>
              {current.points.map((point) => <li key={point}><i>✓</i>{point}</li>)}
            </ul>
          </div>

          {finalStep && (
            <div className="guide-route-choices">
              <button onClick={onOpenHabit}><span>1′</span><div><small>长期养成</small><strong>进入一分小事</strong></div><em>→</em></button>
              <button onClick={onOpenSchedule}><span>▦</span><div><small>短线执行</small><strong>进入个人日程</strong></div><em>→</em></button>
            </div>
          )}

          <footer className="guide-actions">
            <button className="guide-skip" onClick={onClose}>{finalStep ? "先看看木屋" : "跳过引导"}</button>
            <div>
              {step > 0 && <button className="guide-back" onClick={() => setStep((value) => value - 1)}>上一步</button>}
              {!finalStep && <button className="guide-next" onClick={() => setStep((value) => value + 1)}>下一步 <span>→</span></button>}
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}

function HabitWorkspace({
  user,
  theme,
  onToggleTheme,
  onBack,
  onUse,
}: {
  user: UserSummary;
  theme: WorkbenchTheme;
  onToggleTheme: () => void;
  onBack: () => void;
  onUse: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [timerChallenge, setTimerChallenge] = useState<Challenge | null>(null);
  const [noteCheckin, setNoteCheckin] = useState<Checkin | null>(null);
  const [toast, setToast] = useState("");
  const today = toLocalDate();

  const loadDashboard = useCallback(async () => {
    try {
      const result = await api<DashboardData>("/api/dashboard");
      setData(result);
      window.dispatchEvent(new CustomEvent("cabin:notifications-refresh"));
      setLoadingError("");
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : "暂时无法读取记录");
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(task);
  }, [loadDashboard]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const activeChallenges = data?.challenges.filter((item) => item.status === "active") ?? [];
  const openSession = timerChallenge
    ? data?.sessions.find(
        (item) =>
          item.challengeId === timerChallenge.id &&
          isSessionUsable(item, today),
      )
    : undefined;

  async function archiveChallenge(challenge: Challenge) {
    const confirmed = window.confirm(
      `结束「${challenge.title}」吗？已有的打卡和备注会保留。`,
    );
    if (!confirmed) return;
    try {
      await api(`/api/challenges/${challenge.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "archive", endedDate: today }),
      });
      setToast("这件小事已收进历史");
      await loadDashboard();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "操作没有成功");
    }
  }

  async function handleCompleted(checkin: Checkin, challengeCompleted: boolean) {
    setTimerChallenge(null);
    setNoteCheckin(checkin);
    await loadDashboard();
    if (challengeCompleted) setToast("二十一天完成了，真了不起");
  }

  return (
    <main className="app-shell" onClickCapture={onUse}>
      <header className="topbar">
        <button className="brand brand-button" onClick={onBack} aria-label="返回木屋工作台">
          <span className="brand-dot">1′</span>
          <span>一分小事</span>
          <small>返回工作台</small>
        </button>
        <div className="tool-header-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <NotificationCenter user={user} />
          <div className="account-chip" title={user.email}>
            <span>{user.displayName.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user.displayName}</strong>
              {user.edition === "local" ? <small>个人本地版</small> : <a href={withBasePath("/logout")}>{user.edition === "guest" ? "退出体验" : "退出"}</a>}
            </div>
          </div>
        </div>
      </header>

      <div id="top" className="content-wrap">
        <section className="hero-section">
          <p className="date-line">{formatLongDay(today)}</p>
          <div className="hero-heading-row">
            <div>
              <h1>今天，给重要的小事<br /><em>一分钟。</em></h1>
              <p>不用做很多，只要完整地开始一次。</p>
            </div>
            <div className="today-seal" aria-label="今日完成数">
              <strong>{activeChallenges.filter((challenge) => data?.checkins.some((item) => item.challengeId === challenge.id && item.habitDate === today)).length}</strong>
              <span>今日完成</span>
            </div>
          </div>
        </section>

        {loadingError ? (
          <section className="state-card">
            <p>{loadingError}</p>
            <button className="secondary-button" onClick={() => void loadDashboard()}>
              再试一次
            </button>
          </section>
        ) : !data ? (
          <section className="habit-grid" aria-label="正在读取你的小事">
            {[0, 1, 2].map((item) => <div className="habit-card skeleton-card" key={item} />)}
          </section>
        ) : (
          <>
            <section className="section-block" aria-labelledby="today-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">TODAY</p>
                  <h2 id="today-title">正在坚持</h2>
                </div>
                <span className="slot-count">{activeChallenges.length} / 3 件</span>
              </div>

              <div className="habit-grid">
                {activeChallenges.map((challenge, index) => {
                  const challengeCheckins = data.checkins.filter((item) => item.challengeId === challenge.id);
                  const streak = getChallengeStreak(challenge.id, data.checkins, today);
                  const doneToday = challengeCheckins.some((item) => item.habitDate === today);
                  const session = data.sessions.find(
                    (item) => item.challengeId === challenge.id && isSessionUsable(item, today),
                  );
                  const expectedDate = addDays(today, Math.max(0, 21 - streak - (doneToday ? 0 : 1)));
                  const color = CHALLENGE_COLORS[index % CHALLENGE_COLORS.length];
                  return (
                    <article className="habit-card" key={challenge.id} style={{ "--accent": color } as React.CSSProperties}>
                      <div className="habit-card-top">
                        <span className="habit-number">0{index + 1}</span>
                        <button className="icon-button" onClick={() => void archiveChallenge(challenge)} aria-label={`结束${challenge.title}`} title="结束挑战">···</button>
                      </div>
                      <h3>{challenge.title}</h3>
                      <div className="streak-row">
                        <strong>{streak}</strong>
                        <span>连续天数<br />/ 21 天</span>
                      </div>
                      <div className="progress-dots" aria-label={`已连续完成${streak}天`}>
                        {Array.from({ length: 21 }, (_, dot) => (
                          <span className={dot < streak ? "filled" : ""} key={dot} />
                        ))}
                      </div>
                      <p className="target-date">预计 {formatDay(expectedDate)} 完成本轮</p>
                      <button
                        className={`habit-action ${doneToday ? "done" : ""}`}
                        disabled={doneToday}
                        onClick={() => setTimerChallenge(challenge)}
                      >
                        <span>{doneToday ? "✓" : session?.status === "paused" ? "▶" : "1′"}</span>
                        {doneToday ? "今日已完成" : session ? "继续这一分钟" : "开始这一分钟"}
                      </button>
                    </article>
                  );
                })}

                {activeChallenges.length < 3 && (
                  <button className="habit-card add-card" onClick={() => setCreateOpen(true)}>
                    <span className="add-circle">＋</span>
                    <strong>添加一件小事</strong>
                    <small>创建当天，就是第一天</small>
                  </button>
                )}
              </div>
            </section>

            <CalendarSection
              challenges={data.challenges}
              checkins={data.checkins}
              today={today}
            />

            <NotesArchive
              challenges={data.challenges}
              checkins={data.checkins}
              onEdit={setNoteCheckin}
              onRestart={(challenge) => {
                setCreateOpen(true);
                sessionStorage.setItem("oneminute-prefill", challenge.title);
              }}
            />
          </>
        )}
      </div>

      <footer>
        <span>一分小事</span>
        <p>微小，但完整。一天，只需要一分钟。</p>
      </footer>

      {createOpen && (
        <CreateChallengeModal
          today={today}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            setToast("新的一轮，从今天开始");
            await loadDashboard();
          }}
        />
      )}

      {timerChallenge && (
        <TimerExperience
          challenge={timerChallenge}
          existingSession={openSession}
          isGuest={user.edition === "guest"}
          today={today}
          onClose={() => setTimerChallenge(null)}
          onCompleted={handleCompleted}
          onSessionChange={loadDashboard}
        />
      )}

      {noteCheckin && (
        <NoteModal
          checkin={noteCheckin}
          challenge={data?.challenges.find((item) => item.id === noteCheckin.challengeId)}
          onClose={() => setNoteCheckin(null)}
          onSaved={async () => {
            setNoteCheckin(null);
            setToast("这一分钟，已经好好记下");
            await loadDashboard();
          }}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function CreateChallengeModal({
  today,
  onClose,
  onCreated,
}: {
  today: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [title, setTitle] = useState(() => {
    const prefill = sessionStorage.getItem("oneminute-prefill") ?? "";
    if (prefill) sessionStorage.removeItem("oneminute-prefill");
    return prefill;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api("/api/challenges", {
        method: "POST",
        body: JSON.stringify({ title, createdDate: today }),
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
        <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        <p className="eyebrow">NEW RITUAL</p>
        <h2 id="create-title">这一轮，你想坚持什么？</h2>
        <p>把它写得小一点，小到一分钟就能完成。</p>
        <form onSubmit={submit}>
          <label htmlFor="habit-title">我的一件小事</label>
          <input
            id="habit-title"
            autoFocus
            maxLength={60}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：背一个单词"
          />
          <div className="example-row">
            {['读一页书', '拉伸一分钟', '写一句日记'].map((example) => (
              <button type="button" key={example} onClick={() => setTitle(example)}>{example}</button>
            ))}
          </div>
          <div className="commitment-note">
            <span>21</span>
            <p><strong>连续二十一天</strong><br />漏掉一天，下一次会从第 1 天重新开始。</p>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full-button" disabled={saving || !title.trim()}>
            {saving ? "正在创建…" : "从今天开始"}
          </button>
        </form>
      </section>
    </div>
  );
}

function CalendarSection({
  challenges,
  checkins,
  today,
}: {
  challenges: Challenge[];
  checkins: Checkin[];
  today: string;
}) {
  const [month, setMonth] = useState(() => {
    const now = parseDate(today);
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);
  const firstOffset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const previousMonthDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstOffset + 1;
    if (day < 1) {
      const date = new Date(month.getFullYear(), month.getMonth() - 1, previousMonthDays + day);
      return { value: toLocalDate(date), number: date.getDate(), muted: true };
    }
    if (day > daysInMonth) {
      const date = new Date(month.getFullYear(), month.getMonth() + 1, day - daysInMonth);
      return { value: toLocalDate(date), number: date.getDate(), muted: true };
    }
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return { value: toLocalDate(date), number: day, muted: false };
  });

  const selectedRecords = checkins.filter((item) => item.habitDate === selected);
  const selectedRelevant = challenges.filter(
    (challenge) =>
      challenge.createdDate <= selected &&
      selected <= today &&
      (!challenge.endedDate || selected <= challenge.endedDate),
  );

  return (
    <section className="section-block calendar-section" aria-labelledby="calendar-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CALENDAR</p>
          <h2 id="calendar-title">小事日历</h2>
        </div>
        <div className="legend"><span className="legend-done" />完成 <span className="legend-pending" />待完成 <span className="legend-missed" />中断</div>
      </div>
      <div className="calendar-layout">
        <div className="calendar-card">
          <div className="calendar-toolbar">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="上个月">←</button>
            <strong>{month.getFullYear()}年 {month.getMonth() + 1}月</strong>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="下个月">→</button>
          </div>
          <div className="calendar-grid weekday-row">
            {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid">
            {cells.map((cell) => {
              const records = checkins.filter((item) => item.habitDate === cell.value);
              const relevant = challenges.filter(
                (challenge) =>
                  challenge.createdDate <= cell.value &&
                  cell.value <= today &&
                  (!challenge.endedDate || cell.value <= challenge.endedDate),
              );
              return (
                <button
                  key={cell.value}
                  className={`calendar-day ${cell.muted ? "muted" : ""} ${cell.value === today ? "today" : ""} ${cell.value === selected ? "selected" : ""}`}
                  onClick={() => setSelected(cell.value)}
                >
                  <span className="day-number">{cell.number}</span>
                  <span className="day-marks">
                    {relevant.slice(0, 3).map((challenge) => {
                      const challengeIndex = challenges.findIndex((item) => item.id === challenge.id);
                      const done = records.some((item) => item.challengeId === challenge.id);
                      const markClass = done ? "mark-done" : cell.value === today ? "mark-pending" : "mark-missed";
                      return <i key={challenge.id} className={markClass} style={{ "--mark": CHALLENGE_COLORS[Math.abs(challengeIndex) % 3] } as React.CSSProperties} />;
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="day-detail">
          <p className="eyebrow">{selected === today ? "TODAY" : "DAY NOTE"}</p>
          <h3>{formatLongDay(selected)}</h3>
          {selectedRelevant.length === 0 ? (
            <div className="empty-day"><span>○</span><p>这一天还没有小事记录</p></div>
          ) : (
            <div className="day-records">
              {selectedRelevant.map((challenge) => {
                const record = selectedRecords.find((item) => item.challengeId === challenge.id);
                return (
                  <div className={`day-record ${record ? "complete" : selected === today ? "pending" : "missed"}`} key={challenge.id}>
                    <span>{record ? "✓" : selected === today ? "○" : "×"}</span>
                    <div>
                      <strong>{challenge.title}</strong>
                      <small>{record ? "完成了一分钟" : selected === today ? "今天尚未完成" : "这一天中断"}</small>
                      {record?.note && <p>“{record.note}”</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function NotesArchive({
  challenges,
  checkins,
  onEdit,
  onRestart,
}: {
  challenges: Challenge[];
  checkins: Checkin[];
  onEdit: (checkin: Checkin) => void;
  onRestart: (challenge: Challenge) => void;
}) {
  const challengesWithHistory = challenges.filter((challenge) => checkins.some((item) => item.challengeId === challenge.id));
  const [selectedId, setSelectedId] = useState(challengesWithHistory[0]?.id ?? "");

  const selectedChallenge = challenges.find((item) => item.id === selectedId) ?? challengesWithHistory[0];
  const notes = checkins
    .filter((item) => item.challengeId === selectedChallenge?.id && item.note)
    .sort((a, b) => b.habitDate.localeCompare(a.habitDate));

  function markdown() {
    if (!selectedChallenge) return "";
    const rows = notes.map((item) => `## ${formatDay(item.habitDate)}\n\n${item.note}`);
    return `# ${selectedChallenge.title}｜一分钟笔记\n\n${rows.join("\n\n")}`;
  }

  async function copyNotes() {
    await navigator.clipboard.writeText(markdown());
  }

  function downloadNotes() {
    const blob = new Blob([markdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedChallenge?.title ?? "一分钟笔记"}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="section-block notes-section" aria-labelledby="notes-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ARCHIVE</p>
          <h2 id="notes-title">一分钟笔记</h2>
        </div>
        {selectedChallenge && (
          <div className="export-actions">
            <button onClick={() => void copyNotes()}>复制全部</button>
            <button onClick={downloadNotes}>下载 Markdown</button>
          </div>
        )}
      </div>

      {challengesWithHistory.length === 0 ? (
        <div className="notes-empty">
          <span>✎</span>
          <h3>完成第一分钟后，笔记会出现在这里</h3>
          <p>写下一点点，也是在给未来的自己留线索。</p>
        </div>
      ) : (
        <div className="notes-layout">
          <nav className="challenge-tabs" aria-label="选择一件小事">
            {challengesWithHistory.map((challenge) => (
              <button key={challenge.id} className={challenge.id === selectedChallenge?.id ? "active" : ""} onClick={() => setSelectedId(challenge.id)}>
                <span>{challenge.status === "active" ? "进行中" : challenge.status === "completed" ? "已完成" : "已结束"}</span>
                {challenge.title}
              </button>
            ))}
          </nav>
          <div className="note-list">
            <div className="note-list-head">
              <div>
                <h3>{selectedChallenge?.title}</h3>
                <p>{checkins.filter((item) => item.challengeId === selectedChallenge?.id).length} 次完成 · {notes.length} 条笔记</p>
              </div>
              {selectedChallenge?.status !== "active" && <button className="text-button" onClick={() => onRestart(selectedChallenge)}>再挑战 21 天</button>}
            </div>
            {notes.length === 0 ? (
              <p className="no-notes">已经开始了。下一次完成后，试着留下一句话吧。</p>
            ) : notes.map((note) => (
              <article className="note-item" key={note.id}>
                <time>{formatDay(note.habitDate)}</time>
                <p>{note.note}</p>
                <button onClick={() => onEdit(note)}>编辑</button>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TimerExperience({
  challenge,
  existingSession,
  isGuest,
  today,
  onClose,
  onCompleted,
  onSessionChange,
}: {
  challenge: Challenge;
  existingSession?: TimerSession;
  isGuest: boolean;
  today: string;
  onClose: () => void;
  onCompleted: (checkin: Checkin, challengeCompleted: boolean) => Promise<void>;
  onSessionChange: () => Promise<void>;
}) {
  const [phase, setPhase] = useState<"prepare" | "starting" | "running" | "paused" | "celebrate">(
    existingSession?.status === "paused" ? "paused" : existingSession?.status === "running" ? "running" : "prepare",
  );
  const [prepareCount, setPrepareCount] = useState(3);
  const [session, setSession] = useState<TimerSession | undefined>(existingSession);
  const [remaining, setRemaining] = useState(existingSession?.remainingMs ?? 60000);
  const [muted, setMuted] = useState(() => localStorage.getItem("oneminute-muted") === "true");
  const [error, setError] = useState("");
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  const playTone = useCallback((frequency: number, duration = 0.12) => {
    if (muted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch { /* Sound is optional. */ }
  }, [muted]);

  const startSession = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase("starting");
    try {
      if (isGuest) {
        const now = new Date().toISOString();
        const guestSession: TimerSession = {
          id: `guest-timer-${challenge.id}`,
          challengeId: challenge.id,
          habitDate: today,
          status: "running",
          startedAt: now,
          remainingMs: 60000,
          pauseUsed: false,
          pausedAt: null,
          updatedAt: now,
        };
        setSession(guestSession);
        setRemaining(guestSession.remainingMs);
        setPhase("running");
        playTone(520, 0.14);
        return;
      }
      const result = await api<{ session: TimerSession }>("/api/timer/start", {
        method: "POST",
        body: JSON.stringify({ challengeId: challenge.id, habitDate: today }),
      });
      setSession(result.session);
      setRemaining(result.session.remainingMs);
      setPhase(result.session.status === "paused" ? "paused" : "running");
      playTone(520, 0.14);
      await onSessionChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法开始计时");
      setPhase("prepare");
      startedRef.current = false;
    }
  }, [challenge.id, isGuest, onSessionChange, playTone, today]);

  useEffect(() => {
    if (phase !== "prepare") return;
    const timeout = window.setTimeout(() => {
      if (prepareCount <= 1) void startSession();
      else setPrepareCount((value) => value - 1);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [phase, prepareCount, startSession]);

  const finish = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    try {
      if (isGuest) {
        setPhase("celebrate");
        playTone(660, 0.18);
        window.setTimeout(() => playTone(880, 0.25), 160);
        navigator.vibrate?.([45, 40, 75]);
        window.setTimeout(onClose, 1500);
        return;
      }
      const result = await api<{ checkin: Checkin; challengeCompleted?: boolean }>("/api/timer/complete", {
        method: "POST",
        body: JSON.stringify({ challengeId: challenge.id }),
      });
      setPhase("celebrate");
      playTone(660, 0.18);
      window.setTimeout(() => playTone(880, 0.25), 160);
      navigator.vibrate?.([45, 40, 75]);
      window.setTimeout(() => void onCompleted(result.checkin, Boolean(result.challengeCompleted)), 1500);
    } catch (err) {
      completedRef.current = false;
      setError(err instanceof Error ? err.message : "完成记录没有保存");
    }
  }, [challenge.id, isGuest, onClose, onCompleted, playTone]);

  useEffect(() => {
    if (phase !== "running" || !session) return;
    const tick = () => {
      const value = Math.max(0, session.remainingMs - (Date.now() - new Date(session.startedAt).getTime()));
      setRemaining(value);
      if (value <= 0) void finish();
    };
    tick();
    const interval = window.setInterval(tick, 100);
    return () => window.clearInterval(interval);
  }, [finish, phase, session]);

  async function pause() {
    try {
      const result = await api<{ session: TimerSession }>("/api/timer/pause", {
        method: "POST",
        body: JSON.stringify({ challengeId: challenge.id }),
      });
      setSession(result.session);
      setRemaining(result.session.remainingMs);
      setPhase("paused");
      await onSessionChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "暂时无法暂停");
    }
  }

  async function resume() {
    try {
      const result = await api<{ session: TimerSession }>("/api/timer/resume", {
        method: "POST",
        body: JSON.stringify({ challengeId: challenge.id, habitDate: today }),
      });
      setSession(result.session);
      setRemaining(result.session.remainingMs);
      setPhase("running");
      await onSessionChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "暂时无法继续");
    }
  }

  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const progress = Math.max(0, Math.min(100, (remaining / 60000) * 100));

  return (
    <div className={`timer-overlay phase-${phase}`} role="dialog" aria-modal="true" aria-label={`${challenge.title}一分钟倒计时`}>
      <div className="timer-ambient one" /><div className="timer-ambient two" />
      <header className="timer-header">
        <div className="timer-brand"><span>1′</span> 一分小事</div>
        <div className="timer-header-actions">
          <button
            className="sound-button"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              localStorage.setItem("oneminute-muted", String(next));
            }}
          >{muted ? "静音中" : "声音开"}</button>
          <button className="timer-end-button" onClick={onClose}>结束</button>
        </div>
      </header>

      <div className="timer-center">
        <p className="timer-label">{challenge.title}</p>
        {phase === "prepare" || phase === "starting" ? (
          <div className="prepare-state">
            <span>准备</span>
            <strong>{phase === "starting" ? "·" : prepareCount}</strong>
            <p>轻轻呼吸，把注意力放到这一件小事上。</p>
          </div>
        ) : phase === "celebrate" ? (
          <div className="celebrate-state">
            <div className="celebrate-rings"><span>✓</span></div>
            <h2>这一分钟，完成了。</h2>
            <p>微小，但完整。</p>
            <div className="confetti"><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
        ) : (
          <>
            <div className="timer-ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}>
              <div>
                <strong>{seconds}</strong>
                <span>秒</span>
              </div>
            </div>
            <p className="timer-guidance">{phase === "paused" ? "已经暂停，请在十分钟内回来。" : seconds <= 10 ? "就快完成了，留在这一刻。" : "不求更多，只完成这一分钟。"}</p>
            {phase === "paused" ? (
              <div className="timer-actions">
                <button className="timer-primary" onClick={() => void resume()}>继续剩余时间</button>
                <button className="timer-quiet" onClick={onClose}>暂时离开</button>
              </div>
            ) : !isGuest ? (
              <button className="pause-button" onClick={() => void pause()} disabled={Boolean(session?.pauseUsed)}>
                <span>Ⅱ</span>{session?.pauseUsed ? "暂停已使用" : "紧急暂停"}
              </button>
            ) : null}
          </>
        )}
        {error && <p className="timer-error">{error}</p>}
      </div>
      <p className="timer-footnote">{isGuest ? "游客体验不会保存打卡记录" : "倒计时自然结束后，今天的打卡才会完成"}</p>
    </div>
  );
}

function NoteModal({
  checkin,
  challenge,
  onClose,
  onSaved,
}: {
  checkin: Checkin;
  challenge?: Challenge;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [note, setNote] = useState(checkin.note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api(`/api/checkins/${checkin.id}`, {
        method: "PATCH",
        body: JSON.stringify({ note }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop note-backdrop" role="presentation">
      <section className="modal-card note-modal" role="dialog" aria-modal="true" aria-labelledby="note-title">
        <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        <div className="completion-mini">✓</div>
        <p className="eyebrow">ONE MINUTE NOTE</p>
        <h2 id="note-title">给这一分钟，留下一句话</h2>
        <p><strong>{challenge?.title}</strong> · {formatDay(checkin.habitDate)}</p>
        <label htmlFor="note-text">刚刚完成了什么？有什么想记住的？</label>
        <textarea
          id="note-text"
          autoFocus
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="例如：记住了 resilient，意思是有韧性的。"
        />
        <div className="textarea-meta"><span>可以留空，之后也能修改</span><span>{note.length} / 2000</span></div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button full-button" onClick={() => void save()} disabled={saving}>
          {saving ? "正在保存…" : note.trim() ? "保存这句话" : "这次先不写"}
        </button>
      </section>
    </div>
  );
}

function WorldWorkbench({
  user,
  theme,
  onToggleTheme,
  onOpenGuide,
  onOpenDownloads,
  openHabit,
  openSchedule,
  onUseTool,
}: {
  user: UserSummary;
  theme: WorkbenchTheme;
  onToggleTheme: () => void;
  onOpenGuide: () => void;
  onOpenDownloads: () => void;
  openHabit: () => void;
  openSchedule: () => void;
  onUseTool: (toolKey: WorkbenchToolKey) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [toolUsage, setToolUsage] = useState<ToolUsageRecord[]>([]);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [room, setRoom] = useState<CabinRoom>("work");
  const [view, setView] = useState({ x: 0, y: 0 });
  const today = toLocalDate();

  const loadDashboard = useCallback(async () => {
    const result = await api<DashboardData>("/api/dashboard");
    setData(result);
    window.dispatchEvent(new CustomEvent("cabin:notifications-refresh"));
  }, []);

  const loadToolUsage = useCallback(async () => {
    const result = await api<ToolUsageData>("/api/tool-usage");
    setToolUsage(result.usage);
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void Promise.all([
        loadDashboard().catch(() => undefined),
        loadToolUsage().catch(() => undefined),
      ]);
    }, 0);
    return () => window.clearTimeout(task);
  }, [loadDashboard, loadToolUsage]);

  useEffect(() => {
    const openUsage = () => setUsageOpen(true);
    window.addEventListener("cabin:open-tool-usage", openUsage);
    return () => window.removeEventListener("cabin:open-tool-usage", openUsage);
  }, []);

  const activeHabits = data?.challenges.filter((item) => item.status === "active") ?? [];
  const activeSchedule = data?.scheduleItems.filter((item) => item.status === "active") ?? [];
  const todayEntries = data?.scheduleEntries.filter((item) => item.entryDate === today) ?? [];
  const touchedProjects = new Set(todayEntries.filter((entry) => entry.action === "touched").map((entry) => entry.itemId));
  const todayDone = todayEntries.filter((entry) => entry.action === "completed").length;
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const activeToolKeys = WORKBENCH_TOOL_KEYS.filter((toolKey) => !findToolUsage(toolUsage, toolKey)?.isFolded);
  const foldedToolKeys = WORKBENCH_TOOL_KEYS.filter((toolKey) => findToolUsage(toolUsage, toolKey)?.isFolded);

  function recordToolUse(toolKey: WorkbenchToolKey) {
    const now = new Date().toISOString();
    setToolUsage((current) => {
      const existing = findToolUsage(current, toolKey);
      const next: ToolUsageRecord = {
        toolKey,
        openCount: existing?.openCount ?? 0,
        firstSeenAt: existing?.firstSeenAt ?? now,
        lastOpenedAt: now,
        isFolded: existing?.isFolded ?? false,
      };
      return existing
        ? current.map((item) => item.toolKey === toolKey ? next : item)
        : [...current, next];
    });
    onUseTool(toolKey);
  }

  function launchTool(toolKey: WorkbenchToolKey, action: () => void) {
    recordToolUse(toolKey);
    action();
  }

  const launchHabit = () => launchTool("habit", openHabit);
  const launchSchedule = () => launchTool("schedule", openSchedule);
  const launchPindou = () => launchTool("pindou", openPindouTool);
  const launchFavorites = () => launchTool("favorites", openFavoritesTool);

  function setToolFolded(toolKey: WorkbenchToolKey, isFolded: boolean) {
    const now = new Date().toISOString();
    setToolUsage((current) => {
      const existing = findToolUsage(current, toolKey);
      const next: ToolUsageRecord = {
        toolKey,
        openCount: existing?.openCount ?? 0,
        firstSeenAt: existing?.firstSeenAt ?? now,
        lastOpenedAt: existing?.lastOpenedAt ?? null,
        isFolded,
      };
      return existing
        ? current.map((item) => item.toolKey === toolKey ? next : item)
        : [...current, next];
    });
    if (user.edition === "guest") return;
    void api<{ usage: ToolUsageRecord }>("/api/tool-usage", {
      method: "POST",
      body: JSON.stringify({ toolKey, action: isFolded ? "fold" : "restore" }),
    }).then(({ usage }) => {
      setToolUsage((current) => current.map((item) => item.toolKey === toolKey ? usage : item));
    }).catch(() => void loadToolUsage().catch(() => undefined));
  }

  function renderCabinToolTile(toolKey: WorkbenchToolKey) {
    if (toolKey === "habit") {
      return (
        <button key={toolKey} className="tool-tile habit-tile" onClick={launchHabit}>
          <span className="tool-pixel-icon">1′</span>
          <div><small>LONG TERM</small><h3>一分小事</h3><p>用一分钟完成，用二十一天坚持。</p><em>{activeHabits.length} 个习惯进行中 →</em></div>
        </button>
      );
    }
    if (toolKey === "schedule") {
      return (
        <button key={toolKey} className="tool-tile schedule-tile" onClick={launchSchedule}>
          <span className="tool-pixel-icon">▦</span>
          <div><small>SHORT TERM</small><h3>个人日程</h3><p>让事项每天出现，让项目持续向前。</p><em>{activeSchedule.length} 件正在推进 →</em></div>
        </button>
      );
    }
    if (toolKey === "favorites") {
      return (
        <button key={toolKey} className="tool-tile favorites-tile" onClick={launchFavorites}>
          <span className="tool-pixel-icon">🗂</span>
          <div><small>INSPIRATION LIBRARY</small><h3>灵感库</h3><p>收藏视频与笔记，按内容、作者和标签快速找回灵感。</p><em>打开个人收藏库 →</em></div>
        </button>
      );
    }
    return (
      <button key={toolKey} className="tool-tile pindou-tile" onClick={launchPindou}>
        <span className="tool-pixel-icon">豆</span>
        <div><small>CREATIVE TOOL</small><h3>拼豆识图</h3><p>上传拼豆图纸，手动框选网格并生成色块清单。</p><em>打开纯浏览器版 →</em></div>
      </button>
    );
  }

  function openRoom(nextRoom: CabinRoom) {
    if (nextRoom === "activity" && !isBobUser(user)) return;
    setRoom(nextRoom === "foyer" ? "work" : nextRoom);
  }

  function moveView(event: React.PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    setView({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  }

  if (room === "foyer") {
    if (theme === "office") {
      return (
        <OfficeFoyer
          user={user}
          today={today}
          openRoom={openRoom}
          openHabit={launchHabit}
          openSchedule={launchSchedule}
          openPindou={launchPindou}
          openFavorites={launchFavorites}
          onToggleTheme={onToggleTheme}
          onOpenGuide={onOpenGuide}
          onOpenDownloads={onOpenDownloads}
          workSummary={{ habits: activeHabits.length, schedule: activeSchedule.length, done: todayDone }}
        />
      );
    }

    return (
      <CabinFoyer
        user={user}
        today={today}
        view={view}
        moveView={moveView}
        resetView={() => setView({ x: 0, y: 0 })}
        openRoom={openRoom}
        onToggleTheme={onToggleTheme}
        onOpenGuide={onOpenGuide}
        onOpenDownloads={onOpenDownloads}
        workSummary={{ habits: activeHabits.length, schedule: activeSchedule.length, done: todayDone }}
      />
    );
  }

  if (room === "activity") {
    return (
      <>
        <DeviceActivityRoom
          user={user}
          theme={theme}
          openRoom={openRoom}
          onToggleTheme={onToggleTheme}
          onOpenGuide={onOpenGuide}
          onOpenDownloads={onOpenDownloads}
        />
        {usageOpen && <ToolUsageModal user={user} usage={toolUsage} onClose={() => setUsageOpen(false)} onSetFolded={setToolFolded} />}
      </>
    );
  }

  if (room === "life" || room === "entertainment") {
    return (
      <>
        <PortalRoom
          user={user}
          theme={theme}
          onToggleTheme={onToggleTheme}
          category={room}
          links={(data?.portalLinks ?? []).filter((link) => link.category === room)}
          onBack={() => setRoom("work")}
          switchRoom={openRoom}
          reload={loadDashboard}
          onOpenGuide={onOpenGuide}
          onOpenDownloads={onOpenDownloads}
        />
        {usageOpen && <ToolUsageModal user={user} usage={toolUsage} onClose={() => setUsageOpen(false)} onSetFolded={setToolFolded} />}
      </>
    );
  }

  if (theme === "office") {
    return (
      <>
      <OfficeWorkRoom
        user={user}
        today={today}
        openRoom={openRoom}
        openHabit={launchHabit}
        openSchedule={launchSchedule}
        openPindou={launchPindou}
        openFavorites={launchFavorites}
        toolUsage={toolUsage}
        onToggleTheme={onToggleTheme}
        onOpenGuide={onOpenGuide}
        onOpenDownloads={onOpenDownloads}
        scheduleItems={data?.scheduleItems ?? []}
        scheduleEntries={data?.scheduleEntries ?? []}
        summary={{
          habits: activeHabits.length,
          tasks: activeSchedule.filter((item) => item.kind === "task").length,
          projects: activeSchedule.filter((item) => item.kind === "project" && !item.parentItemId).length,
          touchedProjects: touchedProjects.size,
          done: todayDone,
        }}
      />
      {usageOpen && <ToolUsageModal user={user} usage={toolUsage} onClose={() => setUsageOpen(false)} onSetFolded={setToolFolded} />}
      </>
    );
  }

  return (
    <main
      className="pixel-world work-room"
      onPointerMove={moveView}
      onPointerLeave={() => setView({ x: 0, y: 0 })}
      style={{ "--look-x": view.x, "--look-y": view.y } as React.CSSProperties}
    >
      <div className="cabin-scene" aria-hidden="true">
        <div className="cabin-wall" />
        <div className="cabin-window">
          <span className="window-sky" />
          <span className="window-sun" />
          <span className="window-mountain mountain-one" />
          <span className="window-mountain mountain-two" />
          <span className="window-pine pine-one" />
          <span className="window-pine pine-two" />
          <span className="window-pine pine-three" />
          <span className="window-frame" />
        </div>
        <div className="cabin-beam beam-left" />
        <div className="cabin-beam beam-right" />
        <div className="cabin-beam beam-top" />
        <div className="cabin-shelf">
          <span className="shelf-book book-one" />
          <span className="shelf-book book-two" />
          <span className="shelf-book book-three" />
          <span className="shelf-pot"><i /></span>
        </div>
        <div className="cabin-lamp"><span /><i /></div>
        <div className="cabin-floor" />
        <div className="cabin-rug" />
        <div className="pixel-particles">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</div>
      </div>

      <header className="world-hud">
        <button className="world-brand room-brand-button" onClick={() => setRoom("work")}>
          <span className="world-brand-cube"><i /><i /><i /></span>
          <div><strong>木屋工作台</strong><small>WORKSPACE</small></div>
        </button>
        <div className="world-date"><span>{formatLongDay(today)}</span><i />炉火正暖，适合专注一会儿</div>
        <div className="world-header-actions">
          <RoomSwitcher current="work" openRoom={openRoom} />
          <NotificationCenter user={user} />
          <WorkbenchAccountMenu user={user} theme="cabin" openRoom={openRoom} onToggleTheme={onToggleTheme} onOpenGuide={onOpenGuide} onOpenDownloads={onOpenDownloads} />
        </div>
      </header>

      <section className="world-stage" aria-label="像素木屋工作台场景">
        <div className="world-title-card">
          <p>WELCOME HOME</p>
          <h1>今天想从哪件<br /><em>小事开始？</em></h1>
          <span>轻轻移动视角 · 点击屋内物件进入工具</span>
        </div>

        <div className="cabin-desk" aria-hidden="true">
          <span className="desk-top" />
          <span className="desk-drawer drawer-one" />
          <span className="desk-drawer drawer-two" />
          <span className="desk-leg desk-left" />
          <span className="desk-leg desk-right" />
          <span className="desk-mug"><i /></span>
          <span className="desk-paper" />
        </div>

        <button className="world-object workbench-object" onClick={() => setToolsOpen(true)}>
          <span className="object-pulse" />
          <span className="pixel-workbench" aria-hidden="true">
            <i className="bench-top" /><i className="bench-front" /><i className="bench-grid" /><i className="bench-leg left" /><i className="bench-leg right" />
          </span>
          <span className="world-object-label"><small>TOOL CHEST</small><strong>工具箱</strong><em>创作工具 · {foldedToolKeys.length} 个收起</em></span>
        </button>

        {activeToolKeys.includes("schedule") && <button className="world-object calendar-object" onClick={launchSchedule}>
          <span className="object-pulse" />
          <span className="pixel-calendar" aria-hidden="true">
            <span className="calendar-pixel-head"><i /><i /></span>
            <strong>{parseDate(today).getDate()}</strong>
            <small>{parseDate(today).getMonth() + 1} 月</small>
            <span className="calendar-pixel-marks"><i /><i /><i /></span>
          </span>
          <span className="world-object-label align-right"><small>WALL CALENDAR</small><strong>个人日程</strong><em>{activeSchedule.length} 件正在路上</em></span>
        </button>}

        {activeToolKeys.includes("habit") && <button className="habit-crystal" onClick={launchHabit} aria-label="进入一分小事">
          <span className="pixel-hourglass" aria-hidden="true">
            <i className="hourglass-top" />
            <i className="hourglass-glass" />
            <i className="hourglass-sand" />
            <i className="hourglass-bottom" />
            <strong>1′</strong>
          </span>
          <span className="world-object-label"><small>ONE MINUTE</small><strong>一分小事</strong><em>{activeHabits.length} 个习惯坚持中</em></span>
        </button>}

        <aside className="world-quest-card">
          <div className="quest-head"><span>今日便笺</span><small>{todayDone} 项已完成</small></div>
          <div className="quest-row"><i className="quest-habit" /><span>长期习惯</span><strong>{activeHabits.length}</strong></div>
          <div className="quest-row"><i className="quest-task" /><span>短线事项</span><strong>{activeSchedule.filter((item) => item.kind === "task").length}</strong></div>
          <div className="quest-row"><i className="quest-project" /><span>今日推进项目</span><strong>{touchedProjects.size}</strong></div>
        </aside>

        {activeSchedule.length > 0 && <aside className="world-mini-calendar">
          <p>本周日历</p>
          <div>
            {weekDates.map((date) => (
              <button key={date} className={date === today ? "current" : ""} onClick={launchSchedule}>
                <small>{["日", "一", "二", "三", "四", "五", "六"][parseDate(date).getDay()]}</small>
                <strong>{parseDate(date).getDate()}</strong>
                <i className={activeSchedule.some((item) => item.repeatDaily ? date >= item.startDate : item.kind === "project" ? date === today || date === item.startDate || date === item.dueDate : date === item.startDate || (date === today && item.startDate < today)) ? "has-entry" : ""} />
              </button>
            ))}
          </div>
        </aside>}

        <div className="world-daily-phrase"><DailyPhraseCard user={user} compact /></div>
      </section>

      <nav className="world-dock" aria-label="快速进入工具">
        {activeToolKeys.includes("habit") && <button onClick={launchHabit}><span className="dock-habit">1′</span><div><small>长期习惯</small><strong>一分小事</strong></div></button>}
        {activeToolKeys.includes("schedule") && <button onClick={launchSchedule}><span className="dock-schedule">▦</span><div><small>短线执行</small><strong>个人日程</strong></div></button>}
      </nav>

      {toolsOpen && (
        <div className="world-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setToolsOpen(false)}>
          <section className="tool-library" role="dialog" aria-modal="true" aria-labelledby="tool-library-title">
            <button className="world-modal-close" onClick={() => setToolsOpen(false)} aria-label="关闭">×</button>
            <p>TOOLBOX · CABIN 01</p>
            <h2 id="tool-library-title">工具箱</h2>
            <span className="tool-library-copy">日程和习惯留在工作台，辅助创作工具收在这里。</span>
            <div className="tool-library-grid">
              {activeToolKeys.filter((toolKey) => toolKey === "pindou" || toolKey === "favorites").map(renderCabinToolTile)}
            </div>
            {foldedToolKeys.length > 0 && (
              <details className="infrequent-tools-card cabin-infrequent-tools">
                <summary><span><strong>不常用工具</strong><small>这些工具由你手动收起</small></span><b>{foldedToolKeys.length} 个</b></summary>
                <div className="tool-library-grid">{foldedToolKeys.map(renderCabinToolTile)}</div>
              </details>
            )}
          </section>
        </div>
      )}

      {usageOpen && <ToolUsageModal user={user} usage={toolUsage} onClose={() => setUsageOpen(false)} onSetFolded={setToolFolded} />}

    </main>
  );
}

const TOOL_USAGE_PRESENTATION: Record<WorkbenchToolKey, { name: string; category: string; mark: string }> = {
  habit: { name: "一分小事", category: "长期习惯", mark: "1′" },
  schedule: { name: "个人日程", category: "任务与项目", mark: "▦" },
  pindou: { name: "拼豆识图", category: "创作工具", mark: "豆" },
  favorites: { name: "灵感库", category: "灵感收藏", mark: "🗂" },
};

function ToolUsageModal({
  user,
  usage,
  onClose,
  onSetFolded,
}: {
  user: UserSummary;
  usage: ToolUsageRecord[];
  onClose: () => void;
  onSetFolded: (toolKey: WorkbenchToolKey, isFolded: boolean) => void;
}) {
  const now = new Date().toISOString();
  const rows = WORKBENCH_TOOL_KEYS.map((toolKey) => findToolUsage(usage, toolKey) ?? {
    toolKey,
    openCount: 0,
    firstSeenAt: now,
    lastOpenedAt: null,
    isFolded: false,
  });
  const usedTodayCount = rows.filter((item) => item.lastOpenedAt && getToolIdleDays(item) === 0).length;
  const staleCount = rows.filter((item) => isInfrequentTool(item)).length;
  const chartMaxDays = Math.max(10, Math.ceil(Math.max(...rows.map(getToolIdleDays)) / 5) * 5);
  const chartTicks = [chartMaxDays, Math.round(chartMaxDays * 0.75), Math.round(chartMaxDays * 0.5), Math.round(chartMaxDays * 0.25), 0];

  return (
    <div className="tool-usage-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="tool-usage-modal" role="dialog" aria-modal="true" aria-labelledby="tool-usage-title">
        <button className="tool-usage-close" type="button" onClick={onClose} aria-label="关闭使用统计">×</button>
        <header className="tool-usage-head">
          <div><p>TOOL MEMORY · 使用状态</p><h2 id="tool-usage-title">哪些工具最近真的用到了？</h2><span>进入工具或操作其中任意功能，都会更新今天的使用状态。</span></div>
          <div className="tool-usage-summary"><article><small>今天使用</small><strong>{usedTodayCount}</strong><span>个</span></article><article><small>超过 7 天</small><strong>{staleCount}</strong><span>个</span></article></div>
        </header>

        <div className="tool-usage-column-chart" aria-label="各模块未使用天数柱状图">
          <div className="tool-chart-axis" aria-hidden="true">
            {chartTicks.map((tick) => <span key={tick}>{tick} 天</span>)}
          </div>
          <div className="tool-chart-plot">
            <div className="tool-chart-threshold" style={{ "--threshold-position": `${7 / chartMaxDays * 100}%` } as React.CSSProperties}><span>7 天提醒线</span></div>
            <div className="tool-chart-grid" aria-hidden="true">{chartTicks.map((tick) => <i key={tick} />)}</div>
            <div className="tool-chart-columns">
              {rows.map((item) => {
                const tool = TOOL_USAGE_PRESENTATION[item.toolKey];
                const idleDays = getToolIdleDays(item);
                const recommended = idleDays > 7 && !item.isFolded;
                return (
                  <article className={`tool-chart-column ${idleDays === 0 ? "is-today" : "is-idle"} ${item.isFolded ? "is-folded" : ""} ${idleDays > 7 ? "is-stale" : ""}`} key={item.toolKey}>
                    <div className="tool-chart-bar-space">
                      <div className="tool-chart-bar" style={{ "--bar-height": `${idleDays / chartMaxDays * 100}%` } as React.CSSProperties}>
                        <strong>{idleDays === 0 ? "今天使用" : `${idleDays} 天未使用`}</strong>
                      </div>
                    </div>
                    <div className="tool-chart-label"><span className={`tool-usage-mark ${item.toolKey}`}>{tool.mark}</span><small>{tool.category}</small><strong>{tool.name}</strong></div>
                    <em>{item.isFolded ? "已收进不常用" : recommended ? "建议收起" : "仍在常用区"}</em>
                    <button type="button" disabled={user.edition === "guest"} onClick={() => onSetFolded(item.toolKey, !item.isFolded)}>{item.isFolded ? "恢复常用" : "收进不常用"}</button>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <footer><span>每天首次使用会刷新状态，不累计点击次数</span><button type="button" onClick={onClose}>完成</button></footer>
      </section>
    </div>
  );
}

type CabinRoom = "foyer" | "work" | "life" | "entertainment" | "activity";

function ThemeToggle({ theme, onToggle }: { theme: WorkbenchTheme; onToggle: () => void }) {
  const office = theme === "office";
  const nextTheme = office ? "休闲木屋风" : "飞书钉钉办公风";

  return (
    <button
      className={`theme-toggle ${office ? "is-office" : "is-cabin"}`}
      type="button"
      onClick={onToggle}
      aria-label={`切换到${nextTheme}`}
      aria-pressed={office}
      title={`切换到${nextTheme}`}
    >
      <span className="theme-toggle-icon" aria-hidden="true"><i /><i /><i /></span>
      <span><small>界面风格</small><strong>{office ? "切到木屋风" : "切到办公风"}</strong></span>
    </button>
  );
}

function DailyPhraseCard({ user, compact = false }: { user: UserSummary; compact?: boolean }) {
  const [data, setData] = useState<DailyPhraseData | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void api<DailyPhraseData>("/api/daily-phrase").then(setData).catch(() => setMessage("今天的短语暂时走丢了"));
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  async function update(action: "swap" | "learn" | "favorite") {
    if (user.edition === "guest") {
      setMessage("登录后可以换一句、收藏和打卡");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      setData(await api<DailyPhraseData>("/api/daily-phrase", {
        method: "POST",
        body: JSON.stringify({ action }),
      }));
      if (action === "swap") setMessage("换到一句新的啦");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作没有成功");
    } finally {
      setBusy(false);
    }
  }

  function speak() {
    if (!data || !("speechSynthesis" in window)) {
      setMessage("当前浏览器暂不支持发音");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(data.phrase.text);
    utterance.lang = data.phrase.locale;
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  function openFavorites() {
    if (user.edition === "guest") {
      setMessage("登录后可以查看自己的收藏");
      return;
    }
    setFavoritesOpen(true);
  }

  if (!data) {
    return <section className={`daily-phrase-card ${compact ? "compact" : ""}`} aria-label="今日上头一句"><div className="daily-phrase-loading">{message || "正在从世界另一端捎来一句话…"}</div></section>;
  }

  const { phrase, state } = data;
  return (
    <>
    <section className={`daily-phrase-card ${compact ? "compact" : ""} ${state.learned ? "is-learned" : ""}`} aria-label="今日上头一句">
      <div className="daily-phrase-stamp"><span>{phrase.flag}</span><small>{phrase.country}</small></div>
      <div className="daily-phrase-copy">
        <div className="daily-phrase-kicker"><span>今日上头一句</span><i />{phrase.language}<em>DAILY PHRASE</em><button type="button" onClick={openFavorites}><b>★</b> 我的收藏</button></div>
        <h2 lang={phrase.locale}>{phrase.text}</h2>
        <p><b>读音</b>{phrase.pronunciation}</p>
        <strong>{phrase.meaning}</strong>
        {!compact && <small>{phrase.context} · 来源：{phrase.source}</small>}
      </div>
      <div className="daily-phrase-actions">
        <button type="button" onClick={speak}><span>▶</span>听发音</button>
        <button type="button" className={state.learned ? "active" : ""} onClick={() => void update("learn")} disabled={busy}><span>{state.learned ? "✓" : "○"}</span>{state.learned ? "今天会了" : "跟读一次"}</button>
        <button type="button" className={state.favorite ? "active" : ""} onClick={() => void update("favorite")} disabled={busy} aria-label={state.favorite ? "取消收藏" : "收藏这句话"}><span>{state.favorite ? "★" : "☆"}</span>{state.favorite ? "已收藏" : "收藏"}</button>
        <button type="button" onClick={() => void update("swap")} disabled={busy || state.swapsRemaining === 0}><span>↻</span>{state.swapsRemaining > 0 ? `换一句 · ${state.swapsRemaining}` : "明天再换"}</button>
      </div>
      {message && <div className="daily-phrase-message" role="status">{message}</div>}
    </section>
    {favoritesOpen && typeof document !== "undefined" && createPortal(
      <FavoritePhrasesModal
        onClose={() => setFavoritesOpen(false)}
        onRemoved={(phraseDate) => {
          if (phraseDate !== toLocalDate()) return;
          setData((current) => current ? { ...current, state: { ...current.state, favorite: false } } : current);
        }}
      />,
      document.body,
    )}
    </>
  );
}

function FavoritePhrasesModal({ onClose, onRemoved }: { onClose: () => void; onRemoved: (phraseDate: string) => void }) {
  const [items, setItems] = useState<FavoritePhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<FavoritePhraseData>("/api/daily-phrase/favorites");
      setItems(result.favorites);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "暂时无法读取收藏");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void loadFavorites(), 0);
    return () => window.clearTimeout(task);
  }, [loadFavorites]);

  function speakPhrase(phrase: FavoritePhrase) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(phrase.text);
    utterance.lang = phrase.locale;
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  async function removeFavorite(phrase: FavoritePhrase) {
    setRemoving(phrase.phraseDate);
    setError("");
    try {
      const result = await api<FavoritePhraseData>("/api/daily-phrase/favorites", {
        method: "DELETE",
        body: JSON.stringify({ phraseDate: phrase.phraseDate }),
      });
      setItems(result.favorites);
      onRemoved(phrase.phraseDate);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "暂时无法取消收藏");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="phrase-favorites-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="phrase-favorites-modal" role="dialog" aria-modal="true" aria-labelledby="phrase-favorites-title">
        <button className="phrase-favorites-close" type="button" onClick={onClose} aria-label="关闭我的收藏">×</button>
        <header><p>MY PHRASE BOOK</p><h2 id="phrase-favorites-title">我的收藏</h2><span>{loading ? "正在整理…" : `共 ${items.length} 句，按收藏时间排列`}</span></header>

        <div className="phrase-favorites-list">
          {loading && <div className="phrase-favorites-empty">正在取回收藏的句子…</div>}
          {!loading && error && items.length === 0 && <div className="phrase-favorites-empty is-error"><strong>暂时没有打开收藏夹</strong><span>{error}</span><button type="button" onClick={() => void loadFavorites()}>重新读取</button></div>}
          {!loading && !error && items.length === 0 && <div className="phrase-favorites-empty"><strong>收藏夹还是空的</strong><span>遇到喜欢的句子，点一下星标就会出现在这里。</span></div>}
          {items.map((phrase) => (
            <article className="phrase-favorite-item" key={phrase.phraseDate}>
              <div className="phrase-favorite-flag"><span>{phrase.flag}</span><small>{phrase.country}</small></div>
              <div className="phrase-favorite-copy"><small>{phrase.language} · {formatDay(phrase.phraseDate)}</small><h3 lang={phrase.locale}>{phrase.text}</h3><p>{phrase.pronunciation}</p><strong>{phrase.meaning}</strong><span>{phrase.context} · 来源：{phrase.source}</span></div>
              <div className="phrase-favorite-actions"><button type="button" onClick={() => speakPhrase(phrase)}><span>▶</span>听发音</button><button type="button" disabled={removing === phrase.phraseDate} onClick={() => void removeFavorite(phrase)}><span>★</span>{removing === phrase.phraseDate ? "正在移除" : "取消收藏"}</button></div>
            </article>
          ))}
        </div>

        {error && items.length > 0 && <div className="phrase-favorites-error" role="status">{error}</div>}
        <footer><span>收藏内容只属于当前账号</span><button type="button" onClick={onClose}>完成</button></footer>
      </section>
    </div>
  );
}

function NotificationCenter({ user }: { user: UserSummary }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WorkbenchNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (user.edition === "guest") return;
    try {
      const result = await api<{ notifications: WorkbenchNotification[] }>(
        "/api/notifications",
      );
      setItems(result.notifications);
    } catch {
      // 通知加载失败不影响工作台的其他操作。
    }
  }, [user.edition]);

  useEffect(() => {
    if (user.edition === "guest") return;
    const first = window.setTimeout(() => void load(), 0);
    const poll = window.setInterval(() => void load(), 30_000);
    const refresh = () => void load();
    window.addEventListener("cabin:notifications-refresh", refresh);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(poll);
      window.removeEventListener("cabin:notifications-refresh", refresh);
    };
  }, [load, user.edition]);

  if (user.edition === "guest") return null;

  const unread = items.filter((item) => !item.readAt).length;
  const todayPending = items.filter(
    (item) => item.kind === "today_pending" && !item.readAt,
  );
  const toolReminders = items.filter((item) => item.kind === "tool_inactive");
  const unreadToolReminders = toolReminders.filter((item) => !item.readAt).length;
  const updates = items.filter(
    (item) => (item.kind !== "today_pending" || Boolean(item.readAt)) && item.kind !== "tool_inactive",
  );

  async function markRead(item: WorkbenchNotification) {
    if (!item.readAt) {
      const now = new Date().toISOString();
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, readAt: now } : row)),
      );
      try {
        await api("/api/notifications", {
          method: "PATCH",
          body: JSON.stringify({ id: item.id }),
        });
      } catch {
        await load();
      }
    }
    if (item.itemId) {
      setOpen(false);
      window.dispatchEvent(new CustomEvent("cabin:open-schedule"));
    } else if (item.kind === "tool_inactive") {
      setOpen(false);
      window.dispatchEvent(new CustomEvent("cabin:open-tool-usage"));
    }
  }

  async function markAllRead() {
    setLoading(true);
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    try {
      await api("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ all: true }),
      });
    } catch {
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`notification-center ${open ? "is-open" : ""}`}>
      <button
        className="notification-bell"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `提醒，${unread} 条未读` : "提醒"}
        aria-expanded={open}
      >
        <span aria-hidden="true">♢</span>
        {unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}
      </button>
      {open && (
        <section className="notification-panel" role="dialog" aria-label="提醒中心">
          <div className="notification-panel-head">
            <div><small>NOTIFICATIONS</small><strong>提醒中心</strong></div>
            <div>
              {unread > 0 && <button type="button" onClick={() => void markAllRead()} disabled={loading}>全部已读</button>}
              <button type="button" onClick={() => setOpen(false)} aria-label="关闭提醒">×</button>
            </div>
          </div>
          <div className="notification-scroll">
            {todayPending.length > 0 && (
              <div className="notification-group">
                <p>今日待完成 <span>{todayPending.length}</span></p>
                {todayPending.map((item) => (
                  <button className="notification-row is-unread today" type="button" key={item.id} onClick={() => void markRead(item)}>
                    <i>○</i><div><strong>{item.title}</strong><span>{item.body}</span></div><em>今天</em>
                  </button>
                ))}
              </div>
            )}
            {toolReminders.length > 0 && (
              <div className="notification-group tool-reminder-group">
                <p>工具整理 {unreadToolReminders > 0 && <span>{unreadToolReminders}</span>}</p>
                {toolReminders.map((item) => (
                  <button className={`notification-row tool-reminder ${item.readAt ? "" : "is-unread"}`} type="button" key={item.id} onClick={() => void markRead(item)}>
                    <i>!</i><div><strong>{item.title}</strong><span>{item.body}</span></div><em>{formatNotificationTime(item.createdAt)}</em>
                  </button>
                ))}
              </div>
            )}
            {updates.length > 0 && (
              <div className="notification-group">
                <p>协作动态</p>
                {updates.map((item) => (
                  <button className={`notification-row ${item.readAt ? "" : "is-unread"}`} type="button" key={item.id} onClick={() => void markRead(item)}>
                    <i>{item.kind === "shared" ? "+" : item.kind === "progress" ? "%" : item.kind === "removed" ? "−" : "↻"}</i>
                    <div><strong>{item.title}</strong><span>{item.body}</span></div>
                    <em>{formatNotificationTime(item.createdAt)}</em>
                  </button>
                ))}
              </div>
            )}
            {items.length === 0 && (
              <div className="notification-empty"><span>✓</span><strong>暂时没有新提醒</strong><small>好友关联和进度更新会出现在这里</small></div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (toLocalDate(date) === toLocalDate(now)) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatProgressEntryTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function RoomSwitcher({
  current,
  openRoom,
}: {
  current: CabinRoom;
  openRoom: (room: CabinRoom) => void;
}) {
  return (
    <nav className="room-switcher" aria-label="工作台主导航">
      <button className={current === "work" || current === "foyer" ? "active" : ""} onClick={() => openRoom("work")}>工作台</button>
      <button className={current === "life" ? "active" : ""} onClick={() => openRoom("life")}>生活</button>
      <button className={current === "entertainment" ? "active" : ""} onClick={() => openRoom("entertainment")}>娱乐</button>
    </nav>
  );
}

function NavigationUtilities({
  onOpenGuide,
  onOpenDownloads,
}: {
  onOpenGuide: () => void;
  onOpenDownloads: () => void;
}) {
  return (
    <div className="navigation-utilities" aria-label="工作台帮助与资源">
      <button type="button" onClick={onOpenDownloads} aria-label="下载最新版工作台代码" title="借鉴主包的工作台">
        <span aria-hidden="true">↓</span><small>下载</small>
      </button>
      <button type="button" onClick={onOpenGuide} aria-label="打开新手指引" title="新手指引">
        <span aria-hidden="true">?</span><small>指引</small>
      </button>
    </div>
  );
}

function WorkbenchAccountMenu({
  user,
  theme,
  openRoom,
  onToggleTheme,
  onOpenGuide,
  onOpenDownloads,
}: {
  user: UserSummary;
  theme: WorkbenchTheme;
  openRoom: (room: CabinRoom) => void;
  onToggleTheme: () => void;
  onOpenGuide: () => void;
  onOpenDownloads: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className={`workbench-account-menu ${open ? "is-open" : ""}`}>
      <button
        className="workbench-account-trigger"
        type="button"
        title={user.email}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{user.displayName.slice(0, 1).toUpperCase()}</span>
        <strong>{user.displayName}</strong>
        <i aria-hidden="true">⌄</i>
      </button>
      {open && (
        <section className="workbench-account-panel" role="menu" aria-label="个人与工作台设置">
          <header><span>{user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>{user.email}</small></div></header>
          <div className="workbench-account-group">
            <small>工作台</small>
            <button type="button" role="menuitem" onClick={() => run(onToggleTheme)}><i>◐</i><span><strong>界面风格</strong><small>{theme === "office" ? "切换到木屋风" : "切换到办公风"}</small></span><b>›</b></button>
            <button type="button" role="menuitem" onClick={() => run(() => window.dispatchEvent(new CustomEvent("cabin:open-tool-usage")))}><i>▥</i><span><strong>使用状态</strong><small>查看工具多久未使用</small></span><b>›</b></button>
            {isBobUser(user) && <button type="button" role="menuitem" onClick={() => run(() => openRoom("activity"))}><i>YC</i><span><strong>设备活动</strong><small>查看 YoooClaw 操作记录</small></span><b>›</b></button>}
          </div>
          <div className="workbench-account-group">
            <small>帮助与资源</small>
            <button type="button" role="menuitem" onClick={() => run(onOpenGuide)}><i>?</i><span><strong>新手指引</strong><small>重新查看使用说明</small></span><b>›</b></button>
            <button type="button" role="menuitem" onClick={() => run(onOpenDownloads)}><i>↓</i><span><strong>下载代码</strong><small>获取最新版工作台</small></span><b>›</b></button>
          </div>
          {user.edition !== "local" && <a className="workbench-account-logout" role="menuitem" href={withBasePath("/logout")}>{user.edition === "guest" ? "退出体验" : "退出登录"}</a>}
        </section>
      )}
    </div>
  );
}

function CabinFoyer({
  user,
  today,
  view,
  moveView,
  resetView,
  openRoom,
  onToggleTheme,
  onOpenGuide,
  onOpenDownloads,
  workSummary,
}: {
  user: UserSummary;
  today: string;
  view: { x: number; y: number };
  moveView: (event: React.PointerEvent<HTMLElement>) => void;
  resetView: () => void;
  openRoom: (room: CabinRoom) => void;
  onToggleTheme: () => void;
  onOpenGuide: () => void;
  onOpenDownloads: () => void;
  workSummary: { habits: number; schedule: number; done: number };
}) {
  return (
    <main
      className="pixel-world cabin-foyer"
      onPointerMove={moveView}
      onPointerLeave={resetView}
      style={{ "--look-x": view.x, "--look-y": view.y } as React.CSSProperties}
    >
      <div className="foyer-background" aria-hidden="true">
        <div className="foyer-wall" />
        <div className="foyer-ceiling-beam" />
        <div className="foyer-floor" />
        <div className="foyer-lantern"><span /><i /></div>
        <div className="foyer-runner" />
        <div className="pixel-particles">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</div>
      </div>

      <header className="world-hud foyer-hud">
        <div className="world-brand">
          <span className="world-brand-cube"><i /><i /><i /></span>
          <div><strong>木屋玄关</strong><small>WORK · LIFE · PLAY</small></div>
        </div>
        <div className="world-date"><span>{formatLongDay(today)}</span><i />欢迎回来，选一间房开始</div>
        <div className="foyer-header-actions">
          <NavigationUtilities onOpenGuide={onOpenGuide} onOpenDownloads={onOpenDownloads} />
          <ThemeToggle theme="cabin" onToggle={onToggleTheme} />
          <NotificationCenter user={user} />
          <div className="world-user" title={user.email}>
            <span>{user.displayName.slice(0, 1).toUpperCase()}</span>
            <div><strong>{user.displayName}</strong>{user.edition === "local" ? <small>个人本地版</small> : <a href={withBasePath("/logout")}>{user.edition === "guest" ? "退出体验" : "退出"}</a>}</div>
          </div>
        </div>
      </header>

      <section className="foyer-stage" aria-label="木屋的三个房间">
        <div className="foyer-title">
          <p>WELCOME TO YOUR CABIN</p>
          <h1>今天，想先做点什么？</h1>
          <span>工作、生活与娱乐，各有自己的位置。</span>
        </div>

        <button className="room-gate life-gate" onClick={() => openRoom("life")}>
          <span className="gate-glow" />
          <span className="gate-frame">
            <i className="gate-sign">生活</i>
            <span className="market-box box-a">淘</span>
            <span className="market-box box-b">京</span>
            <span className="market-shelf" />
          </span>
          <span className="gate-copy"><small>LIFE MARKET</small><strong>生活市集</strong><em>购物与生活入口</em></span>
        </button>

        <button className="room-gate work-gate" onClick={() => openRoom("work")}>
          <span className="gate-glow" />
          <span className="gate-frame">
            <i className="gate-sign">工作</i>
            <span className="work-desk-mini"><i /><b /></span>
            <span className="work-hourglass-mini">1′</span>
            <span className="work-calendar-mini">{parseDate(today).getDate()}</span>
          </span>
          <span className="gate-copy"><small>WORK ROOM · MAIN</small><strong>工作间</strong><em>{workSummary.habits} 个习惯 · {workSummary.schedule} 件日程</em></span>
          <span className="work-room-badge">今天完成 {workSummary.done}</span>
        </button>

        <button className="room-gate fun-gate" onClick={() => openRoom("entertainment")}>
          <span className="gate-glow" />
          <span className="gate-frame">
            <i className="gate-sign">娱乐</i>
            <span className="fun-screen"><i>▶</i></span>
            <span className="fun-books" />
          </span>
          <span className="gate-copy"><small>PLAY LOUNGE</small><strong>娱乐角</strong><em>视频与内容入口</em></span>
        </button>
      </section>

      <nav className="foyer-hotbar" aria-label="快速进入房间">
        <button onClick={() => openRoom("work")}><span>01</span><strong>工作</strong></button>
        <button onClick={() => openRoom("life")}><span>02</span><strong>生活</strong></button>
        <button onClick={() => openRoom("entertainment")}><span>03</span><strong>娱乐</strong></button>
        {isBobUser(user) && <button onClick={() => openRoom("activity")}><span>04</span><strong>设备记录</strong></button>}
      </nav>
    </main>
  );
}

function OfficeHeader({
  user,
  current,
  openRoom,
  onToggleTheme,
  onOpenGuide,
  onOpenDownloads,
}: {
  user: UserSummary;
  current: CabinRoom;
  openRoom: (room: CabinRoom) => void;
  onToggleTheme: () => void;
  onOpenGuide: () => void;
  onOpenDownloads: () => void;
}) {
  return (
    <header className="office-topbar">
      <button className="office-brand" type="button" onClick={() => openRoom("work")} aria-label="返回工作台">
        <span>1′</span>
        <div><strong>木屋工作台</strong><small>OFFICE</small></div>
      </button>
      <nav className="office-nav" aria-label="办公风格导航">
        <button className={current === "work" || current === "foyer" ? "active" : ""} type="button" onClick={() => openRoom("work")}>工作台</button>
        <button className={current === "life" ? "active" : ""} type="button" onClick={() => openRoom("life")}>生活</button>
        <button className={current === "entertainment" ? "active" : ""} type="button" onClick={() => openRoom("entertainment")}>娱乐</button>
        {isBobUser(user) && <button className={current === "activity" ? "active" : ""} type="button" onClick={() => openRoom("activity")}>设备记录</button>}
      </nav>
      <div className="office-topbar-actions">
        <NotificationCenter user={user} />
        <WorkbenchAccountMenu user={user} theme="office" openRoom={openRoom} onToggleTheme={onToggleTheme} onOpenGuide={onOpenGuide} onOpenDownloads={onOpenDownloads} />
      </div>
    </header>
  );
}

function DeviceActivityRoom({
  user,
  theme,
  openRoom,
  onToggleTheme,
  onOpenGuide,
  onOpenDownloads,
}: {
  user: UserSummary;
  theme: WorkbenchTheme;
  openRoom: (room: CabinRoom) => void;
  onToggleTheme: () => void;
  onOpenGuide: () => void;
  onOpenDownloads: () => void;
}) {
  const [data, setData] = useState<DeviceActivityData | null>(null);
  const [filter, setFilter] = useState<"all" | "sent" | "other">("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadActivity = useCallback(async () => {
    try {
      const response = await fetch("http://127.0.0.1:4391/api/activity", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("设备记录服务暂时不可用");
      const result = await response.json() as DeviceActivityData;
      if (!Array.isArray(result.records)) throw new Error("设备记录格式不正确");
      setData(result);
      setError("");
    } catch {
      setError("没有连接到这台电脑的设备记录服务，请确认 YoooClaw 活动服务正在运行。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void loadActivity(), 0);
    const timer = window.setInterval(() => void loadActivity(), 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [loadActivity]);

  const records = (data?.records ?? []).filter((record) => {
    if (filter === "sent") return record.delivery.status === "sent";
    if (filter === "other") return record.delivery.status !== "sent";
    return true;
  });

  function deliveryCopy(record: DeviceActivityRecord) {
    if (record.delivery.status === "sent") return { label: "已发送微信", className: "sent" };
    if (record.delivery.status === "waiting") return { label: "等待微信", className: "waiting" };
    return { label: "服务启用前", className: "before" };
  }

  return (
    <main className={`device-activity-room ${theme === "office" ? "is-office" : "is-cabin"}`}>
      {theme === "office" ? (
        <OfficeHeader user={user} current="activity" openRoom={openRoom} onToggleTheme={onToggleTheme} onOpenGuide={onOpenGuide} onOpenDownloads={onOpenDownloads} />
      ) : (
        <header className="portal-room-header device-activity-cabin-header">
          <button className="portal-back" onClick={() => openRoom("work")}><span>←</span><div><small>返回工作台</small><strong>设备活动记录</strong></div></button>
          <RoomSwitcher current="activity" openRoom={openRoom} />
          <div className="portal-header-actions">
            <NotificationCenter user={user} />
            <WorkbenchAccountMenu user={user} theme="cabin" openRoom={openRoom} onToggleTheme={onToggleTheme} onOpenGuide={onOpenGuide} onOpenDownloads={onOpenDownloads} />
          </div>
        </header>
      )}

      <div className="device-activity-page">
        <header className="device-activity-titlebar">
          <div className="device-activity-brand"><span>YC</span><div><p>YOOOCLAW ACTIVITY</p><h1>设备活动记录</h1></div></div>
          <div className="device-private-state"><i />仅 bob 可见</div>
        </header>

        <section className="device-activity-hero">
          <div className="device-activity-intro">
            <h2>每一句指令，<br />每一步都有迹可循。</h2>
            <p>集中查看设备转写、Agent 执行动作、最终结果与微信送达状态。</p>
          </div>
          <div className="device-activity-health" aria-label="设备链路状态">
            <div><span><i>声</i>设备指令</span><b>{data?.records.length ? "已有记录" : "等待记录"}</b></div>
            <div><span><i>执</i>Hermes Agent</span><b>{error ? "等待连接" : "记录正常"}</b></div>
            <div><span><i>微</i>微信通知</span><b>{data?.wechatReady ? "推送已连接" : "等待记录"}</b></div>
          </div>
        </section>

        <section className="device-activity-toolbar">
          <div><h2>操作时间线</h2><p>{data ? `共 ${data.records.length} 条 · 更新于 ${data.generatedLabel}` : "正在读取记录…"}</p></div>
          <div className="device-activity-filters" aria-label="筛选活动记录">
            <button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>全部</button>
            <button className={filter === "sent" ? "active" : ""} type="button" onClick={() => setFilter("sent")}>已送达</button>
            <button className={filter === "other" ? "active" : ""} type="button" onClick={() => setFilter("other")}>待确认</button>
          </div>
        </section>

        <section className="device-activity-list" aria-live="polite">
          {loading && <div className="device-activity-empty">正在加载设备活动…</div>}
          {!loading && error && (
            <div className="device-activity-empty is-error"><strong>暂时读不到设备记录</strong><span>{error}</span><button type="button" onClick={() => void loadActivity()}>重新连接</button></div>
          )}
          {!loading && !error && records.length === 0 && <div className="device-activity-empty">这个范围暂时没有记录</div>}
          {!error && records.map((record) => {
            const delivery = deliveryCopy(record);
            return (
              <article className="device-activity-card" key={record.id}>
                <header><time>{record.timeLabel}</time><span className={delivery.className}><i />{delivery.label}</span></header>
                <div className="device-activity-conversation">
                  <p className="device-activity-label">设备原话</p>
                  <h3>{record.instruction}</h3>
                  <div className="device-activity-flow">
                    <div><strong>YoooClaw</strong><span>语音识别并转为文字</span></div>
                    <i>→</i>
                    <div><strong>Hermes Agent</strong><span>{record.operations.length ? `执行了 ${record.operations.length} 个操作` : "直接生成回答"}</span></div>
                  </div>
                  <p className="device-activity-label">执行结果</p>
                  <div className="device-activity-result">{record.result || "正在处理中…"}</div>
                </div>
                <details className="device-activity-details">
                  <summary>查看操作详情</summary>
                  <div className="device-activity-operations">
                    {record.operations.length === 0 && <div className="device-activity-operation"><strong>本次没有外部工具调用</strong></div>}
                    {record.operations.map((operation, index) => (
                      <div className="device-activity-operation" key={`${record.id}-${index}`}>
                        <strong>步骤 {index + 1} · {operation.tool || "工具调用"}</strong>
                        <pre>{operation.command || operation.arguments || "已调用"}</pre>
                        {operation.output && <pre>{operation.output}</pre>}
                      </div>
                    ))}
                    {record.delivery.messageId && <div className="device-activity-operation"><strong>微信消息编号</strong><pre>{record.delivery.messageId}</pre></div>}
                  </div>
                </details>
              </article>
            );
          })}
        </section>

        <footer className="device-activity-footer">记录由 YoooClaw、Hermes 与微信通知桥接服务生成 · 每 10 秒自动刷新</footer>
      </div>
    </main>
  );
}

function OfficeFoyer({
  user,
  today,
  openRoom,
  openHabit,
  openSchedule,
  openPindou,
  openFavorites,
  onToggleTheme,
  onOpenGuide,
  onOpenDownloads,
  workSummary,
}: {
  user: UserSummary;
  today: string;
  openRoom: (room: CabinRoom) => void;
  openHabit: () => void;
  openSchedule: () => void;
  openPindou: () => void;
  openFavorites: () => void;
  onToggleTheme: () => void;
  onOpenGuide: () => void;
  onOpenDownloads: () => void;
  workSummary: { habits: number; schedule: number; done: number };
}) {
  const pendingCount = workSummary.habits + workSummary.schedule;

  return (
    <main className="office-foyer">
      <OfficeHeader user={user} current="foyer" openRoom={openRoom} onToggleTheme={onToggleTheme} onOpenGuide={onOpenGuide} onOpenDownloads={onOpenDownloads} />

      <div className="office-page">
        <section className="office-welcome">
          <div>
            <p>{formatLongDay(today)} · WORKSPACE</p>
            <h1>你好，{user.displayName}</h1>
            <span>今天有 {pendingCount} 项正在推进，从最重要的一件开始。</span>
          </div>
          <button type="button" onClick={() => openRoom("work")}>进入工作区 <span>→</span></button>
        </section>

        <section className="office-stats" aria-label="今日工作概览">
          <article><span className="office-stat-icon blue">✓</span><div><small>今日完成</small><strong>{workSummary.done}</strong></div><em>项</em></article>
          <article><span className="office-stat-icon violet">1′</span><div><small>长期习惯</small><strong>{workSummary.habits}</strong></div><em>个进行中</em></article>
          <article><span className="office-stat-icon cyan">▦</span><div><small>待办日程</small><strong>{workSummary.schedule}</strong></div><em>件待推进</em></article>
        </section>

        <section className="office-section-heading">
          <div><p>常用空间</p><h2>快速进入你的工作台</h2></div>
          <span>所有数据与木屋模式保持同步</span>
        </section>

        <section className="office-space-grid" aria-label="工作台空间">
          <button className="office-space-card office-work-card" type="button" onClick={() => openRoom("work")}>
            <span className="office-space-icon">工</span>
            <div><small>WORK</small><h3>工作空间</h3><p>习惯、项目和日程，集中在一个清晰的行动面板里。</p></div>
            <em>{pendingCount} 项进行中 <b>→</b></em>
          </button>
          <button className="office-space-card office-life-card" type="button" onClick={() => openRoom("life")}>
            <span className="office-space-icon">生</span>
            <div><small>LIFE</small><h3>生活入口</h3><p>常用购物与生活服务，打开即达。</p></div>
            <em>进入生活市集 <b>→</b></em>
          </button>
          <button className="office-space-card office-play-card" type="button" onClick={() => openRoom("entertainment")}>
            <span className="office-space-icon">娱</span>
            <div><small>PLAY</small><h3>娱乐入口</h3><p>把放松与内容入口收在一个地方。</p></div>
            <em>进入娱乐角 <b>→</b></em>
          </button>
        </section>

        <section className="office-quick-tools" aria-label="常用工具">
          <div><p>常用工具</p><span>直接开始，不必绕路</span></div>
          <button type="button" onClick={openHabit}><i>1′</i><span><small>长期习惯</small><strong>一分小事</strong></span><b>打开</b></button>
          <button type="button" onClick={openSchedule}><i>▦</i><span><small>任务与项目</small><strong>个人日程</strong></span><b>打开</b></button>
          <button type="button" onClick={openPindou}><i>豆</i><span><small>创作工具</small><strong>拼豆识图</strong></span><b>打开</b></button>
          <button type="button" onClick={openFavorites}><i>🗂</i><span><small>灵感收藏</small><strong>灵感库</strong></span><b>打开</b></button>
        </section>
      </div>
    </main>
  );
}

function OfficeWorkRoom({
  user,
  today,
  openRoom,
  openHabit,
  openSchedule,
  openPindou,
  openFavorites,
  toolUsage,
  onToggleTheme,
  onOpenGuide,
  onOpenDownloads,
  scheduleItems,
  scheduleEntries,
  summary,
}: {
  user: UserSummary;
  today: string;
  openRoom: (room: CabinRoom) => void;
  openHabit: () => void;
  openSchedule: () => void;
  openPindou: () => void;
  openFavorites: () => void;
  toolUsage: ToolUsageRecord[];
  onToggleTheme: () => void;
  onOpenGuide: () => void;
  onOpenDownloads: () => void;
  scheduleItems: ScheduleItem[];
  scheduleEntries: ScheduleEntry[];
  summary: { habits: number; tasks: number; projects: number; touchedProjects: number; done: number };
}) {
  const tools = [
    {
      key: "habit" as const,
      className: "habit",
      mark: "1′",
      eyebrow: "LONG TERM · 长期养成",
      title: "一分小事",
      description: "把想坚持的事情缩小到一分钟，每天完成一个清晰闭环。",
      metric: <><strong>{summary.habits}</strong> 个习惯进行中</>,
      open: openHabit,
    },
    {
      key: "schedule" as const,
      className: "schedule",
      mark: "▦",
      eyebrow: "SHORT TERM · 短线执行",
      title: "个人日程",
      description: "管理今天的事项、持续项目和日历记录，让工作持续向前。",
      metric: <><strong>{summary.tasks + summary.projects}</strong> 件正在推进</>,
      open: openSchedule,
    },
    {
      key: "pindou" as const,
      className: "pindou",
      mark: "豆",
      eyebrow: "CREATIVE · 拼豆创作",
      title: "拼豆识图",
      description: "在浏览器内上传图纸、框选网格、识别色块并逐色高亮，不上传图片。",
      metric: <><strong>HTML</strong> 纯浏览器版本</>,
      open: openPindou,
    },
    {
      key: "favorites" as const,
      className: "favorites",
      mark: "🗂",
      eyebrow: "INSPIRATION · 灵感收藏",
      title: "灵感库",
      description: "收好小红书、抖音等平台的视频与笔记，按主旨、作者和标签快速找回。",
      metric: <><strong>AI</strong> 自动整理与检索</>,
      open: openFavorites,
    },
  ];
  const activeTools = tools.filter((tool) => !findToolUsage(toolUsage, tool.key)?.isFolded);
  const activeCoreTools = activeTools.filter((tool) => tool.key === "habit" || tool.key === "schedule");
  const activeAuxiliaryTools = activeTools.filter((tool) => tool.key === "pindou" || tool.key === "favorites");
  const foldedTools = tools.filter((tool) => findToolUsage(toolUsage, tool.key)?.isFolded);

  function renderOfficeTool(tool: (typeof tools)[number]) {
    return (
      <button key={tool.key} className={`office-tool-panel ${tool.className}`} type="button" onClick={tool.open}>
        <span className="office-tool-mark">{tool.mark}</span>
        <div><small>{tool.eyebrow}</small><h3>{tool.title}</h3><p>{tool.description}</p></div>
        <em>{tool.metric} <b>打开工具 →</b></em>
      </button>
    );
  }

  return (
    <main className="office-foyer office-work-room">
      <OfficeHeader user={user} current="work" openRoom={openRoom} onToggleTheme={onToggleTheme} onOpenGuide={onOpenGuide} onOpenDownloads={onOpenDownloads} />
      <div className="office-page">
        <section className="office-welcome">
          <div>
            <p>{formatLongDay(today)} · WORKSPACE</p>
            <h1>你好，{user.displayName}</h1>
            <span>今天的日程、项目和习惯都在这里，从最重要的一件开始。</span>
          </div>
          <button type="button" onClick={openSchedule}>打开今日日程 <span>→</span></button>
        </section>

        <section className="office-stats office-work-stats" aria-label="工作空间概览">
          <article><span className="office-stat-icon blue">✓</span><div><small>今日完成</small><strong>{summary.done}</strong></div><em>项</em></article>
          <article><span className="office-stat-icon violet">1′</span><div><small>长期习惯</small><strong>{summary.habits}</strong></div><em>个进行中</em></article>
          <article><span className="office-stat-icon cyan">▦</span><div><small>短线事项</small><strong>{summary.tasks}</strong></div><em>件待推进</em></article>
          <article><span className="office-stat-icon amber">▰</span><div><small>持续项目</small><strong>{summary.projects}</strong></div><em>{summary.touchedProjects} 个今日推进</em></article>
        </section>

        {scheduleItems.length > 0 && (
          <WorkWeekCalendar
            items={scheduleItems}
            entries={scheduleEntries}
            today={today}
            onOpen={openSchedule}
          />
        )}

        <DailyPhraseCard user={user} />

        <section className="office-section-heading">
          <div><p>核心工作</p><h2>选择现在要处理的事情</h2></div>
          <span>日程处理眼前，习惯照顾长期</span>
        </section>

        <section className="office-tool-panels office-core-tools" aria-label="核心工作工具">
          {activeCoreTools.map(renderOfficeTool)}
        </section>

        {activeAuxiliaryTools.length > 0 && (
          <section className="office-toolbox-card" aria-label="工具箱">
            <div><i>工</i><span><small>TOOLBOX</small><strong>工具箱</strong><em>辅助创作工具集中收纳，不打断今天的工作。</em></span></div>
            <div className="office-toolbox-tools">
              {activeAuxiliaryTools.map((tool) => (
                <button type="button" key={tool.key} onClick={tool.open}><i className={tool.className}>{tool.mark}</i><span><small>{tool.key === "favorites" ? "灵感收藏" : "创作工具"}</small><strong>{tool.title}</strong></span><b>打开 →</b></button>
              ))}
            </div>
          </section>
        )}

        {foldedTools.length > 0 && (
          <details className="infrequent-tools-card office-infrequent-tools">
            <summary><span><strong>不常用工具</strong><small>这些工具由你手动收起</small></span><b>{foldedTools.length} 个</b></summary>
            <div className="office-tool-panels">{foldedTools.map(renderOfficeTool)}</div>
          </details>
        )}

        <section className="office-room-shortcuts" aria-label="其他空间">
          <div><p>其他空间</p><span>工作完成后，也给生活和休息留位置。</span></div>
          <button type="button" onClick={() => openRoom("life")}><i>生</i><span><small>LIFE</small><strong>生活入口</strong></span><b>→</b></button>
          <button type="button" onClick={() => openRoom("entertainment")}><i>娱</i><span><small>PLAY</small><strong>娱乐入口</strong></span><b>→</b></button>
        </section>
      </div>
    </main>
  );
}

function WorkWeekCalendar({
  items,
  entries,
  today,
  onOpen,
}: {
  items: ScheduleItem[];
  entries: ScheduleEntry[];
  today: string;
  onOpen: () => void;
}) {
  const dates = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const parentIdsWithStages = new Set(
    items.filter((item) => item.kind === "project" && item.parentItemId).map((item) => item.parentItemId),
  );
  const calendarItems = items.filter(
    (item) => !(item.kind === "project" && !item.parentItemId && parentIdsWithStages.has(item.id)),
  );

  function itemsForDate(date: string) {
    return scheduleItemsRelevantForDate(calendarItems, entries, today, date);
  }

  return (
    <section className="work-week-calendar" aria-label="未来七天日历">
      <div className="work-week-head">
        <div><p>CALENDAR</p><h2>未来 7 天</h2></div>
        <button type="button" onClick={onOpen}>查看完整日历 <span>→</span></button>
      </div>
      <div className="work-week-grid">
        {dates.map((date) => {
          const dayItems = itemsForDate(date);
          const dayEntries = entries.filter((entry) => entry.entryDate === date);
          return (
            <button className={date === today ? "today" : ""} type="button" key={date} onClick={onOpen}>
              <div className="work-week-date"><small>{date === today ? "今天" : ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][parseDate(date).getDay()]}</small><strong>{parseDate(date).getDate()}</strong></div>
              <div className="work-week-items">
                {dayItems.slice(0, 3).map((item) => {
                  const entry = dayEntries.find((record) => record.itemId === item.id);
                  const done = entry?.action === "completed";
                  const collaboration = !item.isOwner
                    ? `来自 ${item.ownerUsername}`
                    : item.participantUsernames.length > 0
                      ? `协作 · ${item.participantUsernames.join("、")}`
                      : "";
                  return (
                    <span className={`${item.kind} ${done ? "done" : ""}`} key={item.id}>
                      <i />
                      <b>{item.title}</b>
                      {item.kind === "project" && (
                        <small>{item.parentItemId ? `${item.parentTitle ?? "大项目"} · 阶段` : "项目"} · {entry?.progress ?? item.progress}%{item.dueDate ? ` · 截止 ${formatDay(item.dueDate)}` : ""}</small>
                      )}
                      {collaboration && <em>{collaboration}</em>}
                    </span>
                  );
                })}
                {dayItems.length === 0 && <span className="empty">暂无安排</span>}
                {dayItems.length > 3 && <span className="more">还有 {dayItems.length - 3} 项</span>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ScheduleCollaborationMeta({ item }: { item: ScheduleItem }) {
  if (!item.isOwner) {
    return <span className="collaboration-pill shared">来自 {item.ownerUsername}</span>;
  }
  if (item.participantUsernames.length > 0) {
    return <span className="collaboration-pill">协作 · {item.participantUsernames.join("、")}</span>;
  }
  return null;
}

function PortalRoom({
  user,
  theme,
  onToggleTheme,
  category,
  links,
  onBack,
  switchRoom,
  reload,
  onOpenGuide,
  onOpenDownloads,
}: {
  user: UserSummary;
  theme: WorkbenchTheme;
  onToggleTheme: () => void;
  category: "life" | "entertainment";
  links: PortalLink[];
  onBack: () => void;
  switchRoom: (room: CabinRoom) => void;
  reload: () => Promise<void>;
  onOpenGuide: () => void;
  onOpenDownloads: () => void;
}) {
  const [manage, setManage] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const sortedLinks = [...links].sort((a, b) => a.sortOrder - b.sortOrder);
  const life = category === "life";
  const copy = life
    ? { eyebrow: "LIFE MARKET", title: "生活市集", subtitle: "把常去的商店收进自己的置物架。", add: "添加购物入口" }
    : { eyebrow: "PLAY LOUNGE", title: "娱乐角", subtitle: "想放松的时候，从这里直接出发。", add: "添加娱乐入口" };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function persistOrder(ordered: PortalLink[]) {
    try {
      await api("/api/portal-links", {
        method: "POST",
        body: JSON.stringify({ action: "reorder", category, orderedIds: ordered.map((link) => link.id) }),
      });
      await reload();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "暂时无法调整顺序");
    }
  }

  function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sortedLinks.length) return;
    const ordered = [...sortedLinks];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    void persistOrder(ordered);
  }

  function dropOn(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const from = sortedLinks.findIndex((link) => link.id === draggedId);
    const to = sortedLinks.findIndex((link) => link.id === targetId);
    if (from < 0 || to < 0) return;
    const ordered = [...sortedLinks];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    setDraggedId(null);
    void persistOrder(ordered);
  }

  async function removeLink(link: PortalLink) {
    if (!window.confirm(`从${copy.title}移除「${link.label}」吗？`)) return;
    try {
      await api(`/api/portal-links/${link.id}`, { method: "DELETE" });
      setToast(link.isDefault ? "已移除，需要时可以恢复默认入口" : "入口已删除");
      await reload();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "暂时无法移除入口");
    }
  }

  async function restoreDefaults() {
    try {
      await api("/api/portal-links", {
        method: "POST",
        body: JSON.stringify({ action: "restore-defaults", category }),
      });
      setToast("默认入口已经回到木屋");
      await reload();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "暂时无法恢复默认入口");
    }
  }

  return (
    <main className={`portal-room ${theme === "office" ? "office-portal-room" : ""} ${life ? "life-room" : "entertainment-room"}`}>
      {theme === "office" ? (
        <OfficeHeader user={user} current={category} openRoom={switchRoom} onToggleTheme={onToggleTheme} onOpenGuide={onOpenGuide} onOpenDownloads={onOpenDownloads} />
      ) : (
        <header className="portal-room-header">
          <button className="portal-back" onClick={onBack}><span>←</span><div><small>返回工作台</small><strong>{copy.title}</strong></div></button>
          <RoomSwitcher current={category} openRoom={switchRoom} />
          <div className="portal-header-actions">
            <NotificationCenter user={user} />
            <WorkbenchAccountMenu user={user} theme="cabin" openRoom={switchRoom} onToggleTheme={onToggleTheme} onOpenGuide={onOpenGuide} onOpenDownloads={onOpenDownloads} />
          </div>
        </header>
      )}

      <div className="portal-room-scenery" aria-hidden="true">
        <span className="portal-beam beam-a" /><span className="portal-beam beam-b" />
        <span className="portal-window"><i /><b /></span>
        <span className="portal-lamp"><i /></span>
        <span className="portal-room-floor" />
      </div>

      <section className="portal-room-content">
        <div className="portal-room-title">
          <div><p>{copy.eyebrow}</p><h1>{copy.title}</h1><span>{copy.subtitle}</span></div>
          <div className="portal-actions">
            <button className={manage ? "active" : ""} onClick={() => setManage((value) => !value)}>{manage ? "完成整理" : "整理入口"}</button>
            <button className="portal-add" onClick={() => setAddOpen(true)}>＋ {copy.add}</button>
          </div>
        </div>

        <div className="portal-shelf">
          <div className="portal-grid">
            {sortedLinks.map((link, index) => (
              <article
                className={`portal-link-card ${manage ? "managing" : ""} ${draggedId === link.id ? "dragging" : ""}`}
                key={link.id}
                draggable={manage}
                onDragStart={() => setDraggedId(link.id)}
                onDragOver={(event) => manage && event.preventDefault()}
                onDrop={() => dropOn(link.id)}
              >
                <a href={link.url} target="_blank" rel="noreferrer" aria-label={`打开${link.label}`} onClick={(event) => manage && event.preventDefault()}>
                  <span className="portal-link-icon" style={{ "--portal-color": link.color } as React.CSSProperties}>{link.icon}</span>
                  <div>
                    <small>{life ? "SHOP" : "DISCOVER"} · 0{index + 1}</small>
                    <strong>{link.label}</strong>
                    <span className="portal-link-url">{formatPortalHost(link.url)}</span>
                    <em className="portal-jump-button">前往{link.label} ↗</em>
                  </div>
                </a>
                {manage && (
                  <div className="portal-manage-controls">
                    <button onClick={() => moveLink(index, -1)} disabled={index === 0} aria-label="向前移动">←</button>
                    <button onClick={() => moveLink(index, 1)} disabled={index === sortedLinks.length - 1} aria-label="向后移动">→</button>
                    <button className="remove" onClick={() => void removeLink(link)}>移除</button>
                  </div>
                )}
              </article>
            ))}
            {sortedLinks.length < 12 && (
              <button className="portal-empty-slot" onClick={() => setAddOpen(true)}><span>＋</span><strong>放入一个新入口</strong><small>{sortedLinks.length} / 12</small></button>
            )}
          </div>
          <div className="portal-shelf-edge" />
        </div>

        {manage && <button className="restore-defaults" onClick={() => void restoreDefaults()}>恢复默认入口</button>}
      </section>

      {addOpen && (
        <AddPortalModal
          category={category}
          onClose={() => setAddOpen(false)}
          onAdded={async () => {
            setAddOpen(false);
            setToast("新入口已经放进房间");
            await reload();
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function AddPortalModal({
  category,
  onClose,
  onAdded,
}: {
  category: "life" | "entertainment";
  onClose: () => void;
  onAdded: () => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState(category === "life" ? "购" : "▶");
  const [color, setColor] = useState(category === "life" ? "#ad713d" : "#6f6b92");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/api/portal-links", {
        method: "POST",
        body: JSON.stringify({ action: "create", category, label, url, icon, color }),
      });
      await onAdded();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "暂时无法添加入口");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="world-modal-backdrop portal-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="portal-add-modal" onSubmit={submit}>
        <button type="button" className="world-modal-close" onClick={onClose} aria-label="关闭">×</button>
        <p>ADD A NEW DOORWAY</p>
        <h2>添加一个网站入口</h2>
        <span>以后可以随时移除或调整它的位置。</span>
        <label><strong>显示名称</strong><input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={30} placeholder="例如：网易云音乐" required /></label>
        <label><strong>网页地址</strong><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." inputMode="url" required /></label>
        <div className="portal-appearance-fields">
          <label><strong>标记</strong><input value={icon} onChange={(event) => setIcon(Array.from(event.target.value).slice(0, 2).join(""))} maxLength={4} /></label>
          <label><strong>颜色</strong><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
          <span className="portal-icon-preview" style={{ "--portal-color": color } as React.CSSProperties}>{icon || "↗"}</span>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={saving}>{saving ? "正在放入…" : "添加到房间"}</button></div>
      </form>
    </div>
  );
}

function ScheduleWorkspace({
  user,
  theme,
  onToggleTheme,
  onBack,
  onUse,
}: {
  user: UserSummary;
  theme: WorkbenchTheme;
  onToggleTheme: () => void;
  onBack: () => void;
  onUse: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<"schedule" | "projects">("schedule");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [projectUpdate, setProjectUpdate] = useState<ScheduleItem | null>(null);
  const [toast, setToast] = useState("");
  const today = toLocalDate();

  const load = useCallback(async () => {
    const result = await api<DashboardData>("/api/dashboard");
    setData(result);
    window.dispatchEvent(new CustomEvent("cabin:notifications-refresh"));
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const items = data?.scheduleItems ?? [];
  const entries = data?.scheduleEntries ?? [];
  async function completeTask(item: ScheduleItem) {
    try {
      await api("/api/schedule/entries", {
        method: "POST",
        body: JSON.stringify({ itemId: item.id, entryDate: today }),
      });
      setToast(item.repeatDaily ? "今天这一项完成了" : "事项已完成");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "暂时无法完成");
    }
  }

  async function archiveItem(item: ScheduleItem) {
    if (!window.confirm(`结束「${item.title}」吗？已有记录会保留。`)) return;
    try {
      await api(`/api/schedule/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "archive" }),
      });
      setToast("已收进历史");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "暂时无法结束");
    }
  }

  async function convertTaskToProject(item: ScheduleItem) {
    if (!window.confirm(`把「${item.title}」转为持续项目吗？项目会从今天开始，你可以继续设置截止日期和拆解阶段。`)) return;
    try {
      const result = await api<{ item: ScheduleItem }>(`/api/schedule/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "convert_to_project", startDate: today }),
      });
      await load();
      setTab("projects");
      setEditingItem(result.item);
      setToast("已转为项目，可以继续规划");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "暂时无法转为项目");
    }
  }

  async function restoreProject(item: ScheduleItem) {
    if (!window.confirm(`还原「${item.title}」并重新放回正在推进吗？`)) return;
    try {
      await api(`/api/schedule/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "restore" }),
      });
      setToast("项目已还原");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "暂时无法还原");
    }
  }

  async function deleteProject(item: ScheduleItem) {
    if (!window.confirm(`永久删除「${item.title}」吗？项目阶段和全部推进记录都会一起删除，且无法恢复。`)) return;
    try {
      await api(`/api/schedule/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "delete" }),
      });
      setToast("项目已永久删除");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "暂时无法删除");
    }
  }

  return (
    <main className="schedule-shell" onClickCapture={onUse}>
      <header className="schedule-header">
        <button className="schedule-back" onClick={onBack}><span>←</span><div><small>返回木屋</small><strong>个人工作台</strong></div></button>
        <nav>
          <button className={tab === "schedule" ? "active" : ""} onClick={() => setTab("schedule")}>日程</button>
          <button className={tab === "projects" ? "active" : ""} onClick={() => setTab("projects")}>项目</button>
        </nav>
        <div className="schedule-header-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <NotificationCenter user={user} />
          <div className="schedule-account"><span>{user.displayName.slice(0, 1).toUpperCase()}</span><strong>{user.displayName}</strong></div>
        </div>
      </header>

      <div className="schedule-wrap">
        <section className="schedule-hero">
          <div><p>{formatLongDay(today)} · SHORT TERM</p><h1>{tab === "schedule" ? "先看全局，再安排今天。" : "每个项目，都往前一点。"}</h1></div>
          <button className="schedule-create" onClick={() => setCreateOpen(true)}><span>＋</span>新建事项或项目</button>
        </section>

        {!data ? (
          <div className="schedule-loading"><i /><p>正在整理今天的地图…</p></div>
        ) : tab === "projects" ? (
          <ProjectBoard
            projects={items.filter((item) => item.kind === "project")}
            entries={entries}
            today={today}
            onUpdate={setProjectUpdate}
            onEdit={setEditingItem}
            onArchive={(item) => void archiveItem(item)}
            onRestore={(item) => void restoreProject(item)}
            onDelete={(item) => void deleteProject(item)}
          />
        ) : (
          <div className="schedule-overview">
            <ScheduleCalendar
              items={items}
              entries={entries}
              today={today}
              onCompleteTask={(item) => void completeTask(item)}
              onEdit={setEditingItem}
              onConvertTask={(item) => void convertTaskToProject(item)}
              onArchive={(item) => void archiveItem(item)}
              onUpdateProject={setProjectUpdate}
              onCreate={() => setCreateOpen(true)}
            />
          </div>
        )}
      </div>

      {createOpen && <ScheduleItemModal today={today} friends={data?.friends ?? []} onClose={() => setCreateOpen(false)} onSaved={async () => { setCreateOpen(false); setToast("已经放进你的工作台"); await load(); }} />}
      {editingItem && <ScheduleItemModal today={today} friends={data?.friends ?? []} item={editingItem} projectStages={items.filter((candidate) => candidate.parentItemId === editingItem.id && candidate.status !== "archived")} onClose={() => setEditingItem(null)} onSaved={async () => { setEditingItem(null); setToast("调整已保存"); await load(); }} />}
      {projectUpdate && <ProjectUpdateModal project={projectUpdate} entries={entries.filter((entry) => entry.itemId === projectUpdate.id && entry.progress !== null)} today={today} onClose={() => setProjectUpdate(null)} onSaved={async () => { setProjectUpdate(null); setToast("今天的推进已记录"); await load(); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

type ProjectStageDraft = {
  id: string | null;
  title: string;
  startDate: string;
  dueDate: string;
};

function ScheduleItemModal({
  today,
  friends,
  item,
  projectStages = [],
  onClose,
  onSaved,
}: {
  today: string;
  friends: string[];
  item?: ScheduleItem;
  projectStages?: ScheduleItem[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [kind, setKind] = useState<"task" | "project">(item?.kind ?? "task");
  const [title, setTitle] = useState(item?.title ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [priority, setPriority] = useState<ScheduleItem["priority"]>(item?.priority ?? "normal");
  const [repeatDaily, setRepeatDaily] = useState(item?.repeatDaily ?? false);
  const [startDate, setStartDate] = useState(item?.startDate ?? today);
  const [dueDate, setDueDate] = useState(item?.dueDate ?? "");
  const [participantUsernames, setParticipantUsernames] = useState<string[]>(item?.participantUsernames ?? []);
  const [stages, setStages] = useState<ProjectStageDraft[]>(() => projectStages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    startDate: stage.startDate,
    dueDate: stage.dueDate ?? stage.startDate,
  })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addStage() {
    const previous = stages[stages.length - 1];
    const nextStart = previous?.dueDate ? addDays(previous.dueDate, 1) : startDate;
    const boundedStart = dueDate && nextStart > dueDate ? dueDate : nextStart;
    setStages((current) => [...current, {
      id: null,
      title: "",
      startDate: boundedStart,
      dueDate: dueDate || boundedStart,
    }]);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api(item ? `/api/schedule/items/${item.id}` : "/api/schedule/items", {
        method: item ? "PATCH" : "POST",
        body: JSON.stringify({
          action: item ? "update" : undefined,
          kind,
          title,
          note,
          priority,
          repeatDaily,
          startDate,
          dueDate,
          participantUsernames,
          stages: kind === "project" ? stages : undefined,
        }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "暂时无法保存");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop schedule-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card schedule-item-modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        <p className="eyebrow">{item ? "EDIT" : "NEW COORDINATE"}</p>
        <h2>{item ? "调整这条坐标" : "今天，要记下什么？"}</h2>
        {!item && <div className="kind-switch"><button className={kind === "task" ? "active" : ""} onClick={() => setKind("task")}><span>✓</span><div><strong>普通事项</strong><small>一次完成，或每天重复</small></div></button><button className={kind === "project" ? "active" : ""} onClick={() => setKind("project")}><span>▰</span><div><strong>持续项目</strong><small>每次变化，都是一次推进</small></div></button></div>}
        <form onSubmit={save}>
          <label htmlFor="schedule-title">{kind === "project" ? "项目名称" : "事项名称"}</label>
          <input id="schedule-title" autoFocus maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "project" ? "例如：完成个人网站" : "例如：早上查看邮件"} />
          <div className="form-grid">
            <div><label htmlFor="schedule-start">开始日期</label><input id="schedule-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={Boolean(item && kind === "task")} /></div>
            {kind === "project" && <div><label htmlFor="schedule-due">截止日期（可选）</label><input id="schedule-due" type="date" min={startDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>}
          </div>
          {kind === "project" && (
            <fieldset className="project-stage-field">
              <legend>项目拆解（可选）</legend>
              <p>每个阶段会以自己的名称和跨度显示在日历上，并自动继承大项目的颜色与协作成员。</p>
              <div className="project-stage-list">
                {stages.map((stage, index) => (
                  <article key={stage.id ?? `new-stage-${index}`}>
                    <div className="project-stage-row-head"><strong>阶段 {String(index + 1).padStart(2, "0")}</strong><button type="button" onClick={() => setStages((current) => current.filter((_, stageIndex) => stageIndex !== index))}>移除</button></div>
                    <label htmlFor={`project-stage-title-${index}`}>阶段名称</label>
                    <input id={`project-stage-title-${index}`} maxLength={80} value={stage.title} onChange={(event) => setStages((current) => current.map((value, stageIndex) => stageIndex === index ? { ...value, title: event.target.value } : value))} placeholder="例如：完成信息架构" />
                    <div className="form-grid">
                      <div><label htmlFor={`project-stage-start-${index}`}>开始日期</label><input id={`project-stage-start-${index}`} type="date" min={startDate} max={dueDate || undefined} value={stage.startDate} onChange={(event) => setStages((current) => current.map((value, stageIndex) => stageIndex === index ? { ...value, startDate: event.target.value } : value))} /></div>
                      <div><label htmlFor={`project-stage-due-${index}`}>结束日期</label><input id={`project-stage-due-${index}`} type="date" min={stage.startDate || startDate} max={dueDate || undefined} value={stage.dueDate} onChange={(event) => setStages((current) => current.map((value, stageIndex) => stageIndex === index ? { ...value, dueDate: event.target.value } : value))} /></div>
                    </div>
                  </article>
                ))}
              </div>
              <button className="project-stage-add" type="button" onClick={addStage}>＋ 添加一个项目阶段</button>
            </fieldset>
          )}
          {kind === "task" && <label className="repeat-toggle"><input type="checkbox" checked={repeatDaily} onChange={(event) => setRepeatDaily(event.target.checked)} /><span /><div><strong>每天重复</strong><small>每天生成独立记录，昨天没完成也不会堆到今天</small></div></label>}
          <fieldset className="priority-field"><legend>优先级</legend><div>{(["important", "normal", "later"] as const).map((value) => <button type="button" className={`${value} ${priority === value ? "active" : ""}`} key={value} onClick={() => setPriority(value)}><i />{PRIORITY_LABELS[value]}</button>)}</div></fieldset>
          {friends.length > 0 && (
            <fieldset className="friend-field">
              <legend>关联好友（可多选）</legend>
              <p>{kind === "project" ? "关联后会自动出现在对方日历，所有项目成员都能编辑项目、阶段和进度。" : "关联后会自动出现在对方日历，对方可以更新完成状态。"}</p>
              <div>
                {friends.map((username) => {
                  const selected = participantUsernames.includes(username);
                  return (
                    <button
                      type="button"
                      className={selected ? "active" : ""}
                      key={username}
                      onClick={() => setParticipantUsernames((current) => selected ? current.filter((value) => value !== username) : [...current, username])}
                      aria-pressed={selected}
                    >
                      <span>{username.slice(0, 1).toUpperCase()}</span><strong>{username}</strong><i>{selected ? "✓" : "+"}</i>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
          <label htmlFor="schedule-note">备注（可选）</label>
          <textarea id="schedule-note" maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="给未来的自己一点上下文…" />
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full-button" disabled={!title.trim() || saving}>{saving ? "正在保存…" : item ? "保存调整" : "放进工作台"}</button>
        </form>
      </section>
    </div>
  );
}

function ProjectUpdateModal({
  project,
  entries,
  today,
  onClose,
  onSaved,
}: {
  project: ScheduleItem;
  entries: ScheduleEntry[];
  today: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [progress, setProgress] = useState(project.progress);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changed = progress !== project.progress;
  const progressEntries = [...entries].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  function changeProgress(value: number) {
    setProgress(Math.max(0, Math.min(100, Math.round(value))));
    setError("");
  }

  async function save() {
    if (!changed) {
      setError("请先调整进度；增加或回调都算推进");
      return;
    }
    const completeProject = progress === 100
      ? window.confirm("进度已经达到 100%，要把这个项目完成归档吗？")
      : false;
    setSaving(true);
    try {
      await api("/api/schedule/entries", {
        method: "POST",
        body: JSON.stringify({ itemId: project.id, entryDate: today, progress, note, completeProject }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "暂时无法保存");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop schedule-modal-backdrop">
      <section className="modal-card project-update-modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        <p className="eyebrow">TODAY&apos;S PROGRESS</p>
        <h2>今天，项目有了什么变化？</h2>
        <p><strong>{project.title}</strong>{project.parentItemId ? ` · ${project.parentTitle ?? "大项目"}的阶段` : project.dueDate ? ` · 截止 ${formatDay(project.dueDate)}` : " · 持续项目"}</p>
        <div className="progress-editor">
          <div className="large-project-ring" style={{ "--project-progress": `${progress * 3.6}deg` } as React.CSSProperties}><span><strong>{progress}</strong><small>%</small></span></div>
          <div className="progress-controls">
            <div className="progress-number-field"><label htmlFor="project-progress-number">自定义进度</label><span><input id="project-progress-number" aria-label="自定义项目进度百分比" type="number" inputMode="numeric" min="0" max="100" step="1" value={progress} onChange={(event) => changeProgress(Number(event.target.value))} /><b>%</b></span></div>
            <input aria-label="项目进度" type="range" min="0" max="100" step="1" value={progress} onChange={(event) => changeProgress(Number(event.target.value))} />
            <div className="range-labels"><span>0 · 重新梳理</span><span>100 · 完成</span></div>
            <p className={`progress-change-summary ${changed ? "changed" : ""}`}>{changed ? <>上次 {project.progress}% <b>→</b> 本次 {progress}% · {progress > project.progress ? "向前推进" : "重新校准"}</> : <>上次记录为 {project.progress}%，调整任意 1% 即算推进</>}</p>
          </div>
        </div>
        <label htmlFor="project-progress-note">今天处理了什么？（可选）</label>
        <textarea id="project-progress-note" maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：把首页的信息结构理清了。" />
        <p className="progress-hint">进度增加或回调都算推进：变化说明事情正在变好，或你更清楚怎样让它变好。</p>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button full-button" onClick={() => void save()} disabled={saving || !changed}>{saving ? "正在记录…" : changed ? "记录这次变化" : "调整进度后保存"}</button>
        <div className="project-progress-history project-update-history">
          <div className="project-progress-history-head"><strong>进度修改记录</strong><small>{progressEntries.length} 次修改 · 所有项目成员可见</small></div>
          {progressEntries.length === 0 ? <p>还没有进度修改记录，保存第一次变化后会显示在这里。</p> : <div>{progressEntries.map((entry) => {
            const previous = entry.previousProgress;
            const direction = previous === null || previous === undefined ? "首次记录" : (entry.progress ?? 0) >= previous ? "向前推进" : "重新校准";
            return <article key={entry.id}><span>{entry.actorUsername.slice(0, 1).toUpperCase()}</span><div><strong>{entry.actorUsername}</strong><small>{formatProgressEntryTime(entry.createdAt)} 修改 · {direction}</small>{entry.note && <p>{entry.note}</p>}</div><em>{previous ?? "?"}% <b>→</b> {entry.progress ?? project.progress}%</em></article>;
          })}</div>}
        </div>
      </section>
    </div>
  );
}

function ProjectBoard({
  projects,
  entries,
  today,
  onUpdate,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  projects: ScheduleItem[];
  entries: ScheduleEntry[];
  today: string;
  onUpdate: (project: ScheduleItem) => void;
  onEdit: (project: ScheduleItem) => void;
  onArchive: (project: ScheduleItem) => void;
  onRestore: (project: ScheduleItem) => void;
  onDelete: (project: ScheduleItem) => void;
}) {
  const rootProjects = projects.filter((project) => !project.parentItemId);
  const active = rootProjects.filter((project) => project.status === "active");
  const history = rootProjects.filter((project) => project.status !== "active");

  function exportProject(project: ScheduleItem) {
    const stageById = new Map(
      projects
        .filter((candidate) => candidate.parentItemId === project.id)
        .map((stage) => [stage.id, stage]),
    );
    const relatedItemIds = new Set([project.id, ...stageById.keys()]);
    const logs = entries
      .filter((entry) => relatedItemIds.has(entry.itemId) && entry.progress !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const text = `# ${project.title}｜项目推进记录\n\n${logs.map((entry) => {
      const stage = stageById.get(entry.itemId);
      const source = stage ? ` · 阶段：${stage.title}` : " · 大项目";
      return `## ${formatDay(entry.entryDate)} · ${entry.actorUsername}${source} · ${entry.previousProgress ?? "?"}% → ${entry.progress ?? project.progress}%\n\n${entry.note || "未填写备注"}`;
    }).join("\n\n")}`;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.title}-推进记录.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="project-board">
      <div className="project-board-head"><div><p>ACTIVE PROJECTS</p><h2>正在推进的项目</h2></div><span>{active.length} 个项目</span></div>
      <div className="project-card-grid">
        {active.map((project) => {
          const allStages = projects.filter((candidate) => candidate.parentItemId === project.id);
          const stageById = new Map(allStages.map((stage) => [stage.id, stage]));
          const relatedItemIds = new Set([project.id, ...stageById.keys()]);
          const logs = entries
            .filter((entry) => relatedItemIds.has(entry.itemId) && entry.progress !== null)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const todayEntry = logs.find((entry) => entry.entryDate === today);
          const stages = allStages
            .filter((candidate) => candidate.status !== "archived")
            .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.createdAt.localeCompare(right.createdAt));
          return (
            <article className={`project-card ${todayEntry ? "touched" : ""}`} key={project.id}>
              <div className="project-card-top"><div><span className={`priority-pill ${project.priority}`}>{PRIORITY_LABELS[project.priority]}</span><ScheduleCollaborationMeta item={project} /></div><div><button onClick={() => onEdit(project)}>编辑 / 拆解</button>{project.isOwner && <button onClick={() => onArchive(project)}>结束</button>}</div></div>
              <h3>{project.title}</h3>
              <p>{project.note || "这是一个持续推进的项目。"}</p>
              <div className="project-progress-line"><i style={{ width: `${project.progress}%` }} /><span>{project.progress}%</span></div>
              <div className="project-card-meta"><span>{todayEntry ? "✓ 今日已推进" : project.dueDate ? `截止 ${formatDay(project.dueDate)}` : "没有截止日期"}</span><small>{stages.length > 0 ? `${stages.length} 个阶段` : `${logs.length} 条推进记录`}</small></div>
              {stages.length > 0 && (
                <div className="project-stage-board">
                  <div><strong>项目阶段</strong><small>同色显示在月历</small></div>
                  {stages.map((stage, index) => (
                    <article key={stage.id} className={stage.status === "completed" ? "completed" : ""}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div><strong>{stage.title}</strong><small>{formatDay(stage.startDate)} — {formatDay(stage.dueDate ?? stage.startDate)}</small></div>
                      <em>{stage.progress}%</em>
                      {stage.status === "active" && <button type="button" onClick={() => onUpdate(stage)}>推进</button>}
                    </article>
                  ))}
                </div>
              )}
              <div className="project-card-actions"><button onClick={() => onUpdate(project)}>{todayEntry ? "继续推进" : "推进一下"}</button>{logs.length > 0 && <button onClick={() => exportProject(project)}>下载记录</button>}</div>
              <div className="project-progress-history">
                <div className="project-progress-history-head"><strong>全部推进记录</strong><small>{logs.length} 次变化</small></div>
                {logs.length === 0 ? <p>还没有推进记录，第一次变化会显示在这里。</p> : <div>{logs.map((entry) => {
                  const previous = entry.previousProgress;
                  const direction = previous === null || previous === undefined ? "记录" : (entry.progress ?? 0) >= previous ? "向前推进" : "重新校准";
                  const stage = stageById.get(entry.itemId);
                  return <article key={entry.id}><span>{entry.actorUsername.slice(0,1).toUpperCase()}</span><div><strong>{entry.actorUsername}</strong><small>{stage ? `${stage.title} · 阶段 · ` : "大项目 · "}{formatDay(entry.entryDate)} · {direction}</small>{entry.note && <p>{entry.note}</p>}</div><em>{previous ?? "?"}% <b>→</b> {entry.progress ?? project.progress}%</em></article>;
                })}</div>}
              </div>
            </article>
          );
        })}
        {active.length === 0 && <div className="project-board-empty"><span>◇</span><h3>还没有正在推进的项目</h3><p>回到“日程”，创建一个持续项目。</p></div>}
      </div>
      {history.length > 0 && <div className="project-history"><h3>项目历史</h3>{history.map((project) => <div key={project.id}><span>{project.status === "completed" ? "✓" : "—"}</span><strong>{project.title}</strong><small>{project.status === "completed" ? "已完成" : "已结束"}</small><em>{project.progress}%</em>{project.isOwner && <div className="project-history-actions"><button type="button" onClick={() => onRestore(project)}>还原</button><button type="button" className="danger" onClick={() => onDelete(project)}>删除</button></div>}</div>)}</div>}
    </section>
  );
}

type ScheduleCalendarSegment = {
  item: ScheduleItem;
  startColumn: number;
  endColumn: number;
  startDate: string;
  endDate: string;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
  hasCompletion: boolean;
};

function laterScheduleDate(left: string, right: string) {
  return left > right ? left : right;
}

function getScheduleItemRange(item: ScheduleItem, entries: ScheduleEntry[], today: string) {
  const lastEntryDate = entries.reduce<string | null>((latest, entry) => {
    if (entry.itemId !== item.id) return latest;
    return !latest || entry.entryDate > latest ? entry.entryDate : latest;
  }, null);

  let endDate: string;
  if (item.completedDate) {
    endDate = item.completedDate;
  } else if (item.status === "archived") {
    endDate = lastEntryDate ?? item.startDate;
  } else if (item.kind === "project") {
    endDate = laterScheduleDate(item.dueDate ?? today, today);
  } else {
    // An unfinished task stays visible through today. A future task is shown on its start day.
    endDate = laterScheduleDate(item.startDate, today);
  }

  return {
    startDate: item.startDate,
    endDate: laterScheduleDate(item.startDate, endDate),
  };
}

function scheduleItemsRelevantForDate(
  items: ScheduleItem[],
  entries: ScheduleEntry[],
  today: string,
  date: string,
) {
  return items
    .map((item) => ({ item, range: getScheduleItemRange(item, entries, today) }))
    .filter(({ range }) => date >= range.startDate && date <= range.endDate)
    .sort((left, right) => {
      const startDifference = left.range.startDate.localeCompare(right.range.startDate);
      if (startDifference !== 0) return startDifference;
      if (left.item.kind !== right.item.kind) return left.item.kind === "project" ? -1 : 1;
      return right.range.endDate.localeCompare(left.range.endDate);
    })
    .map(({ item }) => item);
}

function buildScheduleWeekSegments(
  items: ScheduleItem[],
  entries: ScheduleEntry[],
  today: string,
  weekCells: Array<{ value: string }>,
) {
  const weekStart = weekCells[0].value;
  const weekEnd = weekCells[6].value;
  const laneEnds: number[] = [];

  return items
    .flatMap((item) => {
      const range = getScheduleItemRange(item, entries, today);
      if (range.startDate > weekEnd || range.endDate < weekStart) return [];
      if (!item.repeatDaily || item.kind !== "task") return [{ item, range }];

      const firstOccurrence = range.startDate > weekStart ? range.startDate : weekStart;
      const lastOccurrence = range.endDate < weekEnd ? range.endDate : weekEnd;
      const occurrences: Array<{ item: ScheduleItem; range: { startDate: string; endDate: string } }> = [];
      for (let occurrenceDate = firstOccurrence; occurrenceDate <= lastOccurrence; occurrenceDate = addDays(occurrenceDate, 1)) {
        occurrences.push({ item, range: { startDate: occurrenceDate, endDate: occurrenceDate } });
      }
      return occurrences;
    })
    .sort((left, right) => {
      const startDifference = left.range.startDate.localeCompare(right.range.startDate);
      if (startDifference !== 0) return startDifference;
      if (left.item.kind !== right.item.kind) return left.item.kind === "project" ? -1 : 1;
      return right.range.endDate.localeCompare(left.range.endDate);
    })
    .map(({ item, range }) => {
      const startDate = range.startDate > weekStart ? range.startDate : weekStart;
      const endDate = range.endDate < weekEnd ? range.endDate : weekEnd;
      const startColumn = weekCells.findIndex((cell) => cell.value === startDate);
      const endColumn = weekCells.findIndex((cell) => cell.value === endDate);
      let lane = laneEnds.findIndex((occupiedUntil) => startColumn > occupiedUntil);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = endColumn;

      return {
        item,
        startColumn,
        endColumn,
        startDate,
        endDate,
        lane,
        continuesBefore: range.startDate < weekStart,
        continuesAfter: range.endDate > weekEnd,
        hasCompletion: entries.some(
          (entry) => entry.itemId === item.id && entry.entryDate >= startDate && entry.entryDate <= endDate,
        ),
      } satisfies ScheduleCalendarSegment;
    });
}

function ScheduleCalendar({
  items,
  entries,
  today,
  onCompleteTask,
  onEdit,
  onConvertTask,
  onArchive,
  onUpdateProject,
  onCreate,
}: {
  items: ScheduleItem[];
  entries: ScheduleEntry[];
  today: string;
  onCompleteTask: (item: ScheduleItem) => void;
  onEdit: (item: ScheduleItem) => void;
  onConvertTask: (item: ScheduleItem) => void;
  onArchive: (item: ScheduleItem) => void;
  onUpdateProject: (item: ScheduleItem) => void;
  onCreate: () => void;
}) {
  const [month, setMonth] = useState(() => {
    const date = parseDate(today);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);
  const firstOffset = (month.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), index - firstOffset + 1);
    return { value: toLocalDate(date), number: date.getDate(), muted: date.getMonth() !== month.getMonth() };
  });
  const weeks = Array.from({ length: 6 }, (_, weekIndex) => cells.slice(weekIndex * 7, weekIndex * 7 + 7));
  const parentIdsWithStages = new Set(
    items.filter((item) => item.kind === "project" && item.parentItemId).map((item) => item.parentItemId),
  );
  const calendarItems = items.filter(
    (item) => !(item.kind === "project" && !item.parentItemId && parentIdsWithStages.has(item.id)),
  );
  const colorGroupIds = Array.from(new Set(
    [...items]
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
      .map((item) => item.parentItemId ?? item.id),
  ));
  const eventColorByGroupId = new Map(
    colorGroupIds.map((groupId, index) => [groupId, SCHEDULE_EVENT_COLORS[index % SCHEDULE_EVENT_COLORS.length]]),
  );

  const selectedItems = scheduleItemsRelevantForDate(calendarItems, entries, today, selected);
  const selectedEntries = entries.filter((entry) => entry.entryDate === selected);

  return (
    <section className="schedule-calendar-view">
      <div className="schedule-calendar-card">
        <div className="schedule-calendar-toolbar"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><div><small>MY COORDINATES</small><strong>{month.getFullYear()} 年 {month.getMonth() + 1} 月</strong></div><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></div>
        <div className="schedule-weekdays">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="schedule-month-grid">
          {weeks.map((weekCells, weekIndex) => {
            const segments = buildScheduleWeekSegments(calendarItems, entries, today, weekCells);
            const eventLanes = Math.max(1, ...segments.map((segment) => segment.lane + 1));
            return (
              <div
                className="schedule-week-row"
                key={weekCells[0].value}
                style={{ "--schedule-event-lanes": eventLanes } as React.CSSProperties}
              >
                <div className="schedule-week-days">
                  {weekCells.map((cell) => (
                    <button
                      key={cell.value}
                      type="button"
                      className={`${cell.muted ? "muted" : ""} ${cell.value === today ? "today" : ""} ${cell.value === selected ? "selected" : ""}`}
                      onClick={() => setSelected(cell.value)}
                      aria-label={formatLongDay(cell.value)}
                    >
                      <span>{cell.number}</span>
                    </button>
                  ))}
                </div>
                <div className="schedule-week-events" aria-label={`第 ${weekIndex + 1} 周日程`}>
                  {segments.map((segment) => (
                    <button
                      key={`${segment.item.id}-${segment.startDate}`}
                      type="button"
                      className={`schedule-event-bar ${segment.item.kind} ${segment.item.repeatDaily ? "repeat-daily" : ""} priority-${segment.item.priority} ${segment.hasCompletion ? "has-completion" : ""} ${segment.continuesBefore ? "continues-before" : ""} ${segment.continuesAfter ? "continues-after" : ""}`}
                      style={{
                        gridColumn: `${segment.startColumn + 1} / ${segment.endColumn + 2}`,
                        gridRow: segment.lane + 1,
                        backgroundColor: eventColorByGroupId.get(segment.item.parentItemId ?? segment.item.id) ?? SCHEDULE_EVENT_COLORS[0],
                      }}
                      onClick={() => setSelected(segment.startDate)}
                      title={segment.item.repeatDaily ? `${segment.item.title} · ${formatDay(segment.startDate)}` : `${segment.item.title} · ${formatDay(segment.startDate)} 至 ${formatDay(segment.endDate)}`}
                      aria-label={segment.item.repeatDaily ? `每日事项：${segment.item.title}，${formatDay(segment.startDate)}` : `${segment.item.kind === "project" ? "项目" : "事项"}：${segment.item.title}，${formatDay(segment.startDate)}至${formatDay(segment.endDate)}`}
                    >
                      <span>{segment.item.title}</span>
                      {segment.hasCompletion ? <i aria-hidden="true">✓</i> : null}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <aside className="schedule-day-detail">
        <p>{selected === today ? "TODAY" : "DAY RECORD"}</p>
        <h2>{formatLongDay(selected)}</h2>
        {selectedItems.length === 0 ? <div className="schedule-day-empty"><span>·</span><strong>这一天很轻</strong><small>没有事项或项目记录</small><button type="button" onClick={onCreate}>添加事项</button></div> : <div className="schedule-day-items">{selectedItems.map((item) => {
          const entry = selectedEntries.find((record) => record.itemId === item.id);
          const canActToday = selected === today && item.status === "active";
          return <article key={item.id}>
            {item.kind === "task" ? (
              <button
                type="button"
                className={`schedule-item-check ${entry ? "done" : ""}`}
                onClick={() => canActToday && !entry && onCompleteTask(item)}
                disabled={!canActToday || Boolean(entry)}
                aria-label={entry ? `${item.title}已完成` : canActToday ? `完成${item.title}` : `${item.title}当前不可完成`}
                title={entry ? "已完成" : canActToday ? "点击完成" : "只能完成今天的事项"}
              >{entry ? "✓" : ""}</button>
            ) : (
              <span className={`schedule-item-status ${entry ? "done" : ""}`}>{entry ? "✓" : "◇"}</span>
            )}
            <div><small>{item.parentItemId ? `项目阶段 · ${item.parentTitle ?? "大项目"}` : item.kind === "project" ? "项目" : item.repeatDaily ? "每日事项" : "一次事项"}</small><ScheduleCollaborationMeta item={item} /><strong>{item.title}</strong>{entry?.note && <p>“{entry.note}” · {entry.actorUsername}</p>}</div>
            {item.kind === "project" && <em>{entry?.progress ?? item.progress}%</em>}
            <div className="schedule-day-item-actions">
              {item.kind === "project" && canActToday && <button type="button" className="primary" onClick={() => onUpdateProject(item)}>记录推进</button>}
              {item.isOwner && <details className="schedule-item-more">
                <summary aria-label={`${item.title}的更多操作`}>更多</summary>
                <div className="schedule-item-more-menu">
                  <button type="button" onClick={() => onEdit(item)}>编辑</button>
                  {item.kind === "task" && <button type="button" onClick={() => onConvertTask(item)}>转为项目</button>}
                  <button type="button" className="danger" onClick={() => onArchive(item)}>结束</button>
                </div>
              </details>}
            </div>
          </article>;
        })}</div>}
      </aside>
    </section>
  );
}
