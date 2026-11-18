/**
 * HireFlow Storage Utility
 * Safe, robust localStorage wrapper with error recovery and quota detection.
 */

export const storage = {
  /**
   * Read and parse JSON from localStorage
   * @param {string} key 
   * @param {any} defaultValue 
   * @returns {any}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (err) {
      console.error(`[HireFlow Storage] Error reading key "${key}":`, err);
      return defaultValue;
    }
  },

  /**
   * Serialize and store value in localStorage
   * @param {string} key 
   * @param {any} value 
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (err) {
      if (
        err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014
      ) {
        console.error('[HireFlow Storage] LocalStorage quota exceeded!', err);
        alert('Browser storage quota exceeded. Please reset demo data in Settings.');
      } else {
        console.error(`[HireFlow Storage] Error writing key "${key}":`, err);
      }
      return false;
    }
  },

  /**
   * Remove a key
   * @param {string} key 
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`[HireFlow Storage] Error removing key "${key}":`, err);
    }
  },

  /**
   * Clear all app storage
   */
  clear() {
    try {
      localStorage.clear();
    } catch (err) {
      console.error('[HireFlow Storage] Error clearing localStorage:', err);
    }
  }
};
