/**
 * HireFlow Date & Time Helper Utilities
 * Rule: Store ISO 8601 UTC strings, display in the browser's local timezone.
 */

/**
 * Format ISO string to local human readable date (e.g. "Oct 24, 2026")
 * @param {string|Date} isoStr 
 * @param {Intl.DateTimeFormatOptions} options 
 * @returns {string}
 */
export function formatDate(isoStr, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!isoStr) return 'N/A';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat(navigator.language || 'en-US', options).format(date);
}

/**
 * Format ISO string to local date and time (e.g. "Oct 24, 2026, 3:30 PM")
 * @param {string|Date} isoStr 
 * @returns {string}
 */
export function formatDateTime(isoStr) {
  if (!isoStr) return 'N/A';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat(navigator.language || 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * Format ISO string to local time only (e.g. "3:30 PM")
 * @param {string|Date} isoStr 
 * @returns {string}
 */
export function formatTime(isoStr) {
  if (!isoStr) return 'N/A';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return 'Invalid time';
  return new Intl.DateTimeFormat(navigator.language || 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * Format date for HTML <input type="date"> (YYYY-MM-DD)
 * @param {string|Date} isoStr 
 * @returns {string}
 */
export function formatDateInput(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format datetime for HTML <input type="datetime-local">
 * @param {string|Date} isoStr 
 * @returns {string}
 */
export function formatDateTimeInput(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Returns human-friendly relative time (e.g. "3 days ago", "in 2 hours", "Just now")
 * @param {string|Date} isoStr 
 * @returns {string}
 */
export function relativeTime(isoStr) {
  if (!isoStr) return 'N/A';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  const now = new Date();
  const diffSec = Math.round((date.getTime() - now.getTime()) / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHours = Math.round(diffMin / 60);
  const diffDays = Math.round(diffHours / 24);

  // If Intl.RelativeTimeFormat is available
  if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
    const rtf = new Intl.RelativeTimeFormat(navigator.language || 'en-US', { numeric: 'auto' });
    if (Math.abs(diffSec) < 60) return 'Just now';
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
    const diffMonths = Math.round(diffDays / 30);
    if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month');
    return rtf.format(Math.round(diffDays / 365), 'year');
  }

  // Fallback
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  return `in ${diffDays} days`;
}

/**
 * Calculates calendar days elapsed between two dates
 * @param {string|Date} earlier 
 * @param {string|Date} later 
 * @returns {number}
 */
export function daysBetween(earlier, later = new Date()) {
  const d1 = new Date(earlier);
  const d2 = new Date(later);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Helper to add days to a date and return ISO 8601 UTC string
 * @param {number} days 
 * @param {Date} fromDate 
 * @returns {string}
 */
export function addDaysISO(days, fromDate = new Date()) {
  const result = new Date(fromDate);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}
