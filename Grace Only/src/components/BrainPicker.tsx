/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Instagram, 
  Youtube, 
  Linkedin, 
  Mail, 
  ExternalLink, 
  Globe, 
  Heart, 
  Gamepad2, 
  Briefcase, 
  Camera, 
  BookOpen, 
  Cross as CrossIcon,
  Sliders,
  Edit3
} from 'lucide-react';
import { BrainIconId, ProfileConfig } from '../types/brainConfig';
import { getBrainConfig } from '../services/brainConfigStorage';
import { THEME_STYLES } from '../utils/themeStyles';
import BrainCustomizerModal from './BrainCustomizerModal';

interface BrainPickerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showEditTrigger?: boolean;
  readOnly?: boolean;
}

type BrainCategory = BrainIconId | null;

// Cutout images (transparent PNGs with no background)
const CAMERA_IMG = '/src/assets/images/camera_cutout.png';
const BRIEFCASE_IMG = '/src/assets/images/briefcase_cutout.png';
const CONTROLLER_IMG = '/src/assets/images/controller_cutout.png';
const BOOK_IMG = '/src/assets/images/book_cutout.png';
const CROSS_IMG = '/src/assets/images/cross_cutout.png';

const CUTOUT_ASSETS: Record<BrainIconId, string> = {
  camera: CAMERA_IMG,
  cross: CROSS_IMG,
  briefcase: BRIEFCASE_IMG,
  book: BOOK_IMG,
  controller: CONTROLLER_IMG,
};

