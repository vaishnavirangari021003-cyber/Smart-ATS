/**
 * HireFlow Admin Notifications Controller (admin-notifications.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { showToast, openModal, closeModal, renderSkeleton } from '../lib/ui.js';
import { escapeHTML } from '../lib/escape.js';
import { formatDate, formatDateTime, relativeTime } from '../lib/dates.js';

let allNotifs = [];
let allUsers = [];
let activeFilter = 'all';
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const session = guardPage(['admin']);
  if (!session) return;

  setupFilterTabs();
  await loadNotifications();
});

function setupFilterTabs() {
  document.querySelectorAll('[data-status-filter]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-status-filter]').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-ghost');
      });
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-primary');

      activeFilter = btn.getAttribute('data-status-filter');
      currentPage = 1;
      renderTable();
    };
  });
}

async function loadNotifications() {
  const tbody = document.getElementById('notifications-table-body');
  renderSkeleton(tbody, 'row', 5);

  try {
    const [notifs, users] = await Promise.all([
      api.getNotifications(),
      api.getUsers()
    ]);
    allNotifs = notifs.reverse(); // newest first
    allUsers = users;

    const failed = allNotifs.filter(n => n.status === 'failed');
    const sent = allNotifs.filter(n => n.status === 'sent');

    document.getElementById('count-all-notifs').textContent = allNotifs.length;
    document.getElementById('count-failed-notifs').textContent = failed.length;
    document.getElementById('count-sent-notifs').textContent = sent.length;

    renderTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger" style="padding: 2rem;">Error: ${escapeHTML(err.message)}</td></tr>`;
  }
}

function getFilteredNotifs() {
  if (activeFilter === 'failed') {
    return allNotifs.filter(n => n.status === 'failed');
  }
  if (activeFilter === 'sent') {
    return allNotifs.filter(n => n.status === 'sent');
  }
  return allNotifs;
}

function renderTable() {
  const tbody = document.getElementById('notifications-table-body');
  const pagination = document.getElementById('notifications-pagination');
  const filtered = getFilteredNotifs();

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 3rem;">No notifications in this filter view.</td></tr>`;
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  tbody.innerHTML = pageItems.map(notif => {
    const user = allUsers.find(u => u.id === notif.toUserId);
    const recipientText = user ? `${user.name} (${user.email})` : notif.toUserId;
    const isFailed = notif.status === 'failed';

    return `
      <tr>
        <td data-label="Recipient">
          <div class="font-bold text-sm">${escapeHTML(recipientText)}</div>
        </td>
        <td data-label="Subject">
          <span class="text-sm font-semibold">${escapeHTML(notif.subject)}</span>
        </td>
        <td data-label="Status">
          <span class="badge badge-${isFailed ? 'danger' : 'success'}">
            ${escapeHTML(notif.status)}
          </span>
        </td>
        <td data-label="Attempts">${notif.attempts || 1} / 3</td>
        <td data-label="Created Date">${relativeTime(notif.createdAt)}</td>
        <td data-label="Action" style="text-align: right;">
          <div class="flex gap-2 justify-end" style="justify-content: flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" data-action="view" data-id="${escapeHTML(notif.id)}">
              View Body
            </button>
            ${isFailed ? `
              <button type="button" class="btn btn-primary btn-sm" data-action="retry" data-id="${escapeHTML(notif.id)}">
                Retry Delivery
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach button events
  tbody.querySelectorAll('[data-action="view"]').forEach(btn => {
    btn.onclick = () => {
      const notif = allNotifs.find(n => n.id === btn.getAttribute('data-id'));
      if (notif) openNotifModal(notif);
    };
  });

  tbody.querySelectorAll('[data-action="retry"]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      try {
        await api.retryNotification(id);
        showToast('Simulated email retry succeeded! Marked as delivered.', 'success');
        await loadNotifications();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });

  // Pagination
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" class="page-btn ${i === currentPage ? 'active' : ''}" data-p="${i}">${i}</button>`;
  }
  pagination.innerHTML = html;
  pagination.querySelectorAll('[data-p]').forEach(btn => {
    btn.onclick = () => {
      currentPage = Number(btn.getAttribute('data-p'));
      renderTable();
    };
  });
}

function openNotifModal(notif) {
  const user = allUsers.find(u => u.id === notif.toUserId);
  const recipient = user ? `${user.name} <${user.email}>` : notif.toUserId;

  document.getElementById('modal-notif-sub').textContent = notif.subject;
  document.getElementById('view-notif-to').textContent = recipient;
  document.getElementById('view-notif-status').innerHTML = `<span class="badge badge-${notif.status === 'sent' ? 'success' : 'danger'}">${escapeHTML(notif.status)}</span> (Attempts: ${notif.attempts || 1})`;
  document.getElementById('view-notif-date').textContent = formatDateTime(notif.sentAt || notif.createdAt);
  document.getElementById('view-notif-body').textContent = notif.body;

  openModal('notif-modal');
}
