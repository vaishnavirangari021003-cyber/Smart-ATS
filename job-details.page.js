/**
 * HireFlow Job Details & Candidate Application Page (job-details.page.js)
 */

import { api } from '../core/api.js';
import { auth } from '../core/auth.js';
import { initDemoBanner, setupThemeToggle, showToast, setLoading, renderError } from '../lib/ui.js';
import { escapeHTML } from '../lib/escape.js';
import { relativeTime } from '../lib/dates.js';

let currentJob = null;
let currentCandidate = null;
let uploadedFileMeta = null;

document.addEventListener('DOMContentLoaded', async () => {
  initDemoBanner();
  setupThemeToggle();

  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');

  if (!jobId) {
    window.location.href = 'index.html';
    return;
  }

  await loadJobDetails(jobId);
});

async function loadJobDetails(jobId) {
  const container = document.getElementById('job-details-container');
  try {
    currentJob = await api.getJobById(jobId);
    document.title = `${currentJob.title} | HireFlow`;
    document.getElementById('breadcrumb-title').textContent = currentJob.title;

    const session = auth.getSession();
    if (session && session.role === 'candidate') {
      try {
        currentCandidate = await api.getCandidateProfile(session.userId);
      } catch (e) {
        console.warn('Could not load candidate profile', e);
      }
    }

    renderJobView();
    loadSimilarJobs();
  } catch (err) {
    renderError(container, `Could not load job details: ${err.message}`, () => loadJobDetails(jobId));
  }
}

