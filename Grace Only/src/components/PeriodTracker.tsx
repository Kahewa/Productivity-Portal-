/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  format, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  startOfToday,
  differenceInDays,
  parseISO,
  isWithinInterval
} from 'date-fns';
import { ChevronLeft, ChevronRight, Droplets, Info, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeColor } from '../types';
import { THEMES, DEFAULT_THEME } from '../theme';

// Same phase colours as the dashboard cycle card
const PHASES: Record<string, { from: string; to: string; label: string; note: string; cell: string }> = {
  period: { from: '#FB7185', to: '#E11D48', label: 'Period Phase', note: 'Rest, hydrate and go gently.', cell: 'bg-rose-500 text-white shadow-md shadow-rose-500/30' },
  follicular: { from: '#F9A8D4', to: '#DB2777', label: 'Follicular Phase', note: 'Energy is rising. Start new things.', cell: 'bg-pink-100/90 text-pink-800' },
  ovulation: { from: '#C084FC', to: '#9333EA', label: 'Ovulation Phase', note: 'Peak energy. Tackle the big tasks.', cell: 'bg-purple-100/90 text-purple-900' },
  luteal: { from: '#FBBF24', to: '#D97706', label: 'Luteal Phase', note: 'Wind down and finish what you started.', cell: 'bg-amber-100/90 text-amber-800' },
  normal: { from: '#94A3B8', to: '#475569', label: 'No phase yet', note: 'Click a day below to log your cycle.', cell: '' }
};

interface PeriodTrackerProps {
  startDate: string | null;
  endDate: string | null;
  onUpdate: (start: string | null, end: string | null) => void;
  theme?: ThemeColor;
}

export default function PeriodTracker({ 
  startDate, 
  endDate, 
  onUpdate,
  theme = DEFAULT_THEME
}: PeriodTrackerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfToday();
  const themeDef = THEMES[theme] || THEMES[DEFAULT_THEME];

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getDayPhase = (date: Date) => {
    if (!startDate) return 'normal';
    
    try {
      const start = parseISO(startDate);
      const end = endDate ? parseISO(endDate) : null;
      const periodDuration = end ? Math.max(1, differenceInDays(end, start) + 1) : 5;
      const diff = differenceInDays(date, start);
      const cycleDay = ((diff % 28) + 28) % 28;

      if (end && isWithinInterval(date, { start, end })) return 'period';
      if (!end && isSameDay(date, start)) return 'period';
      if (cycleDay < periodDuration) return 'period';
      if (cycleDay < 12) return 'follicular';
      if (cycleDay < 16) return 'ovulation';
      if (cycleDay < 28) return 'luteal';
      return 'normal';
    } catch {
      return 'normal';
    }
  };

  const handleDayClick = (date: Date) => {
    const dateStr = date.toISOString();
    if (!startDate || (startDate && endDate)) {
      onUpdate(dateStr, null);
    } else {
      if (date < parseISO(startDate)) {
        onUpdate(dateStr, null);
      } else {
        onUpdate(startDate, dateStr);
      }
    }
  };

  const nextPeriodPrediction = useMemo(() => {
    if (!startDate) return null;
    try {
      const start = parseISO(startDate);
      const diff = differenceInDays(today, start);
      const cyclesPassed = Math.floor(diff / 28) + 1;
      return addDays(start, cyclesPassed * 28);
    } catch {
      return null;
    }
  }, [startDate, today]);

  const currentPhaseName = getDayPhase(today);
  const currentPhase = PHASES[currentPhaseName] || PHASES.normal;
  const cycleDay = startDate ? ((differenceInDays(today, parseISO(startDate)) % 28) + 28) % 28 + 1 : null;

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-5 md:py-7 space-y-5 pb-28 md:pb-10">

        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 tracking-tight">Cycle Tracker</h1>
            <p className="text-xs text-slate-500 mt-1">Log your cycle and see which phase you&apos;re in</p>
          </div>
          {startDate && (
            <button
              onClick={() => onUpdate(null, null)}
              className="glass flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600"
            >
              <Trash2 size={13} /> Clear log
            </button>
          )}
        </header>

        {/* Phase + prediction */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div
            className="rounded-3xl p-5 text-white flex items-center gap-4"
            style={{ background: `linear-gradient(145deg, ${currentPhase.from}, ${currentPhase.to})`, boxShadow: `0 14px 30px -12px ${currentPhase.to}` }}
          >
            <span className="w-12 h-12 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center shrink-0">
              <Droplets size={22} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">Current phase</p>
              <p className="text-lg font-bold">{currentPhase.label}</p>
              <p className="text-[11px] text-white/85">{cycleDay ? `Day ${cycleDay} · ${currentPhase.note}` : currentPhase.note}</p>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: themeDef.accent }}>
                <Sparkles size={20} />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Estimated next cycle</p>
                <p className="text-base font-bold text-slate-900">
                  {nextPeriodPrediction ? format(nextPeriodPrediction, 'EEEE, MMMM d') : 'Log a start date first'}
                </p>
              </div>
            </div>
            {nextPeriodPrediction && (
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white/80 text-slate-700 shrink-0">
                ~{Math.max(0, differenceInDays(nextPeriodPrediction, today))} days
              </span>
            )}
          </motion.div>
        </div>

        {/* Calendar */}
        <section className="glass rounded-3xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex items-center gap-2">
              <div className="glass-strong flex items-center rounded-xl p-1">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900"
                  aria-label="Next month"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
              <button onClick={() => setCurrentMonth(new Date())} className="glass-strong px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900">
                Today
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {[...Array(days[0].getDay())].map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((d) => {
              const phase = getDayPhase(d);
              const isCurrentDay = isToday(d);
              const meta = PHASES[phase] || PHASES.normal;
              const style = phase === 'normal' ? 'bg-white/55 hover:bg-white/80 text-slate-700' : meta.cell;

              return (
                <button
                  key={d.toISOString()}
                  onClick={() => handleDayClick(d)}
                  className={`h-14 md:h-16 p-1.5 rounded-2xl flex flex-col justify-between items-center transition-all ${style} ${
                    isCurrentDay ? 'ring-2 ring-slate-900 ring-offset-1 ring-offset-transparent' : ''
                  }`}
                >
                  <span className="text-xs font-bold">{format(d, 'd')}</span>
                  {phase === 'period' && <Droplets size={12} className="fill-current" />}
                  {phase === 'ovulation' && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                  {phase === 'normal' && isCurrentDay && <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-white/70 flex flex-wrap items-center gap-4 text-[11px] font-medium text-slate-500">
            {(['period', 'follicular', 'ovulation', 'luteal'] as const).map((p) => (
              <span key={p} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PHASES[p].to }} />
                {PHASES[p].label.replace(' Phase', '')}
              </span>
            ))}
          </div>
        </section>

        <div className="glass rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
          <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
          <p>
            Click a day to mark the start of your cycle, then click another day to record the end date. Phases are estimated from a typical 28-day rhythm.
          </p>
        </div>
      </div>
    </div>
  );
}
