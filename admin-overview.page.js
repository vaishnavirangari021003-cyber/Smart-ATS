/**
 * HireFlow Admin Overview Controller (admin-overview.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { escapeHTML } from '../lib/escape.js';
import { relativeTime } from '../lib/dates.js';

document.addEventListener('DOMContentLoaded', async () => {
  const session = guardPage(['admin']);
  if (!session) return;

  await loadAdminMetrics();
});

async function loadAdminMetrics() {
  try {
    const [users, jobs, apps, notifs, activity] = await Promise.all([
      api.getUsers(),
      api.getJobs(),
      api.getApplications(),
      api.getNotifications(),
      api.getActivityLog()
    ]);

    // KPI: Users
    document.getElementById('kpi-users-count').textContent = users.length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const hrCount = users.filter(u => u.role === 'hr').length;
    const candCount = users.filter(u => u.role === 'candidate').length;
    document.getElementById('kpi-users-roles').textContent = `${adminCount} Admin • ${hrCount} HR • ${candCount} Candidate`;

    // KPI: Jobs
    document.getElementById('kpi-active-jobs').textContent = jobs.filter(j => j.status === 'published').length;

    // KPI: Applications
    document.getElementById('kpi-total-apps').textContent = apps.length;

    // KPI: Notification Failures
    const failedNotifs = notifs.filter(n => n.status === 'failed');
    document.getElementById('kpi-failed-notifs').textContent = failedNotifs.length;

    // System Activity Feed
    const feed = document.getElementById('admin-activity-feed');
    if (!activity || activity.length === 0) {
      feed.innerHTML = `<div class="text-sm text-muted">No system activities recorded yet.</div>`;
      return;
    }

    feed.innerHTML = activity.slice(0, 15).map(act => `
      <div class="timeline-item">
        <div class="timeline-point"></div>
        <div class="timeline-title">
          <strong>${escapeHTML(act.action)}</strong> (${escapeHTML(act.entityType)})
        </div>
        <div class="timeline-meta">${relativeTime(act.at)} • Actor: ${escapeHTML(act.actorId)}</div>
        ${act.meta ? `
          <div style="font-family: monospace; font-size: 11px; color: var(--text-muted); background: var(--surface-2); padding: 4px 8px; border-radius: 4px; margin-top: 4px;">
            ${escapeHTML(JSON.stringify(act.meta))}
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading admin overview metrics:', err);
  }
}
