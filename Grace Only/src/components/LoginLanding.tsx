/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Lock, User, ArrowRight, Eye, EyeOff, AlertTriangle, Sparkles, ChevronDown, X } from 'lucide-react';
import { verifyAndLogin } from '../auth';
import BrainPicker from './BrainPicker';
import { THEMES, DEFAULT_THEME } from '../theme';
import { ThemeColor } from '../types';

interface LoginLandingProps {
  onLoginSuccess: () => void;
}

// Little buddy on the card that reacts to what you're doing
const MOODS = {
  idle: { face: '🙂', note: 'Hi Grace!' },
  username: { face: '👀', note: 'Is that you?' },
  password: { face: '🙈', note: 'Not peeking!' },
  peek: { face: '🫣', note: 'Okay, maybe peeking…' },
  error: { face: '😬', note: 'Hmm, try again' },
  success: { face: '🥳', note: 'Welcome back!' }
} as const;

// Decorative glass bubbles drifting in the background (depth drives the mouse parallax)
const BUBBLES = [
  { size: 140, left: '8%', top: '14%', depth: 18, delay: 0 },
  { size: 70, left: '22%', top: '70%', depth: 30, delay: 1.2 },
  { size: 190, left: '78%', top: '10%', depth: 12, delay: 0.6 },
  { size: 90, left: '86%', top: '64%', depth: 26, delay: 1.8 },
  { size: 46, left: '58%', top: '84%', depth: 36, delay: 0.3 },
  { size: 56, left: '40%', top: '6%', depth: 34, delay: 2.2 }
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return { text: 'Up late, Grace', emoji: '🌙' };
  if (h < 12) return { text: 'Good morning, Grace', emoji: '☀️' };
  if (h < 17) return { text: 'Good afternoon, Grace', emoji: '🌤️' };
  if (h < 21) return { text: 'Good evening, Grace', emoji: '🌇' };
  return { text: 'Good night, Grace', emoji: '🌙' };
}

