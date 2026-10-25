/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addWeeks,
  addMonths,
  startOfToday,
  startOfDay,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, X, FolderKanban, CalendarDays, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Project, ProjectStatus, ThemeColor } from '../types';
import { THEMES, DEFAULT_THEME } from '../theme';
import { STATUS_META, dueLabel, getUrgency } from '../utils/projects';

interface ActivitiesProps {
  activities: Activity[];
  onUpdate: (activities: Activity[]) => void;
  highlightDate?: string | null;
  onClearHighlight?: () => void;
  theme?: ThemeColor;
  projects?: Project[];
  onOpenProjects?: () => void;
}

type ViewMode = 'week' | 'month';

const CATEGORIES: { id: NonNullable<Activity['category']>; label: string; card: string; dot: string }[] = [
  { id: 'general', label: 'General', card: 'bg-white/85 border-white text-slate-800', dot: 'bg-slate-400' },
  { id: 'personal', label: 'Personal', card: 'bg-violet-100/90 border-violet-200 text-violet-950', dot: 'bg-violet-500' },
  { id: 'work', label: 'Work / Career', card: 'bg-sky-100/90 border-sky-200 text-sky-950', dot: 'bg-sky-500' },
  { id: 'health', label: 'Health & Wellness', card: 'bg-emerald-100/90 border-emerald-200 text-emerald-950', dot: 'bg-emerald-500' },
  { id: 'study', label: 'Study & Learning', card: 'bg-amber-100/95 border-amber-200 text-amber-950', dot: 'bg-amber-500' }
];

const categoryOf = (cat?: Activity['category']) => CATEGORIES.find((c) => c.id === cat) || CATEGORIES[0];

const HOUR_PX = 64;

