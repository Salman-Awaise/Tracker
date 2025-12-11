import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Bell,
  Clock,
  Plus,
  CheckCircle2,
  ListTodo,
  Settings,
  PenSquare,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  X,
  Filter,
  FileText,
  Activity,
  Target,
  Play,
  Pause,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Switch } from "./components/ui/switch";
import { Slider } from "./components/ui/slider";

// utility functions
function daysUntil(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const ms = d.setHours(23, 59, 59, 999) - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function truncateWords(text = "", n = 22) {
  const words = text.trim().split(/\s+/);
  if (words.length <= n) return text.trim();
  return words.slice(0, n).join(" ") + "…";
}

function generateAISummary(task) {
  const dleft = daysUntil(task.due);
  const duePhrase =
    dleft <= 0 ? "due today" : dleft === 1 ? "due tomorrow" : `due in ${dleft} days`;
  const core = `${task.title} for ${task.course}, ${duePhrase}.`;
  const workload = `~${task.estimate}h (${Math.max(
    0,
    100 - (task.progress || 0)
  )}% remaining).`;
  const hint = task.notes
    ? `Focus: ${truncateWords(task.notes, 12)}`
    : "Plan 1–2 short sessions.";
  return `${core} ${workload} ${hint}`;
}

// stress level calculation
function computeStressLevel(tasks) {
  const soonTasks = tasks.filter(
    (t) => daysUntil(t.due) <= 3 && (t.progress || 0) < 100
  );
  const remainingHours = soonTasks.reduce(
    (sum, t) => sum + t.estimate * (1 - (t.progress || 0) / 100),
    0
  );

  let level = "Low";
  let color = "bg-emerald-100 text-emerald-800";
  let barColor = "bg-emerald-500";

  if (soonTasks.length >= 4 || remainingHours >= 10) {
    level = "High";
    color = "bg-rose-100 text-rose-800";
    barColor = "bg-rose-500";
  } else if (soonTasks.length >= 2 || remainingHours >= 5) {
    level = "Moderate";
    color = "bg-amber-100 text-amber-800";
    barColor = "bg-amber-500";
  }

  const description =
    level === "Low"
      ? "You have some breathing room. This is a good time to make steady progress without rushing."
      : level === "Moderate"
      ? "There are a few near-term deadlines. Spreading work across the next couple of days can keep things manageable."
      : "Several tasks are clustered in the next few days. Re-prioritizing or breaking work into smaller blocks could reduce last-minute stress.";

  return {
    level,
    chipClass: color,
    barClass: barColor,
    soonCount: soonTasks.length,
    remainingHours: Math.max(0, Math.round(remainingHours)),
    description,
  };
}

// cognitive load heatmap
function computeWeekLoad(tasks) {
  const today = new Date();
  const days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const key = d.toDateString();

    const remaining = tasks.reduce((sum, t) => {
      const due = new Date(t.due);
      if (due.toDateString() === key && (t.progress || 0) < 100) {
        const remainingHours = t.estimate * (1 - (t.progress || 0) / 100);
        return sum + remainingHours;
      }
      return sum;
    }, 0);

    days.push({ label, remaining });
  }

  const max = days.reduce((m, d) => (d.remaining > m ? d.remaining : m), 0) || 1;

  return days.map((d) => ({
    ...d,
    intensity: d.remaining / max,
  }));
}

function getDifficulty(task) {
  const remainingHours = task.estimate * (1 - (task.progress || 0) / 100);
  if (remainingHours >= 4) return "High";
  if (remainingHours >= 2) return "Medium";
  return "Low";
}

