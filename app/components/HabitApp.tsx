"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
};

type UserSummary = { displayName: string; email: string };

const CHALLENGE_COLORS = ["#e36a44", "#5b8272", "#c49a45"];
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

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
    void loadDashboard();
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
        <a className="brand" href="#top" aria-label="一分小事首页">
          <span className="brand-dot">1′</span>
          <span>一分小事</span>
        </a>
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
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prefill = sessionStorage.getItem("oneminute-prefill");
    if (prefill) {
      setTitle(prefill);
      sessionStorage.removeItem("oneminute-prefill");
    }
  }, []);

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

  useEffect(() => {
    if (!selectedId && challengesWithHistory[0]) setSelectedId(challengesWithHistory[0].id);
  }, [selectedId, challengesWithHistory]);

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
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    setMuted(localStorage.getItem("oneminute-muted") === "true");
  }, []);

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
