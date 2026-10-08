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
import { ChevronLeft, ChevronRight, Droplets, Info, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeColor } from '../types';
import { THEMES, DEFAULT_THEME } from '../theme';

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
  const themeDef = THEMES[theme] || THEMES.lavender;

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

  return (
    <div className="h-full w-full p-4 md:p-8 overflow-y-auto bg-slate-50/50">
      <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Wellness & Cycle</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-xs font-semibold text-slate-600">Cycle Log</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1 font-serif">
              Cycle Tracker
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {startDate && (
              <button
                onClick={() => onUpdate(null, null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200"
              >
                Clear Log
              </button>
            )}
            <div className="flex items-center gap-2 bg-rose-50 px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-700">
              <Droplets size={16} />
              <span className="text-xs font-bold capitalize">
                Current: {currentPhaseName} Phase
              </span>
            </div>
          </div>
        </div>

        {/* Prediction Banner */}
        {nextPeriodPrediction && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Estimated Next Cycle</p>
                <p className="text-base font-black text-slate-900">
                  {format(nextPeriodPrediction, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              ~{Math.max(0, differenceInDays(nextPeriodPrediction, today))} days away
            </span>
          </motion.div>
        )}

        {/* Calendar Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-[11px] font-bold text-slate-400 py-1 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {[...Array(days[0].getDay())].map((_, i) => (
              <div key={`empty-${i}`} className="h-14 rounded-xl opacity-0" />
            ))}

            {days.map((d) => {
              const phase = getDayPhase(d);
              const isCurrentDay = isToday(d);

              let phaseStyle = 'border-slate-200 hover:border-slate-300 bg-white text-slate-800';
              if (phase === 'period') {
                phaseStyle = 'bg-rose-500 border-rose-500 text-white font-black shadow-xs';
              } else if (phase === 'ovulation') {
                phaseStyle = 'bg-purple-100 border-purple-300 text-purple-900 font-bold';
              } else if (phase === 'follicular') {
                phaseStyle = 'bg-pink-50 border-pink-200 text-pink-800 font-semibold';
              } else if (phase === 'luteal') {
                phaseStyle = 'bg-amber-50 border-amber-200 text-amber-800 font-semibold';
              }

              return (
                <button
                  key={d.toISOString()}
                  onClick={() => handleDayClick(d)}
                  className={`
                    h-14 p-1.5 rounded-xl border flex flex-col justify-between items-center transition-all
                    ${phaseStyle}
                    ${isCurrentDay ? 'ring-2 ring-slate-900 ring-offset-1' : ''}
                  `}
                >
                  <span className="text-xs font-bold">{format(d, 'd')}</span>
                  {phase === 'period' && (
                    <Droplets size={12} className="text-white fill-white" />
                  )}
                  {phase === 'ovulation' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  )}
                  {phase === 'normal' && isCurrentDay && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span>Period</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-pink-200 border border-pink-300" />
              <span>Follicular</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-300" />
              <span>Ovulation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-200 border border-amber-300" />
              <span>Luteal</span>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
          <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
          <p>
            Click a day to mark the start of your cycle. Click another day to record the end date. The tracker calculates standard cycle phases based on typical 28-day rhythms.
          </p>
        </div>

      </div>
    </div>
  );
}
