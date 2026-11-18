/**
 * HireFlow UI Component Controller & Helpers
 * Provides accessible modals, drawers, toasts, theme toggles, and layout helpers.
 */

import { escapeHTML } from './escape.js';

let lastActiveElement = null;

/**
 * Display an accessible toast notification
 * @param {string} message 
 * @param {'success'|'error'|'info'|'warning'} type 
 * @param {number} duration 
 */
export function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-message">${escapeHTML(message)}</div>
    <button type="button" class="toast-close" aria-label="Dismiss notification">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  };

  closeBtn.addEventListener('click', dismiss);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
}

/**
 * Open modal with accessible focus trapping, Esc key binding and scroll lock
 * @param {string|HTMLElement} modalElOrId 
 */
export function openModal(modalElOrId) {
  const modalBackdrop = typeof modalElOrId === 'string' 
    ? document.getElementById(modalElOrId) 
    : modalElOrId;
  if (!modalBackdrop) return;

  lastActiveElement = document.activeElement;
  modalBackdrop.classList.add('is-open');
  modalBackdrop.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  const modal = modalBackdrop.querySelector('.modal') || modalBackdrop;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  // Focus first interactive element
  const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length > 0) {
    setTimeout(() => focusable[0].focus(), 50);
  }

  // Key handler
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closeModal(modalBackdrop);
      window.removeEventListener('keydown', handleKeydown);
    } else if (e.key === 'Tab') {
      // Trap focus
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  window.addEventListener('keydown', handleKeydown);

  // Close on backdrop click (outside modal card)
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      closeModal(modalBackdrop);
      window.removeEventListener('keydown', handleKeydown);
    }
  });

  // Attach any [data-close-modal] buttons inside
  modalBackdrop.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.onclick = () => {
      closeModal(modalBackdrop);
      window.removeEventListener('keydown', handleKeydown);
    };
  });
}

/**
 * Close modal and restore focus
 * @param {string|HTMLElement} modalElOrId 
 */
export function closeModal(modalElOrId) {
  const modalBackdrop = typeof modalElOrId === 'string' 
    ? document.getElementById(modalElOrId) 
    : modalElOrId;
  if (!modalBackdrop) return;

  modalBackdrop.classList.remove('is-open');
  modalBackdrop.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
    lastActiveElement.focus();
  }
}

/**
 * Open side drawer with backdrop
 * @param {string} drawerId 
 */
export function openDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;

  let backdrop = document.querySelector(`.drawer-backdrop[data-drawer="${drawerId}"]`);
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'drawer-backdrop';
    backdrop.setAttribute('data-drawer', drawerId);
    document.body.appendChild(backdrop);
  }

  lastActiveElement = document.activeElement;
  backdrop.classList.add('is-open');
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('role', 'dialog');
  document.body.style.overflow = 'hidden';

  const closeDrawerAction = () => closeDrawer(drawerId);
  backdrop.onclick = closeDrawerAction;

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeDrawerAction();
      window.removeEventListener('keydown', escHandler);
    }
  };
  window.addEventListener('keydown', escHandler);

  drawer.querySelectorAll('[data-close-drawer]').forEach(btn => {
    btn.onclick = () => {
      closeDrawerAction();
      window.removeEventListener('keydown', escHandler);
    };
  });

  const focusable = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length > 0) {
    setTimeout(() => focusable[0].focus(), 50);
  }
}

/**
 * Close side drawer
 * @param {string} drawerId 
 */
export function closeDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (drawer) drawer.classList.remove('is-open');

  const backdrop = document.querySelector(`.drawer-backdrop[data-drawer="${drawerId}"]`);
  if (backdrop) backdrop.classList.remove('is-open');

  document.body.style.overflow = '';
  if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
    lastActiveElement.focus();
  }
}

/**
 * Accessible confirmation dialog for destructive or important actions
 * @param {{ title: string, message: string, confirmText?: string, cancelText?: string, danger?: boolean }} options 
 * @returns {Promise<boolean>}
 */
export function confirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop is-open';
    backdrop.innerHTML = `
      <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" style="max-width: 440px;">
        <div class="modal-header">
          <h3 id="dialog-title" class="modal-title">${escapeHTML(title)}</h3>
          <button type="button" class="btn-icon btn-ghost" data-action="cancel" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="margin: 0; color: var(--text-muted);">${escapeHTML(message)}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-action="cancel">${escapeHTML(cancelText)}</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${escapeHTML(confirmText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    const confirmBtn = backdrop.querySelector('[data-action="confirm"]');
    const cancelBtns = backdrop.querySelectorAll('[data-action="cancel"]');

    const cleanup = (confirmed) => {
      backdrop.classList.remove('is-open');
      setTimeout(() => backdrop.remove(), 200);
      resolve(confirmed);
    };

    confirmBtn.onclick = () => cleanup(true);
    cancelBtns.forEach(btn => btn.onclick = () => cleanup(false));

    backdrop.onclick = (e) => {
      if (e.target === backdrop) cleanup(false);
    };

    confirmBtn.focus();
  });
}

/**
 * Render empty state inside a container
 * @param {HTMLElement} container 
 * @param {string} title 
 * @param {string} message 
 * @param {string} actionHtml 
 */
export function renderEmpty(container, title = 'No items found', message = 'There are no records to display at this time.', actionHtml = '') {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <div class="empty-state-title">${escapeHTML(title)}</div>
      <p class="empty-state-text">${escapeHTML(message)}</p>
      ${actionHtml ? `<div style="margin-top: var(--space-2);">${actionHtml}</div>` : ''}
    </div>
  `;
}

