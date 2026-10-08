/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { 
  startOfWeek, 
  isSameDay, 
  parseISO, 
  format, 
  startOfToday, 
  isAfter, 
  differenceInDays,
  isWithinInterval
} from 'date-fns';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Droplets, 
  LogOut, 
  Plus, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Palette,
  Sliders,
  Cloud,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TaskTracker from './components/TaskTracker';
import Activities from './components/Activities';
import PeriodTracker from './components/PeriodTracker';
import LoginLanding from './components/LoginLanding';
import ThemeModal from './components/ThemeModal';
import BrainPicker from './components/BrainPicker';
import BrainCustomizerModal from './components/BrainCustomizerModal';
import { getBrainConfig, applyRemoteBrainConfig } from './services/brainConfigStorage';
import { 
  loadAllFromFirebase, 
  saveUserDataToFirebase, 
  savePeriodDataToFirebase, 
  saveActivitiesToFirebase, 
  saveBrainConfigToFirebase,
  saveThemeToFirebase,
  subscribeSyncStatus, 
  SyncStatus 
} from './services/firebaseSyncService';
import { UserData, PeriodData, DayOfWeek, Activity, Task, ThemeColor } from './types';
import { THEMES, DEFAULT_THEME } from './theme';
import { getActiveSession, clearSession, SessionInfo } from './auth';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-md">
            <h1 className="text-2xl font-black text-slate-900 mb-2 font-serif">Grace&apos;s Planner</h1>
            <p className="text-sm text-slate-500 mb-4">A temporary hiccup occurred.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors shadow-xs"
            >
              Reload Planner
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const INITIAL_USER_DATA: UserData = {
  habits: [
    { id: '1', name: 'Drink 2L Water', completed: { Sun: false, Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false } },
    { id: '2', name: 'Morning Movement & Stretch', completed: { Sun: false, Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false } },
    { id: '3', name: 'Daily Reading (20 mins)', completed: { Sun: false, Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false } }
  ],
  weeklySchedule: {
    Sun: { classes: [], tasks: [{ id: 't1', name: 'Plan the upcoming week', completed: false }] },
    Mon: { classes: [{ id: 'c1', name: 'Morning Focus Block' }], tasks: [{ id: 't2', name: 'Review goals & priorities', completed: false }] },
    Tue: { classes: [], tasks: [] },
    Wed: { classes: [], tasks: [] },
    Thu: { classes: [], tasks: [] },
    Fri: { classes: [], tasks: [] },
    Sat: { classes: [], tasks: [] }
  },
  lastResetDate: startOfWeek(startOfToday()).toISOString()
};

const INITIAL_ACTIVITIES: Activity[] = [
  { id: 'a1', name: 'Personal Planning Session', time: '10:00 AM', date: startOfToday().toISOString(), category: 'personal' },
  { id: 'a2', name: 'Weekly Review', time: '5:00 PM', date: startOfToday().toISOString(), category: 'study' }
];

// --- Personal Dashboard Subcomponent ---
interface PersonalDashboardProps {
  userData: UserData;
  periodData: PeriodData;
  activities: Activity[];
  onUpdateUserData: (data: UserData) => void;
  onNavigate: (page: 'dashboard' | 'planner' | 'calendar' | 'period') => void;
  onActivityClick: (date: string) => void;
  theme: ThemeColor;
  avatarSrc: string;
  onOpenCustomizer: () => void;
  syncStatus: SyncStatus;
}

