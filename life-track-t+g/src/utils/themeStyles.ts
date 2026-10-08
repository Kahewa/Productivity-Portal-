/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColorTheme } from '../types/brainConfig';

export interface ThemeClasses {
  name: string;
  badge: string;
  tag: string;
  subtleBg: string;
  border: string;
  textAccent: string;
  iconBg: string;
  pill: string;
  swatch: string;
}

export const THEME_STYLES: Record<ColorTheme, ThemeClasses> = {
  pink: {
    name: 'Pink',
    badge: 'bg-pink-50 border-pink-200 text-pink-700',
    tag: 'bg-pink-50 border-pink-200 text-pink-700',
    subtleBg: 'bg-pink-50/50 border-pink-100',
    border: 'border-pink-200',
    textAccent: 'text-pink-600',
    iconBg: 'bg-pink-500 text-white',
    pill: 'bg-pink-100 text-pink-700',
    swatch: '#ec4899'
  },
  amber: {
    name: 'Amber',
    badge: 'bg-amber-50 border-amber-200 text-amber-800',
    tag: 'bg-amber-50 border-amber-200 text-amber-700',
    subtleBg: 'bg-amber-50/50 border-amber-100',
    border: 'border-amber-200',
    textAccent: 'text-amber-700',
    iconBg: 'bg-amber-500 text-white',
    pill: 'bg-amber-100 text-amber-800',
    swatch: '#f59e0b'
  },
  blue: {
    name: 'Blue',
    badge: 'bg-blue-50 border-blue-200 text-blue-700',
    tag: 'bg-blue-50 border-blue-200 text-blue-700',
    subtleBg: 'bg-blue-50/50 border-blue-100',
    border: 'border-blue-200',
    textAccent: 'text-blue-600',
    iconBg: 'bg-blue-600 text-white',
    pill: 'bg-blue-100 text-blue-700',
    swatch: '#3b82f6'
  },
  emerald: {
    name: 'Emerald',
    badge: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    tag: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    subtleBg: 'bg-emerald-50/50 border-emerald-100',
    border: 'border-emerald-200',
    textAccent: 'text-emerald-700',
    iconBg: 'bg-emerald-600 text-white',
    pill: 'bg-emerald-100 text-emerald-700',
    swatch: '#10b981'
  },
  purple: {
    name: 'Purple',
    badge: 'bg-purple-50 border-purple-200 text-purple-700',
    tag: 'bg-purple-50 border-purple-200 text-purple-700',
    subtleBg: 'bg-purple-50/50 border-purple-100',
    border: 'border-purple-200',
    textAccent: 'text-purple-700',
    iconBg: 'bg-purple-600 text-white',
    pill: 'bg-purple-100 text-purple-700',
    swatch: '#a855f7'
  },
  rose: {
    name: 'Rose',
    badge: 'bg-rose-50 border-rose-200 text-rose-700',
    tag: 'bg-rose-50 border-rose-200 text-rose-700',
    subtleBg: 'bg-rose-50/50 border-rose-100',
    border: 'border-rose-200',
    textAccent: 'text-rose-600',
    iconBg: 'bg-rose-600 text-white',
    pill: 'bg-rose-100 text-rose-700',
    swatch: '#f43f5e'
  },
  indigo: {
    name: 'Indigo',
    badge: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    tag: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    subtleBg: 'bg-indigo-50/50 border-indigo-100',
    border: 'border-indigo-200',
    textAccent: 'text-indigo-600',
    iconBg: 'bg-indigo-600 text-white',
    pill: 'bg-indigo-100 text-indigo-700',
    swatch: '#6366f1'
  },
  slate: {
    name: 'Slate',
    badge: 'bg-slate-100 border-slate-300 text-slate-800',
    tag: 'bg-slate-100 border-slate-300 text-slate-800',
    subtleBg: 'bg-slate-50 border-slate-200',
    border: 'border-slate-300',
    textAccent: 'text-slate-800',
    iconBg: 'bg-slate-800 text-white',
    pill: 'bg-slate-200 text-slate-800',
    swatch: '#475569'
  }
};
