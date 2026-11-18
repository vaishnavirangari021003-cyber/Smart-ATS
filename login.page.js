/**
 * HireFlow Login Page Controller (login.page.js)
 */

import { auth } from '../core/auth.js';
import { initDemoBanner, setupThemeToggle, showToast, setLoading } from '../lib/ui.js';
import { rules, setupFormValidation } from '../lib/validate.js';

document.addEventListener('DOMContentLoaded', () => {
  initDemoBanner();
  setupThemeToggle();

  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const togglePwdBtn = document.getElementById('btn-toggle-pwd');
  const rememberCheck = document.getElementById('remember-me');
  const submitBtn = document.getElementById('btn-submit-login');
  const capsWarning = document.getElementById('caps-lock-warning');
  const lockoutAlert = document.getElementById('lockout-alert');
  const lockoutText = document.getElementById('lockout-text');

  // Check initial lockout
  checkLockoutState();

  function checkLockoutState() {
    const lock = auth.getLockoutStatus();
    if (lock.isLocked) {
      lockoutAlert.style.display = 'block';
      lockoutText.textContent = `Too many failed login attempts. Temporarily locked for security. Please wait ${lock.remainingSeconds}s.`;
      submitBtn.disabled = true;

      const interval = setInterval(() => {
        const currentLock = auth.getLockoutStatus();
        if (currentLock.isLocked) {
          lockoutText.textContent = `Too many failed login attempts. Temporarily locked for security. Please wait ${currentLock.remainingSeconds}s.`;
        } else {
          clearInterval(interval);
          lockoutAlert.style.display = 'none';
          submitBtn.disabled = false;
        }
      }, 1000);
    } else {
      lockoutAlert.style.display = 'none';
      submitBtn.disabled = false;
    }
  }

  // Password show/hide
  togglePwdBtn.addEventListener('click', () => {
    const isPwd = passwordInput.type === 'password';
    passwordInput.type = isPwd ? 'text' : 'password';
    togglePwdBtn.setAttribute('aria-label', isPwd ? 'Hide password' : 'Show password');
  });

  // Caps lock warning
  passwordInput.addEventListener('keyup', (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      capsWarning.style.display = 'flex';
    } else {
      capsWarning.style.display = 'none';
    }
  });

  // Demo chips click-to-fill
  document.querySelectorAll('[data-fill-email]').forEach(chip => {
    chip.addEventListener('click', () => {
      emailInput.value = chip.getAttribute('data-fill-email');
      passwordInput.value = chip.getAttribute('data-fill-pass');
      emailInput.dispatchEvent(new Event('input'));
      passwordInput.dispatchEvent(new Event('input'));
      submitBtn.focus();
    });
  });

  // Validation Schema
  const schema = {
    'login-email': [rules.required, rules.email],
    'login-password': [rules.required]
  };

  setupFormValidation(form, schema, async (data) => {
    setLoading(submitBtn, true);

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberCheck.checked;

    const result = await auth.login(email, password, rememberMe);
    setLoading(submitBtn, false);

    if (!result.success) {
      showToast(result.error, 'error');
      checkLockoutState();
      return;
    }

    showToast('Signed in successfully! Redirecting...', 'success', 2000);

    // Redirect to next URL or role home
    const params = new URLSearchParams(window.location.search);
    const nextUrl = params.get('next');

    setTimeout(() => {
      if (nextUrl && !nextUrl.includes('login.html')) {
        window.location.href = decodeURIComponent(nextUrl);
      } else {
        const role = result.user.role;
        if (role === 'admin') {
          window.location.href = 'admin/overview.html';
        } else if (role === 'hr') {
          window.location.href = 'hr/dashboard.html';
        } else {
          window.location.href = 'candidate/dashboard.html';
        }
      }
    }, 400);
  });
});