async function renderJobView() {
  const container = document.getElementById('job-details-container');
  const session = auth.getSession();

  // Check if candidate has already applied
  let hasApplied = false;
  if (session && session.role === 'candidate') {
    const apps = await api.getApplications({ jobId: currentJob.id });
    hasApplied = apps.length > 0;
  }

  const isClosed = currentJob.status !== 'published' || (currentJob.closesAt && new Date(currentJob.closesAt) < new Date());

  const leftColumnHtml = `
    <div class="card">
      <div style="border-bottom: 1px solid var(--border); padding-bottom: var(--space-6); margin-bottom: var(--space-6);">
        <h1 style="font-size: var(--font-size-2xl); margin-bottom: var(--space-3);">${escapeHTML(currentJob.title)}</h1>
        <div class="job-card-meta" style="font-size: var(--font-size-sm); margin-bottom: var(--space-4);">
          <span class="job-card-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            <strong>${escapeHTML(currentJob.department)}</strong>
          </span>
          <span class="job-card-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${escapeHTML(currentJob.location)}
          </span>
          <span class="job-card-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${escapeHTML(currentJob.type)} • ${escapeHTML(currentJob.experience)} yrs experience
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge badge-success" style="font-size: var(--font-size-sm); padding: 6px 12px;">
            $${currentJob.salaryMin.toLocaleString()} - $${currentJob.salaryMax.toLocaleString()} USD / year
          </span>
          <span class="text-xs text-muted" style="margin-left: auto;">Posted ${relativeTime(currentJob.postedAt)}</span>
        </div>
      </div>

      <section style="margin-bottom: var(--space-6);">
        <h2 style="font-size: var(--font-size-md); margin-bottom: var(--space-3);">About the Role</h2>
        <p class="lead" style="white-space: pre-line;">${escapeHTML(currentJob.description)}</p>
      </section>

      <section style="margin-bottom: var(--space-6);">
        <h2 style="font-size: var(--font-size-md); margin-bottom: var(--space-3);">Key Requirements</h2>
        <ul style="padding-left: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); color: var(--text);">
          ${currentJob.requirements.map(req => `<li>${escapeHTML(req)}</li>`).join('')}
        </ul>
      </section>

      <section>
        <h2 style="font-size: var(--font-size-md); margin-bottom: var(--space-3);">Required Skills</h2>
        <div class="flex gap-2" style="flex-wrap: wrap;">
          ${currentJob.skills.map(s => `<span class="badge badge-primary" style="font-size: 13px;">${escapeHTML(s)}</span>`).join('')}
        </div>
      </section>
    </div>
  `;

  let rightColumnHtml = '';

  if (isClosed) {
    rightColumnHtml = `
      <div class="card apply-card">
        <h3 class="card-title" style="color: var(--danger); margin-bottom: var(--space-2);">Applications Closed</h3>
        <p class="text-sm text-muted">This opening is no longer accepting new candidate applications.</p>
        <a href="index.html#jobs" class="btn btn-secondary w-full" style="margin-top: var(--space-4);">Explore Other Jobs</a>
      </div>
    `;
  } else if (!session) {
    const nextUrl = encodeURIComponent(window.location.href);
    rightColumnHtml = `
      <div class="card apply-card text-center" style="padding: var(--space-8) var(--space-6);">
        <h3 style="font-size: var(--font-size-lg); margin-bottom: var(--space-2);">Ready to Apply?</h3>
        <p class="text-sm text-muted" style="margin-bottom: var(--space-6);">Create an account or sign in to submit your resume in under 2 minutes.</p>
        <a href="login.html?next=${nextUrl}" class="btn btn-primary btn-lg w-full" style="margin-bottom: var(--space-3);">Sign In to Apply</a>
        <a href="register.html" class="btn btn-secondary w-full">Create Candidate Account</a>
      </div>
    `;
  } else if (session.role === 'candidate') {
    if (hasApplied) {
      rightColumnHtml = `
        <div class="card apply-card text-center" style="padding: var(--space-8) var(--space-6);">
          <div style="width: 48px; height: 48px; background: var(--success-soft); color: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-3);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h3 style="font-size: var(--font-size-md); margin-bottom: var(--space-2);">Application Submitted</h3>
          <p class="text-sm text-muted" style="margin-bottom: var(--space-6);">You have already applied for this opening. You can track your stage and timeline in your candidate dashboard.</p>
          <a href="candidate/dashboard.html" class="btn btn-primary w-full">View in Candidate Portal</a>
        </div>
      `;
    } else {
      // Application Form
      rightColumnHtml = `
        <div class="card apply-card">
          <h2 class="card-title" style="margin-bottom: var(--space-4);">Apply for Position</h2>
          <form id="apply-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="cand-name">Full Name <span class="required-indicator">*</span></label>
              <input type="text" id="cand-name" class="form-control" value="${escapeHTML(currentCandidate ? currentCandidate.name : session.name)}" required>
            </div>

            <div class="form-group">
              <label class="form-label" for="cand-email">Email Address <span class="required-indicator">*</span></label>
              <input type="email" id="cand-email" class="form-control" value="${escapeHTML(currentCandidate ? currentCandidate.email : session.email)}" required readonly>
            </div>

            <div class="form-group">
              <label class="form-label" for="cand-phone">Phone Number <span class="required-indicator">*</span></label>
              <input type="tel" id="cand-phone" class="form-control" value="${escapeHTML(currentCandidate ? currentCandidate.phone : '')}" placeholder="+1 (555) 010-0000" required>
            </div>

            <div class="form-group">
              <label class="form-label" for="cand-note">
                Cover Note
                <span id="note-char-count" class="char-counter">0 / 1000</span>
              </label>
              <textarea id="cand-note" class="form-control" maxlength="1000" placeholder="Briefly describe what makes you a great fit for this position..."></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Resume (PDF or DOCX, max 2MB) <span class="required-indicator">*</span></label>
              <div class="file-dropzone" id="resume-dropzone">
                <svg class="file-dropzone-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <div class="text-sm font-semibold">Click to upload or drag & drop</div>
                <div class="text-xs text-muted" id="dropzone-text">PDF or DOCX files up to 2MB</div>
                <input type="file" id="resume-file-input" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
              </div>
              <div id="file-error" class="form-error" style="margin-top: 4px;"></div>
            </div>

            <label class="form-check" style="margin-top: var(--space-4);">
              <input type="checkbox" id="consent-check" class="form-check-input" required>
              <span class="form-check-label text-xs text-muted">
                I confirm that the submitted information is accurate and consent to processing my simulated demo application.
              </span>
            </label>

            <button type="submit" id="btn-submit-app" class="btn btn-primary btn-lg w-full" style="margin-top: var(--space-4);">
              Submit Application
            </button>
          </form>
        </div>
      `;
    }
  } else {
    // HR / Admin Viewing
    rightColumnHtml = `
      <div class="card apply-card">
        <span class="badge badge-primary" style="margin-bottom: var(--space-3);">Staff Preview</span>
        <h3 class="card-title" style="margin-bottom: var(--space-2);">Managing this Position</h3>
        <p class="text-sm text-muted" style="margin-bottom: var(--space-4);">You are logged in as <strong>${escapeHTML(session.role.toUpperCase())}</strong>.</p>
        <a href="hr/pipeline.html?jobId=${encodeURIComponent(currentJob.id)}" class="btn btn-primary w-full" style="margin-bottom: var(--space-2);">View Pipeline Kanban</a>
        <a href="hr/jobs.html" class="btn btn-secondary w-full">Edit Job in Jobs Directory</a>
      </div>
    `;
  }

  container.innerHTML = leftColumnHtml + rightColumnHtml;

  // Bind Form handlers if rendered
  bindApplicationForm();
}

