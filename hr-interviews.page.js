/**
 * HireFlow HR Interviews Controller (hr-interviews.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { InterviewCalendar } from '../lib/calendar.js';
import { showToast, confirmDialog, openModal, closeModal, openDrawer, closeDrawer, setLoading } from '../lib/ui.js';
import { escapeHTML } from '../lib/escape.js';
import { formatDate, formatTime, formatDateInput } from '../lib/dates.js';

let calendar = null;
let allInterviews = [];
let allApplications = [];
let activeInterviewInDrawer = null;

document.addEventListener('DOMContentLoaded', async () => {
  const session = guardPage(['hr', 'admin']);
  if (!session) return;

  setupModalHandlers();
  await loadInterviews();
});

async function loadInterviews() {
  try {
    const [interviews, apps] = await Promise.all([
      api.getInterviews(),
      api.getApplications()
    ]);
    allInterviews = interviews;
    allApplications = apps;

    populateApplicantSelect();

    const mount = document.getElementById('calendar-view-mount');
    if (!calendar) {
      calendar = new InterviewCalendar(mount, {
        events: allInterviews,
        defaultView: 'month',
        onEventClick: (ev) => openInterviewDetails(ev)
      });
    } else {
      calendar.setEvents(allInterviews);
    }
  } catch (err) {
    showToast(`Error loading interviews: ${err.message}`, 'error');
  }
}

function populateApplicantSelect() {
  const select = document.getElementById('int-app-select');
  select.innerHTML = `<option value="">Select an active applicant...</option>`;

  // Filter applications that are not rejected or withdrawn
  const activeApps = allApplications.filter(a => !['Rejected', 'Withdrawn'].includes(a.stage));
  activeApps.forEach(app => {
    const opt = document.createElement('option');
    opt.value = app.id;
    opt.textContent = `${app.candidateName} — ${app.jobTitle} (${app.stage})`;
    select.appendChild(opt);
  });
}

function setupModalHandlers() {
  const openBtn = document.getElementById('btn-open-schedule-modal');
  const form = document.getElementById('schedule-form');
  const submitBtn = document.getElementById('btn-submit-interview');

  openBtn.onclick = () => {
    form.reset();
    document.getElementById('interview-edit-id').value = '';
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    document.getElementById('int-date').value = formatDateInput(tomorrow);
    openModal('schedule-modal');
  };

  form.onsubmit = async (e) => {
    e.preventDefault();

    const appId = document.getElementById('int-app-select').value;
    const title = document.getElementById('int-title').value.trim();
    const date = document.getElementById('int-date').value;
    const time = document.getElementById('int-time').value;
    const durationMin = Number(document.getElementById('int-duration').value);
    const mode = document.getElementById('int-mode').value;
    const location = document.getElementById('int-location').value.trim();

    const participants = Array.from(document.querySelectorAll('input[name="int-participant"]:checked')).map(cb => cb.value);

    if (!appId) {
      showToast('Please select a candidate application', 'error');
      return;
    }
    if (!date || !time) {
      showToast('Please choose date and time', 'error');
      return;
    }

    const startsAt = new Date(`${date}T${time}`).toISOString();
    if (new Date(startsAt).getTime() <= Date.now()) {
      showToast('Interview must be scheduled in the future', 'error');
      return;
    }

    setLoading(submitBtn, true);

    try {
      await api.scheduleInterview({
        applicationId: appId,
        title,
        startsAt,
        durationMin,
        mode,
        location,
        participants
      });

      showToast('Interview scheduled successfully!', 'success');
      closeModal('schedule-modal');
      await loadInterviews();
    } catch (err) {
      showToast(err.message, 'error', 5000);
    } finally {
      setLoading(submitBtn, false);
    }
  };
}

function openInterviewDetails(ev) {
  activeInterviewInDrawer = ev;
  const drawerTitle = document.getElementById('drawer-int-title');
  const content = document.getElementById('drawer-int-content');

  drawerTitle.textContent = ev.title;
  openDrawer('interview-detail-drawer');

  const hasFeedback = ev.feedback && ev.feedback.length > 0;

  content.innerHTML = `
    <div style="border-bottom: 1px solid var(--border); padding-bottom: var(--space-4); margin-bottom: var(--space-4);">
      <div class="flex justify-between items-center" style="margin-bottom: var(--space-2);">
        <span class="badge badge-primary">${escapeHTML(ev.mode)}</span>
        <span class="badge badge-${ev.status === 'completed' ? 'success' : (ev.status === 'cancelled' ? 'danger' : 'default')}">
          ${escapeHTML(ev.status)}
        </span>
      </div>
      <div class="font-bold text-sm" style="margin-bottom: 2px;">${escapeHTML(ev.candidateName || 'Candidate')}</div>
      <div class="text-xs text-muted" style="margin-bottom: var(--space-3);">${escapeHTML(ev.jobTitle || 'Job')}</div>
      <div class="text-xs text-muted">
        📅 <strong>${formatDate(ev.startsAt)}</strong> at <strong>${formatTime(ev.startsAt)}</strong> (${ev.durationMin} mins)
      </div>
      <div class="text-xs text-muted" style="margin-top: 4px;">
        📍 ${ev.location && ev.location.startsWith('http') ? `<a href="${escapeHTML(ev.location)}" target="_blank" rel="noopener">Join Link: ${escapeHTML(ev.location)}</a>` : escapeHTML(ev.location || 'Online')}
      </div>
    </div>

    <!-- Quick Status Change Actions -->
    <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-6); flex-wrap: wrap;">
      ${ev.status === 'scheduled' ? `
        <button type="button" class="btn btn-success btn-sm" id="btn-mark-completed">✓ Mark Completed</button>
        <button type="button" class="btn btn-danger-ghost btn-sm" id="btn-mark-cancelled">✕ Cancel Interview</button>
      ` : ''}
    </div>

    <!-- Existing Feedback Section -->
    ${hasFeedback ? `
      <div style="margin-bottom: var(--space-6);">
        <h4 style="font-size: var(--font-size-sm); margin-bottom: var(--space-3);">Evaluation Feedback</h4>
        ${ev.feedback.map(fb => `
          <div style="background: var(--surface-2); padding: var(--space-3); border-radius: var(--radius-md); margin-bottom: var(--space-2);">
            <div class="flex justify-between items-center" style="margin-bottom: 4px;">
              <span class="badge badge-success">${escapeHTML(fb.recommendation)}</span>
              <span style="color: var(--warning); font-size: 13px;">${'★'.repeat(fb.rating)}</span>
            </div>
            <p class="text-sm" style="margin: 0; color: var(--text);">${escapeHTML(fb.comments)}</p>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Submit Feedback Form (if completed or scheduled) -->
    ${ev.status === 'completed' && !hasFeedback ? `
      <div style="border-top: 1px solid var(--border); padding-top: var(--space-4);">
        <h4 style="font-size: var(--font-size-sm); margin-bottom: var(--space-3);">Submit Candidate Evaluation</h4>
        <form id="evaluation-form">
          <div class="form-group">
            <label class="form-label" for="fb-rating">Rating (1 to 5 Stars)</label>
            <select id="fb-rating" class="form-select">
              <option value="5">★★★★★ - Exceptional (5)</option>
              <option value="4" selected>★★★★☆ - Strong (4)</option>
              <option value="3">★★★☆☆ - Average (3)</option>
              <option value="2">★★☆☆☆ - Below Bar (2)</option>
              <option value="1">★☆☆☆☆ - Reject (1)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="fb-recommendation">Recommendation</label>
            <select id="fb-recommendation" class="form-select">
              <option value="Strong yes">Strong Yes</option>
              <option value="Yes" selected>Yes</option>
              <option value="No">No</option>
              <option value="Strong no">Strong No</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="fb-comments">Evaluation Notes</label>
            <textarea id="fb-comments" class="form-control" placeholder="Provide notes on technical architecture, coding problem solving, and cultural alignment..." required></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-sm w-full">Save Feedback</button>
        </form>
      </div>
    ` : ''}
  `;

  // Attach button actions
  const completedBtn = document.getElementById('btn-mark-completed');
  if (completedBtn) {
    completedBtn.onclick = async () => {
      await api.updateInterviewStatus(ev.id, 'completed');
      showToast('Interview marked as completed. You can now submit evaluation feedback.', 'success');
      await loadInterviews();
      const updated = allInterviews.find(i => i.id === ev.id);
      if (updated) openInterviewDetails(updated);
    };
  }

  const cancelledBtn = document.getElementById('btn-mark-cancelled');
  if (cancelledBtn) {
    cancelledBtn.onclick = async () => {
      const confirmed = await confirmDialog({
        title: 'Cancel Interview',
        message: 'Are you sure you want to cancel this interview session? The candidate and participants will be notified.',
        confirmText: 'Cancel Session',
        danger: true
      });
      if (confirmed) {
        await api.updateInterviewStatus(ev.id, 'cancelled');
        showToast('Interview cancelled.', 'info');
        await loadInterviews();
        closeDrawer('interview-detail-drawer');
      }
    };
  }

  const fbForm = document.getElementById('evaluation-form');
  if (fbForm) {
    fbForm.onsubmit = async (e) => {
      e.preventDefault();
      const rating = document.getElementById('fb-rating').value;
      const recommendation = document.getElementById('fb-recommendation').value;
      const comments = document.getElementById('fb-comments').value.trim();

      if (!comments) {
        showToast('Please enter evaluation comments', 'error');
        return;
      }

      await api.submitInterviewFeedback({
        interviewId: ev.id,
        rating,
        recommendation,
        comments
      });

      showToast('Interview evaluation saved!', 'success');
      await loadInterviews();
      const updated = allInterviews.find(i => i.id === ev.id);
      if (updated) openInterviewDetails(updated);
    };
  }
}
