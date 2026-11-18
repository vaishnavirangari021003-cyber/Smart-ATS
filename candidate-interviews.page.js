/**
 * HireFlow Candidate Interviews Controller (candidate-interviews.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { showToast, renderEmpty, renderSkeleton } from '../lib/ui.js';
import { escapeHTML } from '../lib/escape.js';
import { formatDate, formatTime } from '../lib/dates.js';

document.addEventListener('DOMContentLoaded', async () => {
  const session = guardPage(['candidate']);
  if (!session) return;

  await loadCandidateInterviews();
});

async function loadCandidateInterviews() {
  const container = document.getElementById('candidate-interviews-container');
  renderSkeleton(container, 'card', 3);

  try {
    const list = await api.getInterviews();

    if (list.length === 0) {
      renderEmpty(
        container,
        'No interviews scheduled',
        'When your recruiter schedules an interview, it will appear here along with meeting links and calendar options.'
      );
      return;
    }

    // Sort by startsAt ascending
    list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    container.innerHTML = `
      <div class="grid gap-4" style="grid-template-columns: 1fr;">
        ${list.map(int => {
          const isVideo = int.mode === 'Video';
          const isCompleted = int.status === 'completed';
          const isCancelled = int.status === 'cancelled';

          return `
            <div class="card" style="border-left: 4px solid var(--${isCompleted ? 'success' : (isCancelled ? 'danger' : 'primary')});">
              <div class="flex justify-between items-center" style="margin-bottom: var(--space-2); flex-wrap: wrap;">
                <div class="flex items-center gap-2">
                  <span class="badge badge-primary">${escapeHTML(int.mode)}</span>
                  <span class="badge badge-${isCompleted ? 'success' : (isCancelled ? 'danger' : 'default')}">
                    ${escapeHTML(int.status)}
                  </span>
                </div>
                <span class="text-xs text-muted font-semibold">${int.durationMin} minutes</span>
              </div>

              <h2 style="font-size: var(--font-size-md); margin-bottom: var(--space-2);">${escapeHTML(int.title)}</h2>

              <div class="job-card-meta" style="margin-bottom: var(--space-4);">
                <span class="job-card-meta-item">
                  📅 <strong>${formatDate(int.startsAt)}</strong> at <strong>${formatTime(int.startsAt)}</strong>
                </span>
                <span class="job-card-meta-item">
                  📍 ${escapeHTML(int.location || 'Online / Remote')}
                </span>
              </div>

              <div class="flex gap-2" style="flex-wrap: wrap;">
                ${isVideo && int.location && int.location.startsWith('http') && !isCancelled ? `
                  <a href="${escapeHTML(int.location)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
                    Join Video Conference
                  </a>
                ` : ''}
                ${!isCancelled ? `
                  <button type="button" class="btn btn-secondary btn-sm" data-action="download-ics" data-id="${escapeHTML(int.id)}">
                    📅 Add to Calendar (.ics)
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Attach ICS download handlers
    container.querySelectorAll('[data-action="download-ics"]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const ev = list.find(item => item.id === id);
        if (ev) downloadICS(ev);
      };
    });
  } catch (err) {
    container.innerHTML = `<div class="error-state"><p>${escapeHTML(err.message)}</p></div>`;
  }
}

/**
 * Generate and trigger download of .ics iCalendar file
 * @param {Object} ev 
 */
function downloadICS(ev) {
  const start = new Date(ev.startsAt);
  const end = new Date(start.getTime() + (ev.durationMin || 45) * 60 * 1000);

  const formatICSDate = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HireFlow//Smart ATS//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:hireflow-${ev.id}@example.com`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${ev.title}`,
    `DESCRIPTION:HireFlow Interview for ${ev.title}. Mode: ${ev.mode}`,
    `LOCATION:${ev.location || 'Online'}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Interview-${ev.title.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Calendar (.ics) downloaded!', 'success');
}
