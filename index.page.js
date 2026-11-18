/**
 * HireFlow Landing & Job Search Page Controller (index.page.js)
 */

import { api } from '../core/api.js';
import { auth } from '../core/auth.js';
import { initDemoBanner, setupThemeToggle, renderSkeleton, renderEmpty } from '../lib/ui.js';
import { escapeHTML } from '../lib/escape.js';
import { relativeTime } from '../lib/dates.js';

const ITEMS_PER_PAGE = 9;
let allJobs = [];
let currentPage = 1;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initDemoBanner();
  setupThemeToggle();
  checkAuthNav();
  initFilterBindings();
  readFiltersFromURL();
  await loadJobs();
});

function checkAuthNav() {
  const session = auth.getSession();
  const navContainer = document.getElementById('auth-nav-buttons');
  if (session && navContainer) {
    const dashboardLink = session.role === 'admin' 
      ? 'admin/overview.html' 
      : (session.role === 'hr' ? 'hr/dashboard.html' : 'candidate/dashboard.html');
    
    navContainer.innerHTML = `
      <a href="${dashboardLink}" class="btn btn-primary btn-sm">Go to Dashboard</a>
    `;
  }
}

function initFilterBindings() {
  const heroForm = document.getElementById('hero-search-form');
  const sortSelect = document.getElementById('sort-select');
  const depSelect = document.getElementById('filter-department');
  const typeSelect = document.getElementById('filter-type');
  const expSelect = document.getElementById('filter-experience');
  const salarySlider = document.getElementById('filter-salary');
  const salaryDisplay = document.getElementById('salary-val-display');
  const clearBtn = document.getElementById('btn-clear-filters');

  salarySlider.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    salaryDisplay.textContent = val > 0 ? `$${val.toLocaleString()}+` : '$0';
  });

  const triggerSearch = () => {
    currentPage = 1;
    updateURL();
    renderJobList();
  };

  heroForm.addEventListener('submit', (e) => {
    e.preventDefault();
    triggerSearch();
    document.getElementById('jobs').scrollIntoView({ behavior: 'smooth' });
  });

  sortSelect.addEventListener('change', triggerSearch);
  depSelect.addEventListener('change', triggerSearch);
  typeSelect.addEventListener('change', triggerSearch);
  expSelect.addEventListener('change', triggerSearch);
  salarySlider.addEventListener('change', triggerSearch);

  clearBtn.addEventListener('click', () => {
    document.getElementById('hero-keywords').value = '';
    document.getElementById('hero-location').value = '';
    depSelect.value = '';
    typeSelect.value = '';
    expSelect.value = '';
    salarySlider.value = 0;
    salaryDisplay.textContent = '$0';
    sortSelect.value = 'newest';
    triggerSearch();
  });
}

function readFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('q')) document.getElementById('hero-keywords').value = params.get('q');
  if (params.has('loc')) document.getElementById('hero-location').value = params.get('loc');
  if (params.has('dept')) document.getElementById('filter-department').value = params.get('dept');
  if (params.has('type')) document.getElementById('filter-type').value = params.get('type');
  if (params.has('exp')) document.getElementById('filter-experience').value = params.get('exp');
  if (params.has('sort')) document.getElementById('sort-select').value = params.get('sort');
  if (params.has('salary')) {
    const sVal = params.get('salary');
    document.getElementById('filter-salary').value = sVal;
    document.getElementById('salary-val-display').textContent = Number(sVal) > 0 ? `$${Number(sVal).toLocaleString()}+` : '$0';
  }
  if (params.has('page')) currentPage = Math.max(1, parseInt(params.get('page'), 10) || 1);
}

function updateURL() {
  const params = new URLSearchParams();
  const q = document.getElementById('hero-keywords').value.trim();
  const loc = document.getElementById('hero-location').value.trim();
  const dept = document.getElementById('filter-department').value;
  const type = document.getElementById('filter-type').value;
  const exp = document.getElementById('filter-experience').value;
  const salary = document.getElementById('filter-salary').value;
  const sort = document.getElementById('sort-select').value;

  if (q) params.set('q', q);
  if (loc) params.set('loc', loc);
  if (dept) params.set('dept', dept);
  if (type) params.set('type', type);
  if (exp) params.set('exp', exp);
  if (Number(salary) > 0) params.set('salary', salary);
  if (sort && sort !== 'newest') params.set('sort', sort);
  if (currentPage > 1) params.set('page', currentPage);

  const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
  window.history.replaceState({}, '', newUrl);
}

async function loadJobs() {
  const container = document.getElementById('job-cards-list');
  renderSkeleton(container, 'card', 6);

  try {
    allJobs = await api.getJobs();
    document.getElementById('stat-open-jobs').textContent = `${allJobs.length}+`;
    renderJobList();
  } catch (err) {
    container.innerHTML = `<div class="error-state"><p>${escapeHTML(err.message)}</p></div>`;
  }
}

