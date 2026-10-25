/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Project, ProjectStatus } from '../types';

export type Urgency = 'overdue' | 'today' | 'soon' | 'upcoming' | 'none';

export const STATUS_META: Record<ProjectStatus, { label: string; dot: string; chip: string; solid: string; edge: string; ring: string }> = {
  not_started: {
    label: 'Not started',
    dot: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-700 border border-slate-200',
    solid: 'bg-slate-600 text-white shadow-md shadow-slate-600/30',
    edge: 'border-l-slate-400',
    ring: 'ring-slate-300'
  },
  in_progress: {
    label: 'In progress',
    dot: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-800 border border-amber-200',
    solid: 'bg-amber-500 text-white shadow-md shadow-amber-500/40',
    edge: 'border-l-amber-500',
    ring: 'ring-amber-300'
  },
  complete: {
    label: 'Complete',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    solid: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40',
    edge: 'border-l-emerald-500',
    ring: 'ring-emerald-300'
  }
};

/** Earliest unfinished deadline: the project's own date or any open task's date. */
export function nearestDeadline(project: Project): string | null {
  const dates = [
    ...(project.dueDate ? [project.dueDate] : []),
    ...project.tasks.filter((t) => t.status !== 'complete' && t.dueDate).map((t) => t.dueDate as string)
  ].sort();
  return dates[0] || null;
}

/** 'alert' when a deadline is within 3 days (or passed) and work remains; 'done' when every task is complete. */
export function projectHealth(project: Project, today: Date): 'alert' | 'done' | 'normal' {
  const { isDone } = projectProgress(project);
  if (isDone) return 'done';
  const urgency = getUrgency(nearestDeadline(project), today);
  return urgency === 'overdue' || urgency === 'today' || urgency === 'soon' ? 'alert' : 'normal';
}

export const URGENCY_META: Record<Urgency, { chip: string; rank: number }> = {
  overdue: { chip: 'bg-rose-100 text-rose-700', rank: 0 },
  today: { chip: 'bg-orange-100 text-orange-700', rank: 1 },
  soon: { chip: 'bg-amber-100 text-amber-800', rank: 2 },
  upcoming: { chip: 'bg-slate-100 text-slate-600', rank: 3 },
  none: { chip: 'bg-slate-100 text-slate-500', rank: 4 }
};

/** Days until due (negative = overdue). Null when there is no date. */
export function daysUntil(dueDate: string | null, today: Date): number | null {
  if (!dueDate) return null;
  try {
    return differenceInCalendarDays(parseISO(dueDate), today);
  } catch {
    return null;
  }
}

export function getUrgency(dueDate: string | null, today: Date, done = false): Urgency {
  const d = daysUntil(dueDate, today);
  if (d === null || done) return 'none';
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 3) return 'soon';
  return 'upcoming';
}

export function dueLabel(dueDate: string | null, today: Date): string {
  const d = daysUntil(dueDate, today);
  if (d === null || !dueDate) return 'No date';
  if (d < -1) return `${-d} days overdue`;
  if (d === -1) return 'Overdue by 1 day';
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  if (d <= 6) return `Due ${format(parseISO(dueDate), 'EEEE')}`;
  return `Due ${format(parseISO(dueDate), 'MMM d')}`;
}

export function projectProgress(project: Project) {
  const total = project.tasks.length;
  const complete = project.tasks.filter((t) => t.status === 'complete').length;
  const inProgress = project.tasks.filter((t) => t.status === 'in_progress').length;
  return {
    total,
    complete,
    inProgress,
    notStarted: total - complete - inProgress,
    percent: total ? Math.round((complete / total) * 100) : 0,
    isDone: total > 0 && complete === total
  };
}
