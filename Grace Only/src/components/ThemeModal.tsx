/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Palette } from 'lucide-react';
import { ThemeColor } from '../types';
import { THEMES } from '../theme';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeColor;
  onSelectTheme: (theme: ThemeColor) => void;
}

export default function ThemeModal({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}: ThemeModalProps) {
  if (!isOpen) return null;

  const themesList = Object.values(THEMES);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-strong font-display w-full max-w-md rounded-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/80 text-slate-700">
                <Palette size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Select Theme</h3>
                <p className="text-xs text-slate-500">Customize your planner accent palette</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/70 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Theme Grid */}
          <div className="p-6 grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
            {themesList.map((t) => {
              const isSelected = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTheme(t.id);
                    onClose();
                  }}
                  className={`
                    relative p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-2.5 group
                    ${isSelected 
                      ? 'border-white bg-white ring-2 ring-slate-900/70 shadow-sm' 
                      : 'border-white/80 bg-white/45 hover:bg-white/80'
                    }
                  `}
                >
                  <div className="flex items-center justify-between w-full">
                    <div 
                      className="w-6 h-6 rounded-full shadow-xs flex items-center justify-center text-white"
                      style={{ backgroundColor: t.previewColor }}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                        Active
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">
                      {t.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className={`h-1.5 w-6 rounded-full ${t.primary}`} />
                      <div className={`h-1.5 w-3 rounded-full ${t.bgLight} border border-slate-200`} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-white/40 border-t border-white/80 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white/70 hover:text-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
