/**
 * HireFlow HR Pipeline Kanban & Table View Controller (hr-pipeline.page.js)
 * Flagship interactive recruiter workspace.
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { KanbanDnD } from '../lib/dnd.js';
import { getAllowedTransitions } from '../core/pipeline.js';
import { showToast, confirmDialog, openDrawer, closeDrawer, openModal, closeModal, renderAvatar, setLoading } from '../lib/ui.js';
import { escapeHTML, sanitizeCSV } from '../lib/escape.js';
import { formatDate, formatDateTime, daysBetween, relativeTime, formatDateInput } from '../lib/dates.js';

let allApplications = [];
let allJobs = [];
let currentView = 'kanban'; // 'kanban' | 'table'
let activeAppIdInDrawer = null;
let dndController = null;
let tablePage = 1;
const TABLE_PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const session = guardPage(['hr', 'admin']);
  if (!session) return;

  setupDnD();
  setupControls();
  await loadData();

  // If URL has ?appId=, auto-open drawer
  const params = new URLSearchParams(window.location.search);
  const targetAppId = params.get('appId');
  if (targetAppId) {
    setTimeout(() => openCandidateDrawer(targetAppId), 300);
  }
});

function setupDnD() {
  dndController = new KanbanDnD({
    getAllowedStages: (stage) => getAllowedTransitions(stage, 'hr'),
    onMove: async (appId, targetStage) => {
      try {
        await api.moveApplicationStage(appId, targetStage);
        showToast(`Moved to ${targetStage}`, 'success');
        await loadData();
        return true;
      } catch (err) {
        showToast(err.message, 'error', 5000);
        // If the error asks for scheduling an interview, offer to open modal
        if (err.message.includes('interview')) {
          openScheduleInterviewModal(appId);
        }
        return false;
      }
    }
  });

  const board = document.getElementById('pipeline-kanban-view');
  dndController.bind(board);
}

function setupControls() {
  const kanbanBtn = document.getElementById('view-kanban-btn');
  const tableBtn = document.getElementById('view-table-btn');
  const kanbanView = document.getElementById('pipeline-kanban-view');
  const tableView = document.getElementById('pipeline-table-view');
  const exportCsvBtn = document.getElementById('btn-export-csv');
  const rulesBtn = document.getElementById('btn-show-rules');

  kanbanBtn.onclick = () => {
    currentView = 'kanban';
    kanbanBtn.classList.replace('btn-ghost', 'btn-primary');
    tableBtn.classList.replace('btn-primary', 'btn-ghost');
    kanbanView.style.display = 'flex';
    tableView.style.display = 'none';
    exportCsvBtn.style.display = 'none';
  };

  tableBtn.onclick = () => {
    currentView = 'table';
    tableBtn.classList.replace('btn-ghost', 'btn-primary');
    kanbanBtn.classList.replace('btn-primary', 'btn-ghost');
    kanbanView.style.display = 'none';
    tableView.style.display = 'block';
    exportCsvBtn.style.display = 'inline-flex';
    renderTableView();
  };

  rulesBtn.onclick = () => openModal('rules-modal');

  document.getElementById('pipeline-job-select').onchange = () => refreshViews();
  document.getElementById('pipeline-search-input').oninput = () => refreshViews();
  document.getElementById('pipeline-rating-select').onchange = () => refreshViews();

  exportCsvBtn.onclick = () => exportFilteredCSV();

  setupScheduleModal();
}

async function loadData() {
  try {
    const [jobs, apps] = await Promise.all([
      api.getJobs(),
      api.getApplications()
    ]);
    allJobs = jobs;
    allApplications = apps;

    populateJobSelect();
    refreshViews();
  } catch (err) {
    showToast(`Error loading pipeline: ${err.message}`, 'error');
  }
}

function populateJobSelect() {
  const select = document.getElementById('pipeline-job-select');
  const currentVal = select.value;
  select.innerHTML = `<option value="">All Job Positions (${allJobs.length})</option>`;
  allJobs.forEach(job => {
    const opt = document.createElement('option');
    opt.value = job.id;
    opt.textContent = `${job.title} (${job.department})`;
    select.appendChild(opt);
  });
  if (currentVal) select.value = currentVal;

  // Check URL param jobId
  const urlParams = new URLSearchParams(window.location.search);
  const jobIdParam = urlParams.get('jobId');
  if (jobIdParam) select.value = jobIdParam;
}

function getFilteredApplications() {
  const jobFilter = document.getElementById('pipeline-job-select').value;
  const search = document.getElementById('pipeline-search-input').value.trim().toLowerCase();
  const ratingFilter = document.getElementById('pipeline-rating-select').value;

  return allApplications.filter(app => {
    if (jobFilter && app.jobId !== jobFilter) return false;
    if (ratingFilter && (!app.rating || app.rating < Number(ratingFilter))) return false;
    if (search) {
      const nameMatches = app.candidateName.toLowerCase().includes(search);
      const jobMatches = app.jobTitle.toLowerCase().includes(search);
      const skillMatches = app.candidateSkills && app.candidateSkills.some(s => s.toLowerCase().includes(search));
      if (!nameMatches && !jobMatches && !skillMatches) return false;
    }
    return true;
  });
}

function refreshViews() {
  if (currentView === 'kanban') {
    renderKanbanColumns();
  } else {
    renderTableView();
  }
}

function renderKanbanColumns() {
  const filtered = getFilteredApplications();
  const stages = ['Applied', 'Screening', 'Interview', 'Selected', 'Offered'];
  const now = new Date();

  // Reset columns
  stages.forEach(st => {
    const colList = document.getElementById(`col-${st}`);
    const countBadge = document.getElementById(`count-${st}`);
    if (colList) colList.innerHTML = '';
    if (countBadge) countBadge.textContent = '0';
  });

  const rejectedCol = document.getElementById('col-Rejected');
  const rejectedCount = document.getElementById('count-Rejected');
  if (rejectedCol) rejectedCol.innerHTML = '';
  if (rejectedCount) rejectedCount.textContent = '0';

  const counts = { Applied: 0, Screening: 0, Interview: 0, Selected: 0, Offered: 0, Rejected: 0 };

  filtered.forEach(app => {
    const isTerminal = ['Rejected', 'Withdrawn'].includes(app.stage);
    const targetColId = isTerminal ? 'col-Rejected' : `col-${app.stage}`;
    const list = document.getElementById(targetColId);

    if (isTerminal) counts.Rejected++;
    else if (counts[app.stage] !== undefined) counts[app.stage]++;

    if (!list) return;

    const daysStuck = daysBetween(app.updatedAt, now);
    const isStale = daysStuck >= 7 && !isTerminal;

    // Render Card
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-id', app.id);
    card.setAttribute('data-stage', app.stage);
    card.tabIndex = 0;

    const allowed = getAllowedTransitions(app.stage, 'hr');

    // Build star rating
    let starsHtml = '';
    if (app.rating) {
      starsHtml = '★'.repeat(app.rating) + '☆'.repeat(5 - app.rating);
    }

    card.innerHTML = `
      <div class="kanban-card-header">
        <div class="flex items-center gap-2">
          ${renderAvatar(app.candidateName, 'xs')}
          <span class="kanban-card-title">${escapeHTML(app.candidateName)}</span>
        </div>
        <!-- Keyboard accessible Move To dropdown -->
        ${allowed.length > 0 ? `
          <div class="dropdown">
            <button type="button" class="btn-icon btn-ghost btn-sm" data-action="move-menu" aria-label="Move stage menu" title="Move Candidate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>
            <div class="dropdown-menu">
              <div style="padding: 4px 8px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Move to:</div>
              ${allowed.map(st => `
                <button type="button" class="dropdown-item" data-move-to="${st}">${st}</button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="kanban-card-job">${escapeHTML(app.jobTitle)}</div>

      ${app.candidateSkills && app.candidateSkills.length > 0 ? `
        <div class="flex gap-1" style="flex-wrap: wrap; margin-bottom: 8px;">
          ${app.candidateSkills.slice(0, 2).map(s => `<span class="badge badge-default" style="font-size: 10px; padding: 1px 5px;">${escapeHTML(s)}</span>`).join('')}
        </div>
      ` : ''}

      <div class="kanban-card-footer">
        <div>
          ${starsHtml ? `<span style="color: var(--warning); font-size: 11px;">${starsHtml}</span>` : '<span class="text-xs text-muted">Unrated</span>'}
        </div>
        <span class="days-in-stage-badge ${isStale ? 'stale' : ''}">
          ${daysStuck}d in stage
        </span>
      </div>
    `;

    // Card click opens drawer (unless clicked on menu)
    card.onclick = (e) => {
      if (e.target.closest('.dropdown')) return;
      openCandidateDrawer(app.id);
    };

    // Keyboard menu handlers
    card.querySelectorAll('[data-move-to]').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const toStage = btn.getAttribute('data-move-to');
        try {
          await api.moveApplicationStage(app.id, toStage);
          showToast(`Candidate moved to ${toStage}`, 'success');
          await loadData();
        } catch (err) {
          showToast(err.message, 'error');
          if (err.message.includes('interview')) {
            openScheduleInterviewModal(app.id);
          }
        }
      };
    });

    dndController.attachKeyboardMenu(card, allowed);
    list.appendChild(card);
  });

  // Update counts
  stages.forEach(st => {
    document.getElementById(`count-${st}`).textContent = counts[st];
  });
  document.getElementById('count-Rejected').textContent = counts.Rejected;
}

function renderTableView() {
  const tbody = document.getElementById('pipeline-table-body');
  const pagination = document.getElementById('pipeline-table-pagination');
  const filtered = getFilteredApplications();
  const now = new Date();

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 3rem;">No applications found matching your criteria.</td></tr>`;
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / TABLE_PAGE_SIZE);
  if (tablePage > totalPages) tablePage = totalPages;
  const start = (tablePage - 1) * TABLE_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + TABLE_PAGE_SIZE);

  tbody.innerHTML = pageItems.map(app => {
    const daysStuck = daysBetween(app.updatedAt, now);
    let starsHtml = '—';
    if (app.rating) {
      starsHtml = '★'.repeat(app.rating);
    }

    return `
      <tr>
        <td data-label="Candidate">
          <div class="flex items-center gap-2">
            ${renderAvatar(app.candidateName, 'xs')}
            <div>
              <div class="font-bold text-sm">${escapeHTML(app.candidateName)}</div>
              <div class="text-xs text-muted">${escapeHTML(app.candidateEmail)}</div>
            </div>
          </div>
        </td>
        <td data-label="Job Title">${escapeHTML(app.jobTitle)}</td>
        <td data-label="Current Stage">
          <span class="badge badge-stage-${app.stage.toLowerCase()}">${escapeHTML(app.stage)}</span>
        </td>
        <td data-label="Rating" style="color: var(--warning);">${starsHtml}</td>
        <td data-label="Days in Stage">${daysStuck} days</td>
        <td data-label="Applied Date">${formatDate(app.appliedAt)}</td>
        <td data-label="Action" style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-sm" data-action="inspect" data-id="${escapeHTML(app.id)}">
            Inspect Profile
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-action="inspect"]').forEach(btn => {
    btn.onclick = () => openCandidateDrawer(btn.getAttribute('data-id'));
  });

  // Pagination
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" class="page-btn ${i === tablePage ? 'active' : ''}" data-p="${i}">${i}</button>`;
  }
  pagination.innerHTML = html;
  pagination.querySelectorAll('[data-p]').forEach(btn => {
    btn.onclick = () => {
      tablePage = Number(btn.getAttribute('data-p'));
      renderTableView();
    };
  });
}

function exportFilteredCSV() {
  const filtered = getFilteredApplications();
  const headers = ['Application ID', 'Candidate Name', 'Candidate Email', 'Job Title', 'Current Stage', 'Rating', 'Applied Date', 'Last Updated'];
  
  const rows = filtered.map(a => [
    sanitizeCSV(a.id),
    sanitizeCSV(a.candidateName),
    sanitizeCSV(a.candidateEmail),
    sanitizeCSV(a.jobTitle),
    sanitizeCSV(a.stage),
    sanitizeCSV(a.rating || 'N/A'),
    sanitizeCSV(a.appliedAt),
    sanitizeCSV(a.updatedAt)
  ]);

  const csvContent = '\uFEFF' + [headers.map(sanitizeCSV).join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `HireFlow-Pipeline-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Sanitized CSV report downloaded.', 'success');
}

/**
 * Open Candidate Detail Drawer
 * @param {string} appId 
 */
