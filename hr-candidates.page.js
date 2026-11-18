/**
 * HireFlow HR Candidate Directory Controller (hr-candidates.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { openDrawer, renderAvatar, renderSkeleton } from '../lib/ui.js';
import { escapeHTML } from '../lib/escape.js';
import { formatDate } from '../lib/dates.js';

let allCandidates = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const session = guardPage(['hr', 'admin']);
  if (!session) return;

  setupFilters();
  await loadCandidates();
});

function setupFilters() {
  const searchInput = document.getElementById('candidate-search-input');
  const skillSelect = document.getElementById('candidate-skill-select');

  const onFilter = () => {
    currentPage = 1;
    renderCandidatesTable();
  };

  searchInput.addEventListener('input', onFilter);
  skillSelect.addEventListener('change', onFilter);
}

async function loadCandidates() {
  const tbody = document.getElementById('candidates-table-body');
  renderSkeleton(tbody, 'row', 5);

  try {
    allCandidates = await api.getCandidates();
    renderCandidatesTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger" style="padding: 2rem;">Error: ${escapeHTML(err.message)}</td></tr>`;
  }
}

function getFilteredCandidates() {
  const search = document.getElementById('candidate-search-input').value.trim().toLowerCase();
  const skill = document.getElementById('candidate-skill-select').value;

  return allCandidates.filter(c => {
    if (skill && (!c.skills || !c.skills.includes(skill))) return false;
    if (search) {
      const matchName = c.name.toLowerCase().includes(search);
      const matchHeadline = c.headline && c.headline.toLowerCase().includes(search);
      const matchSkills = c.skills && c.skills.some(s => s.toLowerCase().includes(search));
      if (!matchName && !matchHeadline && !matchSkills) return false;
    }
    return true;
  });
}

function renderCandidatesTable() {
  const tbody = document.getElementById('candidates-table-body');
  const pagination = document.getElementById('candidates-pagination');
  const filtered = getFilteredCandidates();

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 3rem;">No candidates found matching criteria.</td></tr>`;
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  tbody.innerHTML = pageItems.map(c => `
    <tr>
      <td data-label="Candidate">
        <div class="flex items-center gap-2">
          ${renderAvatar(c.name, 'sm')}
          <div>
            <div class="font-bold text-sm">${escapeHTML(c.name)}</div>
            <div class="text-xs text-muted">${escapeHTML(c.email)}</div>
          </div>
        </div>
      </td>
      <td data-label="Headline">${escapeHTML(c.headline || 'Candidate')}</td>
      <td data-label="Location">${escapeHTML(c.location || 'Remote')}</td>
      <td data-label="Top Skills">
        <div class="flex gap-1" style="flex-wrap: wrap;">
          ${(c.skills || []).slice(0, 3).map(s => `<span class="badge badge-default" style="font-size: 11px;">${escapeHTML(s)}</span>`).join('')}
          ${c.skills && c.skills.length > 3 ? `<span class="badge badge-default">+${c.skills.length - 3}</span>` : ''}
        </div>
      </td>
      <td data-label="Active Apps">
        <span class="badge badge-${c.activeApplications > 0 ? 'primary' : 'default'}">
          ${c.activeApplications} active
        </span>
      </td>
      <td data-label="Action" style="text-align: right;">
        <button type="button" class="btn btn-secondary btn-sm" data-action="view-profile" data-id="${escapeHTML(c.id)}">
          View Profile
        </button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-action="view-profile"]').forEach(btn => {
    btn.onclick = () => openProfileDrawer(btn.getAttribute('data-id'));
  });

  // Pagination
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" class="page-btn ${i === currentPage ? 'active' : ''}" data-p="${i}">${i}</button>`;
  }
  pagination.innerHTML = html;
  pagination.querySelectorAll('[data-p]').forEach(btn => {
    btn.onclick = () => {
      currentPage = Number(btn.getAttribute('data-p'));
      renderCandidatesTable();
    };
  });
}

async function openProfileDrawer(userId) {
  const drawerContent = document.getElementById('drawer-profile-content');
  const drawerTitle = document.getElementById('drawer-profile-name');
  drawerContent.innerHTML = `<div class="skeleton" style="height: 250px;"></div>`;
  openDrawer('candidate-profile-drawer');

  try {
    const candidate = await api.getCandidateProfile(userId);
    const candidateApps = await api.getApplications({ candidateId: userId });

    drawerTitle.textContent = candidate.name;

    drawerContent.innerHTML = `
      <div style="border-bottom: 1px solid var(--border); padding-bottom: var(--space-4); margin-bottom: var(--space-4);">
        <div class="flex items-center gap-3" style="margin-bottom: var(--space-3);">
          ${renderAvatar(candidate.name, 'lg')}
          <div>
            <h2 style="font-size: var(--font-size-md); margin-bottom: 2px;">${escapeHTML(candidate.name)}</h2>
            <div class="text-xs text-muted">${escapeHTML(candidate.headline || 'Talent Profile')}</div>
          </div>
        </div>
        <div class="text-xs text-muted" style="display: flex; flex-direction: column; gap: 4px;">
          <span>📧 ${escapeHTML(candidate.email)}</span>
          <span>📞 ${escapeHTML(candidate.phone || 'N/A')}</span>
          <span>📍 ${escapeHTML(candidate.location || 'Remote')}</span>
          ${candidate.linkedin ? `<span>🔗 <a href="${escapeHTML(candidate.linkedin)}" target="_blank" rel="noopener">LinkedIn Profile</a></span>` : ''}
        </div>
      </div>

      <div style="margin-bottom: var(--space-4);">
        <div class="text-xs font-bold text-muted" style="text-transform: uppercase; margin-bottom: 6px;">Skills & Competencies</div>
        <div class="flex gap-2" style="flex-wrap: wrap;">
          ${(candidate.skills || []).map(s => `<span class="badge badge-primary">${escapeHTML(s)}</span>`).join('')}
        </div>
      </div>

      <div style="margin-bottom: var(--space-4);">
        <div class="text-xs font-bold text-muted" style="text-transform: uppercase; margin-bottom: 4px;">Education & Background</div>
        <p class="text-sm" style="margin: 0;">${escapeHTML(candidate.education || 'Computer Science / Engineering background')}</p>
        <div class="text-xs text-muted" style="margin-top: 2px;">Experience: ${candidate.experienceYears || 0} years</div>
      </div>

      <div style="margin-bottom: var(--space-4); border: 1px solid var(--border); padding: var(--space-3); border-radius: var(--radius-md);">
        <div class="text-xs font-bold text-muted" style="text-transform: uppercase; margin-bottom: 4px;">Attached Resume</div>
        <div class="font-bold text-sm">${escapeHTML(candidate.resumeMeta?.fileName || 'Verified_Resume.pdf')}</div>
        <div class="text-xs text-muted">${candidate.resumeMeta?.sizeBytes ? `${(candidate.resumeMeta.sizeBytes / 1024).toFixed(0)} KB • Uploaded ${formatDate(candidate.resumeMeta.uploadedAt)}` : 'Document on file'}</div>
      </div>

      <div>
        <div class="text-xs font-bold text-muted" style="text-transform: uppercase; margin-bottom: 6px;">Candidate Applications (${candidateApps.length})</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${candidateApps.map(a => `
            <div style="background: var(--surface-2); padding: 8px 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="font-bold text-xs">${escapeHTML(a.jobTitle)}</div>
                <div class="text-xs text-muted">Applied ${formatDate(a.appliedAt)}</div>
              </div>
              <span class="badge badge-stage-${a.stage.toLowerCase()}">${escapeHTML(a.stage)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    drawerContent.innerHTML = `<div class="error-state"><p>${escapeHTML(err.message)}</p></div>`;
  }
}
