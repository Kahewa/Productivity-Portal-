/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Palette, 
  Check, 
  ExternalLink, 
  Link2, 
  Instagram, 
  Youtube, 
  Linkedin, 
  Mail, 
  Globe, 
  Heart, 
  Gamepad2, 
  Briefcase, 
  Camera, 
  BookOpen, 
  Cross as CrossIcon, 
  Sparkles, 
  Download, 
  FileUp, 
  Eye,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { 
  BrainIconId, 
  ColorTheme, 
  ContainerType, 
  ProfileConfig, 
  PopupContainer, 
  PopupItem 
} from '../types/brainConfig';
import { 
  getBrainConfig, 
  saveBrainConfig, 
  resetBrainConfig, 
  exportBrainConfigJson, 
  importBrainConfigJson 
} from '../services/brainConfigStorage';
import { DEFAULT_PHOTO_HEAD } from '../config/defaultBrainConfig';
import { THEME_STYLES } from '../utils/themeStyles';

interface BrainCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | BrainIconId;
}

const AVAILABLE_THEMES: ColorTheme[] = [
  'pink', 'amber', 'blue', 'emerald', 'purple', 'rose', 'indigo', 'slate'
];

const LINK_ICONS: { id: string; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'globe', label: 'Web / TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'mail', label: 'Email' },
  { id: 'heart', label: 'Heart' },
  { id: 'link', label: 'Standard Link' }
];

const EMOJI_PRESETS = ['✝️', '🎮', '📸', '🍵', '📔', '🧘‍♀️', '✨', '📐', '📊', '🚀', '🌱', '💡', '🎯', '❤️'];

