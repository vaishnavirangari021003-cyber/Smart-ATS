/**
 * HireFlow Recruitment Pipeline Rules Engine (pipeline.js)
 * Enforces stage transition validation, forward movement guards, terminal states,
 * and immutable audit logging.
 */

import { storage } from '../lib/storage.js';
import { DB_KEY } from './data.js';

export const PIPELINE_STAGES = [
  'Applied',
  'Screening',
  'Interview',
  'Selected',
  'Offered',
  'Rejected',
  'Withdrawn'
];

export const STAGE_CONFIG = {
  Applied: { label: 'Applied', color: 'var(--stage-applied)', bg: 'var(--stage-applied-bg)' },
  Screening: { label: 'Screening', color: 'var(--stage-screening)', bg: 'var(--stage-screening-bg)' },
  Interview: { label: 'Interview', color: 'var(--stage-interview)', bg: 'var(--stage-interview-bg)' },
  Selected: { label: 'Selected', color: 'var(--stage-selected)', bg: 'var(--stage-selected-bg)' },
  Offered: { label: 'Offered', color: 'var(--stage-offered)', bg: 'var(--stage-offered-bg)' },
  Rejected: { label: 'Rejected', color: 'var(--stage-rejected)', bg: 'var(--stage-rejected-bg)' },
  Withdrawn: { label: 'Withdrawn', color: 'var(--stage-withdrawn)', bg: 'var(--stage-withdrawn-bg)' }
};

/**
 * Returns list of allowed destination stages from a given current stage
 * @param {string} currentStage 
 * @param {string} userRole 
 * @returns {string[]}
 */
export function getAllowedTransitions(currentStage, userRole = 'hr') {
  if (userRole === 'candidate') {
    // Candidates can only withdraw an active application
    if (['Rejected', 'Withdrawn'].includes(currentStage)) return [];
    return ['Withdrawn'];
  }

  switch (currentStage) {
    case 'Applied':
      return ['Screening', 'Rejected'];
    case 'Screening':
      return ['Interview', 'Rejected', 'Applied']; // Applied is revert
    case 'Interview':
      return ['Selected', 'Rejected', 'Screening']; // Screening is revert
    case 'Selected':
      return ['Offered', 'Rejected', 'Interview']; // Interview is revert
    case 'Offered':
      return ['Rejected']; // only if declined/withdrawn
    case 'Rejected':
    case 'Withdrawn':
      return []; // Terminal states: cannot transition out
    default:
      return [];
  }
}

/**
 * Validates whether a candidate transition is allowed and meets required business guards
 * @param {Object} db 
 * @param {string} applicationId 
 * @param {string} toStage 
 * @param {string} userRole 
 * @returns {{ allowed: boolean, reason?: string, requiresAction?: string }}
 */
export function validateTransition(db, applicationId, toStage, userRole = 'hr') {
  const app = db.applications.find(a => a.id === applicationId);
  if (!app) return { allowed: false, reason: 'Application not found' };

  const currentStage = app.stage;
  if (currentStage === toStage) return { allowed: true };

  const allowedStages = getAllowedTransitions(currentStage, userRole);
  if (!allowedStages.includes(toStage)) {
    return {
      allowed: false,
      reason: `Direct transition from ${currentStage} to ${toStage} is not permitted.`
    };
  }

  // Guard: Cannot move to Interview without at least one scheduled/completed interview
  if (toStage === 'Interview') {
    const hasInterview = db.interviews.some(i => i.applicationId === applicationId && i.status !== 'cancelled');
    if (!hasInterview) {
      return {
        allowed: false,
        reason: 'Candidates cannot move to Interview stage without scheduling an interview first.',
        requiresAction: 'schedule_interview'
      };
    }
  }

  // Guard: Cannot move to Offered unless an offer record exists in draft or issued state
  if (toStage === 'Offered') {
    const hasOffer = db.offers.some(o => o.applicationId === applicationId && ['draft', 'issued', 'accepted'].includes(o.status));
    if (!hasOffer) {
      return {
        allowed: false,
        reason: 'Candidates cannot move to Offered stage without creating an offer letter first.',
        requiresAction: 'create_offer'
      };
    }
  }

  return { allowed: true };
}

/**
 * Records an immutable stage change with audit log and mock notification
 * @param {string} applicationId 
 * @param {string} fromStage 
 * @param {string} toStage 
 * @param {string} actorId 
 * @param {string} note 
 * @returns {boolean}
 */
export function recordStageChange(applicationId, fromStage, toStage, actorId, note = '') {
  const db = storage.get(DB_KEY);
  if (!db) return false;

  const app = db.applications.find(a => a.id === applicationId);
  if (!app) return false;

  const now = new Date().toISOString();

  // 1. Update application record
  app.stage = toStage;
  app.updatedAt = now;

  // 2. Append to stageHistory (Audit Trail)
  const historyEntry = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    applicationId,
    fromStage,
    toStage,
    actorId,
    note: note || `Moved from ${fromStage} to ${toStage}`,
    at: now
  };
  db.stageHistory.push(historyEntry);

  // 3. Append to system Activity Log
  const job = db.jobs.find(j => j.id === app.jobId);
  db.activityLog.push({
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    actorId,
    action: 'application.stage_changed',
    entityType: 'application',
    entityId: applicationId,
    at: now,
    meta: {
      fromStage,
      toStage,
      jobTitle: job ? job.title : 'Job',
      candidateId: app.candidateId
    }
  });

  // 4. Enqueue mock notification to candidate
  db.notifications.push({
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    type: 'stage_update',
    toUserId: app.candidateId,
    subject: `Application update: ${job ? job.title : 'Job'} at Acme Innovations`,
    body: `Hello! Your application has been moved to: ${toStage}. Log in to view details and next steps.`,
    status: Math.random() < 0.15 ? 'failed' : 'sent', // ~15% failure rate for demo retry
    attempts: 1,
    lastError: null,
    createdAt: now,
    sentAt: now
  });

  storage.set(DB_KEY, db);
  return true;
}