/**
 * Render error state with retry button
 * @param {HTMLElement} container 
 * @param {string} message 
 * @param {Function} onRetry 
 */
export function renderError(container, message = 'An error occurred while loading data.', onRetry = null) {
  if (!container) return;
  container.innerHTML = `
    <div class="error-state" role="alert">
      <div class="error-state-title">Error Loading Data</div>
      <p style="margin-bottom: var(--space-4); color: var(--danger); font-size: var(--font-size-sm);">${escapeHTML(message)}</p>
      ${onRetry ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-retry-action">Retry</button>` : ''}
    </div>
  `;
  if (onRetry) {
    const retryBtn = container.querySelector('#btn-retry-action');
    if (retryBtn) retryBtn.onclick = onRetry;
  }
}

/**
 * Render skeleton loading placeholders
 * @param {HTMLElement} container 
 * @param {'card'|'row'|'kanban'} type 
 * @param {number} count 
 */
export function renderSkeleton(container, type = 'card', count = 3) {
  if (!container) return;
  let html = '';
  for (let i = 0; i < count; i++) {
    if (type === 'card') {
      html += `
        <div class="card" style="margin-bottom: var(--space-4); pointer-events: none;">
          <div class="skeleton" style="height: 20px; width: 60%; margin-bottom: 12px;"></div>
          <div class="skeleton" style="height: 14px; width: 40%; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 14px; width: 85%;"></div>
        </div>
      `;
    } else if (type === 'row') {
      html += `
        <tr>
          <td colspan="7"><div class="skeleton" style="height: 24px; width: 100%;"></div></td>
        </tr>
      `;
    }
  }
  container.innerHTML = html;
}

/**
 * Toggle loading state on a button
 * @param {HTMLButtonElement} btn 
 * @param {boolean} isLoading 
 */
export function setLoading(btn, isLoading) {
  if (!btn) return;
  if (isLoading) {
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
  } else {
    btn.classList.remove('is-loading');
    btn.removeAttribute('aria-busy');
    btn.disabled = false;
  }
}

/**
 * Render avatar with hash-based color and user initials
 * @param {string} name 
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} size 
 * @returns {string} HTML string
 */
export function renderAvatar(name = 'User', size = 'md') {
  const cleanName = String(name || 'User').trim();
  const parts = cleanName.split(/\s+/);
  let initials = parts[0] ? parts[0][0] : 'U';
  if (parts.length > 1 && parts[parts.length - 1]) {
    initials += parts[parts.length - 1][0];
  }
  initials = initials.toUpperCase();

  // Consistent pleasant color palette
  const colors = [
    '#4F46E5', '#7C3AED', '#2563EB', '#0D9488',
    '#059669', '#D97706', '#E11D48', '#DB2777'
  ];
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];

  return `
    <span class="avatar avatar-${size}" style="background-color: ${color};" title="${escapeHTML(cleanName)}">
      ${escapeHTML(initials)}
    </span>
  `;
}

/**
 * Setup Light / Dark theme toggle
 * Reads from localStorage or system prefers-color-scheme
 */
export function setupThemeToggle() {
  const currentTheme = localStorage.getItem('hireflow_theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', currentTheme);

  const toggleBtns = document.querySelectorAll('[data-action="toggle-theme"]');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme');
      const next = active === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('hireflow_theme', next);
    });
  });
}

/**
 * Injects and manages the required Demo Mode Banner on every page
 */
export function initDemoBanner() {
  if (document.querySelector('.demo-banner')) return;
  const isDismissed = sessionStorage.getItem('hireflow_banner_dismissed') === 'true';

  const banner = document.createElement('div');
  banner.className = `demo-banner ${isDismissed ? 'hidden' : ''}`;
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Demo Environment Notice');
  banner.innerHTML = `
    <div class="demo-banner-content">
      <span class="badge">DEMO MODE</span>
      <span>Demo mode: data is simulated and stored in your browser. Emails are mocked. Not for real candidate data.</span>
    </div>
    <button type="button" class="demo-banner-close" aria-label="Dismiss demo notice">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  banner.querySelector('.demo-banner-close').addEventListener('click', () => {
    banner.classList.add('hidden');
    sessionStorage.setItem('hireflow_banner_dismissed', 'true');
  });

  document.body.prepend(banner);
}

/**
 * Setup mobile sidebar drawer toggle
 */
export function setupSidebar() {
  const toggleBtn = document.querySelector('.sidebar-toggle-btn');
  const sidebar = document.querySelector('.app-sidebar');
  if (!toggleBtn || !sidebar) return;

  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  const toggle = () => {
    sidebar.classList.toggle('is-open');
    backdrop.classList.toggle('is-open');
  };

  toggleBtn.addEventListener('click', toggle);
  backdrop.addEventListener('click', toggle);
}