export default function LoginLanding({ onLoginSuccess }: LoginLandingProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<'username' | 'password' | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const hello = greeting();

  // The login screen sits outside the app shell, so pick up the saved theme for the glass backdrop
  const themeDef = (() => {
    try {
      const saved = localStorage.getItem('grace_app_theme') as ThemeColor | null;
      return THEMES[saved || DEFAULT_THEME] || THEMES[DEFAULT_THEME];
    } catch {
      return THEMES[DEFAULT_THEME];
    }
  })();

  useEffect(() => {
    if (!isSignInOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !succeeded) setIsSignInOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSignInOpen, succeeded]);

  const mood = succeeded
    ? MOODS.success
    : error
      ? MOODS.error
      : focused === 'password'
        ? showPassword ? MOODS.peek : MOODS.password
        : focused === 'username' || username
          ? MOODS.username
          : MOODS.idle;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await verifyAndLogin(username, password);
      if (result.success) {
        setSucceeded(true);
        // Let the celebration play for a beat before entering the app
        setTimeout(onLoginSuccess, reduceMotion ? 0 : 700);
      } else {
        setError(result.error || 'Access denied. Grace only.');
        setShakeKey((k) => k + 1);
      }
    } catch {
      setError('An error occurred during verification. Please try again.');
      setShakeKey((k) => k + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="ambient-bg font-display min-h-screen h-full w-screen relative overflow-x-hidden overflow-y-auto select-none"
      style={{ '--accent': themeDef.accent, '--accent-alt': themeDef.accentAlt } as React.CSSProperties}
      onMouseMove={(e) => {
        if (reduceMotion) return;
        setPointer({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
      }}
    >
      {/* Floating glass bubbles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {BUBBLES.map((b, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-white/80"
            style={{
              width: b.size,
              height: b.size,
              left: b.left,
              top: b.top,
              background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), color-mix(in srgb, ${i % 2 ? themeDef.accentAlt : themeDef.accent} 22%, transparent) 70%)`,
              backdropFilter: 'blur(6px)',
              x: pointer.x * -b.depth,
              y: pointer.y * -b.depth
            }}
            animate={reduceMotion ? undefined : { translateY: [0, -14, 0] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-full w-full max-w-5xl mx-auto px-4 py-8 flex flex-col items-center justify-center">

        {/* Left: greeting + interactive profile stage */}
        <div className="flex flex-col items-center text-center w-full">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
          >
            {hello.text}{' '}
            <motion.span
              className="inline-block"
              animate={reduceMotion ? undefined : { rotate: [0, 14, -8, 14, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.5 }}
            >
              {hello.emoji}
            </motion.span>
          </motion.p>
          <div className="glass rounded-[2rem] mt-5 px-2 pt-2 pb-5 w-full max-w-[26rem] flex justify-center">
            <BrainPicker size="lg" readOnly={true} />
          </div>

          {/* Arrow that opens the sign-in pop-up */}
          <motion.button
            onClick={() => setIsSignInOpen(true)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="mt-5 flex flex-col items-center gap-1.5 group cursor-pointer bg-transparent border-0"
            aria-label="Open sign in"
            title="Sign in"
          >
            <motion.span
              className="accent-fill w-14 h-14 rounded-full text-white flex items-center justify-center"
              animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown size={26} strokeWidth={2.5} />
            </motion.span>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800">Sign in</span>
          </motion.button>
        </div>

      </div>

      {/* Sign-in pop-up */}
      <AnimatePresence>
        {isSignInOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!isLoading && !succeeded) setIsSignInOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="w-full max-w-sm relative"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Sign in"
            >
              <motion.div
                key={shakeKey}
                animate={shakeKey && !reduceMotion ? { x: [0, -10, 10, -7, 7, -3, 0] } : undefined}
                transition={{ duration: 0.45 }}
                className="glass-strong rounded-3xl overflow-hidden"
              >
                {/* Caution hazard stripe */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, #dc2626, #dc2626 10px, #450a0a 10px, #450a0a 20px)' }}
                />

                <div className="p-5 sm:p-6 relative">
                  <button
                    type="button"
                    onClick={() => setIsSignInOpen(false)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/70"
                    aria-label="Close sign in"
                  >
                    <X size={18} />
                  </button>
                  {/* Reacting buddy */}
                  <div className="flex items-center gap-3 mb-4 pr-8">
                    <motion.span
                      key={mood.face}
                      initial={{ scale: 0.4, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                      className="w-12 h-12 rounded-2xl bg-white border border-white shadow-md flex items-center justify-center text-2xl shrink-0"
                      aria-hidden="true"
                    >
                      {mood.face}
                    </motion.span>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 leading-tight">Sign in</p>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={mood.note}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 6 }}
                          transition={{ duration: 0.18 }}
                          className="text-xs text-slate-500"
                        >
                          {mood.note}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* WARNING: GRACE ONLY */}
                  <div role="note" className="bg-red-600 rounded-2xl py-2.5 px-3 mb-4 flex items-center justify-center gap-2 shadow-lg shadow-red-600/30">
                    <AlertTriangle size={18} className="text-white shrink-0 animate-pulse" />
                    <span className="font-bold text-xs sm:text-sm tracking-wider text-white uppercase">WARNING: GRACE ONLY</span>
                    <AlertTriangle size={18} className="text-white shrink-0 animate-pulse" />
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User size={15} />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); setError(null); }}
                        onFocus={() => setFocused('username')}
                        onBlur={() => setFocused(null)}
                        placeholder="Username"
                        required
                        autoFocus
                        autoComplete="username"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200/70 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Lock size={15} />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(null); }}
                          onFocus={() => setFocused('password')}
                          onBlur={() => setFocused(null)}
                          placeholder="Password"
                          required
                          autoComplete="current-password"
                          className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200/70 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                        />
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      <motion.button
                        type="submit"
                        disabled={isLoading || succeeded}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.92 }}
                        title="Sign in"
                        aria-label="Sign in"
                        className="accent-fill h-11 w-11 shrink-0 rounded-xl font-bold text-white flex items-center justify-center cursor-pointer disabled:opacity-70 group"
                      >
                        {isLoading ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : succeeded ? (
                          <Sparkles size={18} />
                        ) : (
                          <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                        )}
                      </motion.button>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2"
                        >
                          <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                          <span>{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </div>
              </motion.div>

              {/* Success sparkle burst */}
              <AnimatePresence>
                {succeeded && !reduceMotion && (
                  <div className="pointer-events-none relative" aria-hidden="true">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const angle = (i / 12) * Math.PI * 2;
                      return (
                        <motion.span
                          key={i}
                          className="absolute left-1/2 -top-40 text-lg"
                          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                          animate={{ x: Math.cos(angle) * 140, y: Math.sin(angle) * 110, opacity: 0, scale: 1.2 }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        >
                          {['✨', '💖', '🌸'][i % 3]}
                        </motion.span>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
