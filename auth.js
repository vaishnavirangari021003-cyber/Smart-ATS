/**
 * HireFlow Authentication Service (auth.js)
 * Manages user logins, session tokens, lockout simulation (5 tries = 30s lock),
 * and demo credentials.
 */

import { storage } from '../lib/storage.js';
import { DB_KEY, SESSION_KEY, mockHash } from './data.js';

const LOCKOUT_KEY = 'hireflow_lockout_info';

export const auth = {
  /**
   * Check lockout state
   * @returns {{ isLocked: boolean, remainingSeconds: number }}
   */
  getLockoutStatus() {
    const info = storage.get(LOCKOUT_KEY, { attempts: 0, lockedUntil: null });
    if (info.lockedUntil) {
      const remainingMs = new Date(info.lockedUntil).getTime() - Date.now();
      if (remainingMs > 0) {
        return { isLocked: true, remainingSeconds: Math.ceil(remainingMs / 1000) };
      }
      // Lockout expired
      storage.set(LOCKOUT_KEY, { attempts: 0, lockedUntil: null });
    }
    return { isLocked: false, remainingSeconds: 0 };
  },

  /**
   * Records a failed login attempt; locks for 30s after 5 failures
   */
  recordFailedAttempt() {
    const info = storage.get(LOCKOUT_KEY, { attempts: 0, lockedUntil: null });
    info.attempts += 1;
    if (info.attempts >= 5) {
      info.lockedUntil = new Date(Date.now() + 30 * 1000).toISOString();
    }
    storage.set(LOCKOUT_KEY, info);
    return info;
  },

  /**
   * Resets failed attempt counter on success
   */
  resetAttempts() {
    storage.remove(LOCKOUT_KEY);
  },

  /**
   * Authenticate user with email and password
   * @param {string} email 
   * @param {string} password 
   * @param {boolean} rememberMe 
   * @returns {Promise<{ success: boolean, user?: Object, error?: string }>}
   */
  async login(email, password, rememberMe = false) {
    const lock = this.getLockoutStatus();
    if (lock.isLocked) {
      return {
        success: false,
        error: `Too many failed attempts. Account temporarily locked. Please wait ${lock.remainingSeconds} seconds.`
      };
    }

    const db = storage.get(DB_KEY);
    if (!db) {
      return { success: false, error: 'Database not initialized. Please refresh.' };
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    const hash = mockHash(password);
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user || user.passwordHash !== hash || !user.active) {
      this.recordFailedAttempt();
      return { success: false, error: 'Invalid email or password' };
    }

    this.resetAttempts();

    // Session duration: 7 days if rememberMe, 2 hours otherwise
    const durationMs = rememberMe ? (7 * 24 * 60 * 60 * 1000) : (2 * 60 * 60 * 1000);
    const session = {
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      expiresAt: new Date(Date.now() + durationMs).toISOString()
    };

    storage.set(SESSION_KEY, session);

    // Update lastLoginAt in DB
    user.lastLoginAt = new Date().toISOString();
    storage.set(DB_KEY, db);

    return { success: true, user: session };
  },

  /**
   * End current user session
   */
  logout() {
    storage.remove(SESSION_KEY);
  },

  /**
   * Returns current active session or null if missing/expired
   * @returns {Object|null}
   */
  getSession() {
    const session = storage.get(SESSION_KEY, null);
    if (!session) return null;

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.logout();
      return null;
    }
    return session;
  },

  /**
   * Returns full user profile from database for currently logged in session
   * @returns {Object|null}
   */
  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;

    const db = storage.get(DB_KEY);
    if (!db) return null;

    return db.users.find(u => u.id === session.userId) || null;
  }
};
