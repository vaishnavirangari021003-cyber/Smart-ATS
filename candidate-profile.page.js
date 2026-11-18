/**
 * HireFlow Candidate Profile Controller (candidate-profile.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { showToast, confirmDialog, setLoading } from '../lib/ui.js';
import { escapeHTML } from '../lib/escape.js';
import { formatDate } from '../lib/dates.js';

let session = null;
let profileData = null;
let skills = [];
let resumeMeta = null;
let isDirty = false;

document.addEventListener('DOMContentLoaded', async () => {
  session = guardPage(['candidate']);
  if (!session) return;

  setupTabs();
  setupSkillsTagInput();
  setupResumeDropzone();
  setupUnsavedWarning();
  await loadProfile();
});

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(btn.getAttribute('data-tab'));
      if (targetPanel) targetPanel.classList.add('active');
    });

    // Arrow keys navigation
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        const next = tabBtns[(index + 1) % tabBtns.length];
        next.focus();
        next.click();
      } else if (e.key === 'ArrowLeft') {
        const prev = tabBtns[(index - 1 + tabBtns.length) % tabBtns.length];
        prev.focus();
        prev.click();
      }
    });
  });
}

async function loadProfile() {
  try {
    profileData = await api.getCandidateProfile(session.userId);

    document.getElementById('prof-name').value = profileData.name || '';
    document.getElementById('prof-email').value = profileData.email || '';
    document.getElementById('prof-phone').value = profileData.phone || '';
    document.getElementById('prof-location').value = profileData.location || '';
    document.getElementById('prof-headline').value = profileData.headline || '';
    document.getElementById('prof-exp-years').value = profileData.experienceYears || 0;
    document.getElementById('prof-education').value = profileData.education || '';
    document.getElementById('prof-linkedin').value = profileData.linkedin || '';

    skills = [...(profileData.skills || [])];
    renderSkillsTags();

    resumeMeta = profileData.resumeMeta || null;
    renderResumeCard();

    // Mark clean
    isDirty = false;
  } catch (err) {
    showToast(`Error loading profile: ${err.message}`, 'error');
  }
}

function setupSkillsTagInput() {
  const container = document.getElementById('skills-tag-container');
  const input = document.getElementById('skill-text-input');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = input.value.trim().replace(/,$/, '');
      if (val && !skills.includes(val)) {
        skills.push(val);
        input.value = '';
        renderSkillsTags();
        markDirty();
      }
    } else if (e.key === 'Backspace' && input.value === '' && skills.length > 0) {
      skills.pop();
      renderSkillsTags();
      markDirty();
    }
  });

  input.addEventListener('blur', () => {
    const val = input.value.trim().replace(/,$/, '');
    if (val && !skills.includes(val)) {
      skills.push(val);
      input.value = '';
      renderSkillsTags();
      markDirty();
    }
  });
}

function renderSkillsTags() {
  const container = document.getElementById('skills-tag-container');
  const input = document.getElementById('skill-text-input');

  // Remove existing badges
  container.querySelectorAll('.tag-badge').forEach(b => b.remove());

  skills.forEach((skill, idx) => {
    const badge = document.createElement('span');
    badge.className = 'tag-badge';
    badge.innerHTML = `
      <span>${escapeHTML(skill)}</span>
      <span class="tag-badge-remove" role="button" aria-label="Remove skill ${escapeHTML(skill)}">&times;</span>
    `;

    badge.querySelector('.tag-badge-remove').onclick = () => {
      skills.splice(idx, 1);
      renderSkillsTags();
      markDirty();
    };

    container.insertBefore(badge, input);
  });
}

function setupResumeDropzone() {
  const dropzone = document.getElementById('profile-dropzone');
  const fileInput = document.getElementById('profile-file-input');
  const replaceBtn = document.getElementById('btn-replace-resume');
  const removeBtn = document.getElementById('btn-remove-resume');

  dropzone.onclick = () => fileInput.click();
  replaceBtn.onclick = () => fileInput.click();

  removeBtn.onclick = async () => {
    const confirmed = await confirmDialog({
      title: 'Remove Attached Resume',
      message: 'Are you sure you want to remove your resume? You will need to upload a new document to apply for jobs.',
      confirmText: 'Remove',
      danger: true
    });
    if (confirmed) {
      resumeMeta = null;
      renderResumeCard();
      markDirty();
    }
  };

  dropzone.ondragover = (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  };

  dropzone.ondragleave = () => dropzone.classList.remove('dragover');

  dropzone.ondrop = (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      processResumeFile(e.dataTransfer.files[0]);
    }
  };

  fileInput.onchange = () => {
    if (fileInput.files.length > 0) {
      processResumeFile(fileInput.files[0]);
    }
  };

  function processResumeFile(file) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      showToast('Only PDF and DOCX files are accepted', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('File size exceeds 2 MB limit', 'error');
      return;
    }

    resumeMeta = {
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type || 'application/pdf',
      uploadedAt: new Date().toISOString()
    };

    renderResumeCard();
    markDirty();
    showToast('Resume uploaded. Remember to save changes.', 'info');
  }
}

function renderResumeCard() {
  const card = document.getElementById('resume-current-card');
  const dropzone = document.getElementById('profile-dropzone');
  const fileName = document.getElementById('res-file-name');
  const fileMeta = document.getElementById('res-file-meta');

  if (resumeMeta) {
    card.style.display = 'block';
    dropzone.style.display = 'none';
    fileName.textContent = resumeMeta.fileName;
    fileMeta.textContent = `${(resumeMeta.sizeBytes / 1024).toFixed(0)} KB • Uploaded ${formatDate(resumeMeta.uploadedAt)}`;
  } else {
    card.style.display = 'none';
    dropzone.style.display = 'block';
  }
}

function markDirty() {
  isDirty = true;
}

function setupUnsavedWarning() {
  document.querySelectorAll('#profile-form input').forEach(input => {
    input.addEventListener('input', markDirty);
  });

  window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = 'You have unsaved profile changes. Are you sure you want to leave?';
    }
  });

  const saveBtn = document.getElementById('btn-save-profile');
  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    setLoading(saveBtn, true);

    const payload = {
      name: document.getElementById('prof-name').value.trim(),
      phone: document.getElementById('prof-phone').value.trim(),
      location: document.getElementById('prof-location').value.trim(),
      headline: document.getElementById('prof-headline').value.trim(),
      experienceYears: Number(document.getElementById('prof-exp-years').value) || 0,
      education: document.getElementById('prof-education').value.trim(),
      linkedin: document.getElementById('prof-linkedin').value.trim(),
      skills,
      resumeMeta
    };

    try {
      await api.updateCandidateProfile(session.userId, payload);
      isDirty = false;
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setLoading(saveBtn, false);
    }
  });
}
