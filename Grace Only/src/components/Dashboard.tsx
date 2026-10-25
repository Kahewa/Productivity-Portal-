/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { isSameDay, parseISO, format, startOfToday, startOfWeek, endOfWeek, differenceInDays, isWithinInterval } from 'date-fns';
import {
  Plus,
  Clock,
  ArrowRight,
  Droplets,
  Sparkles,
  Cloud,
  CloudOff,
  RefreshCw,
  ChevronDown,
  Check,
  X,
  ListTodo,
  FolderKanban,
  AlertTriangle,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { SyncStatus } from '../services/firebaseSyncService';
import { UserData, PeriodData, DayOfWeek, Task, ThemeColor, ProjectStatus } from '../types';
import { buildHealthReport, HealthStatus } from '../utils/accountability';
import { projectProgress, projectHealth, nearestDeadline, getUrgency, dueLabel, URGENCY_META, STATUS_META } from '../utils/projects';
import { THEMES } from '../theme';

export type PageId = 'dashboard' | 'planner' | 'projects' | 'calendar' | 'period';

const DAYS: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Sync status pill (shared with the sidebar) ---
export function SyncBadge({ status, compact = false }: { status: SyncStatus; compact?: boolean }) {
  const map = {
    synced: { icon: <Cloud size={13} className="text-emerald-500" />, label: 'Cloud Saved', tone: 'text-emerald-700' },
    syncing: { icon: <RefreshCw size={13} className="text-amber-500 animate-spin" />, label: 'Syncing...', tone: 'text-amber-700' },
    error: { icon: <CloudOff size={13} className="text-slate-400" />, label: 'Offline Saved', tone: 'text-slate-500' },
    idle: { icon: <Cloud size={13} className="text-slate-400" />, label: 'Cloud Ready', tone: 'text-slate-500' }
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${map.tone}`}
      title={status === 'synced' ? 'All data saved to Firebase cloud' : status === 'syncing' ? 'Syncing data with Firebase...' : 'Using local cache'}
    >
      {map.icon}
      {!compact && <span>{map.label}</span>}
    </span>
  );
}

// --- Chart helpers ---
function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    // Clamp control points between the segment's endpoints so the curve never overshoots (e.g. below zero)
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const c1y = Math.min(hi, Math.max(lo, p1.y + (p2.y - p0.y) / 6));
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = Math.min(hi, Math.max(lo, p2.y - (p3.y - p1.y) / 6));
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function WeeklyBars({ values, max, todayIndex, accent }: { values: number[]; max: number; todayIndex: number; accent: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? todayIndex;

  return (
    <div className="flex-1 min-h-44 flex items-end justify-between gap-2 pt-6">
      {values.map((v, i) => {
        const pct = max > 0 ? (v / max) * 100 : 0;
        const isToday = i === todayIndex;
        return (
          <div
            key={DAYS[i]}
            className="flex-1 h-full flex flex-col items-center justify-end gap-2 cursor-default"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="relative w-full max-w-7 flex-1 flex items-end justify-center rounded-[6px] bg-slate-400/10">
              {active === i && (
                <span className="absolute -top-5 text-[10px] font-bold text-slate-700 whitespace-nowrap">
                  {v}/{max}
                </span>
              )}
              <div
                className="w-full rounded-[6px] transition-all duration-500"
                style={{
                  height: `${pct}%`,
                  background: isToday
                    ? `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 70%, white))`
                    : 'rgba(148, 163, 184, 0.35)',
                  boxShadow: isToday && v > 0 ? `0 10px 20px -8px ${accent}` : undefined
                }}
              />
              {isToday && v === 0 && <div className="absolute inset-0 rounded-[6px] border border-dashed" style={{ borderColor: accent }} />}
            </div>
            <span className={`text-[10px] font-semibold ${isToday ? 'text-slate-900' : 'text-slate-400'}`}>
              {DAYS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DonutRing({ percent, accent }: { percent: number; accent: string }) {
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="12" />
        {percent > 0 && (
          <circle
            cx="50" cy="50" r="38" fill="none"
            stroke={accent} strokeWidth="12" strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${percent} 100`}
            className="transition-all duration-700"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-slate-900">
        {percent}%
      </span>
    </div>
  );
}

