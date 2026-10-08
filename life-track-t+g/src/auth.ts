/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Cryptographic hash validation - no raw credentials stored in source code
const USER_HASH = '2a48a32891971a67da10780736682c1c7cf9438d1cfffd7e1789c56d8e16f688'; // SHA-256 for uppercase normalized username
const USER_LOWER_HASH = '1905bc6ace4c93095432f1a1013002cde5de9e34344d21bde4356f7e330b5770'; // SHA-256 for lowercase trimmed username
const PASS_HASH = '0bcf34171dfe2cb351a4dca57490c44be4e136106d48b26dc5764700d8156be5'; // SHA-256 for password

const AUTH_KEY = 'grace_session_v1';
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour session duration

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface SessionInfo {
  authenticated: boolean;
  loginTime: number;
  expiresAt: number;
  displayName: string;
}

export async function verifyAndLogin(userAttempt: string, passAttempt: string): Promise<{ success: boolean; error?: string }> {
  const normalizedUser = userAttempt.trim();
  const trimmedPass = passAttempt.trim();

  if (!normalizedUser || !trimmedPass) {
    return { success: false, error: 'Please enter both username and password.' };
  }

  const userHash = await sha256(normalizedUser.toUpperCase());
  const userLowerHash = await sha256(normalizedUser.toLowerCase());
  const passHash = await sha256(trimmedPass);

  const isUserValid = userHash === USER_HASH || userLowerHash === USER_LOWER_HASH;
  const isPassValid = passHash === PASS_HASH;

  if (isUserValid && isPassValid) {
    const now = Date.now();
    const session: SessionInfo = {
      authenticated: true,
      loginTime: now,
      expiresAt: now + ONE_HOUR_MS,
      displayName: 'Kahewa Grace'
    };
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    } catch {
      // storage quota or private browsing
    }
    return { success: true };
  }

  return { success: false, error: 'Incorrect username or password. Grace only access.' };
}

export function getActiveSession(): SessionInfo | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session: SessionInfo = JSON.parse(raw);
    const now = Date.now();
    if (now >= session.expiresAt) {
      // Expired after 1 hour
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}
