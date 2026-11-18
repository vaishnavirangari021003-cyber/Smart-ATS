/**
 * HireFlow HR Jobs Controller (hr-jobs.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { showToast, confirmDialog, openModal, closeModal, setLoading, renderSkeleton } from '../lib/ui.js';
import { escapeHTML } from '../lib/escape.js';
import { formatDate, formatDateInput } from '../lib/dates.js';

let allJobs = [];
let allApplications = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const session = guardPage(['hr', 'admin']);
  if (!session) return;

  setupToolbars();
  setupJobModal();
  await loadData();
});

function setupToolbars() {
  const searchInput = document.getElementById('jobs-search-input');
  const statusFilter = document.getElementById('jobs-status-filter');
  const deptFilter = document.getElementById('jobs-dept-filter');

  const onFilterChange = () => {
    currentPage = 1;
    renderJobsTable();
  };

  searchInput.addEventListener('input', onFilterChange);
  statusFilter.addEventListener('change', onFilterChange);
  deptFilter.addEventListener('change', onFilterChange);

  document.getElementById('btn-create-job').onclick = () => {
    openJobFormModal(null);
  };
}

async function loadData() {
  const tbody = document.getElementById('hr-jobs-table-body');
  renderSkeleton(tbody, 'row', 5);

  try {
    const [jobs, apps] = await Promise.all([
      api.getJobs(),
      api.getApplications()
    ]);
    allJobs = jobs;
    allApplications = apps;
    renderJobsTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding: 2rem;">Error: ${escapeHTML(err.message)}</td></tr>`;
  }
}

function getFilteredJobs() {
  const q = document.getElementById('jobs-search-input').value.trim().toLowerCase();
  const status = document.getElementById('jobs-status-filter').value;
  const dept = document.getElementById('jobs-dept-filter').value;

  return allJobs.filter(j => {
    if (q && !j.title.toLowerCase().includes(q) && !j.department.toLowerCase().includes(q)) return false;
    if (status && j.status !== status) return false;
    if (dept && j.department !== dept) return false;
    return true;
  });
}

function renderJobsTable() {
  const tbody = document.getElementById('hr-jobs-table-body');
  const pagination = document.getElementById('hr-jobs-pagination');

  const filtered = getFilteredJobs();

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 3rem;">No jobs match your filter criteria.</td></tr>`;
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  tbody.innerHTML = pageItems.map(job => {
    const appCount = allApplications.filter(a => a.jobId === job.id).length;
    const isClosed = job.status === 'closed' || (job.closesAt && new Date(job.closesAt) < new Date());

    return `
      <tr>
        <td data-label="Job Title">
          <div class="font-bold text-sm">${escapeHTML(job.title)}</div>
          <div class="text-xs text-muted">${escapeHTML(job.type)} • ${escapeHTML(job.experience)} yrs</div>
        </td>
        <td data-label="Department">${escapeHTML(job.department)}</td>
        <td data-label="Status">
          <span class="badge badge-${job.status === 'published' ? 'success' : (job.status === 'draft' ? 'warning' : 'default')}">
            ${escapeHTML(job.status)}
          </span>
        </td>
        <td data-label="Applicants">
          <a href="pipeline.html?jobId=${encodeURIComponent(job.id)}" class="font-bold" title="Open in pipeline">
            ${appCount} candidate${appCount === 1 ? '' : 's'}
          </a>
        </td>
        <td data-label="Posted Date">${formatDate(job.postedAt)}</td>
        <td data-label="Closing Date">${job.closesAt ? formatDate(job.closesAt) : 'Ongoing'}</td>
        <td data-label="Actions" style="text-align: right;">
          <div class="flex gap-1 justify-end" style="justify-content: flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="${escapeHTML(job.id)}">Edit</button>
            <button type="button" class="btn btn-secondary btn-sm" data-action="duplicate" data-id="${escapeHTML(job.id)}" title="Duplicate Job">Copy</button>
            ${job.status === 'published' ? `
              <button type="button" class="btn btn-danger-ghost btn-sm" data-action="close" data-id="${escapeHTML(job.id)}">Close</button>
            ` : (job.status === 'draft' || job.status === 'closed' ? `
              <button type="button" class="btn btn-success btn-sm" data-action="publish" data-id="${escapeHTML(job.id)}">Publish</button>
            ` : '')}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach row actions
  tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.onclick = () => {
      const job = allJobs.find(j => j.id === btn.getAttribute('data-id'));
      if (job) openJobFormModal(job);
    };
  });

  tbody.querySelectorAll('[data-action="duplicate"]').forEach(btn => {
    btn.onclick = async () => {
      try {
        await api.duplicateJob(btn.getAttribute('data-id'));
        showToast('Job duplicated successfully as draft.', 'success');
        await loadData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });

  tbody.querySelectorAll('[data-action="close"]').forEach(btn => {
    btn.onclick = async () => {
      const confirmed = await confirmDialog({
        title: 'Close Job Position',
        message: 'Are you sure you want to close applications for this job? Candidates will no longer be able to submit new applications.',
        confirmText: 'Close Position',
        danger: true
      });
      if (confirmed) {
        await api.updateJob(btn.getAttribute('data-id'), { status: 'closed' });
        showToast('Job closed.', 'info');
        await loadData();
      }
    };
  });

  tbody.querySelectorAll('[data-action="publish"]').forEach(btn => {
    btn.onclick = async () => {
      await api.updateJob(btn.getAttribute('data-id'), { status: 'published' });
      showToast('Job published to career board!', 'success');
      await loadData();
    };
  });

  // Render pagination
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('hr-jobs-pagination');
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button type="button" class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>
    `;
  }
  pagination.innerHTML = html;

  pagination.querySelectorAll('[data-page]').forEach(btn => {
    btn.onclick = () => {
      currentPage = Number(btn.getAttribute('data-page'));
      renderJobsTable();
    };
  });
}

function openJobFormModal(job = null) {
  const modal = document.getElementById('job-modal');
  const title = document.getElementById('modal-job-title');
  const form = document.getElementById('job-form');

  form.reset();

  if (job) {
    title.textContent = 'Edit Job Posting';
    document.getElementById('job-form-id').value = job.id;
    document.getElementById('job-title-input').value = job.title;
    document.getElementById('job-dept-input').value = job.department;
    document.getElementById('job-location-input').value = job.location;
    document.getElementById('job-type-input').value = job.type;
    document.getElementById('job-exp-input').value = job.experience;
    document.getElementById('job-salmin-input').value = job.salaryMin;
    document.getElementById('job-salmax-input').value = job.salaryMax;
    document.getElementById('job-closes-input').value = formatDateInput(job.closesAt);
    document.getElementById('job-desc-input').value = job.description;
    document.getElementById('job-reqs-input').value = job.requirements.join('\n');
    document.getElementById('job-skills-input').value = job.skills.join(', ');
  } else {
    title.textContent = 'Create Job Posting';
    document.getElementById('job-form-id').value = '';
    // default closes in 30 days
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    document.getElementById('job-closes-input').value = formatDateInput(nextMonth);
  }

  openModal('job-modal');
}

function setupJobModal() {
  const form = document.getElementById('job-form');
  const saveBtn = document.getElementById('btn-save-job');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const jobId = document.getElementById('job-form-id').value;
    const title = document.getElementById('job-title-input').value.trim();
    const dept = document.getElementById('job-dept-input').value;
    const location = document.getElementById('job-location-input').value.trim();
    const type = document.getElementById('job-type-input').value;
    const exp = document.getElementById('job-exp-input').value;
    const salMin = Number(document.getElementById('job-salmin-input').value);
    const salMax = Number(document.getElementById('job-salmax-input').value);
    const closesAt = document.getElementById('job-closes-input').value;
    const desc = document.getElementById('job-desc-input').value.trim();
    const reqsRaw = document.getElementById('job-reqs-input').value.trim();
    const skillsRaw = document.getElementById('job-skills-input').value.trim();

    // Validation
    if (title.length < 5 || title.length > 100) {
      showToast('Title must be between 5 and 100 characters', 'error');
      return;
    }
    if (salMin > salMax) {
      showToast('Minimum salary cannot exceed maximum salary', 'error');
      return;
    }
    if (new Date(closesAt).getTime() <= Date.now()) {
      showToast('Closing date must be in the future', 'error');
      return;
    }
    const requirements = reqsRaw.split('\n').map(r => r.trim()).filter(Boolean);
    if (requirements.length === 0) {
      showToast('At least one requirement item is required', 'error');
      return;
    }

    const skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);

    setLoading(saveBtn, true);

    const payload = {
      title,
      department: dept,
      location,
      type,
      experience: exp,
      salaryMin: salMin,
      salaryMax: salMax,
      closesAt: new Date(closesAt).toISOString(),
      description: desc,
      requirements,
      skills,
      status: 'published'
    };

    try {
      if (jobId) {
        await api.updateJob(jobId, payload);
        showToast('Job updated successfully!', 'success');
      } else {
        await api.createJob(payload);
        showToast('New job posted successfully!', 'success');
      }
      closeModal('job-modal');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(saveBtn, false);
    }
  };
}