interface ChartSeries {
  key: string;
  label: string; // singular-plural noun for the tooltip, e.g. 'tasks'
  values: number[];
  color: string;
}

function ComparisonChart({ series, todayIndex }: { series: ChartSeries[]; todayIndex: number }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? todayIndex;

  const height = 220;
  const pad = { l: 28, r: 16, t: 40, b: 28 };
  const innerW = Math.max(0, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  const maxVal = Math.max(2, ...series.flatMap((s) => s.values));
  const step = innerW / (DAYS.length - 1);

  const x = (i: number) => pad.l + i * step;
  const y = (v: number) => pad.t + innerH - (v / maxVal) * innerH;
  const points = series.map((s) => s.values.map((v, i) => ({ x: x(i), y: y(v) })));
  const gridVals = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="overflow-visible">
          {gridVals.map((g) => (
            <g key={g}>
              <line x1={pad.l} x2={width - pad.r} y1={y(g)} y2={y(g)} stroke="rgba(148,163,184,0.22)" strokeDasharray="3 5" />
              <text x={pad.l - 10} y={y(g) + 3} textAnchor="end" className="fill-slate-400 text-[10px]">{g}</text>
            </g>
          ))}

          {/* crosshair */}
          <line x1={x(active)} x2={x(active)} y1={pad.t - 6} y2={pad.t + innerH} stroke="rgba(148,163,184,0.45)" strokeDasharray="2 4" />

          {/* drawn last-to-first so the first series sits on top */}
          {[...series].reverse().map((s) => {
            const pts = points[series.indexOf(s)];
            return (
              <g key={s.key}>
                <path d={smoothPath(pts)} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" />
                <circle cx={pts[active].x} cy={pts[active].y} r={5} fill={s.color} stroke="white" strokeWidth={2} />
              </g>
            );
          })}

          {DAYS.map((d, i) => (
            <text
              key={d}
              x={x(i)} y={height - 6}
              textAnchor="middle"
              className={`text-[10px] ${i === todayIndex ? 'fill-slate-900 font-semibold' : 'fill-slate-400'}`}
            >
              {d}
            </text>
          ))}

          {/* hit targets wider than the marks */}
          {DAYS.map((d, i) => (
            <rect
              key={`hit-${d}`}
              x={x(i) - step / 2} y={0} width={step} height={height}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
      )}

      {width > 0 && (
        <div
          className="absolute pointer-events-none -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold whitespace-nowrap shadow-lg"
          style={{ left: Math.min(Math.max(x(active), 110), width - 110), top: 0 }}
        >
          {DAYS[active]}
          {series.map((s) => ` · ${s.values[active]} ${s.label}`).join('')}
        </div>
      )}
    </div>
  );
}


// Matches the phase colours used on the Cycle Tracker page
const PHASE_COLORS: Record<string, { from: string; to: string; label: string; note: string }> = {
  period: { from: '#FB7185', to: '#E11D48', label: 'Period Phase', note: 'Rest, hydrate and go gently.' },
  follicular: { from: '#F9A8D4', to: '#DB2777', label: 'Follicular Phase', note: 'Energy is rising. Start new things.' },
  ovulation: { from: '#C084FC', to: '#9333EA', label: 'Ovulation Phase', note: 'Peak energy. Tackle the big tasks.' },
  luteal: { from: '#FBBF24', to: '#D97706', label: 'Luteal Phase', note: 'Wind down and finish what you started.' },
  normal: { from: '#94A3B8', to: '#475569', label: 'Cycle Tracker', note: 'Log your cycle to see your phase.' }
};

const HEALTH_STYLES: Record<HealthStatus, { card: string; bar: string; icon: React.ReactNode; tone: string; label: string }> = {
  on_track: {
    card: 'bg-emerald-50/85 border-emerald-200',
    bar: 'bg-emerald-500',
    icon: <ShieldCheck size={20} className="text-emerald-600" />,
    tone: 'text-emerald-700',
    label: 'On track'
  },
  slipping: {
    card: 'bg-amber-50/85 border-amber-200',
    bar: 'bg-amber-500',
    icon: <AlertTriangle size={20} className="text-amber-600" />,
    tone: 'text-amber-700',
    label: 'Slipping'
  },
  unattended: {
    card: 'health-alert border-rose-300',
    bar: 'bg-rose-500',
    icon: <Flame size={20} className="text-rose-600" />,
    tone: 'text-rose-700',
    label: 'Needs attention now'
  }
};

function AccountabilityCard({ userData, scope, className = '' }: { userData: UserData; scope: 'today' | 'week'; className?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const report = useMemo(() => buildHealthReport(userData, scope, now), [userData, scope, now]);
  const style = HEALTH_STYLES[report.status];
  const areaBar = (score: number) => (score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500');

  return (
    <section className={`rounded-3xl border p-5 flex flex-col gap-4 ${style.card} ${className}`} aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-2xl bg-white/80 border border-white flex items-center justify-center shrink-0">
            {style.icon}
          </span>
          <div className="min-w-0">
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${style.tone}`}>
              Accountability · {scope === 'today' ? 'Today' : 'This Week'}
            </p>
            <h3 className="font-semibold text-slate-900 leading-snug mt-0.5">{report.headline}</h3>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-slate-900 leading-none">{report.score}%</p>
          <p className={`text-[10px] font-semibold mt-1 ${style.tone}`}>{style.label}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1.5">
          <span>Productivity health</span>
          <span>Tasks · Habits · Projects</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/80 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${style.bar}`} style={{ width: `${report.score}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {report.areas.map((a) => (
          <li key={a.key} className="flex items-center gap-3">
            <span className="w-16 text-[11px] font-semibold text-slate-700 shrink-0">{a.label}</span>
            <span className="w-14 h-1.5 rounded-full bg-white/80 overflow-hidden shrink-0">
              {a.score !== null && <span className={`block h-full rounded-full ${areaBar(a.score)}`} style={{ width: `${a.score}%` }} />}
            </span>
            <span className="text-[11px] text-slate-600 truncate" title={a.message}>{a.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// --- Dashboard ---
interface DashboardProps {
  userData: UserData;
  periodData: PeriodData;
  onUpdateUserData: (data: UserData) => void;
  onNavigate: (page: PageId) => void;
  theme: ThemeColor;
  avatarSrc: string;
  onOpenCustomizer: () => void;
  syncStatus: SyncStatus;
}

export default function Dashboard({
  userData,
  periodData,
  onUpdateUserData,
  onNavigate,
  theme,
  avatarSrc,
  onOpenCustomizer,
  syncStatus
}: DashboardProps) {
  const [scope, setScope] = useState<'today' | 'week'>('today');
  const [quickText, setQuickText] = useState('');
  const today = startOfToday();
  const dayName = format(today, 'EEE') as DayOfWeek;
  const todayIndex = DAYS.indexOf(dayName);
  const [quickDay, setQuickDay] = useState<DayOfWeek>(dayName);
  const themeDef = THEMES[theme] || THEMES.blush;
  const { accent, accentAlt } = themeDef;

  const habits = userData.habits || [];
  const schedule = userData.weeklySchedule;
  const projects = userData.projects || [];

  // Per-day series for the charts
  const habitsDonePerDay = useMemo(
    () => DAYS.map((d) => habits.filter((h) => h.completed && h.completed[d]).length),
    [habits]
  );
  const tasksDonePerDay = useMemo(
    () => DAYS.map((d) => (schedule[d]?.tasks || []).filter((t) => t.completed).length),
    [schedule]
  );

  // Week view lists every day that has time blocks; today view only today
  const timetableDays = DAYS.filter((d) => scope === 'week' || d === dayName)
    .map((day) => ({ day, classes: schedule[day]?.classes || [] }))
    .filter((d) => d.classes.length > 0);

  const weekCheckIns = habitsDonePerDay.reduce((a, b) => a + b, 0);

  // Project tasks completed this week, bucketed by the day they were marked complete
  const projectsDonePerDay = useMemo(() => {
    const counts = DAYS.map(() => 0);
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);
    projects.forEach((p) =>
      p.tasks.forEach((t) => {
        if (t.status !== 'complete' || !t.completedAt) return;
        const done = parseISO(t.completedAt);
        if (isWithinInterval(done, { start: weekStart, end: weekEnd })) counts[done.getDay()]++;
      })
    );
    return counts;
  }, [projects, today]);

  const chartSeries = [
    { key: 'tasks', label: 'tasks', legend: 'Tasks done', values: tasksDonePerDay, color: accent },
    { key: 'habits', label: 'habits', legend: 'Habits done', values: habitsDonePerDay, color: accentAlt },
    { key: 'projects', label: 'project tasks', legend: 'Project tasks done', values: projectsDonePerDay, color: themeDef.accentThird }
  ];

  const weekTasks = useMemo(
    () => DAYS.flatMap((d) => (schedule[d]?.tasks || []).map((t) => ({ ...t, day: d }))),
    [schedule]
  );
  const scopedTasks = scope === 'today' ? weekTasks.filter((t) => t.day === dayName) : weekTasks;
  const scopedDone = scopedTasks.filter((t) => t.completed).length;
  const scopedPercent = scopedTasks.length ? Math.round((scopedDone / scopedTasks.length) * 100) : 0;
  const listedTasks = [...scopedTasks].sort((a, b) => Number(a.completed) - Number(b.completed));

  const activeProjects = projects.filter((p) => !projectProgress(p).isDone);
  // Urgent projects first, then the rest by deadline, finished ones last
  const sortedProjects = [...projects].sort((a, b) => {
    const rank = { alert: 0, normal: 1, done: 2 };
    const ha = projectHealth(a, today);
    const hb = projectHealth(b, today);
    if (ha !== hb) return rank[ha] - rank[hb];
    return (nearestDeadline(a) || '9999').localeCompare(nearestDeadline(b) || '9999');
  });
  const projectTaskTotals = projects.reduce(
    (acc, p) => {
      const pr = projectProgress(p);
      return { total: acc.total + pr.total, complete: acc.complete + pr.complete, inProgress: acc.inProgress + pr.inProgress };
    },
    { total: 0, complete: 0, inProgress: 0 }
  );

  // Current Cycle Phase Calculation
  const cycle = useMemo(() => {
    if (!periodData.startDate) return null;
    try {
      const start = parseISO(periodData.startDate);
      const end = periodData.endDate ? parseISO(periodData.endDate) : null;
      const periodDuration = end ? Math.max(1, differenceInDays(end, start) + 1) : 5;
      const diff = differenceInDays(today, start);
      const cycleDay = ((diff % 28) + 28) % 28;

      let phase = 'normal';
      if (end && isWithinInterval(today, { start, end })) phase = 'period';
      else if (!end && isSameDay(today, start)) phase = 'period';
      else if (cycleDay < periodDuration) phase = 'period';
      else if (cycleDay < 12) phase = 'follicular';
      else if (cycleDay < 16) phase = 'ovulation';
      else if (cycleDay < 28) phase = 'luteal';
      return { phase, cycleDay: cycleDay + 1 };
    } catch {
      return null;
    }
  }, [periodData, today]);
  const phaseColor = PHASE_COLORS[cycle?.phase || 'normal'];

  // --- Mutations (immutable so React & Firebase sync see fresh objects) ---
  const updateDayTasks = (day: DayOfWeek, fn: (tasks: Task[]) => Task[]) => {
    const dayData = schedule[day] || { classes: [], tasks: [] };
    onUpdateUserData({
      ...userData,
      weeklySchedule: { ...schedule, [day]: { ...dayData, tasks: fn(dayData.tasks || []) } }
    });
  };

  const addTask = (name: string, day: DayOfWeek) =>
    updateDayTasks(day, (tasks) => [...tasks, { id: crypto.randomUUID(), name, completed: false }]);

  const toggleTask = (day: DayOfWeek, id: string) =>
    updateDayTasks(day, (tasks) => tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));

  const deleteTask = (day: DayOfWeek, id: string) =>
    updateDayTasks(day, (tasks) => tasks.filter((t) => t.id !== id));

  const toggleHabitToday = (id: string) =>
    onUpdateUserData({
      ...userData,
      habits: habits.map((h) =>
        h.id === id ? { ...h, completed: { ...h.completed, [dayName]: !h.completed?.[dayName] } } : h
      )
    });

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim()) return;
    addTask(quickText.trim(), quickDay);
    setQuickText('');
  };

  return (
    <div className="h-full w-full overflow-y-auto font-display">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 md:py-7 space-y-6 pb-28 md:pb-10">

        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 tracking-tight">
              Hello, Grace! <span className="inline-block">✨</span>
            </h1>
            <div className="glass flex p-1 rounded-xl">
              {(['today', 'week'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    scope === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {s === 'today' ? 'Today' : 'This Week'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="glass px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600">
              {format(today, 'EEEE, MMMM d')}
            </span>
            <button
              onClick={onOpenCustomizer}
              className="flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-2xl hover:bg-white/50 transition-colors group"
              title="Edit profile & popups"
            >
              <img
                src={avatarSrc}
                alt="Grace"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-xl object-cover bg-white/70 border border-white shadow-sm"
              />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900 leading-tight">Grace</p>
                <SyncBadge status={syncStatus} />
              </div>
              <ChevronDown size={15} className="text-slate-400 group-hover:text-slate-700" />
            </button>
          </div>
        </header>

        {/* Top grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* Weekly habits bar chart */}
          <section className="glass rounded-3xl p-5 sm:col-span-2 lg:col-span-1 lg:row-span-2 flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Habit Stats</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Habits completed each day this week</p>
              </div>
              <button onClick={() => onNavigate('planner')} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-white/70">
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900 leading-none">{weekCheckIns}</span>
              <span className="text-[11px] text-slate-400 pb-0.5">/ {habits.length * 7} check-ins this week</span>
            </div>
            <div className="flex-1 min-h-44 flex flex-col">
              <WeeklyBars values={habitsDonePerDay} max={Math.max(habits.length, 1)} todayIndex={todayIndex} accent={accent} />
            </div>
          </section>

          {/* Tasks donut */}
          <section className="glass rounded-3xl p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">Tasks Chart</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                <span className="font-semibold" style={{ color: accent }}>{scopedPercent}%</span> of {scope === 'today' ? "today's" : "this week's"} tasks done
              </p>
              <div className="flex flex-col gap-1 mt-4 text-[10px] font-medium text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />Done · {scopedDone}</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-300" />To do · {scopedTasks.length - scopedDone}</span>
              </div>
            </div>
            <DonutRing percent={scopedPercent} accent={accent} />
          </section>

          {/* Cycle card, coloured by current phase */}
          <button
            onClick={() => onNavigate('period')}
            className="rounded-3xl p-5 text-white flex flex-col items-center justify-center text-center gap-2 hover:scale-[1.02] transition-transform"
            style={{
              background: `linear-gradient(145deg, ${phaseColor.from}, ${phaseColor.to})`,
              boxShadow: `0 14px 30px -12px ${phaseColor.to}`
            }}
          >
            <span className="w-11 h-11 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center">
              <Droplets size={20} />
            </span>
            <span className="font-semibold">{phaseColor.label}</span>
            <span className="text-[11px] text-white/85">
              {cycle ? `Day ${cycle.cycleDay} · ${phaseColor.note}` : phaseColor.note}
            </span>
          </button>

          {/* Add task card (stacked) */}
          <div className="relative pb-3">
            <div className="absolute inset-x-3 bottom-0 top-3 rounded-3xl accent-fill opacity-90" />
            <div className="absolute inset-x-1.5 bottom-1.5 top-1.5 rounded-3xl accent-fill opacity-60" />
            <form onSubmit={handleQuickAdd} className="glass-strong relative rounded-3xl p-5 h-full flex flex-col justify-center gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: accent }}>
                  <ListTodo size={17} />
                </span>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 leading-tight">Add a Task</h3>
                  <p className="text-[10px] text-slate-400">{weekTasks.length} this week · {weekTasks.filter((t) => t.completed).length} done</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <input
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder="Type a task..."
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/80 border border-slate-200/60 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <button type="submit" className="px-2.5 rounded-xl text-white shrink-0" style={{ background: accent }} title="Add task">
                  <Plus size={15} />
                </button>
              </div>
              <div className="flex justify-between">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setQuickDay(d)}
                    className={`w-7 h-7 rounded-full text-[10px] font-semibold transition-all ${
                      quickDay === d ? 'text-white shadow' : 'text-slate-500 hover:bg-white'
                    }`}
                    style={quickDay === d ? { background: accent } : undefined}
                    title={d}
                  >
                    {d[0]}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Accountability */}
          <AccountabilityCard userData={userData} scope={scope} className="sm:col-span-2 lg:col-span-3" />
        </div>

        {/* Projects: one card per project with status counts */}
        <section className="glass rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: accent }}>
                <FolderKanban size={17} />
              </span>
              <div>
                <h3 className="font-semibold text-slate-900 leading-tight">Projects</h3>
                <p className="text-[11px] text-slate-400">
                  {activeProjects.length} active · {projectTaskTotals.complete}/{projectTaskTotals.total} tasks complete
                </p>
              </div>
            </div>
            <button onClick={() => onNavigate('projects')} className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1">
              Manage projects <ArrowRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sortedProjects.map((p) => {
              const prog = projectProgress(p);
              const health = projectHealth(p, today);
              const deadline = nearestDeadline(p);
              const counts: Record<ProjectStatus, number> = { not_started: prog.notStarted, in_progress: prog.inProgress, complete: prog.complete };
              return (
                <button
                  key={p.id}
                  onClick={() => onNavigate('projects')}
                  className={`rounded-2xl border p-4 text-left flex flex-col gap-3 transition-transform hover:scale-[1.01] ${
                    health === 'alert'
                      ? 'health-alert border-rose-300'
                      : health === 'done'
                        ? 'bg-emerald-50/90 border-emerald-200'
                        : 'glass-strong'
                  }`}
                >
                  <div className="w-full flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-slate-900 leading-snug line-clamp-2">{p.name}</p>
                    {health === 'done' ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500 text-white shrink-0">All done</span>
                    ) : deadline ? (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${health === 'alert' ? 'bg-rose-500 text-white' : URGENCY_META[getUrgency(deadline, today)].chip}`}>
                        {dueLabel(deadline, today)}
                      </span>
                    ) : null}
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-400/15 overflow-hidden flex gap-[2px]">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${prog.total ? (prog.complete / prog.total) * 100 : 0}%` }} />
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${prog.total ? (prog.inProgress / prog.total) * 100 : 0}%` }} />
                  </div>

                  <div className="w-full grid grid-cols-3 gap-1.5 mt-auto">
                    {(['not_started', 'in_progress', 'complete'] as ProjectStatus[]).map((s) => (
                      <div key={s} className={`rounded-xl px-2 py-1.5 text-center ${STATUS_META[s].chip}`}>
                        <p className="text-base font-bold leading-none">{counts[s]}</p>
                        <p className="text-[9px] font-semibold mt-1 leading-none">{STATUS_META[s].label}</p>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}

            {projects.length === 0 && (
              <button
                onClick={() => onNavigate('projects')}
                className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400 hover:text-slate-700 sm:col-span-2 lg:col-span-3 xl:col-span-4"
              >
                No projects yet. Click to create your first project.
              </button>
            )}
          </div>
        </section>

        {/* Today's tasks, timetable & habits */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <section className="glass rounded-3xl p-5 flex flex-col">
            <div className="flex items-baseline gap-2 mb-4">
              <h3 className="font-semibold text-slate-900">{scope === 'today' ? "Today's Tasks" : "This Week's Tasks"}</h3>
              <span className="text-[11px] text-slate-400">{scopedDone}/{scopedTasks.length} done</span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 -mr-1 pb-1">
              {listedTasks.map((task, idx) => {
                const highlight = idx === 0 && !task.completed;
                return (
                  <div key={`${task.day}-${task.id}`} className={`relative ${highlight ? 'pl-2' : ''}`}>
                    {highlight && <div className="absolute inset-y-1 left-0 right-2 rounded-2xl accent-fill" />}
                    <div className="glass-strong relative flex items-center gap-3 px-3.5 py-3 rounded-2xl group">
                      <button
                        onClick={() => toggleTask(task.day, task.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          task.completed ? 'text-white border-transparent' : 'border-slate-300 hover:border-slate-500'
                        }`}
                        style={task.completed ? { background: accent } : undefined}
                        title={task.completed ? 'Mark as not done' : 'Mark as done'}
                      >
                        {task.completed && <Check size={12} strokeWidth={3} />}
                      </button>
                      <span className={`flex-1 min-w-0 truncate text-[13px] ${task.completed ? 'line-through text-slate-400' : 'font-medium text-slate-800'}`}>
                        {task.name}
                      </span>
                      {scope === 'week' && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${task.day === dayName ? 'text-white' : 'bg-slate-100 text-slate-500'}`}
                          style={task.day === dayName ? { background: accent } : undefined}
                        >
                          {task.day}
                        </span>
                      )}
                      <button
                        onClick={() => deleteTask(task.day, task.id)}
                        className="p-1 rounded-md text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        title="Delete task"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {listedTasks.length === 0 && (
                <div className="py-10 text-center text-xs text-slate-400">
                  No tasks {scope === 'today' ? 'for today' : 'this week'}. Use the Add a Task card above.
                </div>
              )}
            </div>
          </section>

          <section className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <h3 className="font-semibold text-slate-900">{scope === 'today' ? "Today's Timetable" : "This Week's Timetable"}</h3>
              </div>
              <button onClick={() => onNavigate('planner')} className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1">
                Edit <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1 -mr-1">
              {timetableDays.map(({ day, classes }) => (
                <div key={day}>
                  {scope === 'week' && (
                    <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${day === dayName ? '' : 'text-slate-400'}`} style={day === dayName ? { color: accent } : undefined}>
                      {day === dayName ? `${day} · Today` : day}
                    </p>
                  )}
                  <div className="space-y-2">
                    {classes.map((cls) => (
                      <div key={cls.id} className="glass-strong px-3.5 py-3 rounded-2xl flex items-center gap-3">
                        <span className="w-1 self-stretch rounded-full" style={{ background: day === dayName ? accent : 'rgba(148,163,184,0.5)' }} />
                        <div className="min-w-0">
                          <p className="font-medium text-[13px] text-slate-800 truncate">{cls.name}</p>
                          {cls.time && <p className="text-[11px] text-slate-400 mt-0.5">{cls.time}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {timetableDays.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No time blocks scheduled {scope === 'today' ? 'for today' : 'this week'}.
                </div>
              )}
            </div>
          </section>

          <section className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} style={{ color: accent }} />
                <h3 className="font-semibold text-slate-900">Today&apos;s Habits</h3>
              </div>
              <span className="text-[11px] text-slate-400">{habitsDonePerDay[todayIndex]}/{habits.length} done</span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {habits.map((habit) => {
                const done = !!habit.completed?.[dayName];
                return (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabitToday(habit.id)}
                    className="glass-strong w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-2 text-left hover:brightness-[1.02]"
                    title={habit.name}
                  >
                    <span className={`text-[13px] truncate ${done ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}`}>{habit.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${done ? 'text-white' : 'bg-slate-100 text-slate-500'}`}
                      style={done ? { background: accent } : undefined}
                    >
                      {done ? 'Done' : 'Pending'}
                    </span>
                  </button>
                );
              })}
              {habits.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">No habits yet. Add them in Habits & Schedule.</div>
              )}
            </div>
          </section>
        </div>

        {/* Weekly comparison */}
          <section className="glass rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-slate-900">Weekly Comparison</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Tasks, habits & project tasks completed per day</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-slate-500">
                {chartSeries.map((s) => (
                  <span key={s.key} className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded-full" style={{ background: s.color }} />
                    {s.legend}
                  </span>
                ))}
              </div>
            </div>
            <ComparisonChart series={chartSeries} todayIndex={todayIndex} />
          </section>
      </div>
    </div>
  );
}
