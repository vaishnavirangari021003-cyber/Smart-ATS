/**
 * HireFlow Router Guard & Navigation Controller (router-guard.js)
 * Enforces authentication and role-based page protection on load.
 * Injects user identity, active navigation states, and theme toggling.
 */

import { auth } from './auth.js';
import { setupThemeToggle, initDemoBanner, setupSidebar, renderAvatar } from '../lib/ui.js';

/**
 * Guard a page by checking authentication and allowed roles.
 * @param {string[]} allowedRoles Array of roles allowed on this page, e.g. ['hr'] or ['candidate']
 */
export function guardPage(allowedRoles = []) {
  // Always initialize demo banner & theme toggle
  initDemoBanner();
  setupThemeToggle();
  setupSidebar();

  const session = auth.getSession();
  const currentPath = window.location.pathname;

  // 1. Unauthenticated -> Redirect to login with ?next=
  if (!session) {
    const nextUrl = encodeURIComponent(window.location.href);
    // Find correct relative path to login.html
    const isInSubdir = currentPath.includes('/hr/') || currentPath.includes('/candidate/') || currentPath.includes('/admin/');
    const loginTarget = isInSubdir ? '../login.html' : 'login.html';
    window.location.href = `${loginTarget}?next=${nextUrl}`;
    return null;
  }

  // 2. Role Verification
  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    const isInSubdir = currentPath.includes('/hr/') || currentPath.includes('/candidate/') || currentPath.includes('/admin/');
    const forbiddenTarget = isInSubdir ? '../403.html' : '403.html';
    window.location.href = forbiddenTarget;
    return null;
  }

  // 3. Populate User identity in UI
  populateUserChrome(session);

  return session;
}

/**
 * Injects user info into topbar & sidebar
 * @param {Object} session 
 */
function populateUserChrome(session) {
  // User name
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = session.name;
  });

  // User role
  document.querySelectorAll('[data-user-role]').forEach(el => {
    el.textContent = session.role.toUpperCase();
  });

  // User avatar container
  document.querySelectorAll('[data-user-avatar]').forEach(el => {
    el.innerHTML = renderAvatar(session.name, 'sm');
  });

  // Logout triggers
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      auth.logout();
      const currentPath = window.location.pathname;
      const isInSubdir = currentPath.includes('/hr/') || currentPath.includes('/candidate/') || currentPath.includes('/admin/');
      window.location.href = isInSubdir ? '../login.html' : 'login.html';
    });
  });

  // Mark active navigation link
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-link, .nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentFile || href.endsWith(`/${currentFile}`))) {
      link.classList.add('active');
    }
  });
}
