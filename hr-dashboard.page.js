/**
 * HireFlow HR Dashboard Controller (hr-dashboard.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { renderFunnelChart } from '../lib/charts.js';
import { escapeHTML } from '../lib/escape.js';
import { formatDate, relativeTime, daysBetween } from '../lib/dates.js';

document.addEventListener('DOMContentLoaded', async () => {
  const session = guardPage(['hr', 'admin']);
  if (!session) return;

  await loadDashboardMetrics();
});

async function loadDashboardMetrics() {
  try {
    const [jobs, apps, interviews, offers, activity] = await Promise.all([
      api.getJobs(),
      api.getApplications(),
      api.getInterviews(),
      api.getOffers(),
      api.getActivityLog()
    ]);

    // 1. KPI Cards
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const openJobs = jobs.filter(j => j.status === 'published');
    const newAppsThisWeek = apps.filter(a => new Date(a.appliedAt) >= oneWeekAgo);
    const interviewsThisWeek = interviews.filter(i => {
      const d = new Date(i.startsAt);
      return d >= oneWeekAgo && d <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) && i.status !== 'cancelled';
    });
    const pendingOffers = offers.filter(o => ['draft', 'issued'].includes(o.status));

    document.getElementById('kpi-open-jobs').textContent = openJobs.length;
    document.getElementById('kpi-new-apps').textContent = newAppsThisWeek.length;
    document.getElementById('kpi-interviews-week').textContent = interviewsThisWeek.length;
    document.getElementById('kpi-pending-offers').textContent = pendingOffers.length;

    // 2. Stale Candidates (Needs Attention > 7 days in active stage)
    const staleApps = apps.filter(a => {
      if (['Rejected', 'Withdrawn'].includes(a.stage)) return false;
      const days = daysBetween(a.updatedAt, now);
      return days >= 7;
    }).sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

    const staleListEl = document.getElementById('stale-candidates-list');
    document.getElementById('badge-stale-count').textContent = staleApps.length;

    if (staleApps.length === 0) {
      staleListEl.innerHTML = `<div class="text-sm text-muted" style="padding: 1rem 0;">All active candidates have been updated recently. Great job!</div>`;
    } else {
      staleListEl.innerHTML = staleApps.slice(0, 5).map(app => {
        const daysStuck = daysBetween(app.updatedAt, now);
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) 0; border-bottom: 1px solid var(--border);">
            <div>
              <div class="font-bold text-sm">${escapeHTML(app.candidateName)}</div>
              <div class="text-xs text-muted">${escapeHTML(app.jobTitle)} • <span class="badge badge-stage-${app.stage.toLowerCase()}">${escapeHTML(app.stage)}</span></div>
            </div>
            <div style="text-align: right;">
              <span class="days-in-stage-badge stale">${daysStuck} days stuck</span>
              <div>
                <a href="pipeline.html?appId=${encodeURIComponent(app.id)}" class="text-xs font-semibold" style="margin-top: 2px; display: inline-block;">Take Action →</a>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 3. Mini Funnel Chart
    const funnelContainer = document.getElementById('dashboard-funnel-chart');
    const stages = ['Applied', 'Screening', 'Interview', 'Selected', 'Offered'];
    const funnelData = stages.map(stage => ({
      stage,
      count: apps.filter(a => a.stage === stage).length
    }));
    renderFunnelChart(funnelContainer, funnelData);

    // 4. Recent Activity Feed
    const activityContainer = document.getElementById('recent-activity-list');
    if (!activity || activity.length === 0) {
      activityContainer.innerHTML = `<div class="text-sm text-muted">No recent activities logged.</div>`;
    } else {
      activityContainer.innerHTML = activity.slice(0, 8).map(act => `
        <div class="timeline-item">
          <div class="timeline-point"></div>
          <div class="timeline-title">
            ${escapeHTML(act.meta?.candidateName || 'Candidate')} moved to <strong>${escapeHTML(act.meta?.toStage || act.meta?.stage || 'next stage')}</strong>
          </div>
          <div class="timeline-meta">
            ${escapeHTML(act.meta?.jobTitle || 'Job')} • ${relativeTime(act.at)}
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading HR dashboard metrics:', err);
  }
}
