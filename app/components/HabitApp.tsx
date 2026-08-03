"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  createdAt: string;
  updatedAt: string;
};

type ScheduleEntry = {
  id: string;
  itemId: string;
  entryDate: string;
  action: "completed" | "touched";
  progress: number | null;
  note: string;
  createdAt: string;
  updatedAt: string;
};

type UserSummary = { displayName: string; email: string };

const CHALLENGE_COLORS = ["#e36a44", "#5b8272", "#c49a45"];
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const PRIORITY_LABELS = { important: "重要", normal: "普通", later: "稍后" } as const;
const PRIORITY_ORDER = { important: 0, normal: 1, later: 2 } as const;

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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "操作没有成功，请稍后再试");
  return result;
}

export function HabitApp({ user }: { user: UserSummary }) {
  const [activeTool, setActiveTool] = useState<"world" | "habit" | "schedule">("world");

  if (activeTool === "habit") {
    return <HabitWorkspace user={user} onBack={() => setActiveTool("world")} />;
  }
  if (activeTool === "schedule") {
    return <ScheduleWorkspace user={user} onBack={() => setActiveTool("world")} />;
  }
  return (
    <WorldWorkbench
      user={user}
      openHabit={() => setActiveTool("habit")}
      openSchedule={() => setActiveTool("schedule")}
    />
  );
}

