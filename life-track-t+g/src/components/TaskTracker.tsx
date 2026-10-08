/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  format, 
  startOfToday, 
} from 'date-fns';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  Pencil, 
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock
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
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(format(startOfToday(), 'EEE') as DayOfWeek);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'habit' | 'class' | 'task';
    mode: 'add' | 'edit';
    day?: DayOfWeek;
    item?: Habit | ClassEvent | Task;
  }>({ isOpen: false, type: 'habit', mode: 'add' });

  const [formData, setFormData] = useState({ name: '', time: '' });
  const themeDef = THEMES[theme] || THEMES.lavender;

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
  const currentDaySchedule = data.weeklySchedule[selectedDay] || { classes: [], tasks: [] };

  return (
    <div className="h-full w-full p-4 md:p-8 overflow-y-auto bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{name}&apos;s Workspace</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs font-semibold text-slate-600">Habits & Weekly Schedule</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1 font-serif">
              Habits & Weekly Timetable
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily rhythms, study time-blocks & intentional habit tracking
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            <div className={`p-2 rounded-lg ${themeDef.primary} text-white shadow-xs`}>
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Weekly Completion</p>
              <p className="text-base font-black text-slate-900">{weeklyPercent}% complete</p>
            </div>
          </div>
        </div>

        {/* SECTION 1: Weekly Habits Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-slate-600" />
              <h3 className="font-bold text-base text-slate-900">Weekly Habits Matrix</h3>
            </div>
            <button
              onClick={() => openModal('habit', 'add')}
              className={`px-3.5 py-1.5 rounded-xl ${themeDef.primary} ${themeDef.primaryHover} text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95`}
            >
              <Plus size={14} />
              <span>Add Habit</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3">Habit Name</th>
                  {DAYS.map((d) => (
                    <th key={d} className="py-3 px-2 text-center w-12">{d}</th>
                  ))}
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {(data.habits || []).map((habit) => (
                  <tr key={habit.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      {habit.name}
                    </td>
                    {DAYS.map((d) => (
                      <td key={d} className="py-3 px-2 text-center">
                        <button
                          onClick={() => toggleHabit(habit.id, d)}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition-all ${
                            habit.completed && habit.completed[d]
                              ? `${themeDef.primary} border-transparent text-white shadow-xs`
                              : 'border-slate-300 hover:border-slate-400 bg-white text-transparent'
                          }`}
                          aria-label={`Toggle ${habit.name} for ${d}`}
                        >
                          {habit.completed && habit.completed[d] && <CheckCircle2 size={16} strokeWidth={2.5} />}
                        </button>
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openModal('habit', 'edit', undefined, habit)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                          title="Edit Habit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteHabit(habit.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          title="Delete Habit"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data.habits || data.habits.length === 0) && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 text-sm">
                      No habits tracked yet. Click &quot;Add Habit&quot; above to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: Weekly Timetable & Daily Schedule */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="font-bold text-base text-slate-900">Weekly Schedule & Tasks</h3>
              <p className="text-xs text-slate-500">Select a day of the week to view or organize its schedule</p>
            </div>

            {/* Day Selector Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    selectedDay === d
                      ? `${themeDef.primary} text-white shadow-xs`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Timetable / Classes */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-500" />
                  <h4 className="font-bold text-sm text-slate-800">
                    {selectedDay} Time Blocks
                  </h4>
                </div>
                <button
                  onClick={() => openModal('class', 'add', selectedDay)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Add Block</span>
                </button>
              </div>

              <div className="space-y-2">
                {currentDaySchedule.classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-2xs group"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-900">{cls.name}</p>
                      {cls.time && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock size={11} />
                          <span>{cls.time}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => openModal('class', 'edit', selectedDay, cls)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteClass(selectedDay, cls.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {currentDaySchedule.classes.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No scheduled events for {selectedDay}.
                  </div>
                )}
              </div>
            </div>

            {/* Daily Checklist Tasks */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare size={16} className="text-slate-500" />
                  <h4 className="font-bold text-sm text-slate-800">
                    {selectedDay} Tasks
                  </h4>
                </div>
                <button
                  onClick={() => openModal('task', 'add', selectedDay)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Add Task</span>
                </button>
              </div>

              <div className="space-y-2">
                {currentDaySchedule.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-2xs group"
                  >
                    <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(selectedDay, task.id)}
                        className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-400"
                      />
                      <span className={`text-sm ${task.completed ? 'line-through text-slate-400' : 'font-medium text-slate-800'}`}>
                        {task.name}
                      </span>
                    </label>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => openModal('task', 'edit', selectedDay, task)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteTask(selectedDay, task.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {currentDaySchedule.tasks.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No tasks for {selectedDay}.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Add / Edit Item Modal */}
      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-base text-slate-900 mb-4 capitalize">
                {modal.mode} {modal.type}
              </h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={`Enter ${modal.type} title`}
                    required
                    autoFocus
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-800"
                  />
                </div>

                {modal.type === 'class' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Time / Duration (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      placeholder="e.g. 10:00 AM - 11:30 AM"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-800"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModal({ ...modal, isOpen: false })}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-xs font-bold text-white ${themeDef.primary} ${themeDef.primaryHover} rounded-xl shadow-xs`}
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
