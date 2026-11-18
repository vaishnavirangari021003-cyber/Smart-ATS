/**
 * HireFlow Recruitment Analytics Controller (hr-analytics.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { renderLineChart, renderFunnelChart, renderHorizontalBarChart, renderDonutChart } from '../lib/charts.js';
import { formatDate } from '../lib/dates.js';

let allJobs = [];
let allApplications = [];
let allOffers = [];
let allNotifs = [];
let selectedDays = 90; // default 90 days

document.addEventListener('DOMContentLoaded', async () => {
  const session = guardPage(['hr', 'admin']);
  if (!session) return;

  setupFilters();
  await loadAnalyticsData();
});

function setupFilters() {
  const rangeBtns = document.querySelectorAll('[data-range]');
  const jobSelect = document.getElementById('analytics-job-select');

  rangeBtns.forEach(btn => {
    btn.onclick = () => {
      rangeBtns.forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-ghost');
      });
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-primary');

      const val = btn.getAttribute('data-range');
      selectedDays = val === 'all' ? 365 : Number(val);
      calculateAndRender();
    };
  });

  jobSelect.onchange = () => calculateAndRender();
}

async function loadAnalyticsData() {
  try {
    const [jobs, apps, offers, notifs] = await Promise.all([
      api.getJobs(),
      api.getApplications(),
      api.getOffers(),
      api.getNotifications()
    ]);
    allJobs = jobs;
    allApplications = apps;
    allOffers = offers;
    allNotifs = notifs;

    // Populate jobs select
    const jobSelect = document.getElementById('analytics-job-select');
    jobSelect.innerHTML = `<option value="">All Job Openings (${jobs.length})</option>`;
    jobs.forEach(j => {
      const opt = document.createElement('option');
      opt.value = j.id;
      opt.textContent = `${j.title} (${j.department})`;
      jobSelect.appendChild(opt);
    });

    calculateAndRender();
  } catch (err) {
    console.error('Error loading analytics data:', err);
  }
}

function calculateAndRender() {
  const now = new Date();
  const cutoffTime = now.getTime() - selectedDays * 24 * 60 * 60 * 1000;
  const selectedJobId = document.getElementById('analytics-job-select').value;

  // Filter applications by date window and job
  const apps = allApplications.filter(a => {
    const appTime = new Date(a.appliedAt).getTime();
    if (appTime < cutoffTime) return false;
    if (selectedJobId && a.jobId !== selectedJobId) return false;
    return true;
  });

  // 1. Time-to-hire calculation
  let totalTTH = 0;
  let tthCount = 0;
  let excludedCount = 0;

  allOffers.forEach(o => {
    if (o.status === 'accepted' && o.respondedAt) {
      const app = allApplications.find(a => a.id === o.applicationId);
      if (app && (!selectedJobId || app.jobId === selectedJobId)) {
        if (app.appliedAt) {
          const days = Math.round((new Date(o.respondedAt) - new Date(app.appliedAt)) / (1000 * 60 * 60 * 24));
          if (days >= 0 && days <= 180) {
            totalTTH += days;
            tthCount++;
          } else {
            excludedCount++;
          }
        } else {
          excludedCount++;
        }
      }
    }
  });

  const avgTTH = tthCount > 0 ? (totalTTH / tthCount).toFixed(1) : 'N/A';
  document.getElementById('kpi-tth').textContent = avgTTH;
  document.getElementById('stat-excluded-tth').textContent = excludedCount;

  // 2. Offer Acceptance Rate
  const relevantOffers = allOffers.filter(o => {
    const app = allApplications.find(a => a.id === o.applicationId);
    return !selectedJobId || (app && app.jobId === selectedJobId);
  });
  const respondedOffers = relevantOffers.filter(o => ['accepted', 'declined'].includes(o.status));
  const acceptedOffers = relevantOffers.filter(o => o.status === 'accepted');
  const acceptanceRate = respondedOffers.length > 0 
    ? `${Math.round((acceptedOffers.length / respondedOffers.length) * 100)}%` 
    : 'N/A';
  document.getElementById('kpi-offer-acc').textContent = acceptanceRate;

  // 3. Total Apps
  document.getElementById('kpi-total-apps').textContent = apps.length;

  // 4. Mock notification rate
  const totalNotifs = allNotifs.length;
  const sentNotifs = allNotifs.filter(n => n.status === 'sent').length;
  const notifRate = totalNotifs > 0 ? `${Math.round((sentNotifs / totalNotifs) * 100)}%` : 'N/A';
  document.getElementById('kpi-notif-rate').textContent = notifRate;

  // -------------------------------------------------------------
  // Chart 1: Applications Over Time (Line Chart)
  // -------------------------------------------------------------
  const lineData = [];
  const intervals = 6;
  const stepMs = (selectedDays * 24 * 60 * 60 * 1000) / intervals;

  for (let i = 0; i < intervals; i++) {
    const startWindow = new Date(cutoffTime + i * stepMs);
    const endWindow = new Date(cutoffTime + (i + 1) * stepMs);
    const count = apps.filter(a => {
      const t = new Date(a.appliedAt).getTime();
      return t >= startWindow.getTime() && t < endWindow.getTime();
    }).length;

    lineData.push({
      label: formatDate(startWindow, { month: 'numeric', day: 'numeric' }),
      count
    });
  }
  renderLineChart(document.getElementById('chart-area-inflow'), lineData);

  // -------------------------------------------------------------
  // Chart 2: Pipeline Funnel with Conversion %
  // -------------------------------------------------------------
  const funnelStages = ['Applied', 'Screening', 'Interview', 'Selected', 'Offered'];
  const funnelData = funnelStages.map(stage => {
    // Cohort count: candidates who reached at least this stage
    let count = 0;
    if (stage === 'Applied') count = apps.length;
    else if (stage === 'Screening') count = apps.filter(a => ['Screening', 'Interview', 'Selected', 'Offered'].includes(a.stage)).length;
    else if (stage === 'Interview') count = apps.filter(a => ['Interview', 'Selected', 'Offered'].includes(a.stage)).length;
    else if (stage === 'Selected') count = apps.filter(a => ['Selected', 'Offered'].includes(a.stage)).length;
    else if (stage === 'Offered') count = apps.filter(a => a.stage === 'Offered').length;
    return { stage, count };
  });
  renderFunnelChart(document.getElementById('chart-funnel-stages'), funnelData);

  // -------------------------------------------------------------
  // Chart 3: Top Roles by Applications (Horizontal Bars)
  // -------------------------------------------------------------
  const jobCounts = {};
  apps.forEach(a => {
    jobCounts[a.jobTitle] = (jobCounts[a.jobTitle] || 0) + 1;
  });
  const barData = Object.entries(jobCounts)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
  renderHorizontalBarChart(document.getElementById('chart-bar-jobs'), barData);

  // -------------------------------------------------------------
  // Chart 4: Department Breakdown (Donut Chart)
  // -------------------------------------------------------------
  const deptCounts = {};
  apps.forEach(a => {
    const dept = a.jobDepartment || 'Other';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const donutData = Object.entries(deptCounts).map(([label, count]) => ({ label, count }));
  renderDonutChart(document.getElementById('chart-donut-depts'), donutData);
}
