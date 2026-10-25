/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DayOfWeek = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface Habit {
  id: string;
  name: string;
  completed: Record<DayOfWeek, boolean>;
}

export interface ClassEvent {
  id: string;
  name: string;
  time?: string;
}

export interface Task {
  id: string;
  name: string;
  completed: boolean;
}

export interface DayData {
  classes: ClassEvent[];
  tasks: Task[];
}

export interface Activity {
  id: string;
  name: string;
  time: string;
  date: string; // ISO string
  category?: 'general' | 'work' | 'health' | 'personal' | 'study';
}

export type ProjectStatus = 'not_started' | 'in_progress' | 'complete';

export interface ProjectTask {
  id: string;
  name: string;
  status: ProjectStatus;
  dueDate: string | null; // yyyy-MM-dd, optional
  completedAt?: string | null; // ISO string, set when marked complete
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  dueDate: string | null; // yyyy-MM-dd, optional
  tasks: ProjectTask[];
  createdAt: string; // ISO string
}

export interface UserData {
  habits: Habit[];
  weeklySchedule: Record<DayOfWeek, DayData>;
  lastResetDate: string; // ISO string
  projects?: Project[]; // not reset weekly
}

export interface PeriodData {
  startDate: string | null; // ISO string
  endDate: string | null; // ISO string
  cycleLength: number; // default 28
}

export type ThemeColor = 'blush' | 'lavender' | 'rose' | 'ocean' | 'emerald' | 'amber' | 'indigo';