export default function BrainCustomizerModal({
  isOpen,
  onClose,
  initialTab = 'profile'
}: BrainCustomizerModalProps) {
  const [config, setConfig] = useState<ProfileConfig>(() => getBrainConfig());
  const [activeTab, setActiveTab] = useState<'profile' | BrainIconId>(initialTab);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync config when modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setConfig(getBrainConfig());
      if (initialTab) setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Profile image upload handler (Direct client file upload - zero AI)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const img = new Image();
        img.onload = () => {
          // Standard browser canvas scale-down solely if oversized (> 512px) to prevent exceeding Firestore document storage
          const maxDim = 512;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const standardUrl = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.92);
            setConfig(prev => ({
              ...prev,
              photoUrl: standardUrl
            }));
            showNotification('Profile photo updated directly from your file');
            return;
          }
          setConfig(prev => ({
            ...prev,
            photoUrl: dataUrl
          }));
          showNotification('Profile photo updated directly from your file');
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetPhoto = () => {
    setConfig(prev => ({
      ...prev,
      photoUrl: DEFAULT_PHOTO_HEAD
    }));
    showNotification('Restored default profile photo');
  };

  // Icon config updaters
  const updateIconField = <K extends keyof ProfileConfig['icons'][BrainIconId]>(
    iconId: BrainIconId,
    field: K,
    value: ProfileConfig['icons'][BrainIconId][K]
  ) => {
    setConfig(prev => ({
      ...prev,
      icons: {
        ...prev.icons,
        [iconId]: {
          ...prev.icons[iconId],
          [field]: value
        }
      }
    }));
  };

  // Add container to current icon
  const handleAddContainer = (iconId: BrainIconId, type: ContainerType) => {
    const newContainer: PopupContainer = {
      id: `${iconId}-container-${Date.now()}`,
      title: type === 'links' ? 'New Links Section' : type === 'info_list' ? 'New Highlights' : type === 'cards' ? 'Focus Areas' : 'Note',
      type,
      text: type === 'text_card' ? 'Add your notes or descriptions here...' : undefined,
      items: type === 'links' ? [
        {
          id: `item-${Date.now()}`,
          title: 'Custom Link',
          subtitle: '@handle or description',
          url: 'https://',
          iconType: 'link',
          tag: 'Visit'
        }
      ] : type === 'info_list' ? [
        {
          id: `item-${Date.now()}`,
          title: 'New Service or Milestone',
          description: 'Detailed description of this item.',
          emoji: '✨'
        }
      ] : type === 'cards' ? [
        {
          id: `item-${Date.now()}`,
          title: 'Core Focus',
          emoji: '🎯'
        }
      ] : []
    };

    setConfig(prev => {
      const icon = prev.icons[iconId];
      return {
        ...prev,
        icons: {
          ...prev.icons,
          [iconId]: {
            ...icon,
            containers: [...icon.containers, newContainer]
          }
        }
      };
    });
    showNotification(`Added new ${type} container`);
  };

  // Remove container
  const handleRemoveContainer = (iconId: BrainIconId, containerId: string) => {
    setConfig(prev => {
      const icon = prev.icons[iconId];
      return {
        ...prev,
        icons: {
          ...prev.icons,
          [iconId]: {
            ...icon,
            containers: icon.containers.filter(c => c.id !== containerId)
          }
        }
      };
    });
    showNotification('Container removed');
  };

  // Add item inside container
  const handleAddItem = (iconId: BrainIconId, containerId: string, itemType: ContainerType) => {
    const newItem: PopupItem = {
      id: `item-${Date.now()}`,
      title: itemType === 'links' ? 'New Link' : itemType === 'info_list' ? 'New Highlight' : 'New Card',
      subtitle: itemType === 'links' ? '@username or description' : undefined,
      url: itemType === 'links' ? 'https://' : undefined,
      iconType: itemType === 'links' ? 'globe' : undefined,
      tag: itemType === 'links' ? 'Visit' : undefined,
      emoji: itemType === 'info_list' ? '✨' : itemType === 'cards' ? '🌟' : undefined,
      description: itemType === 'info_list' ? 'Brief description...' : undefined
    };

    setConfig(prev => {
      const icon = prev.icons[iconId];
      return {
        ...prev,
        icons: {
          ...prev.icons,
          [iconId]: {
            ...icon,
            containers: icon.containers.map(c => {
              if (c.id === containerId) {
                return {
                  ...c,
                  items: [...c.items, newItem]
                };
              }
              return c;
            })
          }
        }
      };
    });
  };

  // Remove item from container
  const handleRemoveItem = (iconId: BrainIconId, containerId: string, itemId: string) => {
    setConfig(prev => {
      const icon = prev.icons[iconId];
      return {
        ...prev,
        icons: {
          ...prev.icons,
          [iconId]: {
            ...icon,
            containers: icon.containers.map(c => {
              if (c.id === containerId) {
                return {
                  ...c,
                  items: c.items.filter(i => i.id !== itemId)
                };
              }
              return c;
            })
          }
        }
      };
    });
  };

  // Update item inside container
  const handleUpdateItem = (
    iconId: BrainIconId,
    containerId: string,
    itemId: string,
    patch: Partial<PopupItem>
  ) => {
    setConfig(prev => {
      const icon = prev.icons[iconId];
      return {
        ...prev,
        icons: {
          ...prev.icons,
          [iconId]: {
            ...icon,
            containers: icon.containers.map(c => {
              if (c.id === containerId) {
                return {
                  ...c,
                  items: c.items.map(i => i.id === itemId ? { ...i, ...patch } : i)
                };
              }
              return c;
            })
          }
        }
      };
    });
  };

  // Save changes
  const handleSave = () => {
    saveBrainConfig(config);
    showNotification('All changes saved successfully! ✨');
  };

  // Reset to default
  const handleConfirmReset = () => {
    const def = resetBrainConfig();
    setConfig(def);
    setShowResetConfirm(false);
    showNotification('Reset all features to default settings');
  };

  // Export JSON
  const handleExport = () => {
    const json = exportBrainConfigJson(config);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grace_profile_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Configuration downloaded!');
  };

  // Import JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importBrainConfigJson(text);
        setConfig(imported);
        showNotification('Configuration imported and saved!');
      } catch {
        alert('Could not parse JSON configuration file. Please check format.');
      }
    };
    reader.readAsText(file);
  };

  const currentIconConfig = activeTab !== 'profile' ? config.icons[activeTab] : null;
  const currentThemeDef = currentIconConfig ? THEME_STYLES[currentIconConfig.colorTheme] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full h-[90vh] max-h-[850px] flex flex-col overflow-hidden relative"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shadow-2xs">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-serif">
                Customize Profile & Popups
              </h2>
              <p className="text-xs text-slate-500">
                Change your photo, title, links, containers, and popup details whenever you want
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                showPreview 
                  ? 'bg-pink-500 text-white border-pink-500 shadow-2xs' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle Live Popup Preview"
            >
              <Eye size={14} />
              <span className="hidden sm:inline">{showPreview ? 'Exit Preview' : 'Live Preview'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
              title="Close Customizer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-100/90 border-b border-slate-200 overflow-x-auto shrink-0 select-none no-scrollbar">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ImageIcon size={14} className="text-pink-600" />
            <span>Profile & Photo</span>
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* 5 Icons Tabs */}
          {(['camera', 'cross', 'briefcase', 'book', 'controller'] as BrainIconId[]).map((iconId) => {
            const iconData = config.icons[iconId];
            const isActive = activeTab === iconId;
            return (
              <button
                key={iconId}
                onClick={() => setActiveTab(iconId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {iconId === 'camera' && <Camera size={13} className="text-pink-600" />}
                {iconId === 'cross' && <CrossIcon size={13} className="text-amber-600" />}
                {iconId === 'briefcase' && <Briefcase size={13} className="text-blue-600" />}
                {iconId === 'book' && <BookOpen size={13} className="text-emerald-600" />}
                {iconId === 'controller' && <Gamepad2 size={13} className="text-purple-600" />}
                <span>{iconData.name}</span>
              </button>
            );
          })}
        </div>

        {/* Toast Notification */}
        <AnimatePresence>
          {saveToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 border border-slate-700 pointer-events-none"
            >
              <Check size={14} className="text-emerald-400" />
              <span>{saveToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">

          {/* =========================================================================
              TAB 1: PROFILE PHOTO & TITLE
              ========================================================================= */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Profile Photo & Headshot
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  Upload an image from your device or paste a public image URL, including a Cloudinary delivery link. The image preview updates as you edit.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Avatar Preview */}
                  <div className="relative group shrink-0">
                    <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-md border-2 border-pink-200 bg-slate-100 flex items-center justify-center">
                      <img
                        src={config.photoUrl}
                        alt="Profile Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 flex-1 w-full text-center sm:text-left">
                    <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Upload size={14} />
                        <span>Upload Photo From Device</span>
                      </button>

                      <button
                        onClick={handleResetPhoto}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Restore original studio portrait"
                      >
                        <RefreshCw size={13} />
                        <span>Reset to Default Photo</span>
                      </button>
                    </div>

                    {/* Public image URL, including Cloudinary delivery URLs */}
                    <div className="mt-3">
                      <label htmlFor="profile-image-url" className="text-[11px] font-bold text-slate-500 block mb-1">
                        Or paste an image link (Cloudinary supported):
                      </label>
                      <input
                        id="profile-image-url"
                        type="url"
                        value={config.photoUrl}
                        onChange={(e) => setConfig({ ...config, photoUrl: e.target.value })}
                        placeholder="https://res.cloudinary.com/your-cloud/image/upload/photo.jpg"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">
                        Use a publicly accessible image URL. Click “Save Changes” to keep it.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Title Text */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Profile Title Banner
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  The subtitle text displayed directly underneath the head profile icon on the login landing page.
                </p>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Profile Title Heading:
                  </label>
                  <input
                    type="text"
                    value={config.profileTitle}
                    onChange={(e) => setConfig({ ...config, profileTitle: e.target.value })}
                    placeholder="Kahewa Grace Productivity Profile"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-pink-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Preview: &quot;{config.profileTitle}&quot;
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TABS 2-6: INDIVIDUAL ICON & POPUP CUSTOMIZER
              ========================================================================= */}
          {activeTab !== 'profile' && currentIconConfig && currentThemeDef && (
            <div className="space-y-6">

              {/* LIVE PREVIEW BANNER (IF TOGGLED) */}
              {showPreview && (
                <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 text-white relative">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Live Popup Preview
                    </span>
                    <button
                      onClick={() => setShowPreview(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Hide Preview
                    </button>
                  </div>

                  {/* Render preview of popup card */}
                  <div className="bg-white text-slate-900 p-6 rounded-2xl max-w-lg mx-auto shadow-2xl">
                    <div className="flex items-center gap-3.5 mb-4">
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentThemeDef.badge}`}>
                          {currentIconConfig.badge}
                        </span>
                        <h4 className="text-lg font-black text-slate-900 font-serif mt-1">
                          {currentIconConfig.title}
                        </h4>
                        <p className="text-xs text-slate-500">{currentIconConfig.subtitle}</p>
                      </div>
                    </div>

                    {currentIconConfig.quote?.text && (
                      <div className={`p-3 rounded-xl border mb-4 text-xs italic ${currentThemeDef.subtleBg}`}>
                        &ldquo;{currentIconConfig.quote.text}&rdquo;
                        {currentIconConfig.quote.author && (
                          <div className={`text-[10px] font-bold not-italic text-right mt-1 ${currentThemeDef.textAccent}`}>
                            {currentIconConfig.quote.author}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      {currentIconConfig.containers.map(container => (
                        <div key={container.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
                          {container.title && (
                            <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider mb-2">
                              {container.title}
                            </div>
                          )}
                          {container.type === 'links' && (
                            <div className="space-y-2">
                              {container.items.map(item => (
                                <div key={item.id} className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-md ${currentThemeDef.iconBg}`}>
                                      <Link2 size={13} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-xs text-slate-900">{item.title}</p>
                                      {item.subtitle && <p className="text-[10px] text-slate-500">{item.subtitle}</p>}
                                    </div>
                                  </div>
                                  {item.tag && <span className="text-[10px] text-slate-400 font-medium">{item.tag}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          {container.type === 'info_list' && (
                            <div className="space-y-2">
                              {container.items.map(item => (
                                <div key={item.id} className="flex items-start gap-2">
                                  <span className="text-sm">{item.emoji || '✨'}</span>
                                  <div>
                                    <p className="font-bold text-slate-900">{item.title}</p>
                                    {item.description && <p className="text-[11px] text-slate-600">{item.description}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {container.type === 'cards' && (
                            <div className="grid grid-cols-2 gap-2">
                              {container.items.map(item => (
                                <div key={item.id} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium">
                                  {item.emoji} {item.title}
                                </div>
                              ))}
                            </div>
                          )}
                          {container.type === 'text_card' && (
                            <p className="text-slate-700 leading-relaxed">{container.text}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 1. HEADER & TITLES CONFIG */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Header Titles & Labels
                    </h3>
                    <p className="text-xs text-slate-500">
                      Customize how this icon appears in the radial menu and inside the popup card.
                    </p>
                  </div>

                  {/* Color Swatch Picker */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                      <Palette size={13} />
                      <span>Theme:</span>
                    </span>
                    {AVAILABLE_THEMES.map((thm) => {
                      const thmStyle = THEME_STYLES[thm];
                      const isSelected = currentIconConfig.colorTheme === thm;
                      return (
                        <button
                          key={thm}
                          onClick={() => updateIconField(activeTab, 'colorTheme', thm)}
                          className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                            isSelected ? 'border-slate-900 scale-110 shadow-xs' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: thmStyle.swatch }}
                          title={`Select ${thmStyle.name} theme`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Radial Hover Tag (Tooltip)
                    </label>
                    <input
                      type="text"
                      value={currentIconConfig.tag}
                      onChange={(e) => updateIconField(activeTab, 'tag', e.target.value)}
                      placeholder="e.g. Socials, Faith, Work"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Popup Badge Pill Text
                    </label>
                    <input
                      type="text"
                      value={currentIconConfig.badge}
                      onChange={(e) => updateIconField(activeTab, 'badge', e.target.value)}
                      placeholder="e.g. Visuals & Lifestyle"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Popup Main Heading
                    </label>
                    <input
                      type="text"
                      value={currentIconConfig.title}
                      onChange={(e) => updateIconField(activeTab, 'title', e.target.value)}
                      placeholder="e.g. Grace's Social Media"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Popup Subtitle
                    </label>
                    <input
                      type="text"
                      value={currentIconConfig.subtitle}
                      onChange={(e) => updateIconField(activeTab, 'subtitle', e.target.value)}
                      placeholder="e.g. Curated aesthetics, daily routines..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                {/* Intro / Quote Banner */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700">
                      Intro Quote / Description Banner
                    </label>
                    <button
                      onClick={() => {
                        if (currentIconConfig.quote) {
                          updateIconField(activeTab, 'quote', undefined);
                        } else {
                          updateIconField(activeTab, 'quote', { text: 'Personal quote or vision statement...', author: '— Grace' });
                        }
                      }}
                      className="text-[11px] font-bold text-pink-600 hover:text-pink-700 cursor-pointer"
                    >
                      {currentIconConfig.quote ? 'Remove Quote Banner' : '+ Add Quote Banner'}
                    </button>
                  </div>

                  {currentIconConfig.quote && (
                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <textarea
                        rows={2}
                        value={currentIconConfig.quote.text}
                        onChange={(e) => updateIconField(activeTab, 'quote', {
                          ...currentIconConfig.quote,
                          text: e.target.value
                        })}
                        placeholder="Quote text..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                      />
                      <input
                        type="text"
                        value={currentIconConfig.quote.author || ''}
                        onChange={(e) => updateIconField(activeTab, 'quote', {
                          ...currentIconConfig.quote,
                          text: currentIconConfig.quote?.text || '',
                          author: e.target.value
                        })}
                        placeholder="Author or Scripture citation (optional)"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 2. CONTAINERS LIST (ADD, EDIT, REMOVE) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Popup Containers & Content Sections
                    </h3>
                    <p className="text-xs text-slate-500">
                      Add custom link lists, information highlights, text cards, or service points.
                    </p>
                  </div>

                  {/* Add Container Dropdown / Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleAddContainer(activeTab, 'links')}
                      className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>+ Link List</span>
                    </button>
                    <button
                      onClick={() => handleAddContainer(activeTab, 'info_list')}
                      className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>+ Info Points</span>
                    </button>
                    <button
                      onClick={() => handleAddContainer(activeTab, 'cards')}
                      className="px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>+ Grid Cards</span>
                    </button>
                    <button
                      onClick={() => handleAddContainer(activeTab, 'text_card')}
                      className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>+ Text Note</span>
                    </button>
                  </div>
                </div>

                {/* Render Containers */}
                <div className="space-y-4">
                  {currentIconConfig.containers.map((container, cIndex) => (
                    <div
                      key={container.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4"
                    >
                      {/* Container Top Bar */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {container.type.replace('_', ' ')}
                          </span>
                          <input
                            type="text"
                            value={container.title || ''}
                            onChange={(e) => {
                              const title = e.target.value;
                              setConfig(prev => ({
                                ...prev,
                                icons: {
                                  ...prev.icons,
                                  [activeTab]: {
                                    ...prev.icons[activeTab],
                                    containers: prev.icons[activeTab].containers.map(c => 
                                      c.id === container.id ? { ...c, title } : c
                                    )
                                  }
                                }
                              }));
                            }}
                            placeholder="Section Title (e.g. My Social Channels)"
                            className="text-xs font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-pink-500 focus:outline-none px-1 py-0.5"
                          />
                        </div>

                        <button
                          onClick={() => handleRemoveContainer(activeTab, container.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs"
                          title="Remove entire container"
                        >
                          <Trash2 size={14} />
                          <span className="hidden sm:inline">Delete Container</span>
                        </button>
                      </div>

                      {/* --- TYPE 1: LINKS --- */}
                      {container.type === 'links' && (
                        <div className="space-y-3">
                          {container.items.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                {/* Icon selector */}
                                <div className="sm:col-span-3">
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Icon</label>
                                  <select
                                    value={item.iconType || 'link'}
                                    onChange={(e) => handleUpdateItem(activeTab, container.id, item.id, { iconType: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                                  >
                                    {LINK_ICONS.map(i => (
                                      <option key={i.id} value={i.id}>{i.label}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Title */}
                                <div className="sm:col-span-4">
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Title</label>
                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => handleUpdateItem(activeTab, container.id, item.id, { title: e.target.value })}
                                    placeholder="Instagram, TikTok, etc."
                                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                                  />
                                </div>

                                {/* Subtitle / Handle */}
                                <div className="sm:col-span-4">
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Handle / Subtitle</label>
                                  <input
                                    type="text"
                                    value={item.subtitle || ''}
                                    onChange={(e) => handleUpdateItem(activeTab, container.id, item.id, { subtitle: e.target.value })}
                                    placeholder="@bygreys"
                                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                                  />
                                </div>

                                {/* Delete Item */}
                                <div className="sm:col-span-1 flex justify-end">
                                  <button
                                    onClick={() => handleRemoveItem(activeTab, container.id, item.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                    title="Delete link"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                {/* URL */}
                                <div className="sm:col-span-8">
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Destination URL</label>
                                  <input
                                    type="text"
                                    value={item.url || ''}
                                    onChange={(e) => handleUpdateItem(activeTab, container.id, item.id, { url: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-blue-600 font-mono"
                                  />
                                </div>

                                {/* Tag */}
                                <div className="sm:col-span-4">
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tag / Action Text</label>
                                  <input
                                    type="text"
                                    value={item.tag || ''}
                                    onChange={(e) => handleUpdateItem(activeTab, container.id, item.id, { tag: e.target.value })}
                                    placeholder="Daily Posts, Connect, etc."
                                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          <button
                            onClick={() => handleAddItem(activeTab, container.id, 'links')}
                            className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Add Another Link</span>
                          </button>
                        </div>
                      )}

                      {/* --- TYPE 2: INFO LIST --- */}
                      {container.type === 'info_list' && (
                        <div className="space-y-3">
                          {container.items.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-10">
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Emoji</label>
                                  <input
                                    type="text"
                                    value={item.emoji || '✨'}
                                    onChange={(e) => handleUpdateItem(activeTab, container.id, item.id, { emoji: e.target.value })}
                                    className="w-full text-center px-1 py-1 bg-white border border-slate-200 rounded-lg text-sm"
                                  />
                                </div>

                                <div className="flex-1">
                                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Title / Headline</label>
                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => handleUpdateItem(activeTab, container.id, item.id, { title: e.target.value })}
                                    placeholder="e.g. Worship & Media Team"
                                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                                  />
                                </div>

                                <button
                                  onClick={() => handleRemoveItem(activeTab, container.id, item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors mt-3"
                                  title="Delete item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Description</label>
                                <textarea
                                  rows={2}
                                  value={item.description || ''}
                                  onChange={(e) => handleUpdateItem(activeTab, container.id, item.id, { description: e.target.value })}
                                  placeholder="Details, explanation, or role..."
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                                />
                              </div>
                            </div>
                          ))}

                          <button
                            onClick={() => handleAddItem(activeTab, container.id, 'info_list')}
                            className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Add Another Info Point</span>
                          </button>
                        </div>
                      )}

                      {/* --- TYPE 3: CARDS --- */}
                      {container.type === 'cards' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {container.items.map((item) => (
                              <div
                                key={item.id}
                                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2"
                              >
                                <input
                                  type="text"
                                  value={item.emoji || '✨'}
                                  onChange={(e) => handleUpdateItem(activeTab, container.id, item.id, { emoji: e.target.value })}
                                  className="w-8 text-center py-1 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => handleUpdateItem(activeTab, container.id, item.id, { title: e.target.value })}
                                  className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                                />
                                <button
                                  onClick={() => handleRemoveItem(activeTab, container.id, item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => handleAddItem(activeTab, container.id, 'cards')}
                            className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Add Grid Card</span>
                          </button>
                        </div>
                      )}

                      {/* --- TYPE 4: TEXT CARD --- */}
                      {container.type === 'text_card' && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Text Content</label>
                          <textarea
                            rows={3}
                            value={container.text || ''}
                            onChange={(e) => {
                              const text = e.target.value;
                              setConfig(prev => ({
                                ...prev,
                                icons: {
                                  ...prev.icons,
                                  [activeTab]: {
                                    ...prev.icons[activeTab],
                                    containers: prev.icons[activeTab].containers.map(c => 
                                      c.id === container.id ? { ...c, text } : c
                                    )
                                  }
                                }
                              }));
                            }}
                            placeholder="Write your note, scripture verse, or biography here..."
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-pink-500"
                          />
                        </div>
                      )}

                    </div>
                  ))}

                  {currentIconConfig.containers.length === 0 && (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs">
                      No containers yet. Click one of the buttons above to add a Link List, Info Points, Grid Cards, or Text Note!
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Bottom Actions Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Reset to Defaults</span>
            </button>

            <button
              onClick={handleExport}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download backup file"
            >
              <Download size={13} />
              <span>Export</span>
            </button>

            <label className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
              <FileUp size={13} />
              <span>Import</span>
              <input type="file" onChange={handleImport} accept=".json" className="hidden" />
            </label>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handleSave}
              className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
            >
              <Check size={15} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Reset to Defaults?</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    This will restore Grace&apos;s original links, scripture, and photo. Any custom modifications will be reset.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmReset}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                  >
                    Confirm Reset
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
