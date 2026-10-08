/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BrainIconId = 'camera' | 'briefcase' | 'controller' | 'book' | 'cross';

export type ColorTheme = 
  | 'pink' 
  | 'amber' 
  | 'blue' 
  | 'emerald' 
  | 'purple' 
  | 'rose' 
  | 'indigo' 
  | 'slate';

export type ContainerType = 'links' | 'info_list' | 'cards' | 'text_card' | 'quote';

export interface PopupItem {
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
  iconType?: string; // 'instagram' | 'tiktok' | 'youtube' | 'pinterest' | 'linkedin' | 'mail' | 'globe' | 'heart' | 'external' | etc.
  emoji?: string;
  tag?: string;
  description?: string;
  badge?: string;
}

export interface PopupContainer {
  id: string;
  title?: string;
  type: ContainerType;
  bgColor?: string;
  items: PopupItem[];
  text?: string;
  author?: string;
  badge?: string;
}

export interface BrainIconConfig {
  id: BrainIconId;
  name: string;
  tag: string;
  badge: string;
  title: string;
  subtitle: string;
  colorTheme: ColorTheme;
  quote?: {
    text: string;
    author?: string;
  };
  containers: PopupContainer[];
}

export interface ProfileConfig {
  photoUrl: string;
  profileTitle: string;
  icons: Record<BrainIconId, BrainIconConfig>;
}
