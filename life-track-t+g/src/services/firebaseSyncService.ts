/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isFirebaseConfigured } from '../firebase';
import { UserData, PeriodData, Activity, ThemeColor } from '../types';
import { ProfileConfig } from '../types/brainConfig';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

type SyncListener = (status: SyncStatus, message?: string) => void;
const listeners = new Set<SyncListener>();
let currentStatus: SyncStatus = 'idle';

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => {
    listeners.delete(listener);
  };
}

function setSyncState(status: SyncStatus, message?: string) {
  currentStatus = status;
  listeners.forEach((l) => l(status, message));
}

export interface FirebaseAllData {
  userData?: UserData;
  periodData?: PeriodData;
  activities?: Activity[];
  brainConfig?: ProfileConfig;
  theme?: ThemeColor;
}

/**
 * Loads all stored planner documents from Firestore.
 */
export async function loadAllFromFirebase(): Promise<FirebaseAllData | null> {
  if (!isFirebaseConfigured) return null;

  try {
    setSyncState('syncing', 'Connecting to cloud database...');

    const [userSnap, periodSnap, actSnap, brainSnap, themeSnap] = await Promise.all([
      getDoc(doc(db, 'trackers', 'grace')).catch((err) => {
        handleFirestoreError(err, OperationType.GET, 'trackers/grace');
      }),
      getDoc(doc(db, 'trackers', 'period')).catch((err) => {
        handleFirestoreError(err, OperationType.GET, 'trackers/period');
      }),
      getDoc(doc(db, 'trackers', 'activities')).catch((err) => {
        handleFirestoreError(err, OperationType.GET, 'trackers/activities');
      }),
      getDoc(doc(db, 'trackers', 'brainConfig')).catch((err) => {
        handleFirestoreError(err, OperationType.GET, 'trackers/brainConfig');
      }),
      getDoc(doc(db, 'trackers', 'theme')).catch((err) => {
        handleFirestoreError(err, OperationType.GET, 'trackers/theme');
      }),
    ]);

    const result: FirebaseAllData = {};

    if (userSnap && userSnap.exists()) {
      result.userData = userSnap.data() as UserData;
    }
    if (periodSnap && periodSnap.exists()) {
      result.periodData = periodSnap.data() as PeriodData;
    }
    if (actSnap && actSnap.exists()) {
      const data = actSnap.data();
      if (Array.isArray(data.activities)) {
        result.activities = data.activities as Activity[];
      }
    }
    if (brainSnap && brainSnap.exists()) {
      result.brainConfig = brainSnap.data() as ProfileConfig;
    }
    if (themeSnap && themeSnap.exists()) {
      const data = themeSnap.data();
      if (data.theme) {
        result.theme = data.theme as ThemeColor;
      }
    }

    setSyncState('synced', 'Synced with Firebase');
    return result;
  } catch (err) {
    console.warn('Could not load from Firebase:', err);
    setSyncState('error', 'Cloud sync unavailable, using local cache');
    return null;
  }
}

/**
 * Save user task and habit data to Firestore.
 */
export async function saveUserDataToFirebase(data: UserData): Promise<void> {
  if (!isFirebaseConfigured) return;
  setSyncState('syncing', 'Saving planner to cloud...');
  try {
    await setDoc(doc(db, 'trackers', 'grace'), {
      habits: data.habits || [],
      weeklySchedule: data.weeklySchedule || {},
      lastResetDate: data.lastResetDate || new Date().toISOString(),
    });
    setSyncState('synced', 'Saved to Firebase');
  } catch (err) {
    setSyncState('error', 'Failed saving to cloud');
    handleFirestoreError(err, OperationType.WRITE, 'trackers/grace');
  }
}

/**
 * Save menstrual cycle tracker data to Firestore.
 */
export async function savePeriodDataToFirebase(data: PeriodData): Promise<void> {
  if (!isFirebaseConfigured) return;
  setSyncState('syncing', 'Saving cycle data...');
  try {
    await setDoc(doc(db, 'trackers', 'period'), {
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      cycleLength: data.cycleLength ?? 28,
    });
    setSyncState('synced', 'Saved to Firebase');
  } catch (err) {
    setSyncState('error', 'Failed saving to cloud');
    handleFirestoreError(err, OperationType.WRITE, 'trackers/period');
  }
}

/**
 * Save calendar events to Firestore.
 */
export async function saveActivitiesToFirebase(activities: Activity[]): Promise<void> {
  if (!isFirebaseConfigured) return;
  setSyncState('syncing', 'Saving events...');
  try {
    await setDoc(doc(db, 'trackers', 'activities'), {
      activities: activities || [],
    });
    setSyncState('synced', 'Saved to Firebase');
  } catch (err) {
    setSyncState('error', 'Failed saving to cloud');
    handleFirestoreError(err, OperationType.WRITE, 'trackers/activities');
  }
}

/**
 * Save custom profile photo, titles, and 5 icon popup configurations to Firestore.
 */
export async function saveBrainConfigToFirebase(config: ProfileConfig): Promise<void> {
  if (!isFirebaseConfigured) return;
  setSyncState('syncing', 'Saving profile customizations...');
  try {
    await setDoc(doc(db, 'trackers', 'brainConfig'), {
      photoUrl: config.photoUrl,
      profileTitle: config.profileTitle || 'Productivity Profile',
      icons: config.icons || {},
    });
    setSyncState('synced', 'Saved to Firebase');
  } catch (err) {
    setSyncState('error', 'Failed saving to cloud');
    handleFirestoreError(err, OperationType.WRITE, 'trackers/brainConfig');
  }
}

/**
 * Save active theme preference to Firestore.
 */
export async function saveThemeToFirebase(theme: ThemeColor): Promise<void> {
  if (!isFirebaseConfigured) return;
  setSyncState('syncing', 'Saving theme...');
  try {
    await setDoc(doc(db, 'trackers', 'theme'), {
      theme,
    });
    setSyncState('synced', 'Saved to Firebase');
  } catch (err) {
    setSyncState('error', 'Failed saving to cloud');
    handleFirestoreError(err, OperationType.WRITE, 'trackers/theme');
  }
}