async function openCandidateDrawer(appId) {
  activeAppIdInDrawer = appId;
  const content = document.getElementById('drawer-cand-content');
  const footer = document.getElementById('drawer-cand-footer');
  const title = document.getElementById('drawer-cand-name');
  const headline = document.getElementById('drawer-cand-headline');

  content.innerHTML = `<div class="skeleton" style="height: 300px;"></div>`;
  openDrawer('candidate-drawer');

  try {
    const app = await api.getApplicationById(appId);
    title.textContent = app.candidateName;
    headline.textContent = app.profile?.headline || `${app.jobTitle} Candidate`;

    const isTerminal = ['Rejected', 'Withdrawn'].includes(app.stage);
    const allowed = getAllowedTransitions(app.stage, 'hr');

    content.innerHTML = `
      <div style="border-bottom: 1px solid var(--border); padding-bottom: var(--space-4); margin-bottom: var(--space-4);">
        <div class="flex justify-between items-center" style="margin-bottom: var(--space-2);">
          <span class="badge badge-stage-${app.stage.toLowerCase()}" style="font-size: 13px;">${escapeHTML(app.stage)}</span>
          <span class="text-xs text-muted">Applied ${formatDate(app.appliedAt)}</span>
        </div>
        <div class="text-sm"><strong>Applying for:</strong> ${escapeHTML(app.jobTitle)}</div>
        <div class="text-xs text-muted" style="margin-top: 2px;">
          📧 ${escapeHTML(app.candidateEmail)} • 📞 ${escapeHTML(app.profile?.phone || 'N/A')} • 📍 ${escapeHTML(app.profile?.location || 'Remote')}
        </div>
      </div>

      <!-- Rating Control -->
      <div style="margin-bottom: var(--space-4); background: var(--surface-2); padding: var(--space-3); border-radius: var(--radius-md);">
        <div class="text-xs font-bold text-muted" style="text-transform: uppercase; margin-bottom: 4px;">Candidate Score / Rating</div>
        <div class="flex gap-2 items-center">
          <div id="drawer-rating-stars" style="color: var(--warning); font-size: 1.25rem; cursor: pointer;">
            ${[1, 2, 3, 4, 5].map(star => `
              <span data-star="${star}" title="${star} stars">${star <= (app.rating || 0) ? '★' : '☆'}</span>
            `).join('')}
          </div>
          <span class="text-xs text-muted font-semibold" id="drawer-rating-val">${app.rating ? `${app.rating} / 5` : 'Not yet rated'}</span>
        </div>
      </div>

      <!-- Skills -->
      ${app.candidateSkills && app.candidateSkills.length > 0 ? `
        <div style="margin-bottom: var(--space-4);">
          <div class="text-xs font-bold text-muted" style="text-transform: uppercase; margin-bottom: 6px;">Skills</div>
          <div class="flex gap-2" style="flex-wrap: wrap;">
            ${app.candidateSkills.map(s => `<span class="badge badge-primary">${escapeHTML(s)}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Resume Metadata -->
      <div style="margin-bottom: var(--space-4); border: 1px solid var(--border); padding: var(--space-3); border-radius: var(--radius-md);">
        <div class="text-xs font-bold text-muted" style="text-transform: uppercase; margin-bottom: 4px;">Attached Resume</div>
        <div class="flex justify-between items-center">
          <div>
            <div class="font-bold text-sm">${escapeHTML(app.resumeMeta?.fileName || 'Resume.pdf')}</div>
            <div class="text-xs text-muted">${app.resumeMeta?.sizeBytes ? `${(app.resumeMeta.sizeBytes / 1024).toFixed(0)} KB` : 'Verified Document'}</div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-mock-view-resume">Inspect Resume</button>
        </div>
      </div>

      <!-- Cover Note -->
      ${app.coverNote ? `
        <div style="margin-bottom: var(--space-4); background: var(--surface-2); padding: var(--space-3); border-radius: var(--radius-md);">
          <div class="text-xs font-bold text-muted" style="text-transform: uppercase; margin-bottom: 4px;">Candidate Cover Note</div>
          <p class="text-sm" style="margin: 0;">${escapeHTML(app.coverNote)}</p>
        </div>
      ` : ''}

      <!-- Quick Action Buttons -->
      <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-6); flex-wrap: wrap;">
        <button type="button" class="btn btn-primary btn-sm" id="btn-drawer-schedule">📅 Schedule Interview</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-drawer-create-offer">📝 Create Offer Letter</button>
        ${!isTerminal ? `
          <button type="button" class="btn btn-danger-ghost btn-sm" id="btn-drawer-reject">✕ Reject Candidate</button>
        ` : ''}
      </div>

      <!-- Stage Audit Trail -->
      <div>
        <h4 style="font-size: var(--font-size-sm); margin-bottom: var(--space-3);">Stage History & Audit Trail</h4>
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

    // Bind rating star clicks
    content.querySelectorAll('[data-star]').forEach(starEl => {
      starEl.onclick = async () => {
        const star = Number(starEl.getAttribute('data-star'));
        await api.updateApplicationRating(appId, star);
        showToast(`Rating updated to ${star} stars`, 'success');
        openCandidateDrawer(appId);
        refreshViews();
      };
    });

    document.getElementById('btn-mock-view-resume').onclick = () => {
      showToast('Opening verified candidate resume viewer (simulated)', 'info');
    };

    document.getElementById('btn-drawer-schedule').onclick = () => {
      openScheduleInterviewModal(appId);
    };

    document.getElementById('btn-drawer-create-offer').onclick = () => {
      window.location.href = `offers.html?appId=${encodeURIComponent(appId)}`;
    };

    const rejectBtn = document.getElementById('btn-drawer-reject');
    if (rejectBtn) {
      rejectBtn.onclick = async () => {
        const reason = prompt('Please provide a required reason for rejection (this will be added to the immutable audit log):');
        if (reason && reason.trim()) {
          await api.moveApplicationStage(appId, 'Rejected', `Rejected: ${reason.trim()}`);
          showToast('Candidate moved to Rejected.', 'info');
          closeDrawer('candidate-drawer');
          await loadData();
        } else if (reason !== null) {
          showToast('A rejection reason is required for compliance audit trails.', 'error');
        }
      };
    }
  } catch (err) {
    content.innerHTML = `<div class="error-state"><p>${escapeHTML(err.message)}</p></div>`;
  }
}

function openScheduleInterviewModal(appId) {
  document.getElementById('sched-app-id').value = appId;
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  document.getElementById('sched-date').value = formatDateInput(tomorrow);
  openModal('schedule-interview-modal');
}

function setupScheduleModal() {
  const form = document.getElementById('schedule-interview-form');
  const saveBtn = document.getElementById('btn-save-sched');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const appId = document.getElementById('sched-app-id').value;
    const title = document.getElementById('sched-title').value.trim();
    const date = document.getElementById('sched-date').value;
    const time = document.getElementById('sched-time').value;
    const durationMin = document.getElementById('sched-duration').value;
    const mode = document.getElementById('sched-mode').value;
    const location = document.getElementById('sched-location').value.trim();

    if (!date || !time) {
      showToast('Please specify interview date and time', 'error');
      return;
    }

    const startsAt = new Date(`${date}T${time}`).toISOString();
    if (new Date(startsAt).getTime() <= Date.now()) {
      showToast('Interview must be scheduled for a future time', 'error');
      return;
    }

    setLoading(saveBtn, true);

    try {
      await api.scheduleInterview({
        applicationId: appId,
        title,
        startsAt,
        durationMin,
        mode,
        location
      });

      showToast('Interview successfully scheduled!', 'success');
      closeModal('schedule-interview-modal');
      await loadData();
      if (activeAppIdInDrawer) openCandidateDrawer(activeAppIdInDrawer);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(saveBtn, false);
    }
  };
}
