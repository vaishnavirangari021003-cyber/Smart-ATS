# HireFlow — Smart Recruitment & Applicant Tracking System (ATS)

HireFlow is a professional, multi-page frontend-only website for a Smart Applicant Tracking System built strictly using **HTML5, CSS3, and vanilla JavaScript (ES modules)**. No frameworks, no build tools, no npm packages, no backend server, and no CDN dependencies (only Google Fonts).

All state is persisted in your browser's `localStorage` under key `hireflow_db_v1`, backed by asynchronous Promises and simulated network delay (150–350 ms) to replicate a production-ready REST API client architecture.

---

## 🚀 How to Run the Project

1. **Option A: Simple Static Server (Recommended)**
   - Open VS Code in the project root folder (`ATS` or `hireflow`).
   - Launch with **Live Server** (`http://127.0.0.1:5500/` or `http://localhost:5500/hireflow/index.html`).

2. **Option B: Direct Browser Opening**
   - Double-click or open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).
   - *Note: Since ES modules (`<script type="module">`) are used, a local static server like Live Server or `python -m http.server 8000` is recommended to prevent local `file://` CORS restrictions in certain browser versions.*

3. **Resetting Data**
   - To restore the original synthetic dataset (1 company, 3 staff accounts, 25 candidates, 12 jobs, ~70 applications, and audit entries), go to **Admin → Settings** and click **Reset Demo Data to Initial Seed**.

---

## 🔑 Demo Accounts & Credentials

Clickable quick-fill chips are provided on the login page (`login.html`):

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `Demo@1234` | Full user seat management, mock email logs, retry failed notifications, system settings, database export/reset. |
| **HR Specialist** | `hr@example.com` | `Demo@1234` | Kanban recruitment pipeline, job directory, scheduling interviews with conflict detection, offer letters, onboarding checklists, analytics. |
| **Candidate** | `candidate@example.com` | `Demo@1234` | View public openings, apply with resume & cover notes, track stage progress, view upcoming interviews, accept/decline offers. |

*(All candidate accounts in the seed use password `Demo@1234`).*

---

## 📁 Folder Structure

```
hireflow/
├── index.html                 # Landing page & public jobs search with filters
├── job-details.html           # Job specifications & interactive application form
├── login.html                 # Authentication with lockout simulation & quick-fill chips
├── register.html              # Candidate account registration with live strength meter
├── 403.html                   # Access Forbidden page
├── 404.html                   # Page Not Found error page
├── candidate/
│   ├── dashboard.html         # Candidate overview, profile completion ring, KPI stats
│   ├── profile.html           # Personal, education, skills tags, and resume management
│   ├── applications.html      # Application history table and audit trail drawer
│   └── interviews.html        # Upcoming interviews list & .ics calendar file download
├── hr/
│   ├── dashboard.html         # Recruiter command center, stale candidates alert, mini funnel
│   ├── jobs.html              # Jobs directory, create/edit modal, publish/close actions
│   ├── pipeline.html          # Flagship Kanban board, HTML5 DnD, keyboard moves, drawer
│   ├── candidates.html        # Searchable talent pool directory and candidate profile drawer
│   ├── interviews.html        # Vanilla month/week/list calendar & conflict detection
│   ├── offers.html            # Offer builder, live template preview, print-to-PDF, onboarding
│   └── analytics.html         # Pure SVG/Canvas charts (funnel, area, horizontal bar, donut)
├── admin/
│   ├── overview.html          # System health KPIs, role distribution, audit timeline
│   ├── users.html             # User seat administration, role assignment, activate/deactivate
│   ├── notifications.html     # Mock email delivery log with simulated failure retry
│   └── settings.html          # Company settings, offer template editor, JSON export & reset
├── css/
│   ├── variables.css          # Design tokens (colors, spacing, radius, typography, stages)
│   ├── base.css               # Reset, typography, skip-to-content, accessible focus rings
│   ├── components.css         # Buttons, inputs, modals, drawers, toasts, tables, skeletons
│   ├── layout.css             # Public navbar, dashboard sidebar, topbar, responsive drawer
│   ├── pages.css              # Page-specific styling (Kanban, calendar, auth split screens)
│   └── print.css              # Print stylesheet for A4 offer letters with letterhead
├── js/
│   ├── core/
│   │   ├── data.js            # In-browser database generator & initial seed
│   │   ├── api.js             # Async API abstraction layer with Promise delays & role guards
│   │   ├── auth.js            # Session duration, password hashing, and 5-try lockout
│   │   ├── permissions.js     # Role & permission matrix (can(role, action))
│   │   ├── pipeline.js        # Stage transitions, forward guards, and audit trail
│   │   └── router-guard.js    # Client-side route protection & user identity injection
│   ├── lib/
│   │   ├── ui.js              # Toasts, modals, drawers, confirmDialog, skeletons, avatars
│   │   ├── validate.js        # Accessible form validation with ARIA live feedback
│   │   ├── dates.js           # ISO 8601 UTC to browser local time formatters & relative time
│   │   ├── escape.js          # HTML sanitization & CSV formula injection prevention
│   │   ├── charts.js          # Vanilla SVG/Canvas visualizations with data tables
│   │   ├── calendar.js        # Month, week, and list view interview calendar
│   │   ├── dnd.js             # HTML5 Drag and Drop with keyboard navigation fallback
│   │   └── storage.js         # Safe localStorage wrapper with quota handling
│   └── pages/                 # One controller per HTML page (e.g. hr-pipeline.page.js)
├── assets/
│   ├── logo.svg               # HireFlow brand icon
│   ├── favicon.svg            # Browser tab favicon
│   ├── hero.svg               # Recruitment dashboard graphic
│   └── empty-state.svg        # Empty search results illustration
└── README.md
```

