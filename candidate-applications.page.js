/**
 * HireFlow Candidate Applications Page Controller (candidate-applications.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { showToast, confirmDialog, openDrawer, renderEmpty, renderSkeleton } from '../lib/ui.js';
import { escapeHTML } from '../lib/escape.js';
import { formatDate, formatDateTime, relativeTime } from '../lib/dates.js';

let allApplications = [];
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  const session = guardPage(['candidate']);
  if (!session) return;

  setupFilterButtons();
  await loadApplications();
});

function setupFilterButtons() {
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
      });
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');

      activeFilter = btn.getAttribute('data-filter');
      renderApplicationsTable();
    });
  });
}

async function loadApplications() {
  const tbody = document.getElementById('applications-table-body');
  renderSkeleton(tbody, 'row', 4);

  try {
    allApplications = await api.getApplications();

    // Counts
    const active = allApplications.filter(a => !['Rejected', 'Withdrawn'].includes(a.stage));
    const offered = allApplications.filter(a => a.stage === 'Offered');
    const closed = allApplications.filter(a => ['Rejected', 'Withdrawn'].includes(a.stage));

    document.getElementById('count-all').textContent = allApplications.length;
    document.getElementById('count-active').textContent = active.length;
    document.getElementById('count-offered').textContent = offered.length;
    document.getElementById('count-closed').textContent = closed.length;

    renderApplicationsTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger" style="padding: 2rem;">Error: ${escapeHTML(err.message)}</td></tr>`;
  }
}

function renderApplicationsTable() {
  const tbody = document.getElementById('applications-table-body');

  let filtered = allApplications;
  if (activeFilter === 'active') {
    filtered = allApplications.filter(a => !['Rejected', 'Withdrawn'].includes(a.stage));
  } else if (activeFilter === 'Offered') {
    filtered = allApplications.filter(a => a.stage === 'Offered');
  } else if (activeFilter === 'Rejected') {
    filtered = allApplications.filter(a => ['Rejected', 'Withdrawn'].includes(a.stage));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted" style="padding: 3rem;">
          No applications found in this category.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(app => {
    const isTerminal = ['Rejected', 'Withdrawn'].includes(app.stage);

    return `
      <tr>
        <td data-label="Job Title">
          <div class="font-bold text-sm">${escapeHTML(app.jobTitle)}</div>
        </td>
        <td data-label="Department">${escapeHTML(app.jobDepartment)}</td>
        <td data-label="Current Stage">
          <span class="badge badge-stage-${app.stage.toLowerCase()}">${escapeHTML(app.stage)}</span>
        </td>
        <td data-label="Applied Date">${formatDate(app.appliedAt)}</td>
        <td data-label="Last Update">${relativeTime(app.updatedAt)}</td>
        <td data-label="Actions" style="text-align: right;">
          <div class="flex gap-2 justify-end" style="justify-content: flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" data-action="view-details" data-id="${escapeHTML(app.id)}">
              Timeline Details
            </button>
            ${!isTerminal ? `
              <button type="button" class="btn btn-danger-ghost btn-sm" data-action="withdraw" data-id="${escapeHTML(app.id)}" data-title="${escapeHTML(app.jobTitle)}">
                Withdraw
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach button events
  tbody.querySelectorAll('[data-action="view-details"]').forEach(btn => {
    btn.onclick = () => openApplicationDetails(btn.getAttribute('data-id'));
  });

  tbody.querySelectorAll('[data-action="withdraw"]').forEach(btn => {
    btn.onclick = () => handleWithdraw(btn.getAttribute('data-id'), btn.getAttribute('data-title'));
  });
}

async function handleWithdraw(appId, jobTitle) {
  const confirmed = await confirmDialog({
    title: 'Withdraw Application',
    message: `Are you sure you want to withdraw your application for "${jobTitle}"? This will terminate your candidacy and notify the hiring team.`,
    confirmText: 'Confirm Withdrawal',
    danger: true
  });

  if (confirmed) {
    try {
      await api.withdrawApplication(appId);
      showToast('Application successfully withdrawn.', 'info');
      await loadApplications();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

async function openApplicationDetails(appId) {
  const drawerContent = document.getElementById('drawer-app-content');
  drawerContent.innerHTML = `<div class="skeleton" style="height: 200px;"></div>`;
  openDrawer('application-detail-drawer');

  try {
    const app = await api.getApplicationById(appId);

    drawerContent.innerHTML = `
      <div style="margin-bottom: var(--space-6);">
        <h2 style="font-size: var(--font-size-md); margin-bottom: var(--space-1);">${escapeHTML(app.job ? app.job.title : 'Application')}</h2>
        <div class="text-xs text-muted" style="margin-bottom: var(--space-3);">${escapeHTML(app.job ? app.job.department : '')} • Applied ${formatDate(app.appliedAt)}</div>
        <span class="badge badge-stage-${app.stage.toLowerCase()}">${escapeHTML(app.stage)}</span>
      </div>

      ${app.coverNote ? `
        <div style="background: var(--surface-2); padding: var(--space-3); border-radius: var(--radius-md); margin-bottom: var(--space-6);">
          <div class="text-xs font-bold text-muted" style="text-transform: uppercase; margin-bottom: 4px;">Cover Note</div>
          <p class="text-sm" style="margin: 0; color: var(--text);">${escapeHTML(app.coverNote)}</p>
        </div>
      ` : ''}

      <div style="margin-bottom: var(--space-6);">
        <h4 style="font-size: var(--font-size-sm); margin-bottom: var(--space-3);">Stage Audit Trail</h4>
        <div class="timeline">
          ${(app.history || []).map(h => `
            <div class="timeline-item">
              <div class="timeline-point"></div>
              <div class="timeline-title">${h.fromStage ? `${escapeHTML(h.fromStage)} → ` : ''}${escapeHTML(h.toStage)}</div>
              <div class="timeline-meta">${formatDateTime(h.at)}</div>
              ${h.note ? `<p class="text-sm text-muted" style="margin-top: 4px; margin-bottom: 0;">${escapeHTML(h.note)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    drawerContent.innerHTML = `<div class="error-state"><p>${escapeHTML(err.message)}</p></div>`;
  }
}
