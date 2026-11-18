/**
 * HireFlow Admin Settings Controller (admin-settings.page.js)
 */

import { guardPage } from '../core/router-guard.js';
import { storage } from '../lib/storage.js';
import { DB_KEY, resetDemoData } from '../core/data.js';
import { showToast, confirmDialog, setLoading } from '../lib/ui.js';

let db = null;

document.addEventListener('DOMContentLoaded', () => {
  const session = guardPage(['admin']);
  if (!session) return;

  loadSettings();
  setupCompanyForm();
  setupTemplateForm();
  setupDataButtons();
});

function loadSettings() {
  db = storage.get(DB_KEY);
  if (!db) return;

  const comp = db.companies[0] || {};
  document.getElementById('comp-name').value = comp.name || '';
  document.getElementById('comp-industry').value = comp.industry || '';
  document.getElementById('comp-website').value = comp.website || '';

  const tmpl = db.offerTemplates[0] || {};
  document.getElementById('template-body-input').value = tmpl.body || '';
}

function setupCompanyForm() {
  const form = document.getElementById('company-profile-form');
  const btn = document.getElementById('btn-save-company');

  form.onsubmit = (e) => {
    e.preventDefault();
    setLoading(btn, true);

    const name = document.getElementById('comp-name').value.trim();
    const industry = document.getElementById('comp-industry').value.trim();
    const website = document.getElementById('comp-website').value.trim();

    if (!name) {
      showToast('Company name is required', 'error');
      setLoading(btn, false);
      return;
    }

    db = storage.get(DB_KEY);
    if (!db.companies[0]) {
      db.companies[0] = { id: 'comp_1' };
    }
    db.companies[0].name = name;
    db.companies[0].industry = industry;
    db.companies[0].website = website;

    storage.set(DB_KEY, db);
    setLoading(btn, false);
    showToast('Organization profile saved!', 'success');
  };
}

function setupTemplateForm() {
  const form = document.getElementById('template-editor-form');
  const btn = document.getElementById('btn-save-template');

  form.onsubmit = (e) => {
    e.preventDefault();
    setLoading(btn, true);

    const body = document.getElementById('template-body-input').value.trim();
    if (!body) {
      showToast('Template body cannot be empty', 'error');
      setLoading(btn, false);
      return;
    }

    db = storage.get(DB_KEY);
    if (!db.offerTemplates[0]) {
      db.offerTemplates[0] = { id: 'tmpl_standard', name: 'Standard Full-Time Offer' };
    }
    db.offerTemplates[0].body = body;

    storage.set(DB_KEY, db);
    setLoading(btn, false);
    showToast('Offer letter template updated!', 'success');
  };
}

function setupDataButtons() {
  // Export JSON Database
  document.getElementById('btn-export-json').onclick = () => {
    db = storage.get(DB_KEY);
    const jsonStr = JSON.stringify(db, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hireflow_db_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('JSON database export downloaded!', 'success');
  };

  // Reset Demo Data
  document.getElementById('btn-reset-data').onclick = async () => {
    const confirmed = await confirmDialog({
      title: 'Reset Demo Data to Initial Seed',
      message: 'Are you sure? This will overwrite any new jobs, mock interviews, or applications created and restore the original 70 applications and seed profiles.',
      confirmText: 'Reset Demo Database',
      danger: true
    });

    if (confirmed) {
      resetDemoData();
      showToast('Demo data restored to initial seed. Reloading...', 'success', 2000);
      setTimeout(() => {
        window.location.reload();
      }, 700);
    }
  };
}
