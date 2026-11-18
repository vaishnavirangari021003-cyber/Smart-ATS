/**
 * HireFlow Data Visualization Engine (charts.js)
 * High-performance, pure vanilla SVG/Canvas visualizations.
 * Includes interactive tooltips and accessible screen-reader data table alternatives.
 */

import { escapeHTML } from './escape.js';

/**
 * Render Area / Line Chart for Applications Over Time
 * @param {HTMLElement} container 
 * @param {Array<{ label: string, count: number }>} data 
 */
export function renderLineChart(container, data = []) {
  if (!container) return;
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 2rem;"><p class="text-muted">No application data for this period.</p></div>`;
    return;
  }

  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => d.count), 5);
  const xStep = graphWidth / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = padding.left + i * xStep;
    const y = padding.top + graphHeight - (d.count / maxVal) * graphHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(padding.top + graphHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padding.top + graphHeight).toFixed(1)} Z`;

  let svg = `
    <div style="position: relative; width: 100%;">
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block;" role="img" aria-label="Applications over time trend line chart">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4F46E5" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#4F46E5" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <!-- Horizontal Grid lines -->
        ${[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = padding.top + graphHeight * (1 - pct);
          const val = Math.round(maxVal * pct);
          return `
            <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--border)" stroke-dasharray="3 3"/>
            <text x="${padding.left - 8}" y="${y + 4}" font-size="11" fill="var(--text-muted)" text-anchor="end">${val}</text>
          `;
        }).join('')}
        
        <!-- Fill Area -->
        <path d="${areaD}" fill="url(#lineGrad)"/>
        
        <!-- Stroke Line -->
        <path d="${pathD}" fill="none" stroke="#4F46E5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        
        <!-- Data Dots -->
        ${points.map(p => `
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#FFFFFF" stroke="#4F46E5" stroke-width="2" class="chart-point" data-label="${escapeHTML(p.label)}" data-val="${p.count}">
            <title>${escapeHTML(p.label)}: ${p.count} applications</title>
          </circle>
          <text x="${p.x.toFixed(1)}" y="${height - 12}" font-size="11" fill="var(--text-muted)" text-anchor="middle">${escapeHTML(p.label)}</text>
        `).join('')}
      </svg>
      <details style="margin-top: 8px;">
        <summary style="font-size: 11px; color: var(--text-muted); cursor: pointer;">Show data table</summary>
        <table class="table" style="font-size: 12px; margin-top: 6px;">
          <thead><tr><th>Period</th><th>Applications</th></tr></thead>
          <tbody>
            ${data.map(d => `<tr><td>${escapeHTML(d.label)}</td><td>${d.count}</td></tr>`).join('')}
          </tbody>
        </table>
      </details>
    </div>
  `;

  container.innerHTML = svg;
}

/**
 * Render Stage Funnel Chart with Conversion Rates
 * @param {HTMLElement} container 
 * @param {Array<{ stage: string, count: number, conversionRate?: number }>} funnelData 
 */
export function renderFunnelChart(container, funnelData = []) {
  if (!container) return;
  if (!funnelData || funnelData.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 2rem;"><p class="text-muted">No funnel data available.</p></div>`;
    return;
  }

  const maxCount = Math.max(...funnelData.map(d => d.count), 1);
  const colors = {
    'Applied': '#64748B',
    'Screening': '#0284C7',
    'Interview': '#7C3AED',
    'Selected': '#16A34A',
    'Offered': '#D97706'
  };

  let html = `
    <div class="funnel-container" style="display: flex; flex-direction: column; gap: 12px;">
      ${funnelData.map((stage, idx) => {
        const widthPct = Math.max(Math.round((stage.count / maxCount) * 100), 12);
        const color = colors[stage.stage] || '#4F46E5';
        const prev = funnelData[idx - 1];
        let convText = '';
        if (prev && prev.count > 0) {
          const conv = Math.round((stage.count / prev.count) * 100);
          convText = `<span style="font-size: 11px; color: var(--text-muted); margin-left: auto;">${conv}% conversion</span>`;
        }

        return `
          <div class="funnel-row" style="display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600;">
              <span>${escapeHTML(stage.stage)} (${stage.count})</span>
              ${convText}
            </div>
            <div style="background: var(--surface-2); border-radius: var(--radius-sm); height: 26px; overflow: hidden; width: 100%;">
              <div style="background-color: ${color}; width: ${widthPct}%; height: 100%; border-radius: var(--radius-sm); transition: width 0.6s ease; display: flex; align-items: center; padding: 0 8px; color: #ffffff; font-size: 11px; font-weight: 700;">
                ${stage.count}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Render Horizontal Bar Chart for Applications by Job
 * @param {HTMLElement} container 
 * @param {Array<{ title: string, count: number }>} data 
 */
export function renderHorizontalBarChart(container, data = []) {
  if (!container) return;
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 2rem;"><p class="text-muted">No data available.</p></div>`;
    return;
  }

  const maxVal = Math.max(...data.map(d => d.count), 1);

  let html = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${data.slice(0, 6).map(item => {
        const pct = Math.max(Math.round((item.count / maxVal) * 100), 8);
        return `
          <div style="display: flex; flex-direction: column; gap: 3px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 500;">
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;" title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</span>
              <span class="font-bold">${item.count}</span>
            </div>
            <div style="background: var(--surface-2); height: 12px; border-radius: var(--radius-sm); overflow: hidden;">
              <div style="width: ${pct}%; background: var(--primary); height: 100%; border-radius: var(--radius-sm);"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Render Donut Chart for Source or Department breakdown
 * @param {HTMLElement} container 
 * @param {Array<{ label: string, count: number }>} data 
 */
export function renderDonutChart(container, data = []) {
  if (!container) return;
  const total = data.reduce((acc, curr) => acc + curr.count, 0);
  if (!data || data.length === 0 || total === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 2rem;"><p class="text-muted">No distribution data.</p></div>`;
    return;
  }

  const colors = ['#4F46E5', '#0284C7', '#16A34A', '#D97706', '#7C3AED', '#EC4899'];
  const size = 180;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = 0;
  const segments = data.map((d, i) => {
    const fraction = d.count / total;
    const strokeDasharray = `${(fraction * circumference).toFixed(2)} ${circumference.toFixed(2)}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += fraction;
    return {
      label: d.label,
      count: d.count,
      pct: Math.round(fraction * 100),
      color: colors[i % colors.length],
      strokeDasharray,
      strokeDashoffset: strokeDashoffset.toFixed(2)
    };
  });

  let html = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);" role="img" aria-label="Breakdown donut chart">
          ${segments.map(s => `
            <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"
              fill="transparent"
              stroke="${s.color}"
              stroke-width="${strokeWidth}"
              stroke-dasharray="${s.strokeDasharray}"
              stroke-dashoffset="${s.strokeDashoffset}">
              <title>${escapeHTML(s.label)}: ${s.count} (${s.pct}%)</title>
            </circle>
          `).join('')}
        </svg>
        <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
          <span style="font-size: 20px; font-weight: 800; font-family: var(--font-heading);">${total}</span>
          <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Total</span>
        </div>
      </div>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; font-size: 11px;">
        ${segments.map(s => `
          <div style="display: flex; align-items: center; gap: 5px;">
            <span style="width: 10px; height: 10px; border-radius: 2px; background: ${s.color};"></span>
            <span>${escapeHTML(s.label)} (${s.pct}%)</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
}