function HabitWorkspace({ user, onBack }: { user: UserSummary; onBack: () => void }) {
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
    <main className="app-shell">
      <header className="topbar">
        <button className="brand brand-button" onClick={onBack} aria-label="返回木屋工作台">
          <span className="brand-dot">1′</span>
          <span>一分小事</span>
          <small>返回工作台</small>
        </button>
        <div className="account-chip" title={user.email}>
          <span>{user.displayName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.displayName}</strong>
            <a href="/signout-with-chatgpt?return_to=/">退出</a>
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
  today,
  onClose,
  onCompleted,
  onSessionChange,
}: {
  challenge: Challenge;
  existingSession?: TimerSession;
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
  }, [challenge.id, onSessionChange, playTone, today]);

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
  }, [challenge.id, onCompleted, playTone]);

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
        <button
          className="sound-button"
          onClick={() => {
            const next = !muted;
            setMuted(next);
            localStorage.setItem("oneminute-muted", String(next));
          }}
        >{muted ? "静音中" : "声音开"}</button>
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
            ) : (
              <button className="pause-button" onClick={() => void pause()} disabled={Boolean(session?.pauseUsed)}>
                <span>Ⅱ</span>{session?.pauseUsed ? "暂停已使用" : "紧急暂停"}
              </button>
            )}
          </>
        )}
        {error && <p className="timer-error">{error}</p>}
      </div>
      <p className="timer-footnote">倒计时自然结束后，今天的打卡才会完成</p>
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
  openHabit,
  openSchedule,
}: {
  user: UserSummary;
  openHabit: () => void;
  openSchedule: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [room, setRoom] = useState<"foyer" | "work" | "life" | "entertainment">("foyer");
  const [view, setView] = useState({ x: 0, y: 0 });
  const today = toLocalDate();

  const loadDashboard = useCallback(async () => {
    const result = await api<DashboardData>("/api/dashboard");
    setData(result);
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void loadDashboard().catch(() => undefined), 0);
    return () => window.clearTimeout(task);
  }, [loadDashboard]);

  const activeHabits = data?.challenges.filter((item) => item.status === "active") ?? [];
  const activeSchedule = data?.scheduleItems.filter((item) => item.status === "active") ?? [];
  const todayEntries = data?.scheduleEntries.filter((item) => item.entryDate === today) ?? [];
  const touchedProjects = new Set(todayEntries.filter((entry) => entry.action === "touched").map((entry) => entry.itemId));
  const todayDone = todayEntries.filter((entry) => entry.action === "completed").length;
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(today, index - 3));

  function moveView(event: React.PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    setView({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  }

  if (room === "foyer") {
    return (
      <CabinFoyer
        user={user}
        today={today}
        view={view}
        moveView={moveView}
        resetView={() => setView({ x: 0, y: 0 })}
        openRoom={setRoom}
        workSummary={{ habits: activeHabits.length, schedule: activeSchedule.length, done: todayDone }}
      />
    );
  }

  if (room === "life" || room === "entertainment") {
    return (
      <PortalRoom
        user={user}
        category={room}
        links={(data?.portalLinks ?? []).filter((link) => link.category === room)}
        onBack={() => setRoom("foyer")}
        switchRoom={setRoom}
        reload={loadDashboard}
      />
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
        <button className="world-brand room-brand-button" onClick={() => setRoom("foyer")}>
          <span className="world-brand-cube"><i /><i /><i /></span>
          <div><strong>工作间</strong><small>返回木屋玄关</small></div>
        </button>
        <div className="world-date"><span>{formatLongDay(today)}</span><i />炉火正暖，适合专注一会儿</div>
        <RoomSwitcher current="work" openRoom={setRoom} />
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
          <span className="world-object-label"><small>TOOL CHEST</small><strong>工具箱</strong><em>{2} 个工具可以使用</em></span>
        </button>

        <button className="world-object calendar-object" onClick={openSchedule}>
          <span className="object-pulse" />
          <span className="pixel-calendar" aria-hidden="true">
            <span className="calendar-pixel-head"><i /><i /></span>
            <strong>{parseDate(today).getDate()}</strong>
            <small>{parseDate(today).getMonth() + 1} 月</small>
            <span className="calendar-pixel-marks"><i /><i /><i /></span>
          </span>
          <span className="world-object-label align-right"><small>WALL CALENDAR</small><strong>个人日程</strong><em>{activeSchedule.length} 件正在路上</em></span>
        </button>

        <button className="habit-crystal" onClick={openHabit} aria-label="进入一分小事">
          <span className="pixel-hourglass" aria-hidden="true">
            <i className="hourglass-top" />
            <i className="hourglass-glass" />
            <i className="hourglass-sand" />
            <i className="hourglass-bottom" />
            <strong>1′</strong>
          </span>
          <span className="world-object-label"><small>ONE MINUTE</small><strong>一分小事</strong><em>{activeHabits.length} 个习惯坚持中</em></span>
        </button>

        <aside className="world-quest-card">
          <div className="quest-head"><span>今日便笺</span><small>{todayDone} 项已完成</small></div>
          <div className="quest-row"><i className="quest-habit" /><span>长期习惯</span><strong>{activeHabits.length}</strong></div>
          <div className="quest-row"><i className="quest-task" /><span>短线事项</span><strong>{activeSchedule.filter((item) => item.kind === "task").length}</strong></div>
          <div className="quest-row"><i className="quest-project" /><span>今日推进项目</span><strong>{touchedProjects.size}</strong></div>
        </aside>

        <aside className="world-mini-calendar">
          <p>本周日历</p>
          <div>
            {weekDates.map((date) => (
              <button key={date} className={date === today ? "current" : ""} onClick={openSchedule}>
                <small>{["日", "一", "二", "三", "四", "五", "六"][parseDate(date).getDay()]}</small>
                <strong>{parseDate(date).getDate()}</strong>
                <i className={data?.scheduleEntries.some((entry) => entry.entryDate === date) ? "has-entry" : ""} />
              </button>
            ))}
          </div>
        </aside>
      </section>

      <nav className="world-dock" aria-label="快速进入工具">
        <button onClick={openHabit}><span className="dock-habit">1′</span><div><small>长期习惯</small><strong>一分小事</strong></div></button>
        <i />
        <button onClick={openSchedule}><span className="dock-schedule">▦</span><div><small>短线执行</small><strong>个人日程</strong></div></button>
      </nav>

      {toolsOpen && (
        <div className="world-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setToolsOpen(false)}>
          <section className="tool-library" role="dialog" aria-modal="true" aria-labelledby="tool-library-title">
            <button className="world-modal-close" onClick={() => setToolsOpen(false)} aria-label="关闭">×</button>
            <p>TOOL CHEST · CABIN 01</p>
            <h2 id="tool-library-title">打开木屋工具箱</h2>
            <span className="tool-library-copy">长期的事慢慢生长，眼前的事清楚推进。</span>
            <div className="tool-library-grid">
              <button className="tool-tile habit-tile" onClick={openHabit}>
                <span className="tool-pixel-icon">1′</span>
                <div><small>LONG TERM</small><h3>一分小事</h3><p>用一分钟完成，用二十一天坚持。</p><em>{activeHabits.length} 个习惯进行中 →</em></div>
              </button>
              <button className="tool-tile schedule-tile" onClick={openSchedule}>
                <span className="tool-pixel-icon">▦</span>
                <div><small>SHORT TERM</small><h3>个人日程</h3><p>让事项每天出现，让项目持续向前。</p><em>{activeSchedule.length} 件正在推进 →</em></div>
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

type CabinRoom = "foyer" | "work" | "life" | "entertainment";

function RoomSwitcher({
  current,
  openRoom,
}: {
  current: CabinRoom;
  openRoom: (room: CabinRoom) => void;
}) {
  return (
    <nav className="room-switcher" aria-label="切换木屋房间">
      <button className={current === "foyer" ? "active" : ""} onClick={() => openRoom("foyer")}>玄关</button>
      <button className={current === "work" ? "active" : ""} onClick={() => openRoom("work")}>工作</button>
      <button className={current === "life" ? "active" : ""} onClick={() => openRoom("life")}>生活</button>
      <button className={current === "entertainment" ? "active" : ""} onClick={() => openRoom("entertainment")}>娱乐</button>
    </nav>
  );
}

function CabinFoyer({
  user,
  today,
  view,
  moveView,
  resetView,
  openRoom,
  workSummary,
}: {
  user: UserSummary;
  today: string;
  view: { x: number; y: number };
  moveView: (event: React.PointerEvent<HTMLElement>) => void;
  resetView: () => void;
  openRoom: (room: CabinRoom) => void;
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
        <div className="world-user" title={user.email}>
          <span>{user.displayName.slice(0, 1).toUpperCase()}</span>
          <div><strong>{user.displayName}</strong><a href="/signout-with-chatgpt?return_to=/">退出</a></div>
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
      </nav>
    </main>
  );
}

function PortalRoom({
  user,
  category,
  links,
  onBack,
  switchRoom,
  reload,
}: {
  user: UserSummary;
  category: "life" | "entertainment";
  links: PortalLink[];
  onBack: () => void;
  switchRoom: (room: CabinRoom) => void;
  reload: () => Promise<void>;
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
    <main className={`portal-room ${life ? "life-room" : "entertainment-room"}`}>
      <header className="portal-room-header">
        <button className="portal-back" onClick={onBack}><span>←</span><div><small>返回玄关</small><strong>{copy.title}</strong></div></button>
        <RoomSwitcher current={category} openRoom={switchRoom} />
        <div className="portal-user" title={user.email}><span>{user.displayName.slice(0, 1).toUpperCase()}</span><strong>{user.displayName}</strong></div>
      </header>

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

function ScheduleWorkspace({ user, onBack }: { user: UserSummary; onBack: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<"today" | "calendar" | "projects">("today");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [projectUpdate, setProjectUpdate] = useState<ScheduleItem | null>(null);
  const [toast, setToast] = useState("");
  const today = toLocalDate();

  const load = useCallback(async () => {
    const result = await api<DashboardData>("/api/dashboard");
    setData(result);
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
  const todayEntries = entries.filter((entry) => entry.entryDate === today);
  const touchedIds = new Set(todayEntries.map((entry) => entry.itemId));
  const prioritySort = (a: ScheduleItem, b: ScheduleItem) => {
    const touched = Number(touchedIds.has(a.id)) - Number(touchedIds.has(b.id));
    if (touched !== 0) return touched;
    const priority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priority !== 0) return priority;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return a.dueDate ? -1 : b.dueDate ? 1 : b.createdAt.localeCompare(a.createdAt);
  };
  const activeTasks = items
    .filter((item) => item.kind === "task" && item.status === "active" && item.startDate <= today)
    .sort(prioritySort);
  const completedToday = items.filter(
    (item) => item.kind === "task" && (
      item.completedDate === today || todayEntries.some((entry) => entry.itemId === item.id && entry.action === "completed")
    ),
  );
  const activeProjects = items
    .filter((item) => item.kind === "project" && item.status === "active" && item.startDate <= today)
    .sort(prioritySort);

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

  return (
    <main className="schedule-shell">
      <header className="schedule-header">
        <button className="schedule-back" onClick={onBack}><span>←</span><div><small>返回木屋</small><strong>个人工作台</strong></div></button>
        <nav>
          <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>今日</button>
          <button className={tab === "calendar" ? "active" : ""} onClick={() => setTab("calendar")}>日历</button>
          <button className={tab === "projects" ? "active" : ""} onClick={() => setTab("projects")}>项目</button>
        </nav>
        <div className="schedule-account"><span>{user.displayName.slice(0, 1).toUpperCase()}</span><strong>{user.displayName}</strong></div>
      </header>

      <div className="schedule-wrap">
        <section className="schedule-hero">
          <div><p>{formatLongDay(today)} · SHORT TERM</p><h1>{tab === "today" ? "把今天，整理得刚刚好。" : tab === "calendar" ? "让时间留下清楚的痕迹。" : "每个项目，都往前一点。"}</h1></div>
          <button className="schedule-create" onClick={() => setCreateOpen(true)}><span>＋</span>新建事项或项目</button>
        </section>

        {!data ? (
          <div className="schedule-loading"><i /><p>正在整理今天的地图…</p></div>
        ) : tab === "calendar" ? (
          <ScheduleCalendar items={items} entries={entries} today={today} />
        ) : tab === "projects" ? (
          <ProjectBoard
            projects={items.filter((item) => item.kind === "project")}
            entries={entries}
            today={today}
            onUpdate={setProjectUpdate}
            onEdit={setEditingItem}
            onArchive={(item) => void archiveItem(item)}
          />
        ) : (
          <div className="today-dashboard">
            <section className="today-main-panel">
              <div className="schedule-section-head">
                <div><span className="section-index">01</span><div><small>DAILY TASKS</small><h2>今天的事项</h2></div></div>
                <p>{completedToday.length} / {activeTasks.length + completedToday.filter((item) => !item.repeatDaily).length} 完成</p>
              </div>
              <div className="daily-task-list">
                {activeTasks.length === 0 ? (
                  <button className="schedule-empty" onClick={() => setCreateOpen(true)}><span>＋</span><strong>今天还没有事项</strong><small>添加一件短线任务</small></button>
                ) : activeTasks.map((item) => {
                  const done = todayEntries.some((entry) => entry.itemId === item.id && entry.action === "completed");
                  return (
                    <article className={`daily-task ${done ? "done" : ""}`} key={item.id}>
                      <button className="task-check" onClick={() => !done && void completeTask(item)} disabled={done}>{done ? "✓" : ""}</button>
                      <div className="task-copy"><div><span className={`priority-pill ${item.priority}`}>{PRIORITY_LABELS[item.priority]}</span>{item.repeatDaily && <span className="repeat-pill">每日重复</span>}</div><h3>{item.title}</h3>{item.note && <p>{item.note}</p>}</div>
                      <div className="task-meta"><small>{item.repeatDaily ? "今天的一次" : `计划于 ${formatDay(item.startDate)}`}</small><button onClick={() => setEditingItem(item)}>编辑</button><button onClick={() => void archiveItem(item)}>结束</button></div>
                    </article>
                  );
                })}
              </div>

              {completedToday.length > 0 && (
                <div className="completed-fold"><p>今天已完成</p>{completedToday.map((item) => <span key={item.id}>✓ {item.title}</span>)}</div>
              )}
            </section>

            <aside className="today-side-panel">
              <div className="schedule-section-head compact"><div><span className="section-index">02</span><div><small>PROJECTS</small><h2>持续推进</h2></div></div><button onClick={() => setTab("projects")}>全部</button></div>
              <div className="today-project-list">
                {activeProjects.length === 0 ? (
                  <button className="project-empty" onClick={() => setCreateOpen(true)}>创建第一个项目 →</button>
                ) : activeProjects.map((project) => {
                  const touched = touchedIds.has(project.id);
                  return (
                    <button className={`today-project ${touched ? "touched" : ""}`} key={project.id} onClick={() => setProjectUpdate(project)}>
                      <div><span className={`priority-dot ${project.priority}`} /><small>{touched ? "今日已推进" : project.dueDate ? `截止 ${formatDay(project.dueDate)}` : "持续项目"}</small><strong>{project.title}</strong></div>
                      <span className="project-ring" style={{ "--project-progress": `${project.progress * 3.6}deg` } as React.CSSProperties}><em>{project.progress}%</em></span>
                    </button>
                  );
                })}
              </div>
              <div className="daily-quote"><span>“</span><p>长期的事，不必今天完成。<br />但可以今天推进。</p></div>
            </aside>
          </div>
        )}
      </div>

      {createOpen && <ScheduleItemModal today={today} onClose={() => setCreateOpen(false)} onSaved={async () => { setCreateOpen(false); setToast("已经放进你的工作台"); await load(); }} />}
      {editingItem && <ScheduleItemModal today={today} item={editingItem} onClose={() => setEditingItem(null)} onSaved={async () => { setEditingItem(null); setToast("调整已保存"); await load(); }} />}
      {projectUpdate && <ProjectUpdateModal project={projectUpdate} today={today} onClose={() => setProjectUpdate(null)} onSaved={async () => { setProjectUpdate(null); setToast("今天的推进已记录"); await load(); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function ScheduleItemModal({
  today,
  item,
  onClose,
  onSaved,
}: {
  today: string;
  item?: ScheduleItem;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api(item ? `/api/schedule/items/${item.id}` : "/api/schedule/items", {
        method: item ? "PATCH" : "POST",
        body: JSON.stringify({ action: item ? "update" : undefined, kind, title, note, priority, repeatDaily, startDate, dueDate }),
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
        {!item && <div className="kind-switch"><button className={kind === "task" ? "active" : ""} onClick={() => setKind("task")}><span>✓</span><div><strong>普通事项</strong><small>一次完成，或每天重复</small></div></button><button className={kind === "project" ? "active" : ""} onClick={() => setKind("project")}><span>▰</span><div><strong>持续项目</strong><small>每天推进一点百分比</small></div></button></div>}
        <form onSubmit={save}>
          <label htmlFor="schedule-title">{kind === "project" ? "项目名称" : "事项名称"}</label>
          <input id="schedule-title" autoFocus maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "project" ? "例如：完成个人网站" : "例如：早上查看邮件"} />
          <div className="form-grid">
            <div><label htmlFor="schedule-start">开始日期</label><input id="schedule-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={Boolean(item)} /></div>
            {kind === "project" && <div><label htmlFor="schedule-due">截止日期（可选）</label><input id="schedule-due" type="date" min={startDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>}
          </div>
          {kind === "task" && <label className="repeat-toggle"><input type="checkbox" checked={repeatDaily} onChange={(event) => setRepeatDaily(event.target.checked)} /><span /><div><strong>每天重复</strong><small>每天生成独立记录，昨天没完成也不会堆到今天</small></div></label>}
          <fieldset className="priority-field"><legend>优先级</legend><div>{(["important", "normal", "later"] as const).map((value) => <button type="button" className={`${value} ${priority === value ? "active" : ""}`} key={value} onClick={() => setPriority(value)}><i />{PRIORITY_LABELS[value]}</button>)}</div></fieldset>
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
  today,
  onClose,
  onSaved,
}: {
  project: ScheduleItem;
  today: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [progress, setProgress] = useState(project.progress);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
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
        <h2>今天推进了多少？</h2>
        <p><strong>{project.title}</strong>{project.dueDate ? ` · 截止 ${formatDay(project.dueDate)}` : " · 持续项目"}</p>
        <div className="progress-editor">
          <div className="large-project-ring" style={{ "--project-progress": `${progress * 3.6}deg` } as React.CSSProperties}><span><strong>{progress}</strong><small>%</small></span></div>
          <div><input aria-label="项目进度" type="range" min="0" max="100" step="5" value={progress} onChange={(event) => setProgress(Number(event.target.value))} /><div className="range-labels"><span>刚开始</span><span>完成</span></div></div>
        </div>
        <label htmlFor="project-progress-note">今天处理了什么？（可选）</label>
        <textarea id="project-progress-note" maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：把首页的信息结构理清了。" />
        <p className="progress-hint">即使百分比没有变化，保存后也会标记“今日已推进”。</p>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button full-button" onClick={() => void save()} disabled={saving}>{saving ? "正在记录…" : "记录今天的推进"}</button>
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
}: {
  projects: ScheduleItem[];
  entries: ScheduleEntry[];
  today: string;
  onUpdate: (project: ScheduleItem) => void;
  onEdit: (project: ScheduleItem) => void;
  onArchive: (project: ScheduleItem) => void;
}) {
  const active = projects.filter((project) => project.status === "active");
  const history = projects.filter((project) => project.status !== "active");

  function exportProject(project: ScheduleItem) {
    const logs = entries.filter((entry) => entry.itemId === project.id && entry.note).sort((a, b) => b.entryDate.localeCompare(a.entryDate));
    const text = `# ${project.title}｜项目推进记录\n\n${logs.map((entry) => `## ${formatDay(entry.entryDate)} · ${entry.progress ?? project.progress}%\n\n${entry.note}`).join("\n\n")}`;
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
          const todayEntry = entries.find((entry) => entry.itemId === project.id && entry.entryDate === today);
          const logs = entries.filter((entry) => entry.itemId === project.id && entry.note);
          return (
            <article className={`project-card ${todayEntry ? "touched" : ""}`} key={project.id}>
              <div className="project-card-top"><span className={`priority-pill ${project.priority}`}>{PRIORITY_LABELS[project.priority]}</span><div><button onClick={() => onEdit(project)}>编辑</button><button onClick={() => onArchive(project)}>结束</button></div></div>
              <h3>{project.title}</h3>
              <p>{project.note || "这是一个持续推进的项目。"}</p>
              <div className="project-progress-line"><i style={{ width: `${project.progress}%` }} /><span>{project.progress}%</span></div>
              <div className="project-card-meta"><span>{todayEntry ? "✓ 今日已推进" : project.dueDate ? `截止 ${formatDay(project.dueDate)}` : "没有截止日期"}</span><small>{logs.length} 条推进笔记</small></div>
              {todayEntry?.note && <blockquote>“{todayEntry.note}”</blockquote>}
              <div className="project-card-actions"><button onClick={() => onUpdate(project)}>{todayEntry ? "更新今日进度" : "推进一下"}</button>{logs.length > 0 && <button onClick={() => exportProject(project)}>下载记录</button>}</div>
            </article>
          );
        })}
        {active.length === 0 && <div className="project-board-empty"><span>◇</span><h3>还没有正在推进的项目</h3><p>回到“今日”，创建一个持续项目。</p></div>}
      </div>
      {history.length > 0 && <div className="project-history"><h3>项目历史</h3>{history.map((project) => <div key={project.id}><span>{project.status === "completed" ? "✓" : "—"}</span><strong>{project.title}</strong><small>{project.status === "completed" ? "已完成" : "已结束"}</small><em>{project.progress}%</em></div>)}</div>}
    </section>
  );
}

function ScheduleCalendar({ items, entries, today }: { items: ScheduleItem[]; entries: ScheduleEntry[]; today: string }) {
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

  function relevantForDate(item: ScheduleItem, date: string) {
    if (date < item.startDate || (item.completedDate && date > item.completedDate)) return false;
    if (item.status === "archived" && !entries.some((entry) => entry.itemId === item.id && entry.entryDate === date)) return false;
    if (item.kind === "project") return date <= today;
    if (item.repeatDaily) return date <= today;
    return date >= item.startDate && date <= (item.completedDate ?? today);
  }

  const selectedItems = items.filter((item) => relevantForDate(item, selected));
  const selectedEntries = entries.filter((entry) => entry.entryDate === selected);

  return (
    <section className="schedule-calendar-view">
      <div className="schedule-calendar-card">
        <div className="schedule-calendar-toolbar"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><div><small>MY COORDINATES</small><strong>{month.getFullYear()} 年 {month.getMonth() + 1} 月</strong></div><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></div>
        <div className="schedule-weekdays">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="schedule-month-grid">
          {cells.map((cell) => {
            const dayItems = items.filter((item) => relevantForDate(item, cell.value));
            const dayEntries = entries.filter((entry) => entry.entryDate === cell.value);
            return (
              <button key={cell.value} className={`${cell.muted ? "muted" : ""} ${cell.value === today ? "today" : ""} ${cell.value === selected ? "selected" : ""}`} onClick={() => setSelected(cell.value)}>
                <span>{cell.number}</span>
                <div>{dayItems.slice(0, 3).map((item) => <i key={item.id} className={`${item.kind} ${dayEntries.some((entry) => entry.itemId === item.id) ? "done" : ""}`} />)}</div>
                {dayItems.length > 3 && <small>+{dayItems.length - 3}</small>}
              </button>
            );
          })}
        </div>
      </div>
      <aside className="schedule-day-detail">
        <p>{selected === today ? "TODAY" : "DAY RECORD"}</p>
        <h2>{formatLongDay(selected)}</h2>
        {selectedItems.length === 0 ? <div className="schedule-day-empty"><span>·</span><strong>这一天很轻</strong><small>没有事项或项目记录</small></div> : <div className="schedule-day-items">{selectedItems.map((item) => { const entry = selectedEntries.find((record) => record.itemId === item.id); return <article key={item.id}><span className={entry ? "done" : ""}>{entry ? "✓" : item.kind === "project" ? "◇" : "○"}</span><div><small>{item.kind === "project" ? "项目" : item.repeatDaily ? "每日事项" : "一次事项"}</small><strong>{item.title}</strong>{entry?.note && <p>“{entry.note}”</p>}</div>{item.kind === "project" && <em>{entry?.progress ?? item.progress}%</em>}</article>; })}</div>}
      </aside>
    </section>
  );
}
