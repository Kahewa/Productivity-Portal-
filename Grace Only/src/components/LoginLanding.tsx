/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, ArrowRight, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { verifyAndLogin } from '../auth';
import BrainPicker from './BrainPicker';

interface LoginLandingProps {
  onLoginSuccess: () => void;
}

export default function LoginLanding({ onLoginSuccess }: LoginLandingProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await verifyAndLogin(username, password);
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || 'Access denied. Grace only.');
      }
    } catch {
      setError('An error occurred during verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 py-8 bg-[#faf7f9] relative overflow-x-hidden overflow-y-auto select-none">
      
      {/* Crisp Baby Pink Grid Background behind Login Container */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-60 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(244, 114, 182, 0.22) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(244, 114, 182, 0.22) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Soft Vignette Overlay over grid */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at center, transparent 35%, rgba(253, 242, 248, 0.75) 100%)'
        }}
      />

      {/* Ambient soft baby pink glows */}
      <div className="fixed top-1/4 -left-20 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-1/4 -right-20 w-80 h-80 bg-rose-200/20 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Main Container: Generous space for BrainPicker, compact login container */}
      <div className="w-full max-w-sm relative z-10 flex flex-col items-center my-auto">

        {/* PROFILE ICON & PICK MY BRAIN HERO STAGE (Read-only on login page) */}
        <div className="mb-6 relative z-30 flex flex-col items-center w-full">
          <BrainPicker size="lg" readOnly={true} />
        </div>

        {/* COMPACT LOGIN CONTAINER: DESIGNED LIKE A WARNING SHOWING "GRACE ONLY" */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full relative z-10"
        >
          <div className="bg-white/95 rounded-2xl border-2 border-red-600 shadow-xl shadow-red-950/20 overflow-hidden backdrop-blur-md">
            
            {/* Caution Hazard Top Stripe */}
            <div 
              className="h-2 w-full"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #dc2626, #dc2626 10px, #450a0a 10px, #450a0a 20px)'
              }}
            />

            <div className="p-5 sm:p-6">
              
              {/* WARNING: GRACE ONLY Header Banner */}
              <div role="note" className="bg-red-600 border border-red-800 rounded-xl py-2.5 px-3 mb-4 flex items-center justify-center gap-2 shadow-md shadow-red-900/25">
                <AlertTriangle size={18} className="text-white shrink-0 animate-pulse" />
                <span className="font-mono font-black text-xs sm:text-sm tracking-wider text-white uppercase">
                  WARNING: GRACE ONLY
                </span>
                <AlertTriangle size={18} className="text-white shrink-0 animate-pulse" />
              </div>

              {/* Form: Username + Password + Arrow to sign in */}
              <form onSubmit={handleSubmit} className="space-y-3">
                
                {/* Username Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                    autoFocus
                    autoComplete="username"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
                  />
                </div>

                {/* Password Input + Arrow to Sign In */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock size={15} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      autoComplete="current-password"
                      className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Arrow to Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    title="Sign in"
                    aria-label="Sign in"
                    className="h-10 w-11 shrink-0 rounded-xl font-bold text-white bg-slate-900 hover:bg-black active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50 group"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2"
                  >
                    <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </form>

            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
