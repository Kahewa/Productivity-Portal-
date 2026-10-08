/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProfileConfig } from '../types/brainConfig';
import { DEFAULT_BRAIN_CONFIG, DEFAULT_PHOTO_HEAD } from '../config/defaultBrainConfig';
import { saveBrainConfigToFirebase } from './firebaseSyncService';

const STORAGE_KEY = 'grace_brain_profile_config';
const LEGACY_AVATAR_KEY = 'grace_custom_avatar_cutout';

export function getBrainConfig(): ProfileConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy avatar
      const legacyAvatar = localStorage.getItem(LEGACY_AVATAR_KEY);
      if (legacyAvatar) {
        return {
          ...DEFAULT_BRAIN_CONFIG,
          photoUrl: legacyAvatar,
        };
      }
      return DEFAULT_BRAIN_CONFIG;
    }

    const parsed = JSON.parse(raw) as Partial<ProfileConfig>;
    // Deep merge to ensure all icons and fallback structures exist
    const merged: ProfileConfig = {
      photoUrl: parsed.photoUrl || localStorage.getItem(LEGACY_AVATAR_KEY) || DEFAULT_PHOTO_HEAD,
      profileTitle: parsed.profileTitle || DEFAULT_BRAIN_CONFIG.profileTitle,
      icons: {
        camera: { ...DEFAULT_BRAIN_CONFIG.icons.camera, ...(parsed.icons?.camera || {}) },
        cross: { ...DEFAULT_BRAIN_CONFIG.icons.cross, ...(parsed.icons?.cross || {}) },
        briefcase: { ...DEFAULT_BRAIN_CONFIG.icons.briefcase, ...(parsed.icons?.briefcase || {}) },
        book: { ...DEFAULT_BRAIN_CONFIG.icons.book, ...(parsed.icons?.book || {}) },
        controller: { ...DEFAULT_BRAIN_CONFIG.icons.controller, ...(parsed.icons?.controller || {}) },
      },
    };

    return merged;
  } catch (err) {
    console.error('Failed to parse brain config from storage:', err);
    return DEFAULT_BRAIN_CONFIG;
  }
}

export function saveBrainConfig(config: ProfileConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    if (config.photoUrl) {
      localStorage.setItem(LEGACY_AVATAR_KEY, config.photoUrl);
    }
    // Dispatch events to notify all active components
    window.dispatchEvent(new CustomEvent('grace_brain_config_updated', { detail: config }));
    window.dispatchEvent(new CustomEvent('grace_avatar_updated', { detail: config.photoUrl }));

    // Asynchronously sync to Firebase cloud database
    saveBrainConfigToFirebase(config).catch((err) => {
      console.warn('Firebase background save of brain config deferred:', err);
    });
  } catch (err) {
    console.error('Failed to save brain config:', err);
  }
}

export function applyRemoteBrainConfig(remoteConfig: ProfileConfig): ProfileConfig {
  try {
    const merged: ProfileConfig = {
      photoUrl: remoteConfig.photoUrl || DEFAULT_PHOTO_HEAD,
      profileTitle: remoteConfig.profileTitle || DEFAULT_BRAIN_CONFIG.profileTitle,
      icons: {
        camera: { ...DEFAULT_BRAIN_CONFIG.icons.camera, ...(remoteConfig.icons?.camera || {}) },
        cross: { ...DEFAULT_BRAIN_CONFIG.icons.cross, ...(remoteConfig.icons?.cross || {}) },
        briefcase: { ...DEFAULT_BRAIN_CONFIG.icons.briefcase, ...(remoteConfig.icons?.briefcase || {}) },
        book: { ...DEFAULT_BRAIN_CONFIG.icons.book, ...(remoteConfig.icons?.book || {}) },
        controller: { ...DEFAULT_BRAIN_CONFIG.icons.controller, ...(remoteConfig.icons?.controller || {}) },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    if (merged.photoUrl) {
      localStorage.setItem(LEGACY_AVATAR_KEY, merged.photoUrl);
    }
    window.dispatchEvent(new CustomEvent('grace_brain_config_updated', { detail: merged }));
    window.dispatchEvent(new CustomEvent('grace_avatar_updated', { detail: merged.photoUrl }));
    return merged;
  } catch (err) {
    console.error('Failed to apply remote brain config:', err);
    return getBrainConfig();
  }
}

export function resetBrainConfig(): ProfileConfig {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_AVATAR_KEY);
    window.dispatchEvent(new CustomEvent('grace_brain_config_updated', { detail: DEFAULT_BRAIN_CONFIG }));
    window.dispatchEvent(new CustomEvent('grace_avatar_updated', { detail: DEFAULT_PHOTO_HEAD }));

    // Reset in Firebase cloud database as well
    saveBrainConfigToFirebase(DEFAULT_BRAIN_CONFIG).catch((err) => {
      console.warn('Firebase reset sync deferred:', err);
    });

    return DEFAULT_BRAIN_CONFIG;
  } catch (err) {
    console.error('Failed to reset brain config:', err);
    return DEFAULT_BRAIN_CONFIG;
  }
}

export function exportBrainConfigJson(config: ProfileConfig): string {
  return JSON.stringify(config, null, 2);
}

export function importBrainConfigJson(jsonString: string): ProfileConfig {
  const parsed = JSON.parse(jsonString) as ProfileConfig;
  if (!parsed || !parsed.icons) {
    throw new Error('Invalid configuration format');
  }
  saveBrainConfig(parsed);
  return parsed;
}
