/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState } from 'react';
import { 
  format, 
  startOfToday, 
} from 'date-fns';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Pencil,
  Sparkles,
  CheckCircle2,
  Clock,
  Check,
  Pin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserData, DayOfWeek, Habit, Task, ClassEvent, Activity, ThemeColor } from '../types';
import { THEMES, DEFAULT_THEME } from '../theme';

interface TaskTrackerProps {
  name?: string;
  data: UserData;
  onUpdate: (newData: UserData) => void;
  activities: Activity[];
  onActivityClick: (date: string) => void;
  theme?: ThemeColor;
}

const DAYS: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TaskTracker({ 
  name = 'Grace', 
  data, 
  onUpdate, 
  theme = DEFAULT_THEME
}: TaskTrackerProps) {
  const todayName = format(startOfToday(), 'EEE') as DayOfWeek;
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'habit' | 'class' | 'task';
    mode: 'add' | 'edit';
    day?: DayOfWeek;
    item?: Habit | ClassEvent | Task;
  }>({ isOpen: false, type: 'habit', mode: 'add' });

  const [formData, setFormData] = useState({ name: '', time: '' });
  const themeDef = THEMES[theme] || THEMES[DEFAULT_THEME];

  // Habit Calculations
  const calculateWeeklyPercentage = () => {
    if (!data.habits || data.habits.length === 0) return 0;
    const total = data.habits.length * 7;
    let completed = 0;
    data.habits.forEach((habit) => {
      DAYS.forEach((day) => {
        if (habit.completed && habit.completed[day]) completed++;
      });
    });
    return Math.round((completed / total) * 100);
  };

  // Toggle Habit
  const toggleHabit = (habitId: string, day: DayOfWeek) => {
    const newHabits = data.habits.map((habit) => {
      if (habit.id === habitId) {
        return {
          ...habit,
          completed: {
            ...habit.completed,
            [day]: !habit.completed[day],
          },
        };
      }
      return habit;
    });
    onUpdate({ ...data, habits: newHabits });
  };

  const deleteHabit = (id: string) => {
    const newHabits = data.habits.filter((h) => h.id !== id);
    onUpdate({ ...data, habits: newHabits });
  };

  const deleteClass = (day: DayOfWeek, id: string) => {
    const newSchedule = { ...data.weeklySchedule };
    newSchedule[day].classes = newSchedule[day].classes.filter((c) => c.id !== id);
    onUpdate({ ...data, weeklySchedule: newSchedule });
  };

  const toggleTask = (day: DayOfWeek, id: string) => {
    const newSchedule = { ...data.weeklySchedule };
    newSchedule[day].tasks = newSchedule[day].tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    onUpdate({ ...data, weeklySchedule: newSchedule });
  };

  const deleteTask = (day: DayOfWeek, id: string) => {
    const newSchedule = { ...data.weeklySchedule };
    newSchedule[day].tasks = newSchedule[day].tasks.filter((t) => t.id !== id);
    onUpdate({ ...data, weeklySchedule: newSchedule });
  };

  // Open Modal
  const openModal = (
    type: 'habit' | 'class' | 'task',
    mode: 'add' | 'edit',
    day?: DayOfWeek,
    item?: Habit | ClassEvent | Task
  ) => {
    setModal({ isOpen: true, type, mode, day, item });
    if (mode === 'edit' && item) {
      setFormData({
        name: item.name,
        time: (item as ClassEvent).time || '',
      });
    } else {
      setFormData({ name: '', time: '' });
    }
  };

  // Save Modal
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (modal.type === 'habit') {
      if (modal.mode === 'add') {
        const newHabit: Habit = {
          id: crypto.randomUUID(),
          name: formData.name.trim(),
          completed: { Sun: false, Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false },
        };
        onUpdate({ ...data, habits: [...(data.habits || []), newHabit] });
      } else if (modal.mode === 'edit' && modal.item) {
        const newHabits = data.habits.map((h) =>
          h.id === modal.item!.id ? { ...h, name: formData.name.trim() } : h
        );
        onUpdate({ ...data, habits: newHabits });
      }
    } else if (modal.type === 'class' && modal.day) {
      const newSchedule = { ...data.weeklySchedule };
      if (modal.mode === 'add') {
        const newClass: ClassEvent = {
          id: crypto.randomUUID(),
          name: formData.name.trim(),
          time: formData.time.trim() || undefined,
        };
        newSchedule[modal.day].classes = [...(newSchedule[modal.day].classes || []), newClass];
      } else if (modal.mode === 'edit' && modal.item) {
        newSchedule[modal.day].classes = newSchedule[modal.day].classes.map((c) =>
          c.id === modal.item!.id
            ? { ...c, name: formData.name.trim(), time: formData.time.trim() || undefined }
            : c
        );
      }
      onUpdate({ ...data, weeklySchedule: newSchedule });
    } else if (modal.type === 'task' && modal.day) {
      const newSchedule = { ...data.weeklySchedule };
      if (modal.mode === 'add') {
        const newTask: Task = {
          id: crypto.randomUUID(),
          name: formData.name.trim(),
          completed: false,
        };
        newSchedule[modal.day].tasks = [...(newSchedule[modal.day].tasks || []), newTask];
      } else if (modal.mode === 'edit' && modal.item) {
        newSchedule[modal.day].tasks = newSchedule[modal.day].tasks.map((t) =>
          t.id === modal.item!.id ? { ...t, name: formData.name.trim() } : t
        );
      }
      onUpdate({ ...data, weeklySchedule: newSchedule });
    }

    setModal({ isOpen: false, type: 'habit', mode: 'add' });
  };

  const weeklyPercent = calculateWeeklyPercentage();
  const weekBlocks = DAYS.reduce((n, d) => n + (data.weeklySchedule[d]?.classes.length || 0), 0);
  const weekTasksTotal = DAYS.reduce((n, d) => n + (data.weeklySchedule[d]?.tasks.length || 0), 0);
  const weekTasksDone = DAYS.reduce((n, d) => n + (data.weeklySchedule[d]?.tasks.filter((t) => t.completed).length || 0), 0);

  const habitsDoneToday = (data.habits || []).filter((h) => h.completed?.[todayName]).length;

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-5 md:py-7 space-y-5 pb-28 md:pb-10">

        {/* Header */}
        <header>
          <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 tracking-tight">Habits & Schedule</h1>
          <p className="text-xs text-slate-500 mt-1">Your pinned weekly timetable, this week&apos;s tasks and your habits at a glance</p>
        </header>

        <div className="flex flex-col xl:flex-row gap-5 items-start">

          {/* Habits: compact side card */}
          <aside className="glass rounded-3xl p-4 w-full xl:w-64 shrink-0 xl:sticky xl:top-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ background: themeDef.accent }}>
                  <Sparkles size={15} />
                </span>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 leading-tight">Habits</h3>
                  <p className="text-[10px] text-slate-400">{habitsDoneToday}/{(data.habits || []).length} done today</p>
                </div>
              </div>
              <button
                onClick={() => openModal('habit', 'add')}
                className="accent-fill p-2 rounded-xl text-white"
                title="Add habit"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                <span>This week</span>
                <span>{weeklyPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/80 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${weeklyPercent}%`, background: themeDef.accent }} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1 gap-2.5">
              {(data.habits || []).map((habit) => {
                const count = DAYS.filter((d) => habit.completed?.[d]).length;
                return (
                  <div key={habit.id} className="glass-strong rounded-2xl p-3 group">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-slate-800 truncate" title={habit.name}>{habit.name}</p>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <span className="text-[10px] font-semibold text-slate-400 mr-1">{count}/7</span>
                        <button
                          onClick={() => openModal('habit', 'edit', undefined, habit)}
                          className="p-1 text-slate-300 hover:text-slate-600 rounded opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Edit habit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => deleteHabit(habit.id)}
                          className="p-1 text-slate-300 hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete habit"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mt-2 max-w-[15rem]">
                      {DAYS.map((d) => {
                        const done = !!habit.completed?.[d];
                        return (
                          <button
                            key={d}
                            onClick={() => toggleHabit(habit.id, d)}
                            className={`aspect-square w-full max-w-7 rounded-lg text-[9px] font-bold flex items-center justify-center transition-all ${
                              done ? 'text-white shadow-sm' : 'bg-white border border-slate-200/80 text-slate-400 hover:border-slate-400'
                            } ${d === todayName ? 'ring-2 ring-offset-1' : ''}`}
                            style={{
                              ...(done ? { background: themeDef.accent } : {}),
                              ...(d === todayName ? ({ '--tw-ring-color': themeDef.accent } as React.CSSProperties) : {})
                            }}
                            aria-label={`Toggle ${habit.name} for ${d}`}
                            title={d}
                          >
                            {done ? <CheckCircle2 size={13} strokeWidth={2.5} /> : d[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {(!data.habits || data.habits.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-6 sm:col-span-2 lg:col-span-3 xl:col-span-1">No habits yet. Tap + to add one.</p>
              )}
            </div>
          </aside>

          {/* Weekly timetable (pinned) + tasks */}
          <section className="glass rounded-3xl p-4 md:p-5 flex-1 min-w-0 w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">This Week</h3>
                <p className="text-xs text-slate-500">Timetable stays pinned at the top while you scroll your tasks.</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><Clock size={13} /> {weekBlocks} time block{weekBlocks === 1 ? '' : 's'}</span>
                <span className="flex items-center gap-1.5"><CheckSquare size={13} /> {weekTasksDone}/{weekTasksTotal} tasks done</span>
              </div>
            </div>

            <div className="overflow-x-auto xl:overflow-visible -mx-1 px-1 pb-1">
              <div className="relative min-w-[840px] xl:min-w-0">
                {/* Solid column dividers, aligned with the 7 day columns below (inset matches the pinned band's padding + border) */}
                <div className="absolute inset-y-0 inset-x-[9px] grid grid-cols-7 divide-x divide-slate-300 pointer-events-none z-20" aria-hidden="true">
                  {DAYS.map((d) => <div key={d} />)}
                </div>

                {/* Pinned band: day headers + timetable */}
                <div className="xl:sticky xl:top-0 z-10 rounded-2xl bg-white/80 backdrop-blur-xl border border-white p-2 shadow-sm">
                  <div className="grid grid-cols-7">
                    {DAYS.map((day) => {
                      const isToday = day === todayName;
                      const tasks = data.weeklySchedule[day]?.tasks || [];
                      return (
                        <div
                          key={day}
                          className={`mx-1.5 rounded-xl py-2 text-center ${isToday ? 'accent-fill text-white' : 'bg-white text-slate-800 border border-slate-200/60'}`}
                        >
                          <p className="text-xs font-bold uppercase tracking-wider">{day}{isToday && <span className="font-medium normal-case tracking-normal"> · Today</span>}</p>
                          <p className={`text-[10px] font-semibold ${isToday ? 'text-white/85' : 'text-slate-400'}`}>
                            {tasks.filter((t) => t.completed).length}/{tasks.length} tasks
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <Pin size={11} style={{ color: themeDef.accent }} /> Timetable
                  </div>
                  <div className="grid grid-cols-7">
                    {DAYS.map((day) => {
                      const classes = data.weeklySchedule[day]?.classes || [];
                      return (
                        <div key={day} className="space-y-1.5 min-w-0 px-1.5">
                          {classes.map((cls) => (
                            <div
                              key={cls.id}
                              className="group relative rounded-xl px-2 py-1.5 border-l-[3px] bg-white border border-slate-200/60"
                              style={{ borderLeftColor: themeDef.accent }}
                            >
                              <p lang="en" className="font-semibold text-[11px] text-slate-900 leading-snug pr-5 [hyphens:auto] [overflow-wrap:break-word]">{cls.name}</p>
                              {cls.time && <p className="text-[10px] text-slate-500">{cls.time}</p>}
                              <div className="absolute top-1 right-1 flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 bg-white/90 rounded-md">
                                <button onClick={() => openModal('class', 'edit', day, cls)} className="p-0.5 text-slate-400 hover:text-slate-600" title="Edit">
                                  <Pencil size={11} />
                                </button>
                                <button onClick={() => deleteClass(day, cls.id)} className="p-0.5 text-slate-400 hover:text-rose-500" title="Delete">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => openModal('class', 'add', day)}
                            className="w-full rounded-xl border border-dashed border-slate-300/80 py-1 text-[10px] font-semibold text-slate-400 hover:text-slate-700 hover:border-slate-400 flex items-center justify-center gap-1"
                            title={`Add time block on ${day}`}
                          >
                            <Plus size={11} /> Block
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex items-center gap-1.5 mt-4 mb-2 px-[13px] text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <CheckSquare size={11} /> Tasks
                </div>
                <div className="grid grid-cols-7 px-[9px]">
                  {DAYS.map((day) => {
                    const tasks = data.weeklySchedule[day]?.tasks || [];
                    const isToday = day === todayName;
                    return (
                      <div
                        key={day}
                        className={`mx-1.5 rounded-2xl p-1 space-y-1.5 min-h-[220px] ${isToday ? 'bg-white/70 ring-2' : 'bg-white/35'}`}
                        style={isToday ? ({ '--tw-ring-color': themeDef.accent } as React.CSSProperties) : undefined}
                      >
                        {tasks.map((task) => (
                          <div key={task.id} className="glass-strong group relative rounded-xl px-2 py-2">
                            <div className="flex items-start gap-1.5">
                              <button
                                onClick={() => toggleTask(day, task.id)}
                                className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                  task.completed ? 'text-white border-transparent' : 'border-slate-300 hover:border-slate-500'
                                }`}
                                style={task.completed ? { background: themeDef.accent } : undefined}
                                aria-label={task.completed ? `Mark ${task.name} not done` : `Mark ${task.name} done`}
                              >
                                {task.completed && <Check size={10} strokeWidth={3} />}
                              </button>
                              <span lang="en" className={`text-xs leading-snug min-w-0 [hyphens:auto] [overflow-wrap:break-word] ${task.completed ? 'line-through text-slate-400' : 'font-medium text-slate-800'}`}>
                                {task.name}
                              </span>
                            </div>
                            <div className="absolute top-1 right-1 flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 bg-white/90 rounded-md">
                              <button onClick={() => openModal('task', 'edit', day, task)} className="p-0.5 text-slate-400 hover:text-slate-600" title="Edit">
                                <Pencil size={11} />
                              </button>
                              <button onClick={() => deleteTask(day, task.id)} className="p-0.5 text-slate-400 hover:text-rose-500" title="Delete">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => openModal('task', 'add', day)}
                          className="w-full rounded-xl border border-dashed border-slate-300/80 py-2 text-[11px] font-semibold text-slate-400 hover:text-slate-700 hover:border-slate-400 hover:bg-white/50 flex items-center justify-center gap-1"
                          title={`Add task on ${day}`}
                        >
                          <Plus size={12} /> Task
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong w-full max-w-sm rounded-3xl p-6"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-4 capitalize">
                {modal.mode} {modal.type}
              </h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={`Enter ${modal.type} title`}
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200/70 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                {modal.type === 'class' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Time / Duration (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      placeholder="e.g. 10:00 AM - 11:30 AM"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200/70 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModal({ ...modal, isOpen: false })}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white/70 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="accent-fill px-5 py-2 text-xs font-semibold text-white rounded-xl"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
