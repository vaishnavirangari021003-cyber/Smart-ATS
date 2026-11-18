/**
 * HireFlow Admin Users Controller (admin-users.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { api } from '../core/api.js';
import { storage } from '../lib/storage.js';
import { DB_KEY, mockHash, INITIAL_PASSWORD_HASH } from '../core/data.js';
import { showToast, confirmDialog, openModal, closeModal, renderAvatar, setLoading, renderSkeleton } from '../lib/ui.js';
import { escapeHTML } from '../lib/escape.js';
import { formatDate, relativeTime } from '../lib/dates.js';

let session = null;
let allUsers = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  session = guardPage(['admin']);
  if (!session) return;

  setupFilters();
  setupInviteModal();
  await loadUsers();
});

function setupFilters() {
  const search = document.getElementById('user-search-input');
  const roleFilter = document.getElementById('user-role-filter');

  const onFilter = () => {
    currentPage = 1;
    renderUsersTable();
  };

  search.addEventListener('input', onFilter);
  roleFilter.addEventListener('change', onFilter);
}

async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  renderSkeleton(tbody, 'row', 5);

  try {
    allUsers = await api.getUsers();
    renderUsersTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger" style="padding: 2rem;">Error: ${escapeHTML(err.message)}</td></tr>`;
  }
}

function getFilteredUsers() {
  const search = document.getElementById('user-search-input').value.trim().toLowerCase();
  const role = document.getElementById('user-role-filter').value;

  return allUsers.filter(u => {
    if (role && u.role !== role) return false;
    if (search && !u.name.toLowerCase().includes(search) && !u.email.toLowerCase().includes(search)) return false;
    return true;
  });
}

function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  const pagination = document.getElementById('users-pagination');
  const filtered = getFilteredUsers();

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 3rem;">No users found matching your filters.</td></tr>`;
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  tbody.innerHTML = pageItems.map(user => {
    const isSelf = user.id === session.userId;

    return `
      <tr>
        <td data-label="User">
          <div class="flex items-center gap-2">
            ${renderAvatar(user.name, 'sm')}
            <div>
              <div class="font-bold text-sm">
                ${escapeHTML(user.name)}
                ${isSelf ? '<span class="badge badge-default" style="font-size: 10px; margin-left: 4px;">You</span>' : ''}
              </div>
              <div class="text-xs text-muted">${escapeHTML(user.email)}</div>
            </div>
          </div>
        </td>
        <td data-label="Role">
          <select class="form-select form-select-sm" data-role-select data-id="${escapeHTML(user.id)}" style="min-height: 32px; width: 130px; font-size: 12px;" ${isSelf ? 'disabled title="You cannot change your own role"' : ''}>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
            <option value="hr" ${user.role === 'hr' ? 'selected' : ''}>HR Specialist</option>
            <option value="candidate" ${user.role === 'candidate' ? 'selected' : ''}>Candidate</option>
          </select>
        </td>
        <td data-label="Status">
          <span class="badge badge-${user.active ? 'success' : 'danger'}">
            ${user.active ? 'Active' : 'Deactivated'}
          </span>
        </td>
        <td data-label="Created Date">${formatDate(user.createdAt)}</td>
        <td data-label="Last Login">${user.lastLoginAt ? relativeTime(user.lastLoginAt) : 'Never'}</td>
        <td data-label="Actions" style="text-align: right;">
          <button type="button" class="btn ${user.active ? 'btn-danger-ghost' : 'btn-success'} btn-sm" data-toggle-active data-id="${escapeHTML(user.id)}" data-active="${user.active}" ${isSelf ? 'disabled title="Cannot deactivate yourself"' : ''}>
            ${user.active ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Attach role select change listeners
  tbody.querySelectorAll('[data-role-select]').forEach(sel => {
    sel.onchange = async () => {
      const userId = sel.getAttribute('data-id');
      const newRole = sel.value;
      try {
        await api.updateUserRole(userId, newRole);
        showToast(`User role updated to ${newRole.toUpperCase()}`, 'success');
        await loadUsers();
      } catch (err) {
        showToast(err.message, 'error');
        await loadUsers();
      }
    };
  });

  // Attach activate/deactivate listeners
  tbody.querySelectorAll('[data-toggle-active]').forEach(btn => {
    btn.onclick = async () => {
      const userId = btn.getAttribute('data-id');
      const currentActive = btn.getAttribute('data-active') === 'true';
      const targetActive = !currentActive;

      if (currentActive) {
        const confirmed = await confirmDialog({
          title: 'Deactivate User Account',
          message: 'Deactivating this user will revoke their session and prevent future logins.',
          confirmText: 'Deactivate',
          danger: true
        });
        if (!confirmed) return;
      }

      try {
        await api.toggleUserActive(userId, targetActive);
        showToast(`User ${targetActive ? 'activated' : 'deactivated'}.`, 'info');
        await loadUsers();
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
      renderUsersTable();
    };
  });
}

function setupInviteModal() {
  const openBtn = document.getElementById('btn-invite-user');
  const form = document.getElementById('invite-form');
  const submitBtn = document.getElementById('btn-submit-invite');

  openBtn.onclick = () => {
    form.reset();
    openModal('invite-modal');
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('invite-name').value.trim();
    const email = document.getElementById('invite-email').value.trim().toLowerCase();
    const role = document.getElementById('invite-role').value;

    const db = storage.get(DB_KEY);
    if (db.users.some(u => u.email.toLowerCase() === email)) {
      showToast('A user with this email already exists', 'error');
      return;
    }

    setLoading(submitBtn, true);

    const newUser = {
      id: `usr_${Date.now()}`,
      name,
      email,
      passwordHash: INITIAL_PASSWORD_HASH,
      role,
      companyId: 'comp_1',
      active: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    };

    db.users.push(newUser);

    // Mock notification email
    db.notifications.push({
      id: `notif_${Date.now()}`,
      type: 'invitation',
      toUserId: newUser.id,
      subject: `Welcome to HireFlow ATS - Acme Innovations`,
      body: `Hello ${name}, you have been invited as a ${role.toUpperCase()} on HireFlow. Your temporary password is: Demo@1234`,
      status: 'sent',
      attempts: 1,
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString()
    });

    storage.set(DB_KEY, db);

    showToast(`Invitation sent to ${email}!`, 'success');
    closeModal('invite-modal');
    setLoading(submitBtn, false);
    await loadUsers();
  };
}