function PersonalDashboard({
  userData,
  periodData,
  activities,
  onUpdateUserData,
  onNavigate,
  onActivityClick,
  theme,
  avatarSrc,
  onOpenCustomizer,
  syncStatus
}: PersonalDashboardProps) {
  const [quickTaskText, setQuickTaskText] = useState('');
  const today = startOfToday();
  const dayName = format(today, 'EEE') as DayOfWeek;
  const todaySchedule = userData.weeklySchedule[dayName] || { classes: [], tasks: [] };
  const themeDef = THEMES[theme] || THEMES.lavender;

  const calculateWeeklyPercentage = () => {
    if (!userData.habits || userData.habits.length === 0) return 0;
    const total = userData.habits.length * 7;
    let completed = 0;
    const days: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    userData.habits.forEach(habit => {
      days.forEach(day => {
        if (habit.completed && habit.completed[day]) completed++;
      });
    });
    return Math.round((completed / total) * 100);
  };

  const todayCompletedHabitsCount = useMemo(() => {
    if (!userData.habits) return 0;
    return userData.habits.filter(h => h.completed && h.completed[dayName]).length;
  }, [userData.habits, dayName]);

  const upcomingActivities = useMemo(() => {
    return activities
      .filter(a => {
        if (!a || !a.date) return false;
        try {
          const d = parseISO(a.date);
          if (isNaN(d.getTime())) return false;
          return isAfter(d, today) || isSameDay(d, today);
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return parseISO(a.date).getTime() - parseISO(b.date).getTime();
        } catch {
          return 0;
        }
      })
      .slice(0, 4);
  }, [activities, today]);

  // Current Cycle Phase Calculation
  const currentCyclePhase = useMemo(() => {
    if (!periodData.startDate) return null;
    try {
      const start = parseISO(periodData.startDate);
      const end = periodData.endDate ? parseISO(periodData.endDate) : null;
      const periodDuration = end ? Math.max(1, differenceInDays(end, start) + 1) : 5;
      const diff = differenceInDays(today, start);
      const cycleDay = ((diff % 28) + 28) % 28;

      if (end && isWithinInterval(today, { start, end })) return 'period';
      if (!end && isSameDay(today, start)) return 'period';
      if (cycleDay < periodDuration) return 'period';
      if (cycleDay < 12) return 'follicular';
      if (cycleDay < 16) return 'ovulation';
      if (cycleDay < 28) return 'luteal';
      return 'normal';
    } catch {
      return null;
    }
  }, [periodData, today]);

  const handleToggleTodayTask = (taskId: string) => {
    const newSchedule = { ...userData.weeklySchedule };
    newSchedule[dayName].tasks = newSchedule[dayName].tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdateUserData({ ...userData, weeklySchedule: newSchedule });
  };

  const handleAddQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskText.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      name: quickTaskText.trim(),
      completed: false
    };

    const newSchedule = { ...userData.weeklySchedule };
    newSchedule[dayName].tasks = [...(newSchedule[dayName].tasks || []), newTask];
    onUpdateUserData({ ...userData, weeklySchedule: newSchedule });
    setQuickTaskText('');
  };

  const weeklyPercent = calculateWeeklyPercentage();
  const completedTasksToday = todaySchedule.tasks.filter(t => t.completed).length;
  const totalTasksToday = todaySchedule.tasks.length;

  return (
    <div className="h-full w-full p-4 md:p-8 overflow-y-auto bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">
        
        {/* Welcome Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-7 rounded-2xl border border-slate-200/80 shadow-xs relative">
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenCustomizer}
              className="w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl overflow-hidden hover:ring-2 hover:ring-pink-300 transition-all cursor-pointer relative group bg-pink-50/50"
              title="Click to edit profile & popup features"
            >
              <img 
                src={avatarSrc} 
                alt="Grace" 
                referrerPolicy="no-referrer"
                className="w-14 h-14 object-contain drop-shadow-sm select-none transition-transform group-hover:scale-105"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-xs border border-pink-200 opacity-0 group-hover:opacity-100 transition-opacity">
                <Sliders size={10} className="text-pink-600" />
              </span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Personal Planner</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span className="text-xs font-semibold text-slate-500">{themeDef.name}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 font-serif">
                Hello, Grace! ✨
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                &ldquo;Small daily habits repeated consistently build a meaningful life.&rdquo;
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Cloud Sync Status Indicator */}
            <div 
              className="flex items-center rounded-xl text-xs font-bold transition-all"
              title={syncStatus === 'synced' ? 'All data saved to Firebase cloud' : syncStatus === 'syncing' ? 'Syncing data with Firebase...' : 'Using local cache'}
            >
              {syncStatus === 'synced' && (
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <Cloud size={13} className="text-emerald-500" />
                  <span>Cloud Saved</span>
                </div>
              )}
              {syncStatus === 'syncing' && (
                <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  <RefreshCw size={13} className="text-amber-500 animate-spin" />
                  <span>Syncing...</span>
                </div>
              )}
              {syncStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  <CloudOff size={13} className="text-slate-400" />
                  <span>Offline Saved</span>
                </div>
              )}
              {syncStatus === 'idle' && (
                <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Cloud size={13} className="text-slate-400" />
                  <span>Cloud Connected</span>
                </div>
              )}
            </div>

            <button
              onClick={onOpenCustomizer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pink-200 bg-pink-50/80 hover:bg-pink-100 text-pink-700 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102"
              title="Edit profile photo, title, links, containers, and popup colors"
            >
              <Sliders size={13} className="text-pink-600" />
              <span>Customize Profile & Popups</span>
            </button>
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
              {format(today, 'EEEE, MMMM d')}
            </span>
          </div>
        </header>

        {/* Top 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card 1: Weekly Habits */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Habits</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{weeklyPercent}%</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {todayCompletedHabitsCount} of {userData.habits.length} habits done today
              </p>
            </div>
            <div className={`p-3 rounded-xl ${themeDef.bgLight} ${themeDef.primaryText}`}>
              <CheckCircle2 size={24} />
            </div>
          </div>

          {/* Card 2: Today Tasks */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Tasks</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {completedTasksToday} / {totalTasksToday}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {totalTasksToday - completedTasksToday} remaining for {dayName}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <CheckSquare size={24} />
            </div>
          </div>

          {/* Card 3: Cycle Phase */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cycle Tracker</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 capitalize">
                {currentCyclePhase ? `${currentCyclePhase} Phase` : 'Logged'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {periodData.startDate ? 'Cycle tracked' : 'No cycle data recorded'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 text-rose-500">
              <Droplets size={24} />
            </div>
          </div>

        </div>

        {/* 2-Column Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (7 cols): Today's Schedule & Quick Checklist */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Today's Classes & Time Blocks */}
            <div className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-slate-500" />
                  <h3 className="font-bold text-base text-slate-900">
                    Today&apos;s Focus & Timetable ({dayName})
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('planner')}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <span>Edit in Timetable</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div className="space-y-2.5">
                {todaySchedule.classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-800">{cls.name}</p>
                      {cls.time && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock size={11} />
                          <span>{cls.time}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {todaySchedule.classes.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No time blocks scheduled for today.
                  </div>
                )}
              </div>
            </div>

            {/* Today's Tasks Checklist */}
            <div className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckSquare size={18} className="text-slate-500" />
                  <h3 className="font-bold text-base text-slate-900">
                    Today&apos;s Tasks Checklist
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {completedTasksToday}/{totalTasksToday} done
                </span>
              </div>

              {/* Quick Add Input */}
              <form onSubmit={handleAddQuickTask} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={quickTaskText}
                  onChange={(e) => setQuickTaskText(e.target.value)}
                  placeholder="Add a task for today..."
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white"
                />
                <button
                  type="submit"
                  className={`px-3 py-2 ${themeDef.primary} ${themeDef.primaryHover} text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs`}
                >
                  <Plus size={14} />
                  <span>Add</span>
                </button>
              </form>

              {/* Tasks List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {todaySchedule.tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTodayTask(task.id)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-400"
                    />
                    <span
                      className={`text-xs ${
                        task.completed ? 'line-through text-slate-400' : 'font-semibold text-slate-800'
                      }`}
                    >
                      {task.name}
                    </span>
                  </label>
                ))}

                {todaySchedule.tasks.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No tasks for today. Add one above!
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column (5 cols): Habit Progress & Upcoming Events */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Habits Matrix Snapshot */}
            <div className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className={themeDef.primaryText} />
                  <h3 className="font-bold text-base text-slate-900">
                    Habits Matrix Progress
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('planner')}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-600">Weekly Consistency</span>
                  <span className={themeDef.primaryText}>{weeklyPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${themeDef.primary} transition-all duration-500 rounded-full`}
                    style={{ width: `${weeklyPercent}%` }}
                  />
                </div>
              </div>

              {/* Habit list preview */}
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {userData.habits.map((habit) => {
                  const isDoneToday = habit.completed && habit.completed[dayName];
                  return (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {habit.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDoneToday
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isDoneToday ? 'Done Today' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Events (Sorted earliest first) */}
            <div className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={18} className="text-slate-500" />
                  <h3 className="font-bold text-base text-slate-900">
                    Upcoming Events
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('calendar')}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <span>Open Calendar</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div className="space-y-2.5">
                {upcomingActivities.map((act) => {
                  const actDate = parseISO(act.date);
                  const isActToday = isSameDay(actDate, today);

                  return (
                    <div
                      key={act.id}
                      onClick={() => onActivityClick(act.date)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs text-slate-900">{act.name}</p>
                          {isActToday && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700">
                              Today
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {format(actDate, 'MMM d')} • {act.time}
                        </p>
                      </div>
                      <ArrowRight size={13} className="text-slate-400" />
                    </div>
                  );
                })}

                {upcomingActivities.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No upcoming events. Click &quot;Open Calendar&quot; to plan one.
                  </div>
                )}
              </div>
            </div>

            {/* Pick My Brain / Productivity Profile Interactive Card */}
            <div className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
              <div className="w-full flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-pink-500" />
                  <h3 className="font-bold text-base text-slate-900">
                    Productivity Profile & Highlights
                  </h3>
                </div>
                <button
                  onClick={onOpenCustomizer}
                  className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Edit Studio</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-2">
                Click your photo to open your 5 life highlights. Tap any icon to view and edit its links, scriptures, containers, and colors.
              </p>

              <div className="w-full flex justify-center py-2">
                <BrainPicker size="md" readOnly={false} showEditTrigger={true} />
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

// --- Main App Root ---
export function App() {
  const [session, setSession] = useState<SessionInfo | null>(getActiveSession());
  const [activePage, setActivePage] = useState<'dashboard' | 'planner' | 'calendar' | 'period'>('dashboard');
  const [highlightDate, setHighlightDate] = useState<string | null>(null);

  // Theme selection state with localStorage persistence
  const [theme, setTheme] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem('grace_app_theme') as ThemeColor;
    return saved && THEMES[saved] ? saved : DEFAULT_THEME;
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const themeDef = THEMES[theme] || THEMES.lavender;

  // LocalStorage state for data
  const [userData, setUserData] = useState<UserData>(() => {
    const saved = localStorage.getItem('grace_tracker_data');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_USER_DATA;
  });

  const [periodData, setPeriodData] = useState<PeriodData>(() => {
    const saved = localStorage.getItem('tracker_period');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return { startDate: null, endDate: null, cycleLength: 28 };
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('tracker_activities');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_ACTIVITIES;
  });

  // Reactive profile photo (defaults to realistic studio headshot, or user's uploaded cutout)
  const [avatarSrc, setAvatarSrc] = useState<string>(() => {
    try {
      const cfg = getBrainConfig();
      return cfg.photoUrl || localStorage.getItem('grace_custom_avatar_cutout') || '/src/assets/images/grace_photo_head_1791402567931.jpg';
    } catch {
      return '/src/assets/images/grace_photo_head_1791402567931.jpg';
    }
  });

  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      try {
        const customEvent = e as CustomEvent<string>;
        if (customEvent.detail && typeof customEvent.detail === 'string') {
          setAvatarSrc(customEvent.detail);
        } else {
          const cfg = getBrainConfig();
          setAvatarSrc(cfg.photoUrl);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('grace_avatar_updated', handleAvatarUpdate);
    window.addEventListener('grace_brain_config_updated', handleAvatarUpdate);
    return () => {
      window.removeEventListener('grace_avatar_updated', handleAvatarUpdate);
      window.removeEventListener('grace_brain_config_updated', handleAvatarUpdate);
    };
  }, []);

  // Session expiry check (every 30 seconds)
  useEffect(() => {
    const checkSession = () => {
      const active = getActiveSession();
      if (!active && session) {
        setSession(null);
      }
    };
    const interval = setInterval(checkSession, 30000);
    return () => clearInterval(interval);
  }, [session]);

  // Sunday / Weekly Reset Logic
  const getResetData = (data: UserData): UserData => {
    const newSchedule = { ...data.weeklySchedule };
    (Object.keys(newSchedule) as DayOfWeek[]).forEach((day) => {
      newSchedule[day] = {
        ...newSchedule[day],
        tasks: [], // Reset tasks checklist for fresh week, preserve timetable
      };
    });

    const newHabits = (data.habits || []).map((habit) => ({
      ...habit,
      completed: {
        Sun: false, Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false
      },
    }));

    return {
      ...data,
      weeklySchedule: newSchedule,
      habits: newHabits,
      lastResetDate: startOfToday().toISOString(),
    };
  };

  // Reset Monitor
  useEffect(() => {
    if (!userData.lastResetDate) return;

    const checkReset = () => {
      const today = startOfToday();
      const lastReset = parseISO(userData.lastResetDate);
      const isSunday = format(today, 'EEE') === 'Sun';
      const alreadyResetToday = isSameDay(today, lastReset);
      const daysSinceLastReset = differenceInDays(today, lastReset);

      if ((isSunday && !alreadyResetToday) || daysSinceLastReset >= 7) {
        handleUpdateUserData(getResetData(userData));
      }
    };

    checkReset();
    const interval = setInterval(checkReset, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [userData.lastResetDate]);

  // Cloud Sync Status Tracking
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  useEffect(() => {
    return subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });
  }, []);

  // Initial cloud fetch from Firebase on boot
  useEffect(() => {
    let isMounted = true;
    const initCloudData = async () => {
      try {
        const remote = await loadAllFromFirebase();
        if (!isMounted || !remote) return;

        if (remote.userData) {
          setUserData(remote.userData);
          localStorage.setItem('grace_tracker_data', JSON.stringify(remote.userData));
        } else {
          // Seed cloud with initial user data
          saveUserDataToFirebase(userData).catch(() => {});
        }

        if (remote.periodData) {
          setPeriodData(remote.periodData);
          localStorage.setItem('tracker_period', JSON.stringify(remote.periodData));
        } else {
          savePeriodDataToFirebase(periodData).catch(() => {});
        }

        if (remote.activities) {
          setActivities(remote.activities);
          localStorage.setItem('tracker_activities', JSON.stringify(remote.activities));
        } else {
          saveActivitiesToFirebase(activities).catch(() => {});
        }

        if (remote.brainConfig) {
          const applied = applyRemoteBrainConfig(remote.brainConfig);
          if (applied.photoUrl) setAvatarSrc(applied.photoUrl);
        } else {
          saveBrainConfigToFirebase(getBrainConfig()).catch(() => {});
        }

        if (remote.theme && THEMES[remote.theme]) {
          setTheme(remote.theme);
          localStorage.setItem('grace_app_theme', remote.theme);
        } else {
          saveThemeToFirebase(theme).catch(() => {});
        }
      } catch (err) {
        console.warn('Initial cloud sync notice:', err);
      }
    };

    initCloudData();
    return () => { isMounted = false; };
  }, []);

  const handleUpdateUserData = (newData: UserData) => {
    setUserData(newData);
    localStorage.setItem('grace_tracker_data', JSON.stringify(newData));
    saveUserDataToFirebase(newData).catch((err) => console.warn('Cloud sync deferred:', err));
  };

  const handleUpdatePeriod = (start: string | null, end: string | null) => {
    const newData: PeriodData = { ...periodData, startDate: start, endDate: end };
    setPeriodData(newData);
    localStorage.setItem('tracker_period', JSON.stringify(newData));
    savePeriodDataToFirebase(newData).catch((err) => console.warn('Cloud sync deferred:', err));
  };

  const handleUpdateActivities = (newActivities: Activity[]) => {
    setActivities(newActivities);
    localStorage.setItem('tracker_activities', JSON.stringify(newActivities));
    saveActivitiesToFirebase(newActivities).catch((err) => console.warn('Cloud sync deferred:', err));
  };

  const handleSelectTheme = (newTheme: ThemeColor) => {
    setTheme(newTheme);
    localStorage.setItem('grace_app_theme', newTheme);
    saveThemeToFirebase(newTheme).catch((err) => console.warn('Cloud sync deferred:', err));
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  const handleActivityClick = (date: string) => {
    setHighlightDate(date);
    setActivePage('calendar');
  };

  // If not logged in, render the clean modern landing page as the entry point
  if (!session) {
    return (
      <LoginLanding 
        onLoginSuccess={() => setSession(getActiveSession())}
      />
    );
  }

  return (
    <div className="h-[100dvh] w-screen flex flex-col overflow-hidden bg-slate-50">
      
      {/* Top Navigation Bar - Desktop */}
      <nav className="hidden md:flex px-6 py-3.5 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-xs z-50 shadow-2xs">
        
        {/* Brand with Grace Only badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <img 
              src={avatarSrc} 
              alt="Grace" 
              referrerPolicy="no-referrer"
              className="w-10 h-10 object-contain drop-shadow-xs"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-black text-base text-slate-900 tracking-tight block leading-none">
                Kahewa Grace
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={11} className="text-slate-500" />
                Grace Only
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5 block">
              Personal Habit & Life Planner
            </span>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60">
          <button
            onClick={() => setActivePage('dashboard')}
            className={`
              flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all text-xs font-bold
              ${activePage === 'dashboard' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}
            `}
          >
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActivePage('planner')}
            className={`
              flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all text-xs font-bold
              ${activePage === 'planner' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}
            `}
          >
            <CheckSquare size={14} />
            <span>Habits & Schedule</span>
          </button>

          <button
            onClick={() => setActivePage('calendar')}
            className={`
              flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all text-xs font-bold
              ${activePage === 'calendar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}
            `}
          >
            <CalendarIcon size={14} />
            <span>Events</span>
          </button>

          <button
            onClick={() => setActivePage('period')}
            className={`
              flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all text-xs font-bold
              ${activePage === 'period' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}
            `}
          >
            <Droplets size={14} />
            <span>Cycle Tracker</span>
          </button>
        </div>

        {/* Right Controls: Cloud Status & Customize Popups & Theme Selector & Profile & Logout */}
        <div className="flex items-center gap-2">
          
          {/* Cloud Sync Status Badge */}
          <div 
            className="hidden lg:flex items-center rounded-xl text-xs font-bold transition-all"
            title={syncStatus === 'synced' ? 'All data safely saved to Firebase cloud' : syncStatus === 'syncing' ? 'Syncing data with Firebase...' : 'Using local cache'}
          >
            {syncStatus === 'synced' && (
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                <Cloud size={13} className="text-emerald-500" />
                <span>Cloud Saved</span>
              </div>
            )}
            {syncStatus === 'syncing' && (
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200">
                <RefreshCw size={13} className="text-amber-500 animate-spin" />
                <span>Syncing...</span>
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <CloudOff size={13} className="text-slate-400" />
                <span>Offline Saved</span>
              </div>
            )}
            {syncStatus === 'idle' && (
              <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <Cloud size={13} className="text-slate-400" />
                <span>Cloud Ready</span>
              </div>
            )}
          </div>

          {/* Customize Features & Popups Studio Button */}
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pink-200 bg-pink-50/80 hover:bg-pink-100 text-pink-700 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102"
            title="Edit profile photo, title, links, containers, and popup colors"
          >
            <Sliders size={13} className="text-pink-600" />
            <span className="hidden sm:inline">Edit Profile & Popups</span>
          </button>

          {/* Theme Palette Picker Button */}
          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            title="Change color theme"
          >
            <div 
              className="w-3.5 h-3.5 rounded-full shadow-2xs" 
              style={{ backgroundColor: themeDef.previewColor }} 
            />
            <span className="hidden xl:inline">{themeDef.name}</span>
            <Palette size={13} className="text-slate-400" />
          </button>

          {/* Profile Session Tag */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-slate-700">Grace</span>
            <span className="text-[10px] text-slate-400 font-medium">1-hr</span>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
            title="Lock journal & logout"
          >
            <LogOut size={14} />
            <span className="hidden lg:inline">Lock</span>
          </button>

        </div>
      </nav>

      {/* Main Page Content */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activePage === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 top-0 bottom-[68px] md:bottom-0"
            >
              <PersonalDashboard 
                userData={userData}
                periodData={periodData}
                activities={activities}
                onUpdateUserData={handleUpdateUserData}
                onNavigate={setActivePage}
                onActivityClick={handleActivityClick}
                theme={theme}
                avatarSrc={avatarSrc}
                onOpenCustomizer={() => setIsCustomizerOpen(true)}
                syncStatus={syncStatus}
              />
            </motion.div>
          )}

          {activePage === 'planner' && (
            <motion.div
              key="planner"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 top-0 bottom-[68px] md:bottom-0"
            >
              <TaskTracker 
                name="Grace"
                data={userData}
                onUpdate={handleUpdateUserData}
                activities={activities}
                onActivityClick={handleActivityClick}
                theme={theme}
              />
            </motion.div>
          )}

          {activePage === 'calendar' && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 top-0 bottom-[68px] md:bottom-0"
            >
              <Activities 
                activities={activities}
                onUpdate={handleUpdateActivities}
                highlightDate={highlightDate}
                onClearHighlight={() => setHighlightDate(null)}
                theme={theme}
              />
            </motion.div>
          )}

          {activePage === 'period' && (
            <motion.div
              key="period"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 top-0 bottom-[68px] md:bottom-0"
            >
              <PeriodTracker 
                startDate={periodData.startDate}
                endDate={periodData.endDate}
                onUpdate={handleUpdatePeriod}
                theme={theme}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 py-2.5 flex items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-lg">
        <button
          onClick={() => setActivePage('dashboard')}
          className={`flex flex-col items-center gap-1 transition-all py-1 px-2 rounded-xl ${
            activePage === 'dashboard' ? 'text-slate-900 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[9px] uppercase tracking-wider">Home</span>
        </button>

        <button
          onClick={() => setActivePage('planner')}
          className={`flex flex-col items-center gap-1 transition-all py-1 px-2 rounded-xl ${
            activePage === 'planner' ? 'text-slate-900 font-bold' : 'text-slate-400'
          }`}
        >
          <CheckSquare size={20} />
          <span className="text-[9px] uppercase tracking-wider">Habits</span>
        </button>

        <button
          onClick={() => setActivePage('calendar')}
          className={`flex flex-col items-center gap-1 transition-all py-1 px-2 rounded-xl ${
            activePage === 'calendar' ? 'text-slate-900 font-bold' : 'text-slate-400'
          }`}
        >
          <CalendarIcon size={20} />
          <span className="text-[9px] uppercase tracking-wider">Events</span>
        </button>

        <button
          onClick={() => setActivePage('period')}
          className={`flex flex-col items-center gap-1 transition-all py-1 px-2 rounded-xl ${
            activePage === 'period' ? 'text-slate-900 font-bold' : 'text-slate-400'
          }`}
        >
          <Droplets size={20} />
          <span className="text-[9px] uppercase tracking-wider">Cycle</span>
        </button>

        <button
          onClick={() => setIsCustomizerOpen(true)}
          className="flex flex-col items-center gap-1 transition-all py-1 px-2 rounded-xl text-pink-500 hover:text-pink-600"
          title="Customize Profile & Popups Studio"
        >
          <Sliders size={20} />
          <span className="text-[9px] uppercase tracking-wider font-bold">Studio</span>
        </button>

        <button
          onClick={() => setIsThemeModalOpen(true)}
          className="flex flex-col items-center gap-1 transition-all py-1 px-2 rounded-xl text-slate-400"
        >
          <Palette size={20} />
          <span className="text-[9px] uppercase tracking-wider">Theme</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 transition-all py-1 px-2 rounded-xl text-slate-400 hover:text-rose-500"
        >
          <LogOut size={20} />
          <span className="text-[9px] uppercase tracking-wider">Lock</span>
        </button>
      </nav>

      {/* Theme Selection Modal */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={theme}
        onSelectTheme={handleSelectTheme}
      />

      {/* Profile & Popups In-App Customizer Studio */}
      <BrainCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
      />

    </div>
  );
}

export default function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
