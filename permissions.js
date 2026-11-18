/**
 * HireFlow Role & Permission Matrix (permissions.js)
 * Defines strictly what each role (admin, hr, candidate) is allowed to perform.
 * Client-side role guards are for demo purposes; api.js enforces these checks.
 */

export const ROLES = {
  ADMIN: 'admin',
  HR: 'hr',
  CANDIDATE: 'candidate'
};

/**
 * Permission lookup table
 * [action]: [allowed roles]
 */
export const PERMISSIONS = {
  // Admin only
  'users.manage': [ROLES.ADMIN],
  'company.configure': [ROLES.ADMIN],
  'notifications.view': [ROLES.ADMIN],
  'notifications.retry': [ROLES.ADMIN],
  'settings.manage': [ROLES.ADMIN],

  // Shared Admin & HR
  'activity.view': [ROLES.ADMIN, ROLES.HR],
  'analytics.view': [ROLES.ADMIN, ROLES.HR],
  'jobs.view': [ROLES.ADMIN, ROLES.HR, ROLES.CANDIDATE], // Candidate only sees published

  // HR only
  'jobs.create': [ROLES.HR],
  'jobs.edit': [ROLES.HR],
  'jobs.publish': [ROLES.HR],
  'jobs.close': [ROLES.HR],
  'jobs.archive': [ROLES.HR],
  'jobs.duplicate': [ROLES.HR],
  'applications.view': [ROLES.HR, ROLES.ADMIN],
  'applications.move': [ROLES.HR],
  'candidates.search': [ROLES.HR],
  'candidates.view': [ROLES.HR],
  'interviews.manage': [ROLES.HR],
  'offers.manage': [ROLES.HR],
  'onboarding.manage': [ROLES.HR],

  // Candidate only (own data scope)
  'applications.create': [ROLES.CANDIDATE],
  'applications.withdraw': [ROLES.CANDIDATE],
  'profile.edit': [ROLES.CANDIDATE],
  'interviews.view': [ROLES.CANDIDATE, ROLES.HR, ROLES.ADMIN],
  'offers.respond': [ROLES.CANDIDATE]
};

/**
 * Checks whether a given role has permission for an action
 * @param {string} role 'admin' | 'hr' | 'candidate'
 * @param {string} action 
 * @returns {boolean}
 */
export function can(role, action) {
  if (!role) return false;
  const allowed = PERMISSIONS[action];
  if (!allowed) {
    console.warn(`[Permissions] Unknown action requested: "${action}"`);
    return false;
  }
  return allowed.includes(role);
}
