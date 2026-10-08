/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfToday,
  isAfter,
  parseISO,
  isBefore,
  endOfDay
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Clock,
  Calendar as CalendarIcon,
  Tag,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ThemeColor } from '../types';
import { THEMES, DEFAULT_THEME } from '../theme';

interface ActivitiesProps {
  activities: Activity[];
  onUpdate: (activities: Activity[]) => void;
  highlightDate?: string | null;
  onClearHighlight?: () => void;
  theme?: ThemeColor;
}

const CATEGORIES: { id: Activity['category']; label: string; badgeClass: string }[] = [
  { id: 'general', label: 'General', badgeClass: 'bg-slate-100 text-slate-700' },
  { id: 'personal', label: 'Personal', badgeClass: 'bg-violet-100 text-violet-700' },
  { id: 'work', label: 'Work / Career', badgeClass: 'bg-blue-100 text-blue-700' },
  { id: 'health', label: 'Health & Wellness', badgeClass: 'bg-emerald-100 text-emerald-700' },
  { id: 'study', label: 'Study & Learning', badgeClass: 'bg-amber-100 text-amber-700' },
];

export default function Activities({
  activities,
  onUpdate,
  highlightDate,
  onClearHighlight,
  theme = DEFAULT_THEME,
}: ActivitiesProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formCategory, setFormCategory] = useState<Activity['category']>('general');
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  const themeDef = THEMES[theme] || THEMES.lavender;
  const today = startOfToday();

  // Scroll to highlight date if redirected from dashboard
  useEffect(() => {
    if (highlightDate) {
      try {
        const parsed = parseISO(highlightDate);
        setSelectedDate(parsed);
        setCurrentMonth(parsed);
        if (highlightedRef.current) {
          highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch {
        // ignore invalid date
      }
    }
  }, [highlightDate]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Upcoming events strictly sorted by earliest date first
  const upcomingEvents = useMemo(() => {
    return activities
      .filter((a) => {
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
      });
  }, [activities, today]);

  const pastEvents = useMemo(() => {
    return activities
      .filter((a) => {
        if (!a || !a.date) return false;
        try {
          const d = parseISO(a.date);
          if (isNaN(d.getTime())) return false;
          return isBefore(d, endOfDay(today)) && !isSameDay(d, today);
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return parseISO(b.date).getTime() - parseISO(a.date).getTime();
        } catch {
          return 0;
        }
      });
  }, [activities, today]);

  const selectedDateEvents = useMemo(() => {
    return activities.filter((a) => {
      try {
        return isSameDay(parseISO(a.date), selectedDate);
      } catch {
        return false;
      }
    });
  }, [activities, selectedDate]);

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const newActivity: Activity = {
      id: crypto.randomUUID(),
      name: formName.trim(),
      time: formTime.trim() || 'All Day',
      date: selectedDate.toISOString(),
      category: formCategory,
    };

    onUpdate([...activities, newActivity]);
    setFormName('');
    setFormTime('');
    setFormCategory('general');
    setIsModalOpen(false);
  };

  const handleDeleteActivity = (id: string) => {
    onUpdate(activities.filter((a) => a.id !== id));
  };

  const getCategoryBadge = (cat?: Activity['category']) => {
    const item = CATEGORIES.find((c) => c.id === cat) || CATEGORIES[0];
    return item.badgeClass;
  };

  return (
    <div className="h-full w-full p-4 md:p-8 overflow-y-auto bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Events & Schedule</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs font-semibold text-slate-600">Calendar Agenda</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1 font-serif">
              Calendar & Upcoming Events
            </h2>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className={`px-4 py-2.5 rounded-xl ${themeDef.primary} ${themeDef.primaryHover} text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-transform active:scale-95`}
          >
            <Plus size={16} />
            <span>Add Event for {format(selectedDate, 'MMM d')}</span>
          </button>
        </div>

        {/* 2-Column Calendar & Events Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Calendar Month Grid (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs flex flex-col justify-between">
            <div>
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <p className="text-xs text-slate-500">Click any date to view or add events</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setCurrentMonth(new Date());
                      setSelectedDate(startOfToday());
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-[11px] font-bold text-slate-400 py-1 uppercase">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty padding for month start */}
                {[...Array(monthDays[0]?.getDay() || 0)].map((_, i) => (
                  <div key={`empty-${i}`} className="h-14 rounded-xl opacity-0" />
                ))}

                {monthDays.map((d) => {
                  const isSel = isSameDay(d, selectedDate);
                  const isCurrentDay = isSameDay(d, today);
                  const dayEvents = activities.filter((a) => {
                    try {
                      return isSameDay(parseISO(a.date), d);
                    } catch {
                      return false;
                    }
                  });

                  return (
                    <button
                      key={d.toISOString()}
                      onClick={() => {
                        setSelectedDate(d);
                        if (onClearHighlight) onClearHighlight();
                      }}
                      className={`
                        h-14 p-1.5 rounded-xl border flex flex-col justify-between items-start transition-all text-left
                        ${isSel
                          ? 'border-slate-800 bg-slate-50 ring-2 ring-slate-800/10'
                          : isCurrentDay
                          ? `${themeDef.borderLight} ${themeDef.bgLight}`
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }
                      `}
                    >
                      <span className={`
                        text-xs font-bold w-5 h-5 rounded-md flex items-center justify-center
                        ${isSel ? 'bg-slate-900 text-white' : isCurrentDay ? `${themeDef.primary} text-white` : 'text-slate-700'}
                      `}>
                        {format(d, 'd')}
                      </span>

                      {dayEvents.length > 0 && (
                        <div className="flex items-center gap-1 w-full overflow-hidden">
                          <span className={`w-1.5 h-1.5 rounded-full ${themeDef.primary} shrink-0`} />
                          <span className="text-[9px] font-bold text-slate-500 truncate">
                            {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Summary */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Selected Day</p>
                <p className="text-sm font-black text-slate-800">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                {selectedDateEvents.length} scheduled
              </span>
            </div>
          </div>

          {/* Agenda & Upcoming List (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Events for Selected Date */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} className="text-slate-500" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Schedule for {format(selectedDate, 'MMM d')}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto">
                {selectedDateEvents.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getCategoryBadge(act.category)}`}>
                          {act.category || 'General'}
                        </span>
                        <p className="font-bold text-sm text-slate-800">{act.name}</p>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Clock size={11} />
                        <span>{act.time}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteActivity(act.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete event"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                {selectedDateEvents.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No events scheduled for this day. Click &quot;Add Event&quot; to plan one.
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Agenda (Sorted earliest first) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className={themeDef.primaryText} />
                  <h3 className="font-bold text-sm text-slate-900">
                    Upcoming Events (Earliest First)
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {upcomingEvents.length} total
                </span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {upcomingEvents.map((act) => {
                  const actDate = parseISO(act.date);
                  const isActToday = isSameDay(actDate, today);

                  return (
                    <div
                      key={act.id}
                      onClick={() => {
                        setSelectedDate(actDate);
                        setCurrentMonth(actDate);
                      }}
                      className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`px-2.5 py-1.5 rounded-lg text-center ${isActToday ? `${themeDef.primary} text-white` : 'bg-slate-100 text-slate-700'}`}>
                          <p className="text-[10px] font-bold uppercase leading-none">{format(actDate, 'MMM')}</p>
                          <p className="text-sm font-black leading-tight">{format(actDate, 'd')}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-sm text-slate-900">{act.name}</p>
                            {isActToday && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                Today
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {format(actDate, 'EEEE')} • {act.time}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteActivity(act.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}

                {upcomingEvents.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No upcoming events scheduled.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-base text-slate-900 mb-1">
                Add Event
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Scheduled for {format(selectedDate, 'MMMM d, yyyy')}
              </p>

              <form onSubmit={handleAddActivity} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Doctor Appointment, Exam, Birthday"
                    required
                    autoFocus
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Time / Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="e.g. 2:00 PM or Morning"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as Activity['category'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-800 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-xs font-bold text-white ${themeDef.primary} ${themeDef.primaryHover} rounded-xl shadow-xs`}
                  >
                    Add Event
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