// next best action feature
function computeNextBestTask(tasks) {
  const incomplete = tasks.filter((t) => (t.progress || 0) < 100);
  if (incomplete.length === 0) return null;

  const priorityWeight = { high: 3, medium: 2, low: 1 };

  const sorted = [...incomplete].sort((a, b) => {
    const pa = priorityWeight[a.priority] || 1;
    const pb = priorityWeight[b.priority] || 1;
    if (pa !== pb) return pb - pa;
    const da = daysUntil(a.due);
    const db = daysUntil(b.due);
    if (da !== db) return da - db;
    const ra = a.estimate * (1 - (a.progress || 0) / 100);
    const rb = b.estimate * (1 - (b.progress || 0) / 100);
    return rb - ra;
  });

  const task = sorted[0];
  const remainingHours = task.estimate * (1 - (task.progress || 0) / 100);
  const suggestedMinutes = Math.max(25, Math.min(Math.round(remainingHours * 60), 90));
  const dleft = daysUntil(task.due);
  const difficulty = getDifficulty(task);

  const message = `Spend about ${suggestedMinutes} minutes on this now. It's due in ${dleft} day${
    dleft === 1 ? "" : "s"
  }, and it has enough remaining work to noticeably reduce your weekly load.`;

  return { task, suggestedMinutes, difficulty, message };
}

function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const MOCK_TASKS = [
  {
    id: "t1",
    title: "CS5800 – Problem Set 3",
    course: "Algorithms",
    due: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    estimate: 6,
    progress: 30,
    priority: "high",
    notes: "Focus DP #4–6; re-derive recurrence before coding.",
  },
  {
    id: "t2",
    title: "NLP – Mini Report",
    course: "NLP",
    due: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString(),
    estimate: 3,
    progress: 10,
    priority: "medium",
    notes: "Summarize attention variants; add 2 citations.",
  },
  {
    id: "t3",
    title: "Data Viz – Draft Slides",
    course: "Data Visualization",
    due: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
    estimate: 5,
    progress: 0,
    priority: "low",
    notes: "Story arc + 3 charts; keep colorblind-safe.",
  },
];

