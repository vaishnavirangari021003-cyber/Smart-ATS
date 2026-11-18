/**
 * HireFlow Candidate Dashboard Controller (candidate-dashboard.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { showToast, confirmDialog, renderEmpty, renderSkeleton } from '../lib/ui.js';
import { escapeHTML } from '../lib/escape.js';
import { formatDate, formatTime, relativeTime } from '../lib/dates.js';

let session = null;

document.addEventListener('DOMContentLoaded', async () => {
  session = guardPage(['candidate']);
  if (!session) return;

  await Promise.all([
    loadProfileProgress(),
    loadApplicationsAndOffers(),
    loadUpcomingInterviews(),
    loadRecommendedJobs()
  ]);
});

async function loadProfileProgress() {
  try {
    const profile = await api.getCandidateProfile(session.userId);
    const fields = [
      Boolean(profile.phone),
      Boolean(profile.location),
      Boolean(profile.headline),
      Boolean(profile.skills && profile.skills.length > 0),
      Boolean(profile.education),
      Boolean(profile.linkedin),
      Boolean(profile.resumeMeta)
    ];

    const filled = fields.filter(Boolean).length;
    const pct = Math.round((filled / fields.length) * 100);

    const circle = document.getElementById('profile-ring-circle');
    const pctText = document.getElementById('profile-ring-pct');
    const label = document.getElementById('profile-strength-label');

    const circumference = 2 * Math.PI * 38; // ~238.76
    const offset = circumference - (pct / 100) * circumference;

    if (circle) circle.style.strokeDashoffset = offset;
    if (pctText) pctText.textContent = `${pct}%`;

    if (label) {
      if (pct === 100) label.textContent = 'All Stars (100%)';
      else if (pct >= 70) label.textContent = 'Strong Profile';
      else if (pct >= 40) label.textContent = 'Good Start';
      else label.textContent = 'Needs Attention';
    }
  } catch (e) {
    console.error('Error loading profile progress:', e);
  }
}

async function loadApplicationsAndOffers() {
  const container = document.getElementById('active-applications-list');
  renderSkeleton(container, 'card', 2);

  try {
    const apps = await api.getApplications();
    const offers = await api.getOffers();

    // Update Sidebar & KPI counts
    const activeApps = apps.filter(a => !['Rejected', 'Withdrawn'].includes(a.stage));
    document.getElementById('kpi-active-apps').textContent = activeApps.length;
    document.getElementById('sidebar-app-count').textContent = apps.length;
    document.getElementById('kpi-offers-count').textContent = offers.length;

    // Check for Pending Offer (status === 'issued')
    const pendingOffer = offers.find(o => o.status === 'issued');
    const offerAlert = document.getElementById('pending-offer-alert');
    if (pendingOffer && offerAlert) {
      offerAlert.style.display = 'block';
      offerAlert.innerHTML = `
        <div class="card" style="border-left: 4px solid var(--warning); background: var(--surface);">
          <div class="flex justify-between items-center" style="flex-wrap: wrap; gap: var(--space-3);">
            <div>
              <span class="badge badge-warning" style="margin-bottom: var(--space-2);">Action Required: Job Offer Received</span>
              <h3 style="font-size: var(--font-size-md); margin-bottom: 2px;">
                Congratulations! You have received an official offer for <strong>${escapeHTML(pendingOffer.jobTitle)}</strong>
              </h3>
              <p class="text-sm text-muted" style="margin: 0;">
                Salary: <strong>$${pendingOffer.salary.toLocaleString()} USD</strong> • Target Start Date: <strong>${formatDate(pendingOffer.startDate)}</strong>
              </p>
            </div>
            <div class="flex gap-2">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-decline-offer">Decline</button>
              <button type="button" class="btn btn-success btn-sm" id="btn-accept-offer">Accept Offer</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-accept-offer').onclick = async () => {
        const confirmed = await confirmDialog({
          title: 'Accept Job Offer',
          message: `Are you sure you want to accept the offer for ${pendingOffer.jobTitle}? This will confirm your start date and launch your onboarding checklist.`,
          confirmText: 'Yes, Accept Offer'
        });
        if (confirmed) {
          await api.respondToOffer(pendingOffer.id, 'accepted');
          showToast('Offer successfully accepted! Welcome to the team!', 'success');
          loadApplicationsAndOffers();
        }
      };

      document.getElementById('btn-decline-offer').onclick = async () => {
        const confirmed = await confirmDialog({
          title: 'Decline Job Offer',
          message: `Are you sure you want to decline this offer for ${pendingOffer.jobTitle}?`,
          confirmText: 'Decline Offer',
          danger: true
        });
        if (confirmed) {
          await api.respondToOffer(pendingOffer.id, 'declined');
          showToast('Offer declined.', 'info');
          loadApplicationsAndOffers();
        }
      };
    } else if (offerAlert) {
      offerAlert.style.display = 'none';
    }

    // Render Active Applications Cards
    if (activeApps.length === 0) {
      renderEmpty(
        container,
        'No active applications',
        'You do not have any active applications in progress.',
        `<a href="../index.html#jobs" class="btn btn-primary btn-sm">Explore Open Positions</a>`
      );
      return;
    }

    const stages = ['Applied', 'Screening', 'Interview', 'Selected', 'Offered'];

    container.innerHTML = activeApps.map(app => {
      const currentStageIndex = stages.indexOf(app.stage);

      return `
        <div class="card">
          <div class="flex justify-between items-center" style="margin-bottom: var(--space-2); flex-wrap: wrap;">
            <div>
              <h3 style="font-size: var(--font-size-md); margin-bottom: 2px;">${escapeHTML(app.jobTitle)}</h3>
              <span class="text-xs text-muted">Applied ${formatDate(app.appliedAt)} (${relativeTime(app.appliedAt)})</span>
            </div>
            <span class="badge badge-stage-${app.stage.toLowerCase()}">${escapeHTML(app.stage)}</span>
          </div>

          <!-- Horizontal Stage Timeline -->
          <div class="stage-stepper" aria-label="Application progress stepper">
            ${stages.map((st, i) => {
              let nodeClass = '';
              if (currentStageIndex > i) nodeClass = 'completed';
              else if (currentStageIndex === i) nodeClass = 'current';

              return `
                <div class="step-node ${nodeClass}">
                  <div class="step-dot">${i + 1}</div>
                  <div class="step-label">${st}</div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="flex justify-between items-center" style="border-top: 1px solid var(--border); padding-top: var(--space-3); margin-top: var(--space-2);">
            <span class="text-xs text-muted">Updated ${relativeTime(app.updatedAt)}</span>
            <div class="flex gap-2">
              <a href="applications.html" class="btn btn-secondary btn-sm">View Timeline Details</a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="error-state"><p>${escapeHTML(err.message)}</p></div>`;
  }
}

async function loadUpcomingInterviews() {
  const container = document.getElementById('upcoming-interviews-list');
  try {
    const list = await api.getInterviews();
    const now = new Date().getTime();
    const upcoming = list.filter(i => new Date(i.startsAt).getTime() >= now && i.status !== 'cancelled');

    document.getElementById('kpi-upcoming-interviews').textContent = upcoming.length;
    document.getElementById('sidebar-interview-count').textContent = upcoming.length;

    if (upcoming.length === 0) {
      renderEmpty(container, 'No upcoming interviews scheduled', 'When a recruiter schedules an interview, it will appear here.');
      return;
    }

    container.innerHTML = `
      <div class="grid gap-3" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        ${upcoming.map(item => `
          <div class="card" style="padding: var(--space-4);">
            <div class="flex justify-between items-center" style="margin-bottom: var(--space-2);">
              <span class="badge badge-primary">${escapeHTML(item.mode)}</span>
              <span class="text-xs text-muted font-semibold">${item.durationMin} mins</span>
            </div>
            <h4 style="font-size: var(--font-size-sm); margin-bottom: 4px;">${escapeHTML(item.title)}</h4>
            <div class="text-xs text-muted" style="margin-bottom: var(--space-3);">
              📅 ${formatDate(item.startsAt)} at ${formatTime(item.startsAt)}
            </div>
            <div class="flex gap-2">
              ${item.location && item.location.startsWith('http') 
                ? `<a href="${escapeHTML(item.location)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Join Video Meeting</a>`
                : `<span class="text-xs text-muted">Location: ${escapeHTML(item.location || 'Online')}</span>`}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p class="text-muted text-sm">Could not load interviews.</p>`;
  }
}

async function loadRecommendedJobs() {
  const container = document.getElementById('recommended-jobs-list');
  try {
    const jobs = await api.getJobs();
    const recommended = jobs.slice(0, 3);

    container.innerHTML = recommended.map(j => `
      <a href="../job-details.html?id=${encodeURIComponent(j.id)}" class="job-card" style="padding: var(--space-4);">
        <h3 class="job-card-title" style="font-size: var(--font-size-base);">${escapeHTML(j.title)}</h3>
        <div class="text-xs text-muted" style="margin-bottom: var(--space-2);">${escapeHTML(j.department)} • ${escapeHTML(j.location)}</div>
        <div class="job-card-salary" style="font-size: 13px;">$${j.salaryMin.toLocaleString()} - $${j.salaryMax.toLocaleString()}</div>
      </a>
    `).join('');
  } catch (e) {
    container.innerHTML = '';
  }
}
