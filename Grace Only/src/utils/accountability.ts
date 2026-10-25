/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayOfWeek, UserData } from '../types';
import { daysUntil, dueLabel, nearestDeadline, projectHealth, projectProgress } from './projects';

const DAYS: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type HealthStatus = 'on_track' | 'slipping' | 'unattended';

export interface HealthArea {
  key: 'tasks' | 'habits' | 'projects';
  label: string;
  score: number | null; // 0-100, null when nothing is expected yet
  message: string;
}

export interface HealthReport {
  score: number;
  status: HealthStatus;
  headline: string;
  areas: HealthArea[];
}

/**
 * How much of today "should" be done by now. Before 8am nothing is expected;
 * by 8pm everything is. Keeps the card from shouting at you over breakfast.
 */
export function dayPace(now: Date): number {
  const hours = now.getHours() + now.getMinutes() / 60;
  return Math.min(1, Math.max(0, (hours - 8) / 12));
}

/** Items each carry an expectation weight (0-1) and progress (0-1). */
function scoreItems(items: { expected: number; progress: number }[]): number | null {
  const expected = items.reduce((a, i) => a + i.expected, 0);
  if (expected <= 0) return null;
  const earned = items.filter((i) => i.expected > 0).reduce((a, i) => a + i.progress, 0);
  return Math.round(Math.min(1, earned / expected) * 100);
}

export function buildHealthReport(userData: UserData, scope: 'today' | 'week', now: Date): HealthReport {
  const todayIdx = now.getDay();
  const pace = dayPace(now);
  const expectFor = (dayIdx: number) =>
    scope === 'today' ? (dayIdx === todayIdx ? pace : 0) : dayIdx < todayIdx ? 1 : dayIdx === todayIdx ? pace : 0;
  const period = scope === 'today' ? 'today' : 'this week';

  // Tasks
  const taskItems: { expected: number; progress: number }[] = [];
  let tasksDue = 0;
  let tasksDone = 0;
  DAYS.forEach((d, i) => {
    const inScope = scope === 'today' ? i === todayIdx : i <= todayIdx;
    (userData.weeklySchedule[d]?.tasks || []).forEach((t) => {
      taskItems.push({ expected: expectFor(i), progress: t.completed ? 1 : 0 });
      if (inScope) {
        tasksDue++;
        if (t.completed) tasksDone++;
      }
    });
  });
  const tasksScore = scoreItems(taskItems);
  let tasksMsg: string;
  if (tasksDue === 0) tasksMsg = `No tasks planned ${period}.`;
  else if (tasksDone === tasksDue) tasksMsg = `You completed all ${tasksDue} of ${period}'s tasks.`;
  else if (tasksDone === 0) tasksMsg = `You haven't completed any of ${period}'s ${tasksDue} tasks yet.`;
  else tasksMsg = `You've completed ${tasksDone} of ${tasksDue} tasks ${period} — ${tasksDue - tasksDone} still open.`;

  // Habits
  const habits = userData.habits || [];
  const habitItems: { expected: number; progress: number }[] = [];
  let checkIns = 0;
  let slots = 0;
  habits.forEach((h) => {
    DAYS.forEach((d, i) => {
      const done = !!h.completed?.[d];
      habitItems.push({ expected: expectFor(i), progress: done ? 1 : 0 });
      const inScope = scope === 'today' ? i === todayIdx : i <= todayIdx;
      if (inScope) {
        slots++;
        if (done) checkIns++;
      }
    });
  });
  const habitsScore = scoreItems(habitItems);
  let habitsMsg: string;
  if (habits.length === 0) habitsMsg = 'No habits set up yet.';
  else if (checkIns === slots) habitsMsg = `Every habit checked in ${period}. Beautiful consistency.`;
  else if (checkIns === 0) habitsMsg = `No habit check-ins ${period} yet.`;
  else habitsMsg = `${checkIns} of ${slots} habit check-ins done ${period}.`;

  // Projects: judged by the same rule as the dashboard project cards (projectHealth), so a card
  // flashing red is always reflected here. Projects due soon count in full; in week view anything
  // due later this week counts at half weight. In-progress tasks earn half credit.
  const projectItems: { expected: number; progress: number }[] = [];
  const overdueNames: string[] = [];
  const dueSoon: { name: string; label: string; done: number; total: number }[] = [];
  let laterThisWeek = 0;
  (userData.projects || []).forEach((p) => {
    const health = projectHealth(p, now);
    if (health === 'done') return;
    const deadline = nearestDeadline(p);
    const d = daysUntil(deadline, now);
    if (d === null) return;
    const prog = projectProgress(p);
    const progress = prog.total ? (prog.complete + prog.inProgress * 0.5) / prog.total : 0;
    if (health === 'alert') {
      projectItems.push({ expected: 1, progress });
      if (d < 0) overdueNames.push(p.name);
      else dueSoon.push({ name: p.name, label: dueLabel(deadline, now).toLowerCase(), done: prog.complete, total: prog.total });
    } else if (scope === 'week' && d <= 6 - todayIdx) {
      projectItems.push({ expected: 0.5, progress });
      laterThisWeek++;
    }
  });
  const overdue = overdueNames.length;
  const projectsScore = scoreItems(projectItems);
  const list = (names: string[]) => (names.length <= 2 ? names.join(' & ') : `${names.slice(0, 2).join(', ')} +${names.length - 2} more`);
  let projectsMsg: string;
  if ((userData.projects || []).length === 0) projectsMsg = 'No projects yet.';
  else if (overdue > 0) projectsMsg = `Overdue: ${list(overdueNames)}. Catch up now.`;
  else if (dueSoon.length === 1) projectsMsg = `${dueSoon[0].name} is ${dueSoon[0].label}, ${dueSoon[0].done}/${dueSoon[0].total} tasks complete.`;
  else if (dueSoon.length > 1) projectsMsg = `${dueSoon.length} projects due within 3 days: ${list(dueSoon.map((p) => p.name))}.`;
  else if (laterThisWeek > 0) projectsMsg = `${laterThisWeek} project${laterThisWeek > 1 ? 's' : ''} due later this week.`;
  else projectsMsg = 'Projects are on schedule.';

  const areas: HealthArea[] = [
    { key: 'tasks', label: 'Tasks', score: tasksScore, message: tasksMsg },
    { key: 'habits', label: 'Habits', score: habitsScore, message: habitsMsg },
    { key: 'projects', label: 'Projects', score: projectsScore, message: projectsMsg }
  ];

  const scored = areas.filter((a) => a.score !== null) as (HealthArea & { score: number })[];
  const score = scored.length ? Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length) : 100;
  let status: HealthStatus = overdue > 0 || score < 50 ? 'unattended' : score < 80 ? 'slipping' : 'on_track';
  // A project deadline within 3 days never reads as fully on track
  if (status === 'on_track' && dueSoon.length > 0) status = 'slipping';

  const headline =
    status === 'on_track'
      ? scope === 'today' ? "You're on track today. Keep going!" : "You're on track this week. Proud of you!"
      : status === 'slipping'
        ? `You're slipping a little ${period}. A few things need you.`
        : scope === 'today' ? "Today's commitments are being left unattended." : "This week hasn't gone to plan yet. Time to catch up.";

  return { score, status, headline, areas };
}
