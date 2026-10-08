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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Palette size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Select Theme</h3>
                <p className="text-xs text-slate-500">Customize your planner accent palette</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
                    relative p-3.5 rounded-xl border text-left transition-all flex flex-col gap-2.5 group
                    ${isSelected 
                      ? 'border-slate-800 bg-slate-50 ring-2 ring-slate-800/10 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
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
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
