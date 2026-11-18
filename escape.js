/**
 * HireFlow Security Utilities - HTML Escaping & Sanitization
 * Strictly prevents XSS and CSV formula injection
 */

/**
 * Escapes unsafe HTML characters in a string
 * @param {string|number|null|undefined} str 
 * @returns {string} Safe escaped string
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes attributes to prevent breaking out of attribute quotes
 * @param {string} str 
 * @returns {string}
 */
export function sanitizeAttr(str) {
  return escapeHTML(str);
}

/**
 * Tagged template literal for safe HTML rendering.
 * All interpolated variables are escaped automatically unless flagged as safe.
 * Example: html`<div>${candidate.name}</div>`
 */
export function html(strings, ...values) {
  return strings.reduce((result, string, i) => {
    const value = values[i - 1];
    let safeValue = '';
    
    if (value === null || value === undefined) {
      safeValue = '';
    } else if (value && value.__safeHTML === true) {
      safeValue = value.content;
    } else if (Array.isArray(value)) {
      safeValue = value.map(v => (v && v.__safeHTML ? v.content : escapeHTML(v))).join('');
    } else {
      safeValue = escapeHTML(value);
    }
    
    return result + safeValue + string;
  });
}

/**
 * Mark a string as trusted HTML that shouldn't be re-escaped by html``
 * @param {string} str 
 * @returns {Object} Safe HTML container
 */
export function safeHTML(str) {
  return { __safeHTML: true, content: String(str) };
}

/**
 * Sanitizes CSV cell values to prevent CSV formula injection (OWASP guideline)
 * In spreadsheet software, cells starting with =, +, -, @, or tab are treated as formulas.
 * @param {string|number} value 
 * @returns {string} Sanitized CSV cell
 */
export function sanitizeCSV(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str; // Prefix with single apostrophe to force text interpretation
  }
  return `"${str.replace(/"/g, '""')}"`;
}