---

## 🛡️ Permission Matrix Table

| Action | Admin | HR Specialist | Candidate | Notes |
| :--- | :---: | :---: | :---: | :--- |
| `users.manage` | ✅ | ❌ | ❌ | Change roles, invite users, deactivate accounts. |
| `company.configure` | ✅ | ❌ | ❌ | Organization profile & default offer templates. |
| `notifications.view` | ✅ | ❌ | ❌ | Inspect mock email dispatcher logs. |
| `notifications.retry` | ✅ | ❌ | ❌ | Re-dispatch failed notifications. |
| `jobs.create` / `jobs.edit` | ❌ | ✅ | ❌ | Create, edit, publish, close, archive jobs. |
| `jobs.view` | ✅ (all) | ✅ (all) | ✅ (published) | Candidates only see published, non-expired jobs. |
| `applications.view` | ✅ (all) | ✅ (all) | ✅ (own only) | Candidates strictly receive only their own data. |
| `applications.move` | ❌ | ✅ | ❌ | Move candidates between pipeline stages. |
| `candidates.search` | ❌ | ✅ | ❌ | Recruiter search across talent pool directory. |
| `interviews.manage` | ❌ | ✅ | ❌ | Schedule interviews, conflict check, evaluations. |
| `interviews.view` | ✅ | ✅ | ✅ (own only) | Candidates see only their scheduled interviews. |
| `offers.manage` | ❌ | ✅ | ❌ | Draft, issue, print offer letters. |
| `offers.respond` | ❌ | ❌ | ✅ (own only) | Accept or decline received job offers. |
| `onboarding.manage` | ❌ | ✅ | ❌ | Monitor checklist progress across new hires. |
| `analytics.view` | ✅ | ✅ | ❌ | Executive & recruiter hiring velocity metrics. |

---

## 🔄 Pipeline Stage Transition Rules

HireFlow enforces strict forward workflow integrity, prevents bypassing required interview steps, and maintains an append-only audit trail:

```
[Applied] ───► [Screening] ───► [Interview] ───► [Selected] ───► [Offered]
    │               │                │               │               │
    ▼               ▼                ▼               ▼               ▼
[Rejected]      [Rejected]       [Rejected]      [Rejected]      [Rejected] (declined)
                    │                │               │
                    ▼ (revert)       ▼ (revert)      ▼ (revert)
                [Applied]        [Screening]     [Interview]
```

- **Applied:** Candidate submission. Can advance to `Screening` or terminal `Rejected`.
- **Screening:** Initial review. Can advance to `Interview`, `Rejected`, or revert to `Applied`.
- **Interview:** Requires at least one scheduled interview session. Can advance to `Selected`, `Rejected`, or revert to `Screening`.
- **Selected:** Finalist selection. Can advance to `Offered`, `Rejected`, or revert to `Interview`.
- **Offered:** Requires a draft or issued offer letter in the database. Can move to `Rejected` only if the candidate declines or withdraws.
- **Terminal Stages:** `Rejected` and `Withdrawn` are terminal; no further stage transitions are permitted.
- **Audit Logging:** Every transition appends an immutable entry to `stageHistory`, adds to `activityLog`, and dispatches a simulated email notification.

---

## 📊 Metric Definitions & Calculation Rules

In `hr/analytics.html`:

1. **Stage Conversion Rate:**
   $$\text{Conversion Rate} = \frac{\text{Candidates reaching Stage } N}{\text{Candidates reaching Stage } N-1} \times 100\%$$
   Calculated within the selected date window and cohort of applications created in that window.

2. **Average Time-to-Hire:**
   $$\text{Time-to-Hire} = \frac{\sum (\text{Offer Accepted Date} - \text{Applied Date})}{\text{Total Accepted Offers}}$$
   Computed strictly for accepted offers. Applications missing either timestamp or with inconsistent dates are excluded, and the excluded count is explicitly displayed.

3. **Offer Acceptance Rate:**
   $$\text{Acceptance Rate} = \frac{\text{Accepted Offers}}{\text{Accepted Offers} + \text{Declined Offers}} \times 100\%$$
   Calculated strictly among offers that have received a candidate response.