export default function BrainPicker({ 
  className = '', 
  size = 'lg',
  showEditTrigger = true,
  readOnly = false,
}: BrainPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePopup, setActivePopup] = useState<BrainCategory>(null);
  const [config, setConfig] = useState<ProfileConfig>(() => getBrainConfig());
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customizerTab, setCustomizerTab] = useState<'profile' | BrainIconId>('profile');

  // Synchronize dynamic config across components and storage
  useEffect(() => {
    const handleConfigUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ProfileConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      } else {
        setConfig(getBrainConfig());
      }
    };

    window.addEventListener('grace_brain_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('grace_brain_config_updated', handleConfigUpdate);
  }, []);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleOpenPopup = (e: React.MouseEvent, type: BrainCategory) => {
    e.stopPropagation();
    setActivePopup(type);
  };

  const handleOpenCustomizerForCurrent = (tab: 'profile' | BrainIconId) => {
    setCustomizerTab(tab);
    setIsCustomizerOpen(true);
  };

  // Dimensions based on size prop - generous space
  const headSizeClasses = size === 'lg' ? 'w-28 h-28 md:w-34 md:h-34' : size === 'md' ? 'w-22 h-22' : 'w-16 h-16';
  const radius = size === 'lg' ? 115 : 85;

  // 5 Radial items dynamically bound to config
  const brainItems = [
    {
      id: 'camera' as const,
      name: config.icons.camera.name,
      iconImg: CUTOUT_ASSETS.camera,
      x: -radius * 1.05,
      y: -radius * 0.55,
      delay: 0.04,
      tag: config.icons.camera.tag,
      theme: THEME_STYLES[config.icons.camera.colorTheme || 'pink'],
    },
    {
      id: 'cross' as const,
      name: config.icons.cross.name,
      iconImg: CUTOUT_ASSETS.cross,
      x: 0,
      y: -radius * 1.08,
      delay: 0.08,
      tag: config.icons.cross.tag,
      theme: THEME_STYLES[config.icons.cross.colorTheme || 'amber'],
    },
    {
      id: 'briefcase' as const,
      name: config.icons.briefcase.name,
      iconImg: CUTOUT_ASSETS.briefcase,
      x: radius * 1.05,
      y: -radius * 0.55,
      delay: 0.12,
      tag: config.icons.briefcase.tag,
      theme: THEME_STYLES[config.icons.briefcase.colorTheme || 'blue'],
    },
    {
      id: 'book' as const,
      name: config.icons.book.name,
      iconImg: CUTOUT_ASSETS.book,
      x: radius * 0.95,
      y: radius * 0.65,
      delay: 0.16,
      tag: config.icons.book.tag,
      theme: THEME_STYLES[config.icons.book.colorTheme || 'emerald'],
    },
    {
      id: 'controller' as const,
      name: config.icons.controller.name,
      iconImg: CUTOUT_ASSETS.controller,
      x: -radius * 0.95,
      y: radius * 0.65,
      delay: 0.20,
      tag: config.icons.controller.tag,
      theme: THEME_STYLES[config.icons.controller.colorTheme || 'purple'],
    },
  ];

  const currentActiveIcon = activePopup ? config.icons[activePopup] : null;
  const currentActiveTheme = currentActiveIcon ? THEME_STYLES[currentActiveIcon.colorTheme || 'pink'] : null;

  const renderItemIcon = (iconType?: string) => {
    switch (iconType) {
      case 'instagram': return <Instagram size={16} />;
      case 'youtube': return <Youtube size={16} />;
      case 'linkedin': return <Linkedin size={16} />;
      case 'mail': return <Mail size={16} />;
      case 'heart':
      case 'pinterest': return <Heart size={16} />;
      case 'globe': return <Globe size={16} />;
      default: return <ExternalLink size={16} />;
    }
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>

      {/* Main Interactive Stage: head + 5 orbiting items. Padding reserves room for the orbit so
          nothing overlaps the title or anything below it when the items fly out. */}
      <div
        className="relative flex items-center justify-center overflow-visible"
        style={{ padding: `${Math.round(radius * 1.08)}px ${Math.round(radius * 1.05)}px ${Math.round(radius * 0.65 + 24)}px` }}
      >
        {/* Faint dashed orbit hinting that something lives around the photo */}
        <motion.div
          aria-hidden="true"
          className="absolute rounded-full border-2 border-dashed border-pink-300/60 pointer-events-none"
          style={{ width: radius * 2.1, height: radius * 2.1, left: '50%', top: '50%', marginLeft: -radius * 1.05, marginTop: -radius * 1.05 + (radius * 1.08 - (radius * 0.65 + 24)) / 2 }}
          animate={{ rotate: 360, opacity: isOpen ? 0.25 : 0.9 }}
          transition={{ rotate: { duration: 40, repeat: Infinity, ease: 'linear' }, opacity: { duration: 0.3 } }}
        />

        {/* Center Container Anchor */}
        <div className={`relative ${headSizeClasses} flex items-center justify-center overflow-visible`}>

          {/* 5 FLOATING CUTOUT IMAGES BEHIND THE HEAD */}
          <AnimatePresence>
            {isOpen && brainItems.map((item) => (
              <motion.button
                key={item.id}
                initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1, 
                  x: item.x, 
                  y: item.y,
                  transition: {
                    type: 'spring',
                    stiffness: 350,
                    damping: 20,
                    delay: item.delay
                  }
                }}
                exit={{ 
                  scale: 0, 
                  opacity: 0, 
                  x: 0, 
                  y: 0,
                  transition: { duration: 0.16 }
                }}
                whileHover={{ scale: 1.25, rotate: 6 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => handleOpenPopup(e, item.id)}
                className="absolute z-10 w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center cursor-pointer group focus:outline-none bg-transparent border-0 p-0 m-0"
                title={item.name}
                aria-label={item.name}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <img 
                    src={item.iconImg} 
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain filter drop-shadow-md transition-transform group-hover:scale-115 pointer-events-none select-none"
                  />
                  
                  {/* Floating tooltip label */}
                  <span className={`absolute -bottom-3 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${item.theme.tag}`}>
                    {item.tag}
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>

          {/* THE HEAD: Frameless, photo used directly without background removal, no frame around it */}
          <motion.button
            onClick={toggleOpen}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative z-20 w-full h-full cursor-pointer focus:outline-none bg-transparent border-0 p-0 m-0 flex items-center justify-center"
            title={isOpen ? 'Click head to close items' : 'Click Grace to pick my brain!'}
            aria-label="Grace Profile Avatar - Click to pick my brain"
          >
            {/* Photo rendered directly without frame or border */}
            <img 
              src={config.photoUrl} 
              alt="Grace" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-3xl pointer-events-none select-none shadow-md transition-all duration-200"
            />
          </motion.button>
        </div>
      </div>

      {/* Profile Title Text Banner */}
      <div className="mt-1 text-center flex flex-col items-center">
        <motion.button
          onClick={toggleOpen}
          className="flex items-center gap-1.5 text-pink-600 bg-transparent border-0 cursor-pointer"
          animate={isOpen ? { y: 0 } : { y: [0, -4, 0] }}
          transition={isOpen ? { duration: 0.2 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="18" height="22" viewBox="0 0 18 22" fill="none" className="shrink-0" aria-hidden="true">
            <path d="M9 20 C6 14, 6 8, 9 3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="3 2.5" />
            <path d="M4 7 L9 2 L14 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-serif italic text-base sm:text-lg font-black tracking-wide leading-none">pick my brain</span>
          <span className="text-[10px] sm:text-xs font-bold text-slate-500">{isOpen ? '(tap photo to close)' : '(tap my photo!)'}</span>
        </motion.button>
        <h2 className="mt-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
          {config.profileTitle}
        </h2>

        {/* Option within app to edit features whenever she wants (hidden when readOnly) */}
        {!readOnly && showEditTrigger && (
          <button
            onClick={() => handleOpenCustomizerForCurrent('profile')}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 hover:bg-white text-slate-600 hover:text-pink-600 border border-slate-200 shadow-2xs text-[11px] font-bold transition-all hover:scale-103 cursor-pointer"
            title="Edit profile photo, title, links, containers, and popup colors"
          >
            <Sliders size={12} className="text-pink-500" />
            <span>Edit Features & Popups</span>
          </button>
        )}
      </div>

      {/* MODAL POPUPS (Click anywhere on screen to dismiss) */}
      <AnimatePresence>
        {activePopup && currentActiveIcon && currentActiveTheme && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm select-auto"
            onClick={() => setActivePopup(null)} // Click anywhere outside to dismiss
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()} // Prevent dismiss when clicking card
              className="glass-strong font-display rounded-3xl max-w-lg w-full overflow-hidden relative max-h-[90vh] flex flex-col"
            >
              
              {/* Top Controls: Edit this popup button (only in app) + Dismiss X Button */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
                {!readOnly && (
                  <button
                    onClick={() => {
                      handleOpenCustomizerForCurrent(activePopup);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full text-[11px] font-bold transition-colors cursor-pointer"
                    title="Customize this popup's links, containers, title, and colors"
                  >
                    <Edit3 size={12} />
                    <span>Edit Info</span>
                  </button>
                )}

                <button
                  onClick={() => setActivePopup(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  title="Close (or click outside)"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Popup Body */}
              <div className="overflow-y-auto p-6 md:p-8 space-y-5">

                {/* Popup Header */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 flex items-center justify-center shrink-0">
                    <img 
                      src={CUTOUT_ASSETS[activePopup]} 
                      alt={currentActiveIcon.name} 
                      className="w-full h-full object-contain filter drop-shadow-sm select-none" 
                    />
                  </div>
                  <div className="pr-16">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentActiveTheme.badge}`}>
                      {currentActiveIcon.badge}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      {currentActiveIcon.title}
                    </h3>
                    <p className="text-xs text-slate-500">{currentActiveIcon.subtitle}</p>
                  </div>
                </div>

                {/* Quote / Intro description banner */}
                {currentActiveIcon.quote?.text && (
                  <div className={`p-4 rounded-2xl border ${currentActiveTheme.subtleBg}`}>
                    <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-serif italic">
                      &ldquo;{currentActiveIcon.quote.text}&rdquo;
                    </p>
                    {currentActiveIcon.quote.author && (
                      <p className={`text-[10px] font-bold text-right mt-1.5 ${currentActiveTheme.textAccent}`}>
                        {currentActiveIcon.quote.author}
                      </p>
                    )}
                  </div>
                )}

                {/* Dynamic Containers */}
                <div className="space-y-4">
                  {currentActiveIcon.containers.map((container) => (
                    <div key={container.id} className="space-y-2.5">
                      
                      {container.title && (
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          {container.title}
                        </h4>
                      )}

                      {/* --- Container: Link List --- */}
                      {container.type === 'links' && (
                        <div className="space-y-2.5">
                          {container.items.map((linkItem) => (
                            <a
                              key={linkItem.id}
                              href={linkItem.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-3 rounded-xl bg-white/70 hover:bg-white border border-white transition-colors group cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${currentActiveTheme.iconBg} shadow-2xs`}>
                                  {renderItemIcon(linkItem.iconType)}
                                </div>
                                <div>
                                  <p className="font-bold text-xs text-slate-900">{linkItem.title}</p>
                                  {linkItem.subtitle && (
                                    <p className={`text-[11px] font-medium ${currentActiveTheme.textAccent}`}>
                                      {linkItem.subtitle}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-slate-400 group-hover:text-slate-800 flex items-center gap-1 font-medium">
                                <span>{linkItem.tag || 'Visit'}</span>
                                <ExternalLink size={12} />
                              </span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* --- Container: Info List / Highlights --- */}
                      {container.type === 'info_list' && (
                        <div className="p-4 rounded-2xl bg-white/50 border border-white space-y-3">
                          {container.items.map((infoItem) => (
                            <div key={infoItem.id} className="flex items-start gap-2.5 text-xs text-slate-700">
                              <span className="text-sm mt-0.5 shrink-0">{infoItem.emoji || '✨'}</span>
                              <div>
                                <p className="font-bold text-slate-900">{infoItem.title}</p>
                                {infoItem.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                    {infoItem.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* --- Container: Grid Cards --- */}
                      {container.type === 'cards' && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {container.items.map((cardItem) => (
                            <div 
                              key={cardItem.id} 
                              className={`p-2.5 rounded-xl border font-medium text-slate-700 flex items-center gap-1.5 ${currentActiveTheme.subtleBg}`}
                            >
                              <span>{cardItem.emoji || '✨'}</span>
                              <span className="font-semibold text-slate-800">{cardItem.title}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* --- Container: Text Card / Scripture / Note --- */}
                      {container.type === 'text_card' && (
                        <div className={`p-3.5 rounded-xl border ${currentActiveTheme.subtleBg}`}>
                          {container.badge && (
                            <div className="flex justify-end mb-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentActiveTheme.pill}`}>
                                {container.badge}
                              </span>
                            </div>
                          )}
                          <p className={`text-[11px] md:text-xs font-semibold leading-relaxed ${currentActiveTheme.textAccent}`}>
                            {container.text}
                          </p>
                        </div>
                      )}

                    </div>
                  ))}
                </div>

              </div>

              {/* Footer Dismiss Notice */}
              <div className={`p-3 bg-white/40 border-t border-white/80 flex items-center ${readOnly ? 'justify-center' : 'justify-between'} text-xs text-slate-400 px-6 shrink-0`}>
                {!readOnly && (
                  <button
                    onClick={() => handleOpenCustomizerForCurrent(activePopup)}
                    className="text-pink-600 hover:text-pink-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders size={12} />
                    <span>Customize this popup</span>
                  </button>
                )}
                <span className="text-[11px]">Click outside or tap ✕ to close</span>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* The In-App Customizer Modal (only rendered when editable inside app) */}
      {!readOnly && (
        <BrainCustomizerModal
          isOpen={isCustomizerOpen}
          onClose={() => setIsCustomizerOpen(false)}
          initialTab={customizerTab}
        />
      )}

    </div>
  );
}
