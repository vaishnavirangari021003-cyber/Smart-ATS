/**
 * HireFlow HR Offers & Onboarding Controller (hr-offers.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { showToast, confirmDialog, openModal, closeModal, setLoading, renderSkeleton } from '../lib/ui.js';
import { escapeHTML } from '../lib/escape.js';
import { formatDate, formatDateInput } from '../lib/dates.js';

let allOffers = [];
let allApplications = [];
let offerTemplate = null;

document.addEventListener('DOMContentLoaded', async () => {
  const session = guardPage(['hr', 'admin']);
  if (!session) return;

  setupTabs();
  setupOfferModal();
  await loadData();

  // If URL has ?appId=, auto-open offer modal
  const params = new URLSearchParams(window.location.search);
  const targetAppId = params.get('appId');
  if (targetAppId) {
    setTimeout(() => {
      document.getElementById('btn-create-offer').click();
      document.getElementById('offer-app-select').value = targetAppId;
      document.getElementById('offer-app-select').dispatchEvent(new Event('change'));
    }, 300);
  }
});

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(btn.getAttribute('data-tab'));
      if (targetPanel) targetPanel.classList.add('active');
    };
  });
}

async function loadData() {
  const tbody = document.getElementById('offers-table-body');
  renderSkeleton(tbody, 'row', 4);

  try {
    const [offers, apps, templates] = await Promise.all([
      api.getOffers(),
      api.getApplications(),
      api.getOfferTemplates()
    ]);
    allOffers = offers;
    allApplications = apps;
    offerTemplate = templates[0] || null;

    if (offerTemplate) {
      document.getElementById('template-body-preview').textContent = offerTemplate.body;
    }

    populateOfferAppSelect();
    renderOffersTable();
    renderOnboardingChecklists();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding: 2rem;">Error: ${escapeHTML(err.message)}</td></tr>`;
  }
}

function populateOfferAppSelect() {
  const select = document.getElementById('offer-app-select');
  select.innerHTML = `<option value="">Select candidate application...</option>`;

  // Filter applications that are Selected, Interview or without existing offer
  const eligible = allApplications.filter(a => !['Rejected', 'Withdrawn'].includes(a.stage));
  eligible.forEach(app => {
    const opt = document.createElement('option');
    opt.value = app.id;
    opt.textContent = `${app.candidateName} — ${app.jobTitle} (${app.stage})`;
    select.appendChild(opt);
  });
}

function renderOffersTable() {
  const tbody = document.getElementById('offers-table-body');
  if (allOffers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 3rem;">No offers generated yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = allOffers.map(offer => {
    const isAccepted = offer.status === 'accepted';

    return `
      <tr>
        <td data-label="Candidate">
          <div class="font-bold text-sm">${escapeHTML(offer.candidateName)}</div>
        </td>
        <td data-label="Position">${escapeHTML(offer.jobTitle)}</td>
        <td data-label="Annual Salary" class="font-bold text-success">$${offer.salary.toLocaleString()}</td>
        <td data-label="Start Date">${formatDate(offer.startDate)}</td>
        <td data-label="Status">
          <span class="badge badge-${offer.status === 'accepted' ? 'success' : (offer.status === 'declined' ? 'danger' : 'warning')}">
            ${escapeHTML(offer.status)}
          </span>
        </td>
        <td data-label="Issued Date">${offer.issuedAt ? formatDate(offer.issuedAt) : 'Draft'}</td>
        <td data-label="Action" style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-sm" data-action="view-letter" data-id="${escapeHTML(offer.id)}">
            View & Print PDF
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-action="view-letter"]').forEach(btn => {
    btn.onclick = () => openPrintOfferModal(btn.getAttribute('data-id'));
  });
}

function renderOnboardingChecklists() {
  const container = document.getElementById('onboarding-cards-container');
  const acceptedOffers = allOffers.filter(o => o.status === 'accepted');

  if (acceptedOffers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">No Active Onboardings</div>
        <p class="empty-state-text">When a candidate accepts an offer, their automated onboarding task checklist will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = acceptedOffers.map(offer => {
    const tasks = offer.tasks || [];
    const completedCount = tasks.filter(t => t.done).length;
    const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    return `
      <div class="card" style="border-left: 4px solid var(--success);">
        <div class="flex justify-between items-center" style="margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-2);">
          <div>
            <span class="badge badge-success" style="margin-bottom: 4px;">Offer Accepted</span>
            <h3 style="font-size: var(--font-size-md); margin-bottom: 2px;">${escapeHTML(offer.candidateName)} — ${escapeHTML(offer.jobTitle)}</h3>
            <span class="text-xs text-muted">Target Start Date: <strong>${formatDate(offer.startDate)}</strong></span>
          </div>
          <div style="text-align: right;">
            <div class="text-xs font-bold text-muted">Onboarding Progress: ${completedCount} / ${tasks.length} tasks</div>
            <div style="background: var(--surface-2); width: 140px; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 4px;">
              <div style="background: var(--success); width: ${progressPct}%; height: 100%;"></div>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4);">
          ${tasks.map(task => `
            <label class="form-check" style="background: var(--surface-2); padding: 8px 12px; border-radius: var(--radius-sm); margin: 0; align-items: center;">
              <input type="checkbox" class="form-check-input" data-task-id="${escapeHTML(task.id)}" ${task.done ? 'checked' : ''}>
              <span class="form-check-label text-sm" style="${task.done ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
                ${escapeHTML(task.title)} <small class="text-muted">(${escapeHTML(task.owner.toUpperCase())} • Due: ${formatDate(task.dueDate)})</small>
              </span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Attach task toggle checkboxes
  container.querySelectorAll('input[data-task-id]').forEach(cb => {
    cb.onchange = async () => {
      const taskId = cb.getAttribute('data-task-id');
      await api.toggleOnboardingTask(taskId, cb.checked);
      showToast('Onboarding task updated', 'info');
      await loadData();
    };
  });
}

function setupOfferModal() {
  const modal = document.getElementById('offer-modal');
  const createBtn = document.getElementById('btn-create-offer');
  const appSelect = document.getElementById('offer-app-select');
  const salaryInput = document.getElementById('offer-salary-input');
  const dateInput = document.getElementById('offer-start-date');
  const preview = document.getElementById('offer-live-preview');
  const form = document.getElementById('offer-form');
  const submitBtn = document.getElementById('btn-submit-offer');

  createBtn.onclick = () => {
    form.reset();
    const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    dateInput.value = formatDateInput(inTwoWeeks);
    salaryInput.value = 130000;
    updateOfferPreview();
    openModal('offer-modal');
  };

  const updateOfferPreview = () => {
    const appId = appSelect.value;
    const salary = Number(salaryInput.value) || 0;
    const startDate = dateInput.value;

    if (!appId || !offerTemplate) {
      preview.textContent = 'Select a candidate application to render preview.';
      return;
    }

    const app = allApplications.find(a => a.id === appId);
    if (!app) return;

    const rendered = offerTemplate.body
      .replace('{{candidate_name}}', app.candidateName)
      .replace(/{{job_title}}/g, app.jobTitle)
      .replace(/{{company_name}}/g, 'Acme Innovations')
      .replace('{{salary}}', salary.toLocaleString())
      .replace('{{start_date}}', startDate || 'TBD')
      .replace('{{hr_name}}', 'Elena Rostova');

    preview.textContent = rendered;
  };

  appSelect.onchange = updateOfferPreview;
  salaryInput.oninput = updateOfferPreview;
  dateInput.onchange = updateOfferPreview;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const appId = appSelect.value;
    const salary = Number(salaryInput.value);
    const startDate = dateInput.value;
    const status = document.getElementById('offer-status-select').value;

    if (!appId) {
      showToast('Please select candidate application', 'error');
      return;
    }
    if (!salary || salary <= 0) {
      showToast('Please provide a valid annual salary', 'error');
      return;
    }
    if (!startDate) {
      showToast('Please specify a start date', 'error');
      return;
    }

    const app = allApplications.find(a => a.id === appId);
    const renderedBody = offerTemplate.body
      .replace('{{candidate_name}}', app ? app.candidateName : 'Candidate')
      .replace(/{{job_title}}/g, app ? app.jobTitle : 'Role')
      .replace(/{{company_name}}/g, 'Acme Innovations')
      .replace('{{salary}}', salary.toLocaleString())
      .replace('{{start_date}}', startDate)
      .replace('{{hr_name}}', 'Elena Rostova');

    setLoading(submitBtn, true);

    try {
      await api.createOffer({
        applicationId: appId,
        templateId: offerTemplate.id,
        salary,
        startDate: new Date(startDate).toISOString(),
        status,
        renderedBody
      });

      showToast('Job offer created successfully!', 'success');
      closeModal('offer-modal');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(submitBtn, false);
    }
  };

  document.getElementById('btn-print-doc').onclick = () => {
    window.print();
  };
}

function openPrintOfferModal(offerId) {
  const offer = allOffers.find(o => o.id === offerId);
  if (!offer) return;

  const bodyEl = document.getElementById('print-offer-body');
  bodyEl.innerHTML = `
    <div class="print-letterhead">
      <div>
        <h1 style="font-size: 24px; font-weight: 800; margin: 0; color: #111827;">ACME INNOVATIONS</h1>
        <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Official Offer of Employment • Confidential</div>
      </div>
      <div style="text-align: right; font-size: 11px; color: #6B7280;">
        <div>Date: ${formatDate(offer.issuedAt || new Date())}</div>
        <div>Ref: ${offer.id.toUpperCase()}</div>
      </div>
    </div>

    <div style="font-size: 14px; line-height: 1.8; color: #1F2937; white-space: pre-line; margin-bottom: 2rem;">
      ${escapeHTML(offer.renderedBody)}
    </div>

    <div class="print-signature-section">
      <div class="signature-block">
        <div style="font-weight: 700; color: #111827; margin-bottom: 2px;">Elena Rostova</div>
        <div>Director of Talent Acquisition, Acme Innovations</div>
      </div>
      <div class="signature-block">
        <div style="font-weight: 700; color: #111827; margin-bottom: 2px;">${escapeHTML(offer.candidateName)}</div>
        <div>Candidate Signature & Acceptance</div>
      </div>
    </div>
  `;

  openModal('print-offer-modal');
}