function getFilteredJobs() {
  const q = document.getElementById('hero-keywords').value.trim().toLowerCase();
  const loc = document.getElementById('hero-location').value.trim().toLowerCase();
  const dept = document.getElementById('filter-department').value;
  const type = document.getElementById('filter-type').value;
  const exp = document.getElementById('filter-experience').value;
  const salary = Number(document.getElementById('filter-salary').value);
  const sortBy = document.getElementById('sort-select').value;

  let list = allJobs.filter(job => {
    if (q) {
      const matchTitle = job.title.toLowerCase().includes(q);
      const matchDesc = job.description.toLowerCase().includes(q);
      const matchSkills = job.skills.some(s => s.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchSkills) return false;
    }
    if (loc && !job.location.toLowerCase().includes(loc)) return false;
    if (dept && job.department !== dept) return false;
    if (type && job.type !== type) return false;
    if (exp && job.experience !== exp) return false;
    if (salary > 0 && job.salaryMax < salary) return false;
    return true;
  });

  if (sortBy === 'salary') {
    list.sort((a, b) => b.salaryMax - a.salaryMax);
  } else {
    list.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }

  return list;
}

function renderJobList() {
  const container = document.getElementById('job-cards-list');
  const countText = document.getElementById('results-count-text');
  const pagination = document.getElementById('jobs-pagination');

  const filtered = getFilteredJobs();
  countText.textContent = `Showing ${filtered.length} open position${filtered.length === 1 ? '' : 's'}`;

  if (filtered.length === 0) {
    renderEmpty(
      container,
      'No jobs match your filters',
      'Try broadening your search keywords, location or salary preferences.',
      `<button type="button" class="btn btn-secondary btn-sm" id="btn-empty-clear">Clear all filters</button>`
    );
    const emptyClear = document.getElementById('btn-empty-clear');
    if (emptyClear) {
      emptyClear.onclick = () => document.getElementById('btn-clear-filters').click();
    }
    pagination.innerHTML = '';
    return;
  }

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageJobs = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  container.innerHTML = pageJobs.map(job => `
    <a href="job-details.html?id=${encodeURIComponent(job.id)}" class="job-card" aria-label="View job: ${escapeHTML(job.title)}">
      <div class="flex justify-between items-center" style="gap: var(--space-2); flex-wrap: wrap;">
        <h3 class="job-card-title">${escapeHTML(job.title)}</h3>
        <span class="job-card-salary">$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()} / yr</span>
      </div>
      <div class="job-card-meta">
        <span class="job-card-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
          ${escapeHTML(job.department)}
        </span>
        <span class="job-card-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          ${escapeHTML(job.location)}
        </span>
        <span class="job-card-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          ${escapeHTML(job.type)} • ${escapeHTML(job.experience)} yrs exp
        </span>
        <span class="job-card-meta-item" style="margin-left: auto;">
          Posted ${relativeTime(job.postedAt)}
        </span>
      </div>
      <p class="text-sm text-muted" style="margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
        ${escapeHTML(job.description)}
      </p>
      <div class="flex gap-2" style="flex-wrap: wrap; margin-top: var(--space-2);">
        ${job.skills.slice(0, 4).map(skill => `<span class="badge badge-default">${escapeHTML(skill)}</span>`).join('')}
        ${job.skills.length > 4 ? `<span class="badge badge-default">+${job.skills.length - 4} more</span>` : ''}
      </div>
    </a>
  `).join('');

  // Render pagination controls
  renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
  const pagination = document.getElementById('jobs-pagination');
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '';
  html += `
    <button type="button" class="page-btn" id="page-prev" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous Page">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button type="button" class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}" aria-label="Page ${i}" ${i === currentPage ? 'aria-current="page"' : ''}>
        ${i}
      </button>
    `;
  }

  html += `
    <button type="button" class="page-btn" id="page-next" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next Page">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </button>
  `;

  pagination.innerHTML = html;

  const prevBtn = pagination.querySelector('#page-prev');
  const nextBtn = pagination.querySelector('#page-next');
  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        updateURL();
        renderJobList();
        document.getElementById('jobs').scrollIntoView({ behavior: 'smooth' });
      }
    };
  }
  if (nextBtn) {
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        updateURL();
        renderJobList();
        document.getElementById('jobs').scrollIntoView({ behavior: 'smooth' });
      }
    };
  }

  pagination.querySelectorAll('[data-page]').forEach(btn => {
    btn.onclick = () => {
      currentPage = Number(btn.getAttribute('data-page'));
      updateURL();
      renderJobList();
      document.getElementById('jobs').scrollIntoView({ behavior: 'smooth' });
    };
  });
}
