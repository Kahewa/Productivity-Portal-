/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, ErrorInfo, ReactNode } from 'react';
import { startOfWeek, isSameDay, parseISO, format, startOfToday, differenceInDays } from 'date-fns';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Droplets, 
  LogOut,
  ArrowRight,
  ShieldCheck,
  Palette,
  Sliders,
  FolderKanban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TaskTracker from './components/TaskTracker';
import Activities from './components/Activities';
import PeriodTracker from './components/PeriodTracker';
import ProjectTracker from './components/ProjectTracker';
import LoginLanding from './components/LoginLanding';
import ThemeModal from './components/ThemeModal';
import Dashboard, { SyncBadge, PageId } from './components/Dashboard';
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
import { UserData, PeriodData, DayOfWeek, Activity, ThemeColor } from './types';
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

const NAV_ITEMS: { id: PageId; label: string; short: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { id: 'planner', label: 'Habits & Schedule', short: 'Habits', icon: CheckSquare },
  { id: 'projects', label: 'Projects', short: 'Projects', icon: FolderKanban },
  { id: 'calendar', label: 'Events', short: 'Events', icon: CalendarIcon },
  { id: 'period', label: 'Cycle Tracker', short: 'Cycle', icon: Droplets }
];

function SidebarButton({
  active,
  onClick,
  icon,
  label,
  accent,
  trailing
}: {
  active?: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  accent: string;
  trailing?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] transition-all ${
        active ? 'glass-strong font-semibold text-slate-900' : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
      }`}
    >
      <span style={active ? { color: accent } : undefined} className={active ? '' : 'text-slate-400'}>{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {trailing}
    </button>
  );
}


// --- Main App Root ---
export function App() {
  const [session, setSession] = useState<SessionInfo | null>(getActiveSession());
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [highlightDate, setHighlightDate] = useState<string | null>(null);

  // Theme selection state with localStorage persistence
  const [theme, setTheme] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem('grace_app_theme') as ThemeColor;
    return saved && THEMES[saved] ? saved : DEFAULT_THEME;
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const themeDef = THEMES[theme] || THEMES[DEFAULT_THEME];

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
    <div
      className="ambient-bg h-[100dvh] w-screen flex overflow-hidden md:p-4 font-display"
      style={{ '--accent': themeDef.accent, '--accent-alt': themeDef.accentAlt } as React.CSSProperties}
    >
      <div className="flex-1 flex overflow-hidden md:rounded-[28px] md:border md:border-white/80 md:bg-white/35 md:backdrop-blur-xl md:shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)]">

        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col gap-1 px-4 py-6 border-r border-white/70 bg-white/30 overflow-y-auto">
          <div className="flex items-center gap-2.5 px-2 mb-7">
            <img
              src={avatarSrc}
              alt="Grace"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover bg-white border border-white shadow-sm"
            />
            <div className="min-w-0">
              <p className="font-semibold text-[15px] text-slate-900 leading-tight truncate">
                Grace<span style={{ color: themeDef.accent }}>.</span>Planner
              </p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck size={10} /> Grace Only
              </p>
            </div>
          </div>

          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Overview</p>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <SidebarButton
              key={id}
              active={activePage === id}
              onClick={() => setActivePage(id)}
              icon={<Icon size={17} />}
              label={label}
              accent={themeDef.accent}
            />
          ))}

          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-6 mb-1">Studio</p>
          <SidebarButton
            onClick={() => setIsCustomizerOpen(true)}
            icon={<Sliders size={17} />}
            label="Profile & Popups"
            accent={themeDef.accent}
          />
          <SidebarButton
            onClick={() => setIsThemeModalOpen(true)}
            icon={<Palette size={17} />}
            label={themeDef.name}
            accent={themeDef.accent}
            trailing={<span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: themeDef.previewColor }} />}
          />
          <div className="px-3.5 py-2">
            <SyncBadge status={syncStatus} />
          </div>

          {/* Weekly reset card */}
          <div className="mt-auto pt-6">
            <div className="glass rounded-3xl p-4 text-center">
              <div className="text-2xl">🗓️</div>
              <p className="font-semibold text-sm text-slate-900 mt-1">Plan your week</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Tasks reset every Sunday. Map out the days ahead.</p>
              <button
                onClick={() => setActivePage('planner')}
                className="accent-fill mt-3 w-full py-2 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <ArrowRight size={13} /> Open Schedule
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50/70 transition-colors"
              title="Lock journal & logout"
            >
              <LogOut size={14} /> Lock Planner
            </button>
          </div>
        </aside>

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
                <Dashboard
                  userData={userData}
                  periodData={periodData}
                  onUpdateUserData={handleUpdateUserData}
                  onNavigate={setActivePage}
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

            {activePage === 'projects' && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-x-0 top-0 bottom-[68px] md:bottom-0"
              >
                <ProjectTracker
                  data={userData}
                  onUpdate={handleUpdateUserData}
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
                  projects={userData.projects || []}
                  onOpenProjects={() => setActivePage('projects')}
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
      </div>

      {/* Bottom Navigation - Mobile */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50 px-1 py-2 flex items-center justify-around rounded-2xl glass-strong">
        {NAV_ITEMS.map(({ id, short, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActivePage(id)}
            className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl transition-all ${
              activePage === id ? 'font-semibold text-slate-900' : 'text-slate-400'
            }`}
            style={activePage === id ? { color: themeDef.accent } : undefined}
          >
            <Icon size={20} />
            <span className="text-[9px] uppercase tracking-wider">{short}</span>
          </button>
        ))}
        <button
          onClick={() => setIsThemeModalOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-slate-400"
        >
          <Palette size={20} />
          <span className="text-[9px] uppercase tracking-wider">Theme</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-slate-400 hover:text-rose-500"
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
