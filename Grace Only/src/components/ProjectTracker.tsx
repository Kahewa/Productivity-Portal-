/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState } from 'react';
import { startOfToday } from 'date-fns';
import { Plus, FolderKanban, Trash2, ChevronDown, CalendarDays, X, Check, Circle, Loader, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, ProjectStatus, ProjectTask, ThemeColor, UserData } from '../types';
import { THEMES } from '../theme';
import { STATUS_META, URGENCY_META, dueLabel, getUrgency, projectProgress, projectHealth } from '../utils/projects';

interface ProjectTrackerProps {
  data: UserData;
  onUpdate: (data: UserData) => void;
  theme: ThemeColor;
}

const STATUSES: ProjectStatus[] = ['not_started', 'in_progress', 'complete'];

function DueChip({ dueDate, done, onChange }: { dueDate: string | null; done: boolean; onChange?: (d: string | null) => void }) {
  const today = startOfToday();
  const urgency = getUrgency(dueDate, today, done);
  const chip = (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${done ? 'bg-emerald-50 text-emerald-700' : URGENCY_META[urgency].chip}`}>
      <CalendarDays size={11} />
      {dueDate ? (done ? 'Done' : dueLabel(dueDate, today)) : 'Add date'}
    </span>
  );
  if (!onChange) return chip;
  return (
    <label className="relative cursor-pointer" title="Set an optional due date">
      {chip}
      <input
        type="date"
        value={dueDate || ''}
        onChange={(e) => onChange(e.target.value || null)}
        onClick={(e) => { try { e.currentTarget.showPicker(); } catch { /* unsupported */ } }}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </label>
  );
}

const STATUS_ICONS: Record<ProjectStatus, React.ReactNode> = {
  not_started: <Circle size={13} strokeWidth={2.5} />,
  in_progress: <Loader size={13} strokeWidth={2.5} />,
  complete: <CheckCircle2 size={13} strokeWidth={2.5} />
};

function StatusPicker({ status, onChange }: { status: ProjectStatus; onChange: (s: ProjectStatus) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white/80 border border-slate-200/70 shrink-0" role="radiogroup" aria-label="Task status">
      {STATUSES.map((s) => (
        <button
          key={s}
          role="radio"
          aria-checked={status === s}
          onClick={() => onChange(s)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
            status === s ? STATUS_META[s].solid : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {STATUS_ICONS[s]}
          <span>{STATUS_META[s].label}</span>
        </button>
      ))}
    </div>
  );
}

function StatusCounts({ project, size = 'md' }: { project: Project; size?: 'sm' | 'md' }) {
  const prog = projectProgress(project);
  const counts: Record<ProjectStatus, number> = { not_started: prog.notStarted, in_progress: prog.inProgress, complete: prog.complete };
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUSES.map((s) => (
        <span
          key={s}
          className={`inline-flex items-center gap-1 rounded-full font-semibold ${STATUS_META[s].chip} ${
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
          }`}
        >
          {STATUS_ICONS[s]}
          {counts[s]} {STATUS_META[s].label.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

function ProjectCard({
  project,
  accent,
  onChange,
  onDelete
}: {
  project: Project;
  accent: string;
  onChange: (p: Project) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [taskName, setTaskName] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const prog = projectProgress(project);
  const health = projectHealth(project, startOfToday());
  const healthClass =
    health === 'alert' ? 'health-alert border border-rose-300' : health === 'done' ? 'bg-emerald-50/85 border border-emerald-200' : 'glass';

  const updateTask = (id: string, patch: Partial<ProjectTask>) =>
    onChange({ ...project, tasks: project.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    onChange({
      ...project,
      tasks: [...project.tasks, { id: crypto.randomUUID(), name: taskName.trim(), status: 'not_started', dueDate: taskDate || null }]
    });
    setTaskName('');
    setTaskDate('');
  };

  return (
    <section className={`rounded-3xl overflow-hidden ${healthClass}`}>
      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
          <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: prog.isDone ? '#10B981' : accent }}>
            {prog.isDone ? <Check size={18} /> : <FolderKanban size={18} />}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{project.name}</h3>
            <p className="text-[11px] text-slate-400 truncate">
              {project.description || `${prog.total} task${prog.total === 1 ? '' : 's'}`}
            </p>
            <div className="mt-2">
              <StatusCounts project={project} size="sm" />
            </div>
          </div>
          <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center gap-3 sm:w-auto">
          <DueChip dueDate={project.dueDate} done={prog.isDone} onChange={(d) => onChange({ ...project, dueDate: d })} />
          <div className="w-32">
            <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
              <span>{prog.complete}/{prog.total} done</span>
              <span>{prog.percent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-400/15 overflow-hidden flex gap-[2px]">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${prog.total ? (prog.complete / prog.total) * 100 : 0}%` }} />
              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${prog.total ? (prog.inProgress / prog.total) * 100 : 0}%` }} />
            </div>
          </div>
          <button
            onClick={() => { if (confirm(`Delete "${project.name}" and all its tasks?`)) onDelete(); }}
            className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50/70"
            title="Delete project"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-2">
              {project.tasks.map((t) => (
                <div key={t.id} className={`glass-strong flex flex-wrap md:flex-nowrap items-center gap-2 sm:gap-3 pl-3 pr-3.5 py-2.5 rounded-2xl border-l-4 group ${STATUS_META[t.status].edge}`}>
                  <span className={`flex-1 min-w-[8rem] text-[13px] ${t.status === 'complete' ? 'line-through text-slate-400' : 'font-medium text-slate-800'}`}>
                    {t.name}
                  </span>
                  <DueChip dueDate={t.dueDate} done={t.status === 'complete'} onChange={(d) => updateTask(t.id, { dueDate: d })} />
                  <StatusPicker
                    status={t.status}
                    onChange={(s) =>
                      updateTask(t.id, {
                        status: s,
                        completedAt: s === 'complete' ? (t.status === 'complete' ? t.completedAt ?? null : new Date().toISOString()) : null
                      })
                    }
                  />
                  <button
                    onClick={() => onChange({ ...project, tasks: project.tasks.filter((x) => x.id !== t.id) })}
                    className="p-1 rounded-md text-slate-300 hover:text-rose-500 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete task"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {project.tasks.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">No tasks yet. Break this project into steps below.</p>
              )}

              <form onSubmit={addTask} className="flex flex-wrap gap-2 pt-1">
                <input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Add a project task..."
                  className="flex-1 min-w-[10rem] px-3.5 py-2 rounded-xl bg-white/80 border border-slate-200/60 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <input
                  type="date"
                  value={taskDate}
                  onChange={(e) => setTaskDate(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white/80 border border-slate-200/60 text-xs text-slate-600 focus:outline-none"
                  title="Optional due date"
                />
                <button type="submit" className="px-3 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1" style={{ background: accent }}>
                  <Plus size={14} /> Add
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function ProjectTracker({ data, onUpdate, theme }: ProjectTrackerProps) {
  const themeDef = THEMES[theme] || THEMES.blush;
  const projects = data.projects || [];
  const [filter, setFilter] = useState<'active' | 'done' | 'all'>('active');
  const [showForm, setShowForm] = useState(projects.length === 0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const save = (next: Project[]) => onUpdate({ ...data, projects: next });

  const createProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const project: Project = {
      id: crypto.randomUUID(),
      name: name.trim(),
      dueDate: dueDate || null,
      tasks: [],
      createdAt: new Date().toISOString()
    };
    if (description.trim()) project.description = description.trim();
    save([project, ...projects]);
    setName('');
    setDescription('');
    setDueDate('');
    setShowForm(false);
    setFilter('active');
  };

  const visible = projects
    .filter((p) => {
      const done = projectProgress(p).isDone;
      return filter === 'all' || (filter === 'done' ? done : !done);
    })
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

  const activeCount = projects.filter((p) => !projectProgress(p).isDone).length;
  const openTasks = projects.reduce((n, p) => n + p.tasks.filter((t) => t.status !== 'complete').length, 0);

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-5 md:py-7 space-y-6 pb-28 md:pb-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 tracking-tight">Projects</h1>
            <p className="text-xs text-slate-500 mt-1">
              {activeCount} active project{activeCount === 1 ? '' : 's'} · {openTasks} open task{openTasks === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass flex p-1 rounded-xl">
              {(['active', 'done', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f === 'done' ? 'Completed' : f}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="accent-fill flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
            >
              <Plus size={16} /> New Project
            </button>
          </div>
        </header>

        <AnimatePresence>
          {showForm && (
            <motion.form
              onSubmit={createProject}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="glass-strong rounded-3xl p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3 items-center"
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                className="px-4 py-2.5 rounded-xl bg-white/80 border border-slate-200/60 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description (optional)"
                className="px-4 py-2.5 rounded-xl bg-white/80 border border-slate-200/60 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                title="Optional deadline"
                className="px-3 py-2.5 rounded-xl bg-white/80 border border-slate-200/60 text-sm text-slate-600 focus:outline-none"
              />
              <button type="submit" disabled={!name.trim()} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50" style={{ background: themeDef.accent }}>
                Create
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {visible.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              accent={themeDef.accent}
              onChange={(next) => save(projects.map((x) => (x.id === p.id ? next : x)))}
              onDelete={() => save(projects.filter((x) => x.id !== p.id))}
            />
          ))}
          {visible.length === 0 && (
            <div className="glass rounded-3xl py-14 text-center">
              <FolderKanban size={28} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700 mt-3">
                {filter === 'done' ? 'No completed projects yet' : 'No active projects'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Create a project, then add its tasks with optional due dates.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
