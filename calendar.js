/**
 * HireFlow Calendar Component (calendar.js)
 * Clean, lightweight vanilla JS calendar supporting Month, Week, and List views.
 */

import { escapeHTML } from './escape.js';
import { formatDate, formatTime } from './dates.js';

export class InterviewCalendar {
  /**
   * @param {HTMLElement} container 
   * @param {Object} options 
   */
  constructor(container, options = {}) {
    this.container = container;
    this.events = options.events || [];
    this.currentDate = new Date();
    this.viewMode = options.defaultView || 'month'; // 'month' | 'week' | 'list'
    this.onEventClick = options.onEventClick || null;
    this.onDateClick = options.onDateClick || null;
    this.render();
  }

  setEvents(events) {
    this.events = events || [];
    this.render();
  }

  next() {
    if (this.viewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    } else if (this.viewMode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
    }
    this.render();
  }

  prev() {
    if (this.viewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    } else if (this.viewMode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
    }
    this.render();
  }

  today() {
    this.currentDate = new Date();
    this.render();
  }

  setView(mode) {
    this.viewMode = mode;
    this.render();
  }

  render() {
    if (!this.container) return;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentMonthLabel = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

    let contentHtml = '';
    if (this.viewMode === 'month') {
      contentHtml = this.renderMonthView();
    } else if (this.viewMode === 'week') {
      contentHtml = this.renderWeekView();
    } else {
      contentHtml = this.renderListView();
    }

    this.container.innerHTML = `
      <div class="calendar-container">
        <div class="calendar-header">
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <h2 style="font-size: var(--font-size-md); margin: 0;">${currentMonthLabel}</h2>
            <div style="display: flex; gap: 4px;">
              <button type="button" class="btn btn-secondary btn-sm" id="cal-prev" aria-label="Previous">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button type="button" class="btn btn-secondary btn-sm" id="cal-today">Today</button>
              <button type="button" class="btn btn-secondary btn-sm" id="cal-next" aria-label="Next">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
          <div style="display: flex; gap: 4px;">
            <button type="button" class="btn btn-sm ${this.viewMode === 'month' ? 'btn-primary' : 'btn-secondary'}" data-view="month">Month</button>
            <button type="button" class="btn btn-sm ${this.viewMode === 'week' ? 'btn-primary' : 'btn-secondary'}" data-view="week">Week</button>
            <button type="button" class="btn btn-sm ${this.viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}" data-view="list">List</button>
          </div>
        </div>
        ${contentHtml}
      </div>
    `;

    // Attach control listeners
    this.container.querySelector('#cal-prev').onclick = () => this.prev();
    this.container.querySelector('#cal-next').onclick = () => this.next();
    this.container.querySelector('#cal-today').onclick = () => this.today();

    this.container.querySelectorAll('[data-view]').forEach(btn => {
      btn.onclick = () => this.setView(btn.getAttribute('data-view'));
    });

    // Attach event chip click listeners
    this.container.querySelectorAll('.calendar-event-chip, [data-event-id]').forEach(chip => {
      chip.onclick = (e) => {
        e.stopPropagation();
        const eventId = chip.getAttribute('data-event-id');
        const ev = this.events.find(item => String(item.id) === String(eventId));
        if (ev && this.onEventClick) {
          this.onEventClick(ev);
        }
      };
    });
  }

  renderMonthView() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let cellsHtml = '';

    // Day headers
    const headersHtml = daysOfWeek.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

    // Previous month filler days
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      cellsHtml += `<div class="calendar-cell other-month"><div class="calendar-cell-date">${dayNum}</div></div>`;
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;

      // Find events matching this day
      const dayEvents = this.events.filter(ev => {
        if (!ev.startsAt) return false;
        const d = new Date(ev.startsAt);
        const evDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return evDateStr === dateStr;
      });

      const chipsHtml = dayEvents.map(ev => `
        <span class="calendar-event-chip ${escapeHTML(ev.status || 'scheduled')}" data-event-id="${escapeHTML(ev.id)}" title="${escapeHTML(ev.title)} - ${formatTime(ev.startsAt)}">
          ${formatTime(ev.startsAt)} ${escapeHTML(ev.title)}
        </span>
      `).join('');

      cellsHtml += `
        <div class="calendar-cell ${isToday ? 'is-today' : ''}" data-date="${dateStr}">
          <div class="calendar-cell-date">${day}</div>
          ${chipsHtml}
        </div>
      `;
    }

    // Next month filler
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remaining = totalCells - (firstDay + daysInMonth);
    for (let i = 1; i <= remaining; i++) {
      cellsHtml += `<div class="calendar-cell other-month"><div class="calendar-cell-date">${i}</div></div>`;
    }

    return `
      <div class="calendar-month-grid">
        ${headersHtml}
        ${cellsHtml}
      </div>
    `;
  }

  renderWeekView() {
    const startOfWeek = new Date(this.currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      weekDays.push(d);
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); border-top: 1px solid var(--border);">
        ${weekDays.map(date => {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const dayEvents = this.events.filter(ev => {
            const d = new Date(ev.startsAt);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dateStr;
          });

          return `
            <div style="border-right: 1px solid var(--border); padding: 8px; min-height: 280px; background: var(--surface);">
              <div style="font-size: 12px; font-weight: 700; border-bottom: 1px solid var(--border); padding-bottom: 4px; margin-bottom: 8px;">
                ${formatDate(date, { weekday: 'short', month: 'numeric', day: 'numeric' })}
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${dayEvents.map(ev => `
                  <div class="calendar-event-chip ${escapeHTML(ev.status || 'scheduled')}" data-event-id="${escapeHTML(ev.id)}" style="padding: 6px;">
                    <div style="font-weight: 700;">${formatTime(ev.startsAt)}</div>
                    <div>${escapeHTML(ev.title)}</div>
                    <div style="font-size: 10px; opacity: 0.85;">${escapeHTML(ev.mode)}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderListView() {
    if (!this.events || this.events.length === 0) {
      return `<div class="empty-state" style="padding: 3rem;"><p class="text-muted">No scheduled interviews found.</p></div>`;
    }

    const sorted = [...this.events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    return `
      <div style="padding: var(--space-4);">
        <table class="table">
          <thead>
            <tr>
              <th>Interview Title</th>
              <th>Date & Time</th>
              <th>Mode</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(ev => `
              <tr>
                <td class="font-semibold">${escapeHTML(ev.title)}</td>
                <td>${formatDate(ev.startsAt)} at ${formatTime(ev.startsAt)}</td>
                <td><span class="badge badge-default">${escapeHTML(ev.mode)}</span></td>
                <td>${ev.durationMin} mins</td>
                <td><span class="badge badge-${ev.status === 'completed' ? 'success' : (ev.status === 'cancelled' ? 'danger' : 'primary')}">${escapeHTML(ev.status)}</span></td>
                <td>
                  <button type="button" class="btn btn-secondary btn-sm" data-event-id="${escapeHTML(ev.id)}">Details</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}
