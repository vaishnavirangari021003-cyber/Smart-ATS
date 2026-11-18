/**
 * HireFlow Candidate Registration Controller (register.page.js)
 */

import { auth } from '../core/auth.js';
import { storage } from '../lib/storage.js';
import { DB_KEY, mockHash } from '../core/data.js';
import { initDemoBanner, setupThemeToggle, showToast, setLoading } from '../lib/ui.js';
import { rules, setupFormValidation } from '../lib/validate.js';

document.addEventListener('DOMContentLoaded', () => {
  initDemoBanner();
  setupThemeToggle();

  const form = document.getElementById('register-form');
  const nameInput = document.getElementById('reg-name');
  const emailInput = document.getElementById('reg-email');
  const phoneInput = document.getElementById('reg-phone');
  const passwordInput = document.getElementById('reg-password');
  const confirmPwdInput = document.getElementById('reg-confirm-password');
  const togglePwdBtn = document.getElementById('btn-toggle-reg-pwd');
  const strengthBar = document.getElementById('pwd-strength-bar');
  const strengthText = document.getElementById('pwd-strength-text');
  const submitBtn = document.getElementById('btn-submit-reg');

  // Toggle password visibility
  togglePwdBtn.addEventListener('click', () => {
    const isPwd = passwordInput.type === 'password';
    passwordInput.type = isPwd ? 'text' : 'password';
  });

  // Password live strength calculation
  passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    strengthBar.className = 'password-strength-bar';
    if (val.length === 0) {
      strengthBar.style.width = '0';
      strengthText.textContent = 'Strength: Enter password';
    } else if (score <= 1) {
      strengthBar.classList.add('weak');
      strengthText.textContent = 'Strength: Weak (Needs 8+ chars, upper & lower letters)';
    } else if (score <= 3) {
      strengthBar.classList.add('medium');
      strengthText.textContent = 'Strength: Medium (Add numbers & special symbols)';
    } else {
      strengthBar.classList.add('strong');
      strengthText.textContent = 'Strength: Strong!';
    }
  });

  // Validation Schema
  const schema = {
    'reg-name': [rules.required, rules.minLength(2)],
    'reg-email': [rules.required, rules.email],
    'reg-phone': [rules.required, rules.phone],
    'reg-password': [rules.required, rules.minLength(6)],
    'reg-confirm-password': [
      rules.required,
      rules.matches(() => passwordInput.value, 'password')
    ],
    'reg-terms': [rules.required]
  };

  setupFormValidation(form, schema, async (data) => {
    setLoading(submitBtn, true);

    const db = storage.get(DB_KEY);
    if (!db) {
      showToast('Database not found. Refreshing...', 'error');
      setLoading(submitBtn, false);
      return;
    }

    const email = emailInput.value.trim().toLowerCase();
    const existing = db.users.find(u => u.email.toLowerCase() === email);
    if (existing) {
      showToast('An account with this email already exists. Please sign in.', 'error');
      setLoading(submitBtn, false);
      return;
    }

    const newUserId = `usr_cand_${Date.now()}`;
    const now = new Date().toISOString();

    // 1. Create User
    const newUser = {
      id: newUserId,
      name: nameInput.value.trim(),
      email,
      passwordHash: mockHash(passwordInput.value),
      role: 'candidate',
      companyId: null,
      active: true,
      createdAt: now,
      lastLoginAt: now
    };
    db.users.push(newUser);

    // 2. Create Candidate Profile
    const newProfile = {
      userId: newUserId,
      phone: phoneInput.value.trim(),
      location: 'Remote',
      headline: 'Candidate',
      skills: [],
      experienceYears: 0,
      education: '',
      linkedin: '',
      resumeMeta: null
    };
    db.candidateProfiles.push(newProfile);

    storage.set(DB_KEY, db);

    // Log the user in
    await auth.login(email, passwordInput.value, true);

    showToast('Candidate account created successfully!', 'success');

    setTimeout(() => {
      window.location.href = 'candidate/dashboard.html';
    }, 400);
  });
});
