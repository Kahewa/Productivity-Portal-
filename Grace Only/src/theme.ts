/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ThemeColor = 'lavender' | 'rose' | 'ocean' | 'emerald' | 'amber' | 'indigo';

export interface ThemeDefinition {
  id: ThemeColor;
  name: string;
  previewColor: string;
  primary: string;         // e.g. 'bg-violet-600'
  primaryHover: string;    // e.g. 'hover:bg-violet-700'
  primaryText: string;     // e.g. 'text-violet-600'
  primaryTextLight: string;// e.g. 'text-violet-500'
  bgLight: string;         // e.g. 'bg-violet-50'
  borderLight: string;     // e.g. 'border-violet-200'
  badgeBg: string;         // e.g. 'bg-violet-100 text-violet-700'
  ringFocus: string;       // e.g. 'focus:border-violet-500 focus:ring-violet-200'
  progressBg: string;      // e.g. 'bg-violet-600'
  chipBorder: string;      // e.g. 'border-l-violet-600'
  gradient: string;        // e.g. 'from-violet-500 to-purple-600'
}

export const THEMES: Record<ThemeColor, ThemeDefinition> = {
  lavender: {
    id: 'lavender',
    name: 'Lavender Mist',
    previewColor: '#8B5CF6',
    primary: 'bg-violet-600',
    primaryHover: 'hover:bg-violet-700',
    primaryText: 'text-violet-600',
    primaryTextLight: 'text-violet-500',
    bgLight: 'bg-violet-50',
    borderLight: 'border-violet-200',
    badgeBg: 'bg-violet-100 text-violet-700',
    ringFocus: 'focus:border-violet-500 focus:ring-violet-200',
    progressBg: 'bg-violet-600',
    chipBorder: 'border-l-violet-600',
    gradient: 'from-violet-500 to-purple-600'
  },
  rose: {
    id: 'rose',
    name: 'Rose & Baby Pink',
    previewColor: '#F472B6',
    primary: 'bg-pink-500',
    primaryHover: 'hover:bg-pink-600',
    primaryText: 'text-pink-600',
    primaryTextLight: 'text-pink-500',
    bgLight: 'bg-pink-50',
    borderLight: 'border-pink-200',
    badgeBg: 'bg-pink-100 text-pink-700',
    ringFocus: 'focus:border-pink-500 focus:ring-pink-200',
    progressBg: 'bg-pink-500',
    chipBorder: 'border-l-pink-500',
    gradient: 'from-pink-400 to-rose-500'
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Breeze',
    previewColor: '#0EA5E9',
    primary: 'bg-sky-600',
    primaryHover: 'hover:bg-sky-700',
    primaryText: 'text-sky-600',
    primaryTextLight: 'text-sky-500',
    bgLight: 'bg-sky-50',
    borderLight: 'border-sky-200',
    badgeBg: 'bg-sky-100 text-sky-700',
    ringFocus: 'focus:border-sky-500 focus:ring-sky-200',
    progressBg: 'bg-sky-600',
    chipBorder: 'border-l-sky-600',
    gradient: 'from-sky-500 to-blue-600'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Garden',
    previewColor: '#10B981',
    primary: 'bg-emerald-600',
    primaryHover: 'hover:bg-emerald-700',
    primaryText: 'text-emerald-600',
    primaryTextLight: 'text-emerald-500',
    bgLight: 'bg-emerald-50',
    borderLight: 'border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-700',
    ringFocus: 'focus:border-emerald-500 focus:ring-emerald-200',
    progressBg: 'bg-emerald-600',
    chipBorder: 'border-l-emerald-600',
    gradient: 'from-emerald-500 to-teal-600'
  },
  amber: {
    id: 'amber',
    name: 'Amber Glow',
    previewColor: '#F59E0B',
    primary: 'bg-amber-500',
    primaryHover: 'hover:bg-amber-600',
    primaryText: 'text-amber-600',
    primaryTextLight: 'text-amber-500',
    bgLight: 'bg-amber-50',
    borderLight: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-700',
    ringFocus: 'focus:border-amber-500 focus:ring-amber-200',
    progressBg: 'bg-amber-500',
    chipBorder: 'border-l-amber-500',
    gradient: 'from-amber-400 to-orange-500'
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo Night',
    previewColor: '#6366F1',
    primary: 'bg-indigo-600',
    primaryHover: 'hover:bg-indigo-700',
    primaryText: 'text-indigo-600',
    primaryTextLight: 'text-indigo-500',
    bgLight: 'bg-indigo-50',
    borderLight: 'border-indigo-200',
    badgeBg: 'bg-indigo-100 text-indigo-700',
    ringFocus: 'focus:border-indigo-500 focus:ring-indigo-200',
    progressBg: 'bg-indigo-600',
    chipBorder: 'border-l-indigo-600',
    gradient: 'from-indigo-500 to-blue-600'
  }
};

export const DEFAULT_THEME: ThemeColor = 'lavender';