function bindApplicationForm() {
  const form = document.getElementById('apply-form');
  if (!form) return;

  const noteInput = document.getElementById('cand-note');
  const counter = document.getElementById('note-char-count');
  const dropzone = document.getElementById('resume-dropzone');
  const fileInput = document.getElementById('resume-file-input');
  const fileError = document.getElementById('file-error');
  const dropzoneText = document.getElementById('dropzone-text');

  // Pre-fill profile resume if available
  if (currentCandidate && currentCandidate.resumeMeta) {
    uploadedFileMeta = currentCandidate.resumeMeta;
    dropzoneText.innerHTML = `Using saved profile resume: <strong>${escapeHTML(uploadedFileMeta.fileName)}</strong>`;
  }

  noteInput.addEventListener('input', () => {
    counter.textContent = `${noteInput.value.length} / 1000`;
  });

  dropzone.onclick = () => fileInput.click();

  dropzone.ondragover = (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  };

  dropzone.ondragleave = () => dropzone.classList.remove('dragover');

  dropzone.ondrop = (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  fileInput.onchange = () => {
    if (fileInput.files.length > 0) {
      handleFileSelected(fileInput.files[0]);
    }
  };

  function handleFileSelected(file) {
    fileError.textContent = '';
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      fileError.textContent = 'Only PDF and DOCX documents are accepted.';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      fileError.textContent = 'File size exceeds maximum 2 MB limit.';
      return;
    }

    uploadedFileMeta = {
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type || 'application/pdf',
      uploadedAt: new Date().toISOString()
    };

    dropzoneText.innerHTML = `<span style="color: var(--success); font-weight: 600;">Selected: ${escapeHTML(file.name)} (${(file.size / 1024).toFixed(0)} KB)</span>`;
  }

  form.onsubmit = async (e) => {
    e.preventDefault();

    const name = document.getElementById('cand-name').value.trim();
    const phone = document.getElementById('cand-phone').value.trim();
    const consent = document.getElementById('consent-check').checked;
    const note = noteInput.value.trim();
    const submitBtn = document.getElementById('btn-submit-app');

    if (!name) {
      showToast('Please enter your full name', 'error');
      return;
    }
    if (!phone) {
      showToast('Please enter your phone number', 'error');
      return;
    }
    if (!uploadedFileMeta) {
      fileError.textContent = 'Please attach your resume file (PDF or DOCX)';
      showToast('Please attach your resume file', 'error');
      return;
    }
    if (!consent) {
      showToast('Please accept the accuracy and consent agreement', 'warning');
      return;
    }

    setLoading(submitBtn, true);

    try {
      await api.applyForJob({
        jobId: currentJob.id,
        coverNote: note,
        resumeMeta: uploadedFileMeta
      });

      showToast('Application successfully submitted!', 'success');
      renderJobView();
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(submitBtn, false);
    }
  };
}

async function loadSimilarJobs() {
  const container = document.getElementById('similar-jobs-list');
  try {
    const all = await api.getJobs();
    const similar = all.filter(j => j.id !== currentJob.id && (j.department === currentJob.department || j.type === currentJob.type)).slice(0, 3);

    if (similar.length === 0) {
      container.parentElement.style.display = 'none';
      return;
    }

    container.innerHTML = similar.map(j => `
      <a href="job-details.html?id=${encodeURIComponent(j.id)}" class="job-card" style="padding: var(--space-4);">
        <h4 style="font-size: var(--font-size-base);">${escapeHTML(j.title)}</h4>
        <div class="text-xs text-muted" style="margin-bottom: var(--space-2);">${escapeHTML(j.department)} • ${escapeHTML(j.location)}</div>
        <div class="job-card-salary" style="font-size: 13px;">$${j.salaryMin.toLocaleString()} - $${j.salaryMax.toLocaleString()}</div>
      </a>
    `).join('');
  } catch (e) {
    container.parentElement.style.display = 'none';
  }
}
