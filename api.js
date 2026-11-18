/**
 * HireFlow API Client Abstraction Layer (api.js)
 * Wraps all data access in asynchronous Promises with realistic network delay (150-350ms).
 * Strictly enforces server-side mimicking role guards and candidate data segregation.
 */

import { storage } from '../lib/storage.js';
import { DB_KEY, initDatabase } from './data.js';
import { auth } from './auth.js';
import { can, ROLES } from './permissions.js';
import { validateTransition, recordStageChange } from './pipeline.js';

// Artificial delay to simulate real HTTP requests
const delay = (ms = 220) => new Promise(resolve => setTimeout(resolve, ms));

function getDB() {
  let db = storage.get(DB_KEY);
  if (!db) {
    db = initDatabase();
  }
  return db;
}

function saveDB(db) {
  storage.set(DB_KEY, db);
}

function assertPermission(action) {
  const session = auth.getSession();
  const role = session ? session.role : ROLES.CANDIDATE; // public falls back to guest/candidate
  if (!can(role, action)) {
    throw new Error(`Forbidden: You do not have permission to perform "${action}" (Role: ${role})`);
  }
  return session;
}

export const api = {
  /* ------------------------------------------------------------------
     1. Jobs API (GET /api/jobs, POST /api/jobs, etc.)
  ------------------------------------------------------------------ */
  async getJobs(filters = {}) {
    await delay();
    const session = auth.getSession();
    const db = getDB();
    let list = [...db.jobs];

    // Candidate or non-logged-in public users only see published & non-expired jobs
    if (!session || session.role === ROLES.CANDIDATE) {
      const now = new Date().toISOString();
      list = list.filter(j => j.status === 'published' && (!j.closesAt || j.closesAt > now));
    }

    // Filters
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(j => 
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.department.toLowerCase().includes(q) ||
        j.skills.some(s => s.toLowerCase().includes(q))
      );
    }
    if (filters.department) {
      list = list.filter(j => j.department.toLowerCase() === filters.department.toLowerCase());
    }
    if (filters.type) {
      list = list.filter(j => j.type.toLowerCase() === filters.type.toLowerCase());
    }
    if (filters.location) {
      list = list.filter(j => j.location.toLowerCase().includes(filters.location.toLowerCase()));
    }
    if (filters.experience) {
      list = list.filter(j => j.experience === filters.experience);
    }
    if (filters.status && (!session || session.role !== ROLES.CANDIDATE)) {
      list = list.filter(j => j.status === filters.status);
    }
    if (filters.minSalary) {
      list = list.filter(j => j.salaryMax >= Number(filters.minSalary));
    }

    // Sort
    if (filters.sortBy === 'salary') {
      list.sort((a, b) => b.salaryMax - a.salaryMax);
    } else {
      // Default newest
      list.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    }

    return list;
  },

  async getJobById(id) {
    await delay();
    const db = getDB();
    const job = db.jobs.find(j => j.id === id);
    if (!job) throw new Error('Job not found');
    return job;
  },

  async createJob(jobData) {
    await delay();
    const session = assertPermission('jobs.create');
    const db = getDB();

    const newJob = {
      id: `job_${Date.now()}`,
      companyId: 'comp_1',
      title: jobData.title,
      department: jobData.department,
      location: jobData.location,
      type: jobData.type,
      experience: jobData.experience,
      salaryMin: Number(jobData.salaryMin),
      salaryMax: Number(jobData.salaryMax),
      description: jobData.description,
      requirements: Array.isArray(jobData.requirements) ? jobData.requirements : [jobData.requirements],
      skills: Array.isArray(jobData.skills) ? jobData.skills : [],
      status: jobData.status || 'draft',
      postedAt: new Date().toISOString(),
      closesAt: jobData.closesAt || null,
      createdBy: session.userId
    };

    db.jobs.unshift(newJob);

    db.activityLog.push({
      id: `act_${Date.now()}`,
      actorId: session.userId,
      action: 'job.created',
      entityType: 'job',
      entityId: newJob.id,
      at: new Date().toISOString(),
      meta: { title: newJob.title }
    });

    saveDB(db);
    return newJob;
  },

  async updateJob(id, updates) {
    await delay();
    const session = assertPermission('jobs.edit');
    const db = getDB();
    const job = db.jobs.find(j => j.id === id);
    if (!job) throw new Error('Job not found');

    Object.assign(job, updates);

    db.activityLog.push({
      id: `act_${Date.now()}`,
      actorId: session.userId,
      action: 'job.updated',
      entityType: 'job',
      entityId: id,
      at: new Date().toISOString(),
      meta: { title: job.title }
    });

    saveDB(db);
    return job;
  },

  async duplicateJob(id) {
    await delay();
    const session = assertPermission('jobs.duplicate');
    const db = getDB();
    const source = db.jobs.find(j => j.id === id);
    if (!source) throw new Error('Job not found');

    const copy = {
      ...JSON.parse(JSON.stringify(source)),
      id: `job_${Date.now()}`,
      title: `${source.title} (Copy)`,
      status: 'draft',
      postedAt: new Date().toISOString(),
      createdBy: session.userId
    };

    db.jobs.unshift(copy);
    saveDB(db);
    return copy;
  },

  /* ------------------------------------------------------------------
     2. Applications API
  ------------------------------------------------------------------ */
  async getApplications(filters = {}) {
    await delay();
    const session = auth.getSession();
    const db = getDB();
    let list = [...db.applications];

    // Security Rule: Candidates strictly receive ONLY their own applications
    if (session && session.role === ROLES.CANDIDATE) {
      list = list.filter(a => a.candidateId === session.userId);
    } else {
      assertPermission('applications.view');
    }

    if (filters.jobId) {
      list = list.filter(a => a.jobId === filters.jobId);
    }
    if (filters.stage) {
      list = list.filter(a => a.stage === filters.stage);
    }
    if (filters.candidateId) {
      list = list.filter(a => a.candidateId === filters.candidateId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(a => {
        const user = db.users.find(u => u.id === a.candidateId);
        const candProfile = db.candidateProfiles.find(cp => cp.userId === a.candidateId);
        const nameMatches = user && user.name.toLowerCase().includes(q);
        const skillMatches = candProfile && candProfile.skills.some(s => s.toLowerCase().includes(q));
        return nameMatches || skillMatches;
      });
    }

    // Attach enriched candidate and job data
    return list.map(app => {
      const job = db.jobs.find(j => j.id === app.jobId);
      const user = db.users.find(u => u.id === app.candidateId);
      const profile = db.candidateProfiles.find(cp => cp.userId === app.candidateId);
      return {
        ...app,
        jobTitle: job ? job.title : 'Unknown Job',
        jobDepartment: job ? job.department : '',
        candidateName: user ? user.name : 'Unknown Candidate',
        candidateEmail: user ? user.email : '',
        candidateSkills: profile ? profile.skills : []
      };
    });
  },

  async getApplicationById(id) {
    await delay();
    const session = auth.getSession();
    const db = getDB();
    const app = db.applications.find(a => a.id === id);
    if (!app) throw new Error('Application not found');

    if (session && session.role === ROLES.CANDIDATE && app.candidateId !== session.userId) {
      throw new Error('Forbidden: You can only view your own application');
    }

    const job = db.jobs.find(j => j.id === app.jobId);
    const candidate = db.users.find(u => u.id === app.candidateId);
    const profile = db.candidateProfiles.find(cp => cp.userId === app.candidateId);
    const history = db.stageHistory.filter(h => h.applicationId === id).sort((a, b) => new Date(a.at) - new Date(b.at));
    const appInterviews = db.interviews.filter(i => i.applicationId === id);
    const appOffer = db.offers.find(o => o.applicationId === id);

    return {
      ...app,
      job,
      candidate,
      profile,
      history,
      interviews: appInterviews,
      offer: appOffer
    };
  },

  async applyForJob({ jobId, coverNote, resumeMeta }) {
    await delay();
    const session = assertPermission('applications.create');
    const db = getDB();

    // Prevent duplicate application
    const existing = db.applications.find(a => a.jobId === jobId && a.candidateId === session.userId);
    if (existing) {
      throw new Error('You have already submitted an application for this position.');
    }

    const newAppId = `app_${Date.now()}`;
    const now = new Date().toISOString();

    const newApp = {
      id: newAppId,
      jobId,
      candidateId: session.userId,
      stage: 'Applied',
      coverNote: coverNote || '',
      resumeMeta: resumeMeta || null,
      appliedAt: now,
      updatedAt: now,
      rating: null
    };

    db.applications.push(newApp);

    // Initial audit entry
    db.stageHistory.push({
      id: `hist_${Date.now()}`,
      applicationId: newAppId,
      fromStage: null,
      toStage: 'Applied',
      actorId: session.userId,
      note: 'Application submitted online',
      at: now
    });

    // Mock confirmation email
    db.notifications.push({
      id: `notif_${Date.now()}`,
      type: 'application_submitted',
      toUserId: session.userId,
      subject: 'Application Received - HireFlow',
      body: 'Thank you for applying. The hiring team has received your materials.',
      status: 'sent',
      attempts: 1,
      createdAt: now,
      sentAt: now
    });

    saveDB(db);
    return newApp;
  },

  async moveApplicationStage(applicationId, toStage, note = '') {
    await delay();
    const session = assertPermission('applications.move');
    const db = getDB();

    const validation = validateTransition(db, applicationId, toStage, session.role);
    if (!validation.allowed) {
      throw new Error(validation.reason);
    }

    const app = db.applications.find(a => a.id === applicationId);
    recordStageChange(applicationId, app.stage, toStage, session.userId, note);
    return { success: true };
  },

  async withdrawApplication(applicationId, note = 'Candidate withdrew application') {
    await delay();
    const session = assertPermission('applications.withdraw');
    const db = getDB();

    const app = db.applications.find(a => a.id === applicationId);
    if (!app || app.candidateId !== session.userId) {
      throw new Error('Application not found or unauthorized');
    }

    if (['Rejected', 'Withdrawn'].includes(app.stage)) {
      throw new Error('Cannot withdraw an application that is already closed');
    }

    recordStageChange(applicationId, app.stage, 'Withdrawn', session.userId, note);
    return { success: true };
  },

  async updateApplicationRating(applicationId, rating) {
    await delay();
    assertPermission('applications.move');
    const db = getDB();
    const app = db.applications.find(a => a.id === applicationId);
    if (!app) throw new Error('Application not found');

    app.rating = Number(rating);
    saveDB(db);
    return app;
  },

  /* ------------------------------------------------------------------
     3. Candidates API
  ------------------------------------------------------------------ */
  async getCandidates(filters = {}) {
    await delay();
    assertPermission('candidates.search');
    const db = getDB();

    const candidateUsers = db.users.filter(u => u.role === ROLES.CANDIDATE);
    let list = candidateUsers.map(u => {
      const profile = db.candidateProfiles.find(cp => cp.userId === u.id) || {};
      const apps = db.applications.filter(a => a.candidateId === u.id);
      return {
        ...u,
        ...profile,
        applicationsCount: apps.length,
        activeApplications: apps.filter(a => !['Rejected', 'Withdrawn'].includes(a.stage)).length
      };
    });

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.headline && c.headline.toLowerCase().includes(q)) ||
        (c.skills && c.skills.some(s => s.toLowerCase().includes(q)))
      );
    }
    if (filters.skill) {
      list = list.filter(c => c.skills && c.skills.includes(filters.skill));
    }

    return list;
  },

  async getCandidateProfile(userId) {
    await delay();
    const session = auth.getSession();
    if (session && session.role === ROLES.CANDIDATE && session.userId !== userId) {
      throw new Error('Forbidden: You can only view your own profile');
    }

    const db = getDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    const profile = db.candidateProfiles.find(cp => cp.userId === userId) || {
      userId,
      phone: '',
      location: '',
      headline: '',
      skills: [],
      experienceYears: 0,
      education: '',
      linkedin: '',
      resumeMeta: null
    };

    return { ...user, ...profile };
  },

  async updateCandidateProfile(userId, profileData) {
    await delay();
    const session = auth.getSession();
    if (session && session.role === ROLES.CANDIDATE && session.userId !== userId) {
      throw new Error('Forbidden: You can only edit your own profile');
    }

    const db = getDB();
    let profile = db.candidateProfiles.find(cp => cp.userId === userId);
    if (!profile) {
      profile = { userId };
      db.candidateProfiles.push(profile);
    }

    Object.assign(profile, profileData);

    // If name was updated
    if (profileData.name) {
      const user = db.users.find(u => u.id === userId);
      if (user) user.name = profileData.name;
    }

    saveDB(db);
    return profile;
  },

  /* ------------------------------------------------------------------
     4. Interviews API
  ------------------------------------------------------------------ */
  async getInterviews(filters = {}) {
    await delay();
    const session = auth.getSession();
    const db = getDB();
    let list = [...db.interviews];

    if (session && session.role === ROLES.CANDIDATE) {
      const myApps = db.applications.filter(a => a.candidateId === session.userId).map(a => a.id);
      list = list.filter(i => myApps.includes(i.applicationId));
    } else {
      assertPermission('interviews.manage');
    }

    // Enrich with job and candidate info
    return list.map(int => {
      const app = db.applications.find(a => a.id === int.applicationId);
      const job = app ? db.jobs.find(j => j.id === app.jobId) : null;
      const candidate = app ? db.users.find(u => u.id === app.candidateId) : null;
      const feedback = db.interviewFeedback.filter(f => f.interviewId === int.id);
      return {
        ...int,
        jobTitle: job ? job.title : 'Interview',
        candidateName: candidate ? candidate.name : 'Candidate',
        feedback
      };
    });
  },

  async scheduleInterview(data) {
    await delay();
    const session = assertPermission('interviews.manage');
    const db = getDB();

    // Conflict detection: verify participants not double booked in the same time slot
    const newStart = new Date(data.startsAt).getTime();
    const newEnd = newStart + (Number(data.durationMin) * 60 * 1000);

    const hasConflict = db.interviews.some(existing => {
      if (existing.status === 'cancelled') return false;
      const exStart = new Date(existing.startsAt).getTime();
      const exEnd = exStart + (existing.durationMin * 60 * 1000);

      const sharesParticipant = existing.participants.some(p => (data.participants || []).includes(p));
      const timesOverlap = (newStart < exEnd && newEnd > exStart);
      return sharesParticipant && timesOverlap;
    });

    if (hasConflict) {
      throw new Error('Interview conflict detected: One or more participants are already scheduled during this time window.');
    }

    const newInterview = {
      id: `int_${Date.now()}`,
      applicationId: data.applicationId,
      title: data.title,
      startsAt: data.startsAt,
      durationMin: Number(data.durationMin),
      mode: data.mode,
      location: data.location,
      participants: data.participants || [session.userId],
      status: 'scheduled',
      createdBy: session.userId,
      updatedAt: new Date().toISOString()
    };

    db.interviews.push(newInterview);

    // Notify candidate
    const app = db.applications.find(a => a.id === data.applicationId);
    if (app) {
      db.notifications.push({
        id: `notif_${Date.now()}`,
        type: 'interview_scheduled',
        toUserId: app.candidateId,
        subject: `Interview Scheduled: ${data.title}`,
        body: `Your interview is scheduled for ${data.startsAt} (${data.mode}). Location/Link: ${data.location}`,
        status: 'sent',
        attempts: 1,
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString()
      });
    }

    saveDB(db);
    return newInterview;
  },

  async updateInterviewStatus(id, status) {
    await delay();
    assertPermission('interviews.manage');
    const db = getDB();
    const item = db.interviews.find(i => i.id === id);
    if (!item) throw new Error('Interview not found');

    item.status = status;
    item.updatedAt = new Date().toISOString();
    saveDB(db);
    return item;
  },

  async submitInterviewFeedback(feedbackData) {
    await delay();
    const session = assertPermission('interviews.manage');
    const db = getDB();

    const newFb = {
      id: `fb_${Date.now()}`,
      interviewId: feedbackData.interviewId,
      authorId: session.userId,
      rating: Number(feedbackData.rating),
      recommendation: feedbackData.recommendation,
      comments: feedbackData.comments,
      at: new Date().toISOString()
    };

    db.interviewFeedback.push(newFb);
    saveDB(db);
    return newFb;
  },

  /* ------------------------------------------------------------------
     5. Offers & Onboarding API
  ------------------------------------------------------------------ */
  async getOffers() {
    await delay();
    const session = auth.getSession();
    const db = getDB();
    let list = [...db.offers];

    if (session && session.role === ROLES.CANDIDATE) {
      const myApps = db.applications.filter(a => a.candidateId === session.userId).map(a => a.id);
      list = list.filter(o => myApps.includes(o.applicationId));
    } else {
      assertPermission('offers.manage');
    }

    return list.map(offer => {
      const app = db.applications.find(a => a.id === offer.applicationId);
      const job = app ? db.jobs.find(j => j.id === app.jobId) : null;
      const candidate = app ? db.users.find(u => u.id === app.candidateId) : null;
      const tasks = db.onboardingTasks.filter(t => t.offerId === offer.id);
      return {
        ...offer,
        jobTitle: job ? job.title : 'Job Offer',
        candidateName: candidate ? candidate.name : 'Candidate',
        tasks
      };
    });
  },

  async getOfferTemplates() {
    await delay();
    assertPermission('offers.manage');
    const db = getDB();
    return db.offerTemplates || [];
  },

  async createOffer(offerData) {
    await delay();
    assertPermission('offers.manage');
    const db = getDB();

    const newOffer = {
      id: `off_${Date.now()}`,
      applicationId: offerData.applicationId,
      templateId: offerData.templateId,
      salary: Number(offerData.salary),
      startDate: offerData.startDate,
      status: offerData.status || 'draft',
      renderedBody: offerData.renderedBody,
      issuedAt: offerData.status === 'issued' ? new Date().toISOString() : null,
      respondedAt: null
    };

    db.offers.push(newOffer);
    saveDB(db);
    return newOffer;
  },

  async respondToOffer(offerId, responseAction) { // 'accepted' | 'declined'
    await delay();
    const session = auth.getSession();
    const db = getDB();
    const offer = db.offers.find(o => o.id === offerId);
    if (!offer) throw new Error('Offer not found');

    const app = db.applications.find(a => a.id === offer.applicationId);
    if (session && session.role === ROLES.CANDIDATE && app.candidateId !== session.userId) {
      throw new Error('Forbidden: You can only respond to your own offer');
    }

    if (!['accepted', 'declined'].includes(responseAction)) {
      throw new Error('Invalid response action');
    }

    offer.status = responseAction;
    offer.respondedAt = new Date().toISOString();

    // If accepted, generate default onboarding checklist
    if (responseAction === 'accepted') {
      db.onboardingTasks.push(
        { id: `task_${offer.id}_1`, offerId: offer.id, title: 'Submit signed direct deposit form', owner: 'candidate', dueDate: offer.startDate, done: false },
        { id: `task_${offer.id}_2`, offerId: offer.id, title: 'Upload Government-issued photo ID', owner: 'candidate', dueDate: offer.startDate, done: false },
        { id: `task_${offer.id}_3`, offerId: offer.id, title: 'Provision IT developer hardware and credentials', owner: 'hr', dueDate: offer.startDate, done: false },
        { id: `task_${offer.id}_4`, offerId: offer.id, title: 'Schedule 30-day orientation buddy sync', owner: 'hr', dueDate: offer.startDate, done: false }
      );
    }

    saveDB(db);
    return offer;
  },

  async toggleOnboardingTask(taskId, isDone) {
    await delay();
    const db = getDB();
    const task = db.onboardingTasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');

    task.done = isDone;
    saveDB(db);
    return task;
  },

  /* ------------------------------------------------------------------
     6. Analytics API
  ------------------------------------------------------------------ */
  async getAnalytics(filters = {}) {
    await delay();
    assertPermission('analytics.view');
    const db = getDB();

    const apps = db.applications;
    const offers = db.offers;
    const notifs = db.notifications;

    // Metric 1: Stage conversion
    const stageCounts = {
      Applied: apps.filter(a => a.stage === 'Applied').length,
      Screening: apps.filter(a => a.stage === 'Screening').length,
      Interview: apps.filter(a => a.stage === 'Interview').length,
      Selected: apps.filter(a => a.stage === 'Selected').length,
      Offered: apps.filter(a => a.stage === 'Offered').length
    };

    // Metric 2: Time to hire (days from appliedAt to offer acceptance)
    let totalTTH = 0;
    let tthCount = 0;
    let excludedTTHCount = 0;

    offers.forEach(o => {
      if (o.status === 'accepted' && o.respondedAt) {
        const app = apps.find(a => a.id === o.applicationId);
        if (app && app.appliedAt) {
          const days = Math.round((new Date(o.respondedAt) - new Date(app.appliedAt)) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            totalTTH += days;
            tthCount++;
          } else {
            excludedTTHCount++;
          }
        } else {
          excludedTTHCount++;
        }
      }
    });

    const avgTimeToHireDays = tthCount > 0 ? (totalTTH / tthCount).toFixed(1) : 'N/A';

    // Metric 3: Offer Acceptance Rate
    const respondedOffers = offers.filter(o => ['accepted', 'declined'].includes(o.status));
    const acceptedCount = offers.filter(o => o.status === 'accepted').length;
    const offerAcceptanceRate = respondedOffers.length > 0 
      ? Math.round((acceptedCount / respondedOffers.length) * 100) 
      : 'N/A';

    // Metric 4: Simulated Notification Success
    const totalNotifs = notifs.length;
    const successfulNotifs = notifs.filter(n => n.status === 'sent').length;
    const notifSuccessRate = totalNotifs > 0 
      ? Math.round((successfulNotifs / totalNotifs) * 100) 
      : 'N/A';

    return {
      totalApplications: apps.length,
      activeJobs: db.jobs.filter(j => j.status === 'published').length,
      interviewsCount: db.interviews.length,
      avgTimeToHireDays,
      tthCount,
      excludedTTHCount,
      offerAcceptanceRate,
      notifSuccessRate,
      stageCounts
    };
  },

  /* ------------------------------------------------------------------
     7. Admin API
  ------------------------------------------------------------------ */
  async getUsers() {
    await delay();
    assertPermission('users.manage');
    const db = getDB();
    return db.users || [];
  },

  async updateUserRole(userId, newRole) {
    await delay();
    assertPermission('users.manage');
    const db = getDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    user.role = newRole;
    saveDB(db);
    return user;
  },

  async toggleUserActive(userId, active) {
    await delay();
    const session = assertPermission('users.manage');
    const db = getDB();

    if (session.userId === userId && !active) {
      throw new Error('You cannot deactivate your own account.');
    }

    const adminCount = db.users.filter(u => u.role === ROLES.ADMIN && u.active).length;
    const target = db.users.find(u => u.id === userId);
    if (target && target.role === ROLES.ADMIN && adminCount <= 1 && !active) {
      throw new Error('Cannot deactivate the last remaining active Administrator.');
    }

    target.active = active;
    saveDB(db);
    return target;
  },

  async getNotifications() {
    await delay();
    assertPermission('notifications.view');
    const db = getDB();
    return db.notifications || [];
  },

  async retryNotification(notifId) {
    await delay();
    assertPermission('notifications.retry');
    const db = getDB();
    const notif = db.notifications.find(n => n.id === notifId);
    if (!notif) throw new Error('Notification not found');

    notif.attempts = (notif.attempts || 1) + 1;
    // Max 3 attempts, simulate success on retry
    notif.status = 'sent';
    notif.lastError = null;
    notif.sentAt = new Date().toISOString();

    saveDB(db);
    return notif;
  },

  async getActivityLog() {
    await delay();
    assertPermission('activity.view');
    const db = getDB();
    return db.activityLog.slice(-50).reverse();
  }
};