// main component
export default function TrackerPrototype() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tracker-theme") || "light";
    }
    return "light";
  });

  const [view, setView] = useState("home");
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [query, setQuery] = useState("");
  const [filterUrgent, setFilterUrgent] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showNudge, setShowNudge] = useState(false);

  const [focusTask, setFocusTask] = useState(null);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tracker-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    const urgent = tasks.find((t) => daysUntil(t.due) <= 3 && t.progress < 50);
    const timer = setTimeout(() => setShowNudge(Boolean(urgent)), 500);
    return () => clearTimeout(timer);
  }, [tasks]);

  // focus timer tick
  useEffect(() => {
    if (!focusRunning || !focusTask) return;
    const id = setInterval(() => {
      setFocusSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [focusRunning, focusTask]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return tasks.filter(
      (t) =>
        (!filterUrgent || daysUntil(t.due) <= 3) &&
        (t.title.toLowerCase().includes(q) || t.course.toLowerCase().includes(q))
    );
  }, [tasks, query, filterUrgent]);

  const totalHoursThisWeek = useMemo(
    () => tasks.reduce((s, t) => s + t.estimate * (1 - t.progress / 100), 0),
    [tasks]
  );

  const stress = useMemo(() => computeStressLevel(tasks), [tasks]);
  const weekLoad = useMemo(() => computeWeekLoad(tasks), [tasks]);
  const nextBest = useMemo(() => computeNextBestTask(tasks), [tasks]);

  const startFocusFromSuggestion = (payload) => {
    if (!payload || !payload.task) return;
    setFocusTask(payload.task);
    setFocusSeconds((payload.suggestedMinutes || 25) * 60);
    setFocusRunning(true);
    setView("focus");
  };

  const exitFocusMode = () => {
    setFocusRunning(false);
    setView("home");
  };

  return (
    <div
      className={cn(
        "w-full min-h-screen flex justify-center transition-colors",
        theme === "dark" ? "bg-slate-900 text-slate-50" : "bg-slate-50 text-slate-900"
      )}
    >
      <div
        className={cn(
          "w-full max-w-md min-h-screen shadow-sm border flex flex-col",
          theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
        )}
      >
        <Header
          onBack={selected ? () => setSelected(null) : undefined}
          theme={theme}
          onToggleTheme={() =>
            setTheme((t) => (t === "dark" ? "light" : "dark"))
          }
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4">
          <AnimatePresence mode="wait">
            {selected ? (
              <TaskDetails
                key="details"
                task={selected}
                onClose={() => setSelected(null)}
                onSave={(updates) => {
                  setTasks((prev) =>
                    prev.map((t) => (t.id === selected.id ? { ...t, ...updates } : t))
                  );
                  setSelected(null);
                }}
              />
            ) : view === "home" ? (
              <HomeView
                key="home"
                tasks={filtered}
                query={query}
                setQuery={setQuery}
                filterUrgent={filterUrgent}
                setFilterUrgent={setFilterUrgent}
                onOpenTask={setSelected}
                totalHoursThisWeek={totalHoursThisWeek}
                showNudge={showNudge}
                onDismissNudge={() => setShowNudge(false)}
                stress={stress}
                weekLoad={weekLoad}
                nextBest={nextBest}
                onStartFocus={startFocusFromSuggestion}
              />
            ) : view === "focus" ? (
              <FocusView
                key="focus"
                task={focusTask}
                seconds={focusSeconds}
                isRunning={focusRunning}
                onToggleRunning={() => setFocusRunning((v) => !v)}
                onExit={exitFocusMode}
              />
            ) : view === "weekly" ? (
              <Weekly key="weekly" tasks={tasks} />
            ) : view === "add" ? (
              <AddTask
                key="add"
                onAdd={(t) => {
                  setTasks((prev) => [{ ...t, id: `t${prev.length + 1}` }, ...prev]);
                  setView("home");
                }}
              />
            ) : (
              <Profile key="profile" />
            )}
          </AnimatePresence>
        </main>

        <BottomNav view={view} setView={setView} />
      </div>
    </div>
  );
}

// header component
function Header({ onBack, theme, onToggleTheme }) {
  return (
    <div className="sticky top-0 z-20 bg-transparent">
      <div className="px-4 py-3 flex items-center gap-2 rounded-b-2xl bg-white/90 backdrop-blur border-b border-slate-200">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="rounded-2xl px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <div className="h-8 w-8 rounded-2xl bg-slate-100 grid place-items-center">
            <ListTodo className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-base font-semibold">Tracker</h1>
          <p className="text-xs text-slate-500">Plan earlier. Stress less.</p>
        </div>
        <Button
          variant="ghost"
          className="rounded-2xl px-2"
          onClick={onToggleTheme}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" className="rounded-2xl px-2">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// home view
function HomeView({
  tasks,
  query,
  setQuery,
  filterUrgent,
  setFilterUrgent,
  onOpenTask,
  totalHoursThisWeek,
  showNudge,
  onDismissNudge,
  stress,
  weekLoad,
  nextBest,
  onStartFocus,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
    >
      <AIHintBanner />

      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" /> Weekly Remaining Effort
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-semibold">
            {Math.max(0, Math.round(totalHoursThisWeek))} hrs
          </div>
          <p className="text-xs text-slate-500">
            Based on your estimates &amp; progress.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-3">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">
              Current stress level
            </CardTitle>
          </div>
          <span
            className={cn(
              "text-[11px] px-2 py-1 rounded-full font-medium",
              stress.chipClass
            )}
          >
            {stress.level}
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mb-2">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", stress.barClass)}
                style={{
                  width:
                    stress.level === "Low"
                      ? "30%"
                      : stress.level === "Moderate"
                      ? "65%"
                      : "95%",
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>
                {stress.soonCount} task{stress.soonCount !== 1 ? "s" : ""} in the
                next 3 days
              </span>
              <span>~{stress.remainingHours}h near-term work</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mb-3">{stress.description}</p>

          <div>
            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
              <span>Load this week</span>
              <span>Higher bars = heavier days</span>
            </div>

            <div className="flex items-end gap-1 h-16">
              {weekLoad.map((d) => (
                <div
                  key={d.label}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div className="w-full h-10 rounded-full bg-slate-100 overflow-hidden flex items-end">
                    <div
                      className={cn(
                        "w-full rounded-full",
                        d.remaining === 0
                          ? "bg-slate-200"
                          : stress.level === "High"
                          ? "bg-rose-400"
                          : stress.level === "Moderate"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      )}
                      style={{
                        height: `${Math.max(12, d.intensity * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {d.label[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {nextBest && (
        <NextBestActionCard
          data={nextBest}
          onStartFocus={() => onStartFocus(nextBest)}
        />
      )}

      <div className="flex items-center gap-2 mb-2 mt-3">
        <div className="flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search course or task…"
            className="rounded-2xl"
          />
        </div>
        <Button
          variant={filterUrgent ? "default" : "outline"}
          onClick={() => setFilterUrgent((v) => !v)}
          className="rounded-2xl"
        >
          <Filter className="h-4 w-4 mr-2" /> Urgent
        </Button>
      </div>

      <AnimatePresence>
        {showNudge && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-3">
              <div className="mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <div className="font-medium">AI Nudge</div>
                <div className="text-slate-600">
                  Start your most urgent task today to avoid a last-minute crunch. I
                  can split it into 2 × 1.5h blocks.
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" className="rounded-2xl">
                  Split
                </Button>
                <Button size="sm" className="rounded-2xl">
                  Start
                </Button>
                <button
                  onClick={onDismissNudge}
                  className="ml-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onOpen={() => onOpenTask(t)} />
        ))}
        {tasks.length === 0 && <EmptyState />}
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-slate-200 p-6 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 grid place-items-center mb-2">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="font-medium">No tasks match your filters</div>
      <div className="text-sm text-slate-500">
        Try clearing search or turn off the urgent filter.
      </div>
    </div>
  );
}

// next best action card
function NextBestActionCard({ data, onStartFocus }) {
  const { task, suggestedMinutes, difficulty, message } = data;

  return (
    <Card className="mb-3 border-slate-200">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          <CardTitle className="text-sm font-medium">Next best action</CardTitle>
        </div>
        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-900 text-white">
          {difficulty} difficulty
        </span>
      </CardHeader>
      <CardContent className="pt-0 text-sm">
        <div className="font-semibold mb-1">{task.title}</div>
        <p className="text-slate-500 text-xs mb-3">{message}</p>
        <Button
          className="rounded-2xl text-xs px-3 py-1.5"
          size="sm"
          onClick={onStartFocus}
        >
          Start {suggestedMinutes}-minute focus
        </Button>
      </CardContent>
    </Card>
  );
}

// task card
function TaskCard({ task, onOpen }) {
  const dleft = daysUntil(task.due);
  const urgency =
    dleft <= 0
      ? "Due today"
      : dleft === 1
      ? "Due tomorrow"
      : dleft <= 7
      ? `In ${dleft} days`
      : `In ${dleft} days`;
  const remainingPct = Math.max(0, 100 - task.progress);
  const remainingHours = Math.max(
    0,
    Math.round(task.estimate * (remainingPct / 100))
  );

  return (
    <Card
      className="rounded-2xl hover:shadow-sm transition-shadow cursor-pointer"
      onClick={onOpen}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-100 grid place-items-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{task.title}</h3>
              {task.priority === "high" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  High
                </span>
              )}
              {task.priority === "medium" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  Medium
                </span>
              )}
              {task.priority === "low" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Low
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <Clock className="h-3 w-3" /> <span>{task.estimate}h est.</span>
              <span>•</span>
              <Bell className="h-3 w-3" /> <span>{urgency}</span>
            </div>

            <div className="mt-2 text-xs text-slate-700 space-y-0.5">
              <p>
                Due in{" "}
                <span className="font-medium">
                  {dleft <= 0 ? "0 days" : `${dleft} day${dleft === 1 ? "" : "s"}`}
                </span>
                . ~
                <span className="font-medium">
                  {remainingHours}h left ({remainingPct}%)
                </span>
                .
              </p>
              {task.notes && (
                <p>
                  <span className="font-medium">Focus:</span>{" "}
                  {truncateWords(task.notes, 18)}
                </p>
              )}
            </div>

            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-900"
                  style={{ width: `${remainingPct}%` }}
                />
              </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>Time Req</span>
                <span>{remainingPct}% remaining</span>
              </div>
            </div>
          </div>
          <CheckCircle2
            className={cn(
              "h-5 w-5",
              task.progress >= 100 ? "text-emerald-500" : "text-slate-300"
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// focus mode logic
function FocusView({ task, seconds, isRunning, onToggleRunning, onExit }) {
  const displayTime = formatSeconds(seconds || 0);
  const title = task ? task.title : "No task selected";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader className="pb-2 flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" /> Focus Mode
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="rounded-2xl text-xs"
            onClick={onExit}
          >
            Exit focus
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-slate-500 mb-4">
            Single-task view for <span className="font-medium">{title}</span>.
            Other details are tucked away so you can finish one clear block.
          </p>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-40 w-40 rounded-full border-4 border-slate-900 grid place-items-center">
              <span className="text-2xl font-semibold">{displayTime}</span>
            </div>
            <div className="flex gap-2">
              <Button
                className="rounded-2xl px-4"
                onClick={onToggleRunning}
                disabled={!task}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" /> Start
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Timer is local to this prototype. The main idea is to provide a quiet,
            time-boxed block so the assignment feels smaller and more contained.
          </p>
        </CardContent>
      </Card>

      {task && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Working on</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm font-medium mb-1">{task.title}</div>
            <p className="text-xs text-slate-500 mb-1">{task.course}</p>
            {task.notes && (
              <p className="text-xs text-slate-600">
                <span className="font-medium">Focus for this block: </span>
                {truncateWords(task.notes, 22)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-slate-500">
        You can still adjust the details from the task page later. Right now the
        interface is intentionally minimal—just you and one assignment for about a
        25–50 minute block.
      </p>
    </motion.div>
  );
}

// task details view
function TaskDetails({ task, onClose, onSave }) {
  const [title, setTitle] = useState(task.title);
  const [estimate, setEstimate] = useState(task.estimate);
  const [progress, setProgress] = useState(task.progress);
  const [notes, setNotes] = useState(task.notes || "");
  const [remind, setRemind] = useState(true);

  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);

  const dleft = daysUntil(task.due);

  const handleSummarize = () => {
    setSummarizing(true);
    setTimeout(() => {
      const s = generateAISummary({
        ...task,
        title,
        estimate,
        progress,
        notes,
      });
      setSummary(s);
      setSummarizing(false);
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
    >
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PenSquare className="h-4 w-4" /> Edit Task
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-2xl"
          />
          <div>
            <div className="text-xs mb-1">Estimate (hours)</div>
            <Slider
              value={[estimate]}
              onValueChange={(v) => setEstimate(v[0])}
              min={1}
              max={12}
              step={1}
            />
          </div>
          <div>
            <div className="text-xs mb-1">Progress: {progress}%</div>
            <Slider
              value={[progress]}
              onValueChange={(v) => setProgress(v[0])}
              min={0}
              max={100}
              step={5}
            />
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes…"
            className="rounded-2xl"
          />
          <div className="flex items-center justify-between">
            <div className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" /> Smart reminder
            </div>
            <Switch checked={remind} onCheckedChange={setRemind} />
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4" />
              <div className="text-sm font-medium">AI Summary</div>
              <div className="ml-auto">
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={handleSummarize}
                  disabled={summarizing}
                >
                  {summarizing ? "Summarizing…" : "Summarize"}
                </Button>
              </div>
            </div>
            <div
              className={cn(
                "text-sm",
                summary
                  ? "text-slate-700"
                  : summarizing
                  ? "text-slate-400 animate-pulse"
                  : "text-slate-500"
              )}
            >
              {summary ||
                (summarizing
                  ? "Thinking about your task…"
                  : "Click Summarize to generate a brief description.")}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <div className="font-medium mb-1 flex items-center gap-2">
              <Sparkles className="h-3 w-3" /> AI Tip
            </div>
            {dleft <= 3 ? (
              <div>
                Split into{" "}
                <strong>
                  2×{Math.max(1, Math.ceil((100 - progress) / 50))}h
                </strong>{" "}
                blocks today and tomorrow. I'll nudge you at 6pm.
              </div>
            ) : (
              <div>
                Block <strong>90 mins</strong> this week to get momentum. Progress
                beats perfection.
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              className="rounded-2xl flex-1"
              onClick={() => onSave({ title, estimate, progress, notes })}
            >
              Save
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// weekly view
function Weekly({ tasks }) {
  const buckets = useMemo(() => {
    const map = { "Today/1d": [], "2–3d": [], "4–7d": [], ">1w": [] };
    tasks.forEach((t) => {
      const d = daysUntil(t.due);
      if (d <= 1) map["Today/1d"].push(t);
      else if (d <= 3) map["2–3d"].push(t);
      else if (d <= 7) map["4–7d"].push(t);
      else map[">1w"].push(t);
    });
    return map;
  }, [tasks]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="space-y-3"
    >
      {Object.entries(buckets).map(([label, list]) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{label}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {list.length === 0 && (
              <div className="text-xs text-slate-500">No items</div>
            )}
            {list.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="text-sm font-medium">{t.title}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3" /> {t.estimate}h est. •{" "}
                  {Math.max(0, 100 - t.progress)}% remaining
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
}

// add task form
function AddTask({ onAdd }) {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [due, setDue] = useState("");
  const [estimate, setEstimate] = useState(2);
  const [priority, setPriority] = useState("medium");
  const [notes, setNotes] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Task
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g., CS5800 – PS3)"
            className="rounded-2xl"
          />
          <Input
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="Course (e.g., Algorithms)"
            className="rounded-2xl"
          />
          <Input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="rounded-2xl"
          />
          <div>
            <div className="text-xs mb-1">Estimate (hours)</div>
            <Slider
              value={[estimate]}
              onValueChange={(v) => setEstimate(v[0])}
              min={1}
              max={12}
              step={1}
            />
          </div>
          <div className="text-xs">Priority</div>
          <div className="flex gap-2">
            {["low", "medium", "high"].map((p) => (
              <Button
                key={p}
                variant={priority === p ? "default" : "outline"}
                className="rounded-2xl"
                onClick={() => setPriority(p)}
              >
                {p[0].toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes…"
            className="rounded-2xl"
          />

          <Button
            className="rounded-2xl w-full"
            onClick={() => {
              if (!title || !course || !due) return;
              onAdd({
                title,
                course,
                due: new Date(due).toISOString(),
                estimate,
                progress: 0,
                priority,
                notes,
              });
            }}
          >
            Add Task
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// profile view
function Profile() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="space-y-3"
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" /> Evening nudges (6pm)
            </div>
            <Switch checked={true} onCheckedChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> 25-min focus sessions
            </div>
            <Switch checked={false} onCheckedChange={() => {}} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">About</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-slate-600">
          Static prototype for coursework. Human–AI interaction: proactive nudges,
          visual workload, light personalization. "AI Summary" is generated locally
          without external APIs.
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ai nudge banner
function AIHintBanner() {
  return (
    <div className="mb-3 rounded-2xl bg-slate-900 text-white p-3">
      <div className="text-sm font-medium flex items-center gap-2">
        <Sparkles className="h-4 w-4" /> Adaptive Planner
      </div>
      <div className="text-xs text-slate-300 mt-1">
        Keeps your workload visible, breaks things down, and nudges you before
        crunch time.
      </div>
    </div>
  );
}

// navigation view
function BottomNav({ view, setView }) {
  const Item = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setView(id)}
      className={cn(
        "flex-1 py-2 grid place-items-center rounded-2xl transition-colors",
        view === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      <Icon className="h-5 w-5" />
      <div className="text-[10px] mt-1">{label}</div>
    </button>
  );

  return (
    <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white p-2">
      <div className="grid grid-cols-5 gap-2">
        <Item id="home" icon={ListTodo} label="Home" />
        <Item id="focus" icon={Target} label="Focus" />
        <Item id="weekly" icon={Calendar} label="Weekly" />
        <Item id="add" icon={Plus} label="Add" />
        <Item id="profile" icon={Settings} label="Profile" />
      </div>
    </div>
  );
}