// --- Time helpers: event times are free text ("2:00 PM", "10:00 AM - 11:30 AM", "All Day") ---
function parseTimeRange(text: string): { start: number; end: number } | null {
  const matches = [...(text || '').matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi)].slice(0, 2);
  if (matches.length === 0) return null;
  const toMinutes = (m: RegExpMatchArray, fallbackMeridiem?: string) => {
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const meridiem = (m[3] || fallbackMeridiem || '').toLowerCase();
    if (h > 23 || min > 59) return null;
    if (meridiem === 'pm' && h < 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;
    return h * 60 + min;
  };
  const start = toMinutes(matches[0]);
  if (start === null) return null;
  let end = matches[1] ? toMinutes(matches[1], matches[0][3]) : null;
  if (end === null || end <= start) end = start + 60;
  return { start, end: Math.min(end, 24 * 60) };
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function inputToMinutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

// --- Calendar item model ---
interface TimedEvent {
  activity: Activity;
  start: number;
  end: number;
  lane: number;
  lanes: number;
}

interface ProjectItem {
  id: string;
  project: Project;
  name: string;
  isDeadline: boolean;
  dueDate: string;
  status?: ProjectStatus;
  done: boolean;
}

/** Side-by-side lanes for overlapping events within one day. */
function layoutDay(events: { activity: Activity; start: number; end: number }[]): TimedEvent[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
  const result: TimedEvent[] = [];
  let cluster: TimedEvent[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    cluster.forEach((e) => (e.lanes = laneEnds.length));
    cluster = [];
    laneEnds = [];
  };
  sorted.forEach((ev) => {
    if (ev.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= ev.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(ev.end);
    } else {
      laneEnds[lane] = ev.end;
    }
    const placed = { ...ev, lane, lanes: 1 };
    cluster.push(placed);
    result.push(placed);
    clusterEnd = Math.max(clusterEnd, ev.end);
  });
  flush();
  return result;
}

export default function Activities({
  activities,
  onUpdate,
  highlightDate,
  onClearHighlight,
  theme = DEFAULT_THEME,
  projects = [],
  onOpenProjects
}: ActivitiesProps) {
  const today = startOfToday();
  const themeDef = THEMES[theme] || THEMES[DEFAULT_THEME];
  const [view, setView] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState<Date>(today);
  const [now, setNow] = useState(() => new Date());
  const [detail, setDetail] = useState<Activity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', date: format(today, 'yyyy-MM-dd'), start: '', end: '', category: 'general' as Activity['category'] });
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Jump to a date when redirected from elsewhere in the app
  useEffect(() => {
    if (!highlightDate) return;
    try {
      setAnchor(startOfDay(parseISO(highlightDate)));
      setView('week');
    } catch {
      // ignore invalid date
    }
  }, [highlightDate]);

  const days = useMemo(() => {
    if (view === 'week') return eachDayOfInterval({ start: startOfWeek(anchor), end: endOfWeek(anchor) });
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(anchor)), end: endOfWeek(endOfMonth(anchor)) });
  }, [view, anchor]);

  const eventsOn = (d: Date) =>
    activities.filter((a) => {
      try {
        return isSameDay(parseISO(a.date), d);
      } catch {
        return false;
      }
    });

  const projectItemsOn = (d: Date): ProjectItem[] => {
    const items: ProjectItem[] = [];
    projects.forEach((p) => {
      const allDone = p.tasks.length > 0 && p.tasks.every((t) => t.status === 'complete');
      if (p.dueDate && isSameDay(parseISO(p.dueDate), d)) {
        items.push({ id: `p-${p.id}`, project: p, name: p.name, isDeadline: true, dueDate: p.dueDate, done: allDone });
      }
      p.tasks.forEach((t) => {
        if (t.dueDate && isSameDay(parseISO(t.dueDate), d)) {
          items.push({ id: `t-${t.id}`, project: p, name: t.name, isDeadline: false, dueDate: t.dueDate, status: t.status, done: t.status === 'complete' });
        }
      });
    });
    return items;
  };

  const splitDay = (d: Date) => {
    const timed: { activity: Activity; start: number; end: number }[] = [];
    const allDay: Activity[] = [];
    eventsOn(d).forEach((a) => {
      const range = parseTimeRange(a.time);
      if (range) timed.push({ activity: a, ...range });
      else allDay.push(a);
    });
    return { timed: layoutDay(timed), allDay, projectItems: projectItemsOn(d) };
  };

  const dayData = useMemo(() => days.map((d) => ({ date: d, ...splitDay(d) })), [days, activities, projects]);

  const showsToday = days.some((d) => isSameDay(d, today));

  // Visible hours stretch to fit the earliest / latest event (and the current time when today is shown)
  const { startHour, endHour } = useMemo(() => {
    let s = 7;
    let e = showsToday ? Math.max(21, now.getHours() + 1) : 21;
    dayData.forEach((d) =>
      d.timed.forEach((t) => {
        s = Math.min(s, Math.floor(t.start / 60));
        e = Math.max(e, Math.ceil(t.end / 60));
      })
    );
    return { startHour: Math.max(0, s), endHour: Math.min(24, e) };
  }, [dayData, showsToday, now]);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowVisible = showsToday && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;

  // Open the time grid at the first event (or an hour before now when today is shown) so nothing is hidden above
  useEffect(() => {
    if (view === 'month' || !scrollRef.current) return;
    const starts = dayData.flatMap((d) => d.timed.map((t) => t.start));
    const candidates = [...starts, ...(showsToday ? [nowMinutes] : [])];
    const focus = candidates.length ? Math.min(...candidates) : 8 * 60;
    scrollRef.current.scrollTop = Math.max(0, (focus / 60 - startHour - 1) * HOUR_PX);
  }, [view, anchor, startHour]);

  const step = (dir: 1 | -1) => {
    if (view === 'week') setAnchor(addWeeks(anchor, dir));
    else setAnchor(addMonths(anchor, dir));
    onClearHighlight?.();
  };

  const rangeLabel =
    view === 'week'
        ? `${format(days[0], 'MMM d')} – ${format(days[6], isSameMonth(days[0], days[6]) ? 'd' : 'MMM d')}`
        : format(anchor, 'MMMM yyyy');

  const openAdd = (date: Date, startMinutes?: number) => {
    const pad = (m: number) => `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
    setForm({
      name: '',
      date: format(date, 'yyyy-MM-dd'),
      start: startMinutes !== undefined ? pad(startMinutes) : '',
      end: startMinutes !== undefined ? pad(Math.min(startMinutes + 60, 23 * 60 + 59)) : '',
      category: 'general'
    });
    setIsModalOpen(true);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    let time = 'All Day';
    if (form.start) {
      const s = inputToMinutes(form.start);
      time = formatMinutes(s);
      if (form.end && inputToMinutes(form.end) > s) time += ` - ${formatMinutes(inputToMinutes(form.end))}`;
    }
    const activity: Activity = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      time,
      date: startOfDay(parseISO(form.date)).toISOString(),
      category: form.category
    };
    onUpdate([...activities, activity]);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    onUpdate(activities.filter((a) => a.id !== id));
    setDetail(null);
  };

  // --- Small renderers ---
  const ProjectChip = ({ item, compact = false }: { item: ProjectItem; compact?: boolean }) => {
    // Same thresholds as the project cards: due within 3 days or overdue = red, finished = green
    const urgency = getUrgency(item.dueDate, today, item.done);
    const tone = item.done
      ? 'bg-emerald-100/90 border-emerald-200 text-emerald-900'
      : urgency === 'overdue' || urgency === 'today' || urgency === 'soon'
        ? 'bg-rose-100/95 border-rose-300 text-rose-900'
        : 'bg-white/85 border-white text-slate-800';
    return (
      <button
        onClick={() => onOpenProjects?.()}
        title={`${item.isDeadline ? 'Project deadline' : `Task in ${item.project.name}`}${item.status ? ` · ${STATUS_META[item.status].label}` : ''} · ${item.done ? 'Done' : dueLabel(item.dueDate, today)}`}
        className={`w-full text-left rounded-xl border px-2 py-1 flex items-center gap-1.5 hover:brightness-[0.98] ${tone}`}
      >
        {item.isDeadline ? (
          <FolderKanban size={11} className="shrink-0" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_META[item.status || 'not_started'].dot}`} />
        )}
        <span className={`text-[10px] font-semibold truncate ${item.done ? 'line-through opacity-70' : ''}`}>
          {item.isDeadline ? `Due: ${item.name}` : item.name}
        </span>
        {!compact && !item.isDeadline && <span className="text-[9px] opacity-60 truncate hidden xl:inline">· {item.project.name}</span>}
      </button>
    );
  };

  const AllDayChip = ({ a }: { a: Activity }) => {
    const c = categoryOf(a.category);
    return (
      <button onClick={() => setDetail(a)} className={`w-full text-left rounded-xl border px-2 py-1 flex items-center gap-1.5 ${c.card}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
        <span className="text-[10px] font-semibold truncate">{a.name}</span>
      </button>
    );
  };

  const legend = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
      {CATEGORIES.map((c) => (
        <span key={c.id} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
          {c.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5"><FolderKanban size={11} /> Project dates</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> Due soon / overdue</span>
    </div>
  );

  // --- Time grid (day & week) ---
  const timeGrid = (
    <div className="glass rounded-3xl p-3 md:p-4 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          {/* Day headers */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` }}>
            <div className="flex flex-col items-center justify-end pb-1 text-[10px] font-semibold text-slate-400">
              <span>W{format(days[0], 'w')}</span>
            </div>
            {days.map((d) => {
              const isToday = isSameDay(d, today);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => openAdd(d)}
                  title="Add an event on this day"
                  className={`rounded-2xl py-2.5 text-center transition-transform hover:scale-[1.02] ${
                    isToday ? 'accent-fill text-white' : 'glass-strong text-slate-800'
                  }`}
                >
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? 'text-white/85' : 'text-slate-400'}`}>{format(d, 'EEE')}</p>
                  <p className="text-sm font-bold">{format(d, 'dd/MM')}</p>
                </button>
              );
            })}
          </div>

          {/* All-day lane: projects & untimed events */}
          {dayData.some((d) => d.allDay.length + d.projectItems.length > 0) && (
            <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` }}>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 text-center pt-1.5 leading-tight">All<br />day</div>
              {dayData.map((d) => (
                <div key={d.date.toISOString()} className="space-y-1 min-w-0">
                  {d.projectItems.map((p) => <ProjectChip key={p.id} item={p} compact={view === 'week'} />)}
                  {d.allDay.map((a) => <AllDayChip key={a.id} a={a} />)}
                </div>
              ))}
            </div>
          )}

          {/* Hours */}
          <div ref={scrollRef} className="relative mt-2 max-h-[62vh] overflow-y-auto pr-1">
            <div className="relative grid gap-2" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))`, height: hours.length * HOUR_PX }}>
              {/* Gutter */}
              <div className="relative">
                {hours.map((h) => (
                  <span key={h} className="absolute right-1 -translate-y-1/2 text-[10px] font-semibold text-slate-400" style={{ top: (h - startHour) * HOUR_PX }}>
                    {h === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
                  </span>
                ))}
              </div>

              {dayData.map((d) => {
                const isToday = isSameDay(d.date, today);
                return (
                  <div
                    key={d.date.toISOString()}
                    className={`relative rounded-2xl ${isToday ? 'bg-white/45' : 'bg-white/20'}`}
                    onDoubleClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const mins = startHour * 60 + Math.floor(((e.clientY - rect.top) / HOUR_PX) * 2) * 30;
                      openAdd(d.date, Math.min(mins, 23 * 60));
                    }}
                    title="Double-click to add an event"
                  >
                    {hours.map((h) => (
                      <div key={h} className="absolute inset-x-0 border-t border-slate-400/15" style={{ top: (h - startHour) * HOUR_PX }} />
                    ))}

                    {d.timed.map((t) => {
                      const c = categoryOf(t.activity.category);
                      const top = ((t.start - startHour * 60) / 60) * HOUR_PX;
                      const height = Math.max(30, ((t.end - t.start) / 60) * HOUR_PX - 4);
                      const width = 100 / t.lanes;
                      return (
                        <button
                          key={t.activity.id}
                          onClick={() => setDetail(t.activity)}
                          title={`${t.activity.name} · ${formatMinutes(t.start)} – ${formatMinutes(t.end)}`}
                          className={`absolute rounded-2xl border p-2 text-left overflow-hidden shadow-sm hover:shadow-md hover:z-10 transition-shadow ${c.card}`}
                          style={{ top: top + 2, height, left: `calc(${t.lane * width}% + 2px)`, width: `calc(${width}% - 4px)` }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${c.dot} text-white`}>
                              <CalendarDays size={11} />
                            </span>
                            <p className="text-[11px] font-bold leading-tight truncate">{t.activity.name}</p>
                          </div>
                          {height > 44 && (
                            <p className="text-[10px] opacity-70 mt-1 truncate">{formatMinutes(t.start)} – {formatMinutes(t.end)}</p>
                          )}
                          {height > 70 && <p className="text-[9px] font-semibold opacity-60 mt-1 truncate">{c.label}</p>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Current time line across the visible days */}
              {nowVisible && (
                <div className="absolute inset-x-0 pointer-events-none z-20" style={{ top: ((nowMinutes - startHour * 60) / 60) * HOUR_PX }}>
                  <span className="absolute left-0 -translate-y-1/2 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white" style={{ background: themeDef.accent }}>
                    {format(now, 'HH:mm')}
                  </span>
                  <div className="ml-[52px] border-t-2 border-dashed" style={{ borderColor: themeDef.accent }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Month grid ---
  const monthGrid = (
    <div className="glass rounded-3xl p-3 md:p-4">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {dayData.map((d) => {
          const isToday = isSameDay(d.date, today);
          const inMonth = isSameMonth(d.date, anchor);
          const timedSorted = [...d.timed].sort((a, b) => a.start - b.start);
          const total = d.projectItems.length + d.allDay.length + timedSorted.length;
          const shown = 3;
          let used = 0;
          return (
            <div
              key={d.date.toISOString()}
              onClick={() => { setAnchor(d.date); setView('week'); }}
              className={`min-h-[92px] md:min-h-[112px] rounded-2xl p-1.5 md:p-2 flex flex-col gap-1 cursor-pointer transition-colors ${
                inMonth ? 'bg-white/55 hover:bg-white/80' : 'bg-white/15 opacity-60'
              } ${isToday ? 'ring-2' : ''}`}
              style={isToday ? ({ '--tw-ring-color': themeDef.accent } as React.CSSProperties) : undefined}
            >
              <span
                className={`text-[11px] font-bold w-6 h-6 rounded-lg flex items-center justify-center ${isToday ? 'text-white' : 'text-slate-700'}`}
                style={isToday ? { background: themeDef.accent } : undefined}
              >
                {format(d.date, 'd')}
              </span>
              <div className="space-y-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                {d.projectItems.map((p) => (used++ < shown ? <ProjectChip key={p.id} item={p} compact /> : null))}
                {d.allDay.map((a) => (used++ < shown ? <AllDayChip key={a.id} a={a} /> : null))}
                {timedSorted.map((t) => {
                  if (used++ >= shown) return null;
                  const c = categoryOf(t.activity.category);
                  return (
                    <button key={t.activity.id} onClick={() => setDetail(t.activity)} className={`w-full text-left rounded-xl border px-2 py-1 flex items-center gap-1.5 ${c.card}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                      <span className="text-[10px] font-semibold truncate"><span className="opacity-60 hidden md:inline">{formatMinutes(t.start).replace(':00', '')} </span>{t.activity.name}</span>
                    </button>
                  );
                })}
              </div>
              {total > shown && <span className="text-[10px] font-semibold text-slate-500 px-1">+{total - shown} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const detailCategory = detail ? categoryOf(detail.category) : null;

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 md:py-7 space-y-5 pb-28 md:pb-10">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-[30px] font-bold text-slate-900 tracking-tight">Stay up to date, Grace</h1>
            <div className="flex items-center gap-2 mt-3">
              <div className="glass flex items-center rounded-xl p-1">
                <button onClick={() => step(-1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Previous">
                  <ChevronLeft size={15} />
                </button>
                <span className="px-2 text-xs font-semibold text-slate-800 min-w-[9.5rem] text-center">{rangeLabel}</span>
                <button onClick={() => step(1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Next">
                  <ChevronRight size={15} />
                </button>
              </div>
              <button
                onClick={() => { setAnchor(today); onClearHighlight?.(); }}
                className="glass px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Today
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="glass flex p-1 rounded-xl">
              {(['week', 'month'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    view === v ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => openAdd(isSameMonth(today, anchor) ? today : startOfMonth(anchor))}
              className="accent-fill flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
            >
              <Plus size={16} /> Add event
            </button>
          </div>
        </header>

        {legend}

        {view === 'month' ? monthGrid : timeGrid}

        {view === 'week' && (
          <p className="text-[11px] text-slate-400">Tip: double-click an empty slot to add an event at that time, or click a day header to add one that day. Click a project item to open Projects.</p>
        )}
      </div>

      {/* Event details */}
      <AnimatePresence>
        {detail && detailCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm" onClick={() => setDetail(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong w-full max-w-sm rounded-3xl p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${detailCategory.card}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${detailCategory.dot}`} />
                    {detailCategory.label}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900 mt-2">{detail.name}</h3>
                </div>
                <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/70">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2"><CalendarDays size={15} className="text-slate-400" /> {format(parseISO(detail.date), 'EEEE, MMMM d, yyyy')}</p>
                <p className="flex items-center gap-2"><Clock size={15} className="text-slate-400" /> {detail.time}</p>
              </div>
              <div className="flex justify-between gap-2 mt-6">
                <button
                  onClick={() => handleDelete(detail.id)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Delete
                </button>
                <button
                  onClick={() => { setAnchor(startOfDay(parseISO(detail.date))); setView('week'); setDetail(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white/80 hover:bg-white flex items-center gap-1.5"
                >
                  View week <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Event */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <motion.form
              onSubmit={handleAdd}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="glass-strong w-full max-w-sm rounded-3xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Add event</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/70">
                  <X size={18} />
                </button>
              </div>

              <input
                autoFocus
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Doctor appointment, Exam, Birthday"
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200/70 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200/70 text-sm text-slate-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Start</label>
                  <input
                    type="time"
                    value={form.start}
                    onChange={(e) => setForm({ ...form, start: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200/70 text-sm text-slate-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">End</label>
                  <input
                    type="time"
                    value={form.end}
                    disabled={!form.start}
                    onChange={(e) => setForm({ ...form, end: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200/70 text-sm text-slate-700 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 -mt-2">Leave the start empty for an all-day event.</p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm({ ...form, category: c.id })}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${c.card} ${
                        form.category === c.id ? 'ring-2 ring-slate-900/70' : 'opacity-75 hover:opacity-100'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="accent-fill w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5">
                <Plus size={16} /> Add event
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