4. **Notification Delivery Rate:**
   $$\text{Delivery Rate} = \frac{\text{Delivered Notifications}}{\text{Delivered} + \text{Failed Attempts}} \times 100\%$$
   Labeled as "Simulated" with an artificial ~15% failure rate to showcase retry mechanics.

---

## 🌐 Timezone Rule

- **Storage:** All timestamps are generated and stored in **ISO 8601 UTC** format (e.g., `2026-11-17T16:15:00.000Z`).
- **Display:** All dates and times are converted and rendered in the browser's local timezone using the native `Intl.DateTimeFormat` API in `js/lib/dates.js`.

---

## 🔒 Limitations & Security Notice

- **Demo Environment Only:** There is no backend server. All database operations happen inside browser `localStorage`.
- **Mock Security:** Passwords use a non-cryptographic demo hash function for UI demonstration. Never use real passwords.
- **Mock Emails:** Notifications are logged locally and not delivered to real external mail servers.
- **Client-Side Guards:** While `api.js` throws `"Forbidden"` errors to mimic real server-side enforcement, client-side guards can be inspected in browser developer tools.
- **Storage Limits:** Browser localStorage typically has a 5MB quota. A JSON export/import and demo reset tool is provided in Settings.

---

## 🔌 Connecting a Real REST API

All frontend pages interact exclusively with `js/core/api.js`. To connect a live backend server (Node.js, Go, Python Django/FastAPI, Java Spring), replace the internal functions in `api.js` with `fetch()` calls:

| `api.js` Function | HTTP Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| `getJobs(filters)` | `GET` | `/api/v1/jobs` | Retrieve filtered jobs list |
| `getJobById(id)` | `GET` | `/api/v1/jobs/:id` | Retrieve single job record |
| `createJob(data)` | `POST` | `/api/v1/jobs` | Post new job opening |
| `updateJob(id, data)` | `PATCH` | `/api/v1/jobs/:id` | Update job details or status |
| `duplicateJob(id)` | `POST` | `/api/v1/jobs/:id/duplicate` | Duplicate job opening as draft |
| `getApplications(filters)` | `GET` | `/api/v1/applications` | Query applications (role scoped) |
| `getApplicationById(id)` | `GET` | `/api/v1/applications/:id` | Application audit trail & details |
| `applyForJob(data)` | `POST` | `/api/v1/applications` | Submit candidate application |
| `moveApplicationStage(id, stage)` | `POST` | `/api/v1/applications/:id/stage` | Transition pipeline stage |
| `withdrawApplication(id)` | `POST` | `/api/v1/applications/:id/withdraw` | Candidate withdraw action |
| `getCandidates(filters)` | `GET` | `/api/v1/candidates` | Recruiter candidate talent search |
| `getCandidateProfile(id)` | `GET` | `/api/v1/candidates/:id` | Full candidate profile |
| `updateCandidateProfile(id, data)`| `PUT` | `/api/v1/candidates/:id` | Candidate profile update |
| `getInterviews(filters)` | `GET` | `/api/v1/interviews` | Fetch scheduled interviews |
| `scheduleInterview(data)` | `POST` | `/api/v1/interviews` | Create interview with conflict check |
| `submitInterviewFeedback(data)` | `POST` | `/api/v1/interviews/:id/feedback` | Record panel feedback & rating |
| `getOffers()` | `GET` | `/api/v1/offers` | Fetch offers list |
| `createOffer(data)` | `POST` | `/api/v1/offers` | Issue employment offer |
| `respondToOffer(id, action)` | `POST` | `/api/v1/offers/:id/respond` | Candidate Accept / Decline |
| `getAnalytics(filters)` | `GET` | `/api/v1/analytics` | Computed funnel and hiring KPIs |
| `getUsers()` | `GET` | `/api/v1/admin/users` | Admin user directory |
| `updateUserRole(id, role)` | `PATCH` | `/api/v1/admin/users/:id/role` | Change user privileges |
| `toggleUserActive(id, active)` | `PATCH` | `/api/v1/admin/users/:id/status` | Activate/Deactivate user |
| `getNotifications()` | `GET` | `/api/v1/admin/notifications` | Email notification log |
| `retryNotification(id)` | `POST` | `/api/v1/admin/notifications/:id/retry` | Retry failed dispatch |
| `getActivityLog()` | `GET` | `/api/v1/admin/activity` | Immutable system audit log |

---

## ♿ Accessibility (WCAG 2.1 AA)

- **Semantic Landmarks:** `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`.
- **Color Contrast:** All colors in both light (`--bg: #f6f8fb`) and dark (`--bg: #0b1220`) modes meet or exceed the 4.5:1 WCAG AA contrast ratio.
- **Skip Links:** A skip-to-content anchor is present at the top of every page.
- **Keyboard Navigation:** Modals trap focus and close on `Escape`. The Kanban board includes a full keyboard alternative ("Move to..." action menu with arrow keys) and announces moves via `aria-live="assertive"`.
- **Screen Reader Support:** Charts provide toggleable data tables as accessible text alternatives.
- **Motion Reduction:** Fully respects `prefers-reduced-motion: reduce` by disabling transitions and animations.
