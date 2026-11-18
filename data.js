/**
 * HireFlow Seed & In-Browser Database (data.js)
 * Stored under key "hireflow_db_v1" in localStorage.
 * Completely simulated synthetic data.
 */

import { storage } from '../lib/storage.js';

export const DB_KEY = 'hireflow_db_v1';
export const SESSION_KEY = 'hireflow_session';

/**
 * Mock password hashing function.
 * Note: DEMO ONLY - this is not real cryptographic security!
 */
export function mockHash(pwd) {
  let hash = 0;
  for (let i = 0; i < pwd.length; i++) {
    hash = (hash << 5) - hash + pwd.charCodeAt(i);
    hash |= 0;
  }
  return `mock_hash_${Math.abs(hash)}`;
}

export const INITIAL_PASSWORD_HASH = mockHash('Demo@1234');

/**
 * Generates initial synthetic database
 */
export function generateSeedData() {
  const now = new Date();
  const subDays = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
  const addDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString();

  // 1. Company
  const companies = [
    {
      id: 'comp_1',
      name: 'Acme Innovations',
      industry: 'Cloud Software & Enterprise Solutions',
      website: 'https://acme.example.com',
      logoText: 'Acme',
      createdAt: subDays(120)
    }
  ];

  // 2. Users (Admin, 2 HR, 25 Candidates)
  const users = [
    {
      id: 'usr_admin',
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: INITIAL_PASSWORD_HASH,
      role: 'admin',
      companyId: 'comp_1',
      active: true,
      createdAt: subDays(100),
      lastLoginAt: subDays(1)
    },
    {
      id: 'usr_hr_1',
      name: 'Elena Rostova',
      email: 'hr@example.com',
      passwordHash: INITIAL_PASSWORD_HASH,
      role: 'hr',
      companyId: 'comp_1',
      active: true,
      createdAt: subDays(95),
      lastLoginAt: subDays(0)
    },
    {
      id: 'usr_hr_2',
      name: 'Marcus Vance',
      email: 'marcus.hr@example.com',
      passwordHash: INITIAL_PASSWORD_HASH,
      role: 'hr',
      companyId: 'comp_1',
      active: true,
      createdAt: subDays(80),
      lastLoginAt: subDays(2)
    }
  ];

  const candidateNames = [
    { name: 'Liam Cooper', email: 'candidate@example.com', title: 'Senior Frontend Engineer', exp: 6, loc: 'San Francisco, CA', skills: ['JavaScript', 'HTML5', 'CSS3', 'React', 'TypeScript'] },
    { name: 'Maya Patel', email: 'maya.patel@example.com', title: 'Lead Product Designer', exp: 7, loc: 'New York, NY', skills: ['Figma', 'UI/UX', 'Design Systems', 'User Research'] },
    { name: 'Alex Chen', email: 'alex.chen@example.com', title: 'Full Stack Developer', exp: 4, loc: 'Remote, US', skills: ['Node.js', 'React', 'PostgreSQL', 'Docker'] },
    { name: 'Priya Sharma', email: 'priya.sharma@example.com', title: 'Backend Software Engineer', exp: 5, loc: 'Seattle, WA', skills: ['Go', 'Python', 'Kubernetes', 'gRPC'] },
    { name: 'Jordan Lee', email: 'jordan.lee@example.com', title: 'Product Manager', exp: 5, loc: 'Austin, TX', skills: ['Roadmapping', 'Agile', 'Product Strategy', 'Data Analytics'] },
    { name: 'Sophia Martinez', email: 'sophia.m@example.com', title: 'DevOps & Cloud Engineer', exp: 6, loc: 'Remote, US', skills: ['AWS', 'Terraform', 'CI/CD', 'Linux'] },
    { name: 'David Kim', email: 'david.kim@example.com', title: 'Frontend Developer', exp: 3, loc: 'San Jose, CA', skills: ['JavaScript', 'Vue.js', 'CSS Grid', 'REST APIs'] },
    { name: 'Aisha Al-Mansoor', email: 'aisha.m@example.com', title: 'Content Marketing Specialist', exp: 3, loc: 'Chicago, IL', skills: ['SEO', 'Copywriting', 'Content Strategy', 'HubSpot'] },
    { name: 'Noah Taylor', email: 'noah.taylor@example.com', title: 'Enterprise Account Executive', exp: 4, loc: 'New York, NY', skills: ['B2B Sales', 'Salesforce', 'Negotiation', 'CRM'] },
    { name: 'Olivia Wilson', email: 'olivia.w@example.com', title: 'QA Automation Engineer', exp: 3, loc: 'Remote, US', skills: ['Cypress', 'Playwright', 'Jest', 'Python'] },
    { name: 'Lucas Silva', email: 'lucas.silva@example.com', title: 'Junior UI/UX Designer', exp: 1, loc: 'Boston, MA', skills: ['Figma', 'Prototyping', 'Wireframing'] },
    { name: 'Emma Davis', email: 'emma.davis@example.com', title: 'Data Scientist', exp: 4, loc: 'Boston, MA', skills: ['Python', 'Machine Learning', 'SQL', 'Pandas'] },
    { name: 'James Brown', email: 'james.b@example.com', title: 'Senior Backend Engineer', exp: 8, loc: 'Austin, TX', skills: ['Java', 'Spring Boot', 'Microservices', 'Kafka'] },
    { name: 'Isabella Garcia', email: 'isabella.g@example.com', title: 'Customer Success Manager', exp: 3, loc: 'Denver, CO', skills: ['Customer Retention', 'Zendesk', 'Onboarding'] },
    { name: 'Benjamin Jones', email: 'ben.jones@example.com', title: 'Senior DevOps Architect', exp: 7, loc: 'Remote, US', skills: ['AWS', 'Docker', 'Kubernetes', 'Ansible'] },
    { name: 'Mia Johnson', email: 'mia.j@example.com', title: 'Full Stack Engineer', exp: 4, loc: 'San Francisco, CA', skills: ['React', 'Node.js', 'MongoDB', 'GraphQL'] },
    { name: 'Ethan White', email: 'ethan.w@example.com', title: 'Mobile Developer', exp: 5, loc: 'Seattle, WA', skills: ['React Native', 'Swift', 'Kotlin', 'Mobile UI'] },
    { name: 'Charlotte Miller', email: 'charlotte.m@example.com', title: 'Product Marketing Manager', exp: 5, loc: 'New York, NY', skills: ['GTM Strategy', 'Campaigns', 'Analytics'] },
    { name: 'Daniel Martin', email: 'daniel.m@example.com', title: 'Cloud Security Analyst', exp: 4, loc: 'Remote, US', skills: ['Cybersecurity', 'AWS IAM', 'Compliance', 'Pen Testing'] },
    { name: 'Harper Jackson', email: 'harper.j@example.com', title: 'UX Researcher', exp: 4, loc: 'Chicago, IL', skills: ['Usability Testing', 'User Interviews', 'Personas'] },
    { name: 'Matthew Anderson', email: 'matthew.a@example.com', title: 'Site Reliability Engineer', exp: 6, loc: 'Austin, TX', skills: ['Prometheus', 'Grafana', 'Linux', 'Terraform'] },
    { name: 'Amelia Harris', email: 'amelia.h@example.com', title: 'Frontend Developer', exp: 2, loc: 'Remote, US', skills: ['JavaScript', 'HTML/CSS', 'Tailwind', 'Git'] },
    { name: 'Henry Clark', email: 'henry.c@example.com', title: 'Sales Development Rep', exp: 2, loc: 'Atlanta, GA', skills: ['Cold Calling', 'Lead Gen', 'Salesforce'] },
    { name: 'Evelyn Lewis', email: 'evelyn.l@example.com', title: 'Technical Writer', exp: 3, loc: 'Remote, US', skills: ['Documentation', 'Markdown', 'API Docs'] },
    { name: 'Alexander Young', email: 'alex.young@example.com', title: 'Systems Architect', exp: 9, loc: 'San Francisco, CA', skills: ['Distributed Systems', 'Go', 'Cloud Architecture'] }
  ];

  const candidateProfiles = [];

  candidateNames.forEach((c, idx) => {
    const id = `usr_cand_${idx + 1}`;
    users.push({
      id,
      name: c.name,
      email: c.email,
      passwordHash: INITIAL_PASSWORD_HASH,
      role: 'candidate',
      companyId: null,
      active: true,
      createdAt: subDays(80 - idx * 2),
      lastLoginAt: subDays(Math.max(1, idx))
    });

    candidateProfiles.push({
      userId: id,
      phone: `+1 (555) 01${String(idx + 10).padStart(2, '0')}`,
      location: c.loc,
      headline: `${c.title} • ${c.exp} yrs exp`,
      skills: c.skills,
      experienceYears: c.exp,
      education: 'B.S. in Computer Science or related degree',
      linkedin: `https://linkedin.example.com/in/${c.name.toLowerCase().replace(/\s+/g, '-')}`,
      resumeMeta: {
        fileName: `${c.name.replace(/\s+/g, '_')}_Resume.pdf`,
        sizeBytes: 1048576 + (idx * 25000),
        mimeType: 'application/pdf',
        uploadedAt: subDays(70 - idx * 2)
      }
    });
  });

  // 3. Jobs (12 items)
  const jobs = [
    {
      id: 'job_1',
      companyId: 'comp_1',
      title: 'Senior Full Stack Engineer',
      department: 'Engineering',
      location: 'Remote, US',
      type: 'Full-time',
      experience: '5+',
      salaryMin: 130000,
      salaryMax: 165000,
      description: 'We are seeking an experienced Full Stack Engineer to lead the architecture and implementation of mission-critical features on our high-scale cloud platforms.',
      requirements: ['5+ years web application development', 'Proficiency in modern JavaScript / TypeScript', 'Experience with SQL and relational databases', 'Demonstrated mentoring skills'],
      skills: ['JavaScript', 'Node.js', 'React', 'PostgreSQL', 'Docker'],
      status: 'published',
      postedAt: subDays(60),
      closesAt: addDays(30),
      createdBy: 'usr_hr_1'
    },
    {
      id: 'job_2',
      companyId: 'comp_1',
      title: 'Lead Product Designer',
      department: 'Design',
      location: 'New York, NY',
      type: 'Full-time',
      experience: '5+',
      salaryMin: 125000,
      salaryMax: 155000,
      description: 'Join our design org to lead product design systems, user journey mapping, and craft delightful interactions across web and mobile surfaces.',
      requirements: ['5+ years UI/UX design', 'Expertise in Figma design systems', 'Deep user research background', 'Strong portfolio'],
      skills: ['Figma', 'UI/UX', 'Design Systems', 'User Research'],
      status: 'published',
      postedAt: subDays(55),
      closesAt: addDays(25),
      createdBy: 'usr_hr_1'
    },
    {
      id: 'job_3',
      companyId: 'comp_1',
      title: 'Frontend Developer (Vanilla / Modern JS)',
      department: 'Engineering',
      location: 'San Francisco, CA',
      type: 'Full-time',
      experience: '3-5',
      salaryMin: 105000,
      salaryMax: 135000,
      description: 'Focus on pure performance, accessibility (WCAG AA), and modular vanilla JavaScript web applications that run lightning-fast on any device.',
      requirements: ['3+ years frontend web engineering', 'Mastery of semantic HTML5, CSS3, and ES modules', 'Deep commitment to web accessibility and performance'],
      skills: ['JavaScript', 'HTML5', 'CSS3', 'Web Accessibility', 'Performance'],
      status: 'published',
      postedAt: subDays(50),
      closesAt: addDays(40),
      createdBy: 'usr_hr_2'
    },
    {
      id: 'job_4',
      companyId: 'comp_1',
      title: 'Backend Engineer (Go / Distributed Systems)',
      department: 'Engineering',
      location: 'Remote, US',
      type: 'Full-time',
      experience: '3-5',
      salaryMin: 115000,
      salaryMax: 145000,
      description: 'Help scale our high-throughput backend services and event-driven architecture using Go and cloud native tooling.',
      requirements: ['3+ years backend development', 'Experience with Go or Java/Rust', 'Solid understanding of concurrency and caching'],
      skills: ['Go', 'Kubernetes', 'gRPC', 'PostgreSQL', 'Redis'],
      status: 'published',
      postedAt: subDays(45),
      closesAt: addDays(45),
      createdBy: 'usr_hr_2'
    },
    {
      id: 'job_5',
      companyId: 'comp_1',
      title: 'Product Manager (Growth & Lifecycle)',
      department: 'Product',
      location: 'Austin, TX',
      type: 'Full-time',
      experience: '3-5',
      salaryMin: 110000,
      salaryMax: 140000,
      description: 'Drive conversion, retention, and feature adoption across all user personas in our B2B SaaS ecosystem.',
      requirements: ['3+ years in software product management', 'Data-driven mindset with analytics expertise', 'Excellent cross-functional leadership'],
      skills: ['Product Strategy', 'Agile', 'User Analytics', 'A/B Testing'],
      status: 'published',
      postedAt: subDays(40),
      closesAt: addDays(50),
      createdBy: 'usr_hr_1'
    },
    {
      id: 'job_6',
      companyId: 'comp_1',
      title: 'DevOps & Cloud Infrastructure Architect',
      department: 'Infrastructure',
      location: 'Remote, US',
      type: 'Full-time',
      experience: '5+',
      salaryMin: 135000,
      salaryMax: 170000,
      description: 'Own AWS cloud architecture, CI/CD pipelines, security compliance, and zero-downtime deployment pipelines.',
      requirements: ['5+ years infrastructure engineering', 'Deep AWS and Terraform experience', 'Container orchestration with Kubernetes'],
      skills: ['AWS', 'Terraform', 'Kubernetes', 'CI/CD', 'Docker'],
      status: 'published',
      postedAt: subDays(35),
      closesAt: addDays(60),
      createdBy: 'usr_hr_2'
    },
    {
      id: 'job_7',
      companyId: 'comp_1',
      title: 'Content Marketing Manager',
      department: 'Marketing',
      location: 'Chicago, IL',
      type: 'Full-time',
      experience: '1-3',
      salaryMin: 75000,
      salaryMax: 95000,
      description: 'Produce high-converting blogs, whitepapers, case studies, and email campaigns to amplify our brand presence.',
      requirements: ['2+ years content marketing experience', 'Proven editorial and copywriting portfolio', 'Familiarity with SEO and CMS platforms'],
      skills: ['Content Marketing', 'SEO', 'Copywriting', 'HubSpot'],
      status: 'published',
      postedAt: subDays(30),
      closesAt: addDays(30),
      createdBy: 'usr_hr_1'
    },
    {
      id: 'job_8',
      companyId: 'comp_1',
      title: 'Enterprise Account Executive',
      department: 'Sales',
      location: 'New York, NY',
      type: 'Full-time',
      experience: '3-5',
      salaryMin: 95000,
      salaryMax: 150000,
      description: 'Prospect and close high-value annual contracts with Fortune 500 enterprise customers.',
      requirements: ['3+ years SaaS sales closing quota', 'Proven track record of beating quota', 'Deep knowledge of enterprise sales cycles'],
      skills: ['B2B Sales', 'Salesforce', 'Negotiation', 'CRM'],
      status: 'published',
      postedAt: subDays(28),
      closesAt: addDays(35),
      createdBy: 'usr_hr_2'
    },
    {
      id: 'job_9',
      companyId: 'comp_1',
      title: 'QA Automation Engineer',
      department: 'Engineering',
      location: 'Remote, US',
      type: 'Contract',
      experience: '1-3',
      salaryMin: 70000,
      salaryMax: 90000,
      description: 'Build robust end-to-end regression test suites using modern test automation frameworks.',
      requirements: ['2+ years test automation', 'Hands-on experience with Playwright or Cypress', 'CI integration knowledge'],
      skills: ['Cypress', 'Playwright', 'Jest', 'Test Automation'],
      status: 'published',
      postedAt: subDays(25),
      closesAt: addDays(40),
      createdBy: 'usr_hr_1'
    },
    {
      id: 'job_10',
      companyId: 'comp_1',
      title: 'UI/UX Design Intern',
      department: 'Design',
      location: 'Remote, US',
      type: 'Internship',
      experience: '0-1',
      salaryMin: 40000,
      salaryMax: 55000,
      description: 'Exciting 6-month paid internship working directly with our lead designers on web design systems and UI prototypes.',
      requirements: ['Enrolled in or recent graduate of design degree/bootcamp', 'Proficiency in Figma', 'Eagerness to learn in a fast-paced environment'],
      skills: ['Figma', 'Wireframing', 'Prototyping'],
      status: 'published',
      postedAt: subDays(20),
      closesAt: addDays(20),
      createdBy: 'usr_hr_1'
    },
    {
      id: 'job_11',
      companyId: 'comp_1',
      title: 'Data Scientist (Machine Learning)',
      department: 'Engineering',
      location: 'Boston, MA',
      type: 'Full-time',
      experience: '3-5',
      salaryMin: 125000,
      salaryMax: 160000,
      description: 'Develop intelligent predictive models and matching algorithms for talent analytics.',
      requirements: ['Master degree in CS/Stats/Math', 'Python, Scikit-learn, PyTorch', 'Experience deploying models in production'],
      skills: ['Python', 'Machine Learning', 'SQL', 'PyTorch'],
      status: 'draft',
      postedAt: subDays(10),
      closesAt: addDays(60),
      createdBy: 'usr_hr_1'
    },
    {
      id: 'job_12',
      companyId: 'comp_1',
      title: 'Customer Success Specialist',
      department: 'Customer Support',
      location: 'Remote, US',
      type: 'Part-time',
      experience: '1-3',
      salaryMin: 50000,
      salaryMax: 65000,
      description: 'Help customers maximize value through prompt onboarding, troubleshooting, and support guidance.',
      requirements: ['1+ years in client support', 'Excellent empathy and written communication'],
      skills: ['Customer Support', 'Zendesk', 'Client Relations'],
      status: 'closed',
      postedAt: subDays(75),
      closesAt: subDays(5),
      createdBy: 'usr_hr_2'
    }
  ];

  // 4. Offer Templates
  const offerTemplates = [
    {
      id: 'tmpl_standard',
      name: 'Standard Full-Time Offer',
      body: `Dear {{candidate_name}},

We are thrilled to extend an offer of employment for the position of {{job_title}} at {{company_name}}!

Here are the key terms of your employment:
- Position: {{job_title}}
- Annual Salary: \${{salary}} USD
- Target Start Date: {{start_date}}
- Reporting Manager: Engineering / Department Lead
- Benefits: Full Health, Dental, Vision, 401(k) matching, and flexible PTO

Please review and confirm your acceptance below by your start date.

Sincerely,
{{hr_name}}
Talent Acquisition, {{company_name}}`
    }
  ];

  // 5. Applications, Stage History, Interviews, Offers, Onboarding Tasks, Notifications, Activity Log
  const applications = [];
  const stageHistory = [];
  const interviews = [];
  const interviewFeedback = [];
  const offers = [];
  const onboardingTasks = [];
  const notifications = [];
  const activityLog = [];

  const stagesPool = [
    'Applied', 'Screening', 'Interview', 'Selected', 'Offered', 'Rejected', 'Withdrawn'
  ];

  let appIdCounter = 1;
  let histIdCounter = 1;
  let intIdCounter = 1;
  let offerIdCounter = 1;
  let notifIdCounter = 1;
  let actIdCounter = 1;

  // Distribute applications systematically across candidates and jobs
  // Every candidate gets 2-4 applications, ensuring ~70 applications total
  const stageDistribution = [
    'Offered', 'Selected', 'Interview', 'Screening', 'Applied',
    'Interview', 'Screening', 'Applied', 'Rejected', 'Withdrawn',
    'Interview', 'Selected', 'Applied', 'Screening', 'Offered'
  ];

  for (let cIdx = 0; cIdx < candidateProfiles.length; cIdx++) {
    const cand = candidateProfiles[cIdx];
    const numApps = (cIdx % 3) + 2; // 2 to 4 apps each

    for (let a = 0; a < numApps; a++) {
      const jobIdx = (cIdx + a * 3) % jobs.length;
      const job = jobs[jobIdx];
      const appId = `app_${appIdCounter++}`;
      
      const assignedStage = stageDistribution[(cIdx * 3 + a) % stageDistribution.length];
      const appliedDaysAgo = 80 - (cIdx * 2 + a * 3);
      const appliedAt = subDays(Math.max(appliedDaysAgo, 5));

      const rating = (cIdx % 5) + 1; // 1 to 5 rating

      applications.push({
        id: appId,
        jobId: job.id,
        candidateId: cand.userId,
        stage: assignedStage,
        coverNote: `I am thrilled to apply for the ${job.title} role. My experience in ${cand.skills.slice(0, 3).join(', ')} aligns strongly with your requirements.`,
        resumeMeta: cand.resumeMeta,
        appliedAt,
        updatedAt: subDays(Math.max(appliedDaysAgo - 8, 1)),
        rating
      });

      // Audit Trail (stageHistory) - strictly append-only
      stageHistory.push({
        id: `hist_${histIdCounter++}`,
        applicationId: appId,
        fromStage: null,
        toStage: 'Applied',
        actorId: cand.userId,
        note: 'Application submitted online',
        at: appliedAt
      });

      if (assignedStage !== 'Applied') {
        const screenDate = subDays(Math.max(appliedDaysAgo - 3, 4));
        stageHistory.push({
          id: `hist_${histIdCounter++}`,
          applicationId: appId,
          fromStage: 'Applied',
          toStage: 'Screening',
          actorId: 'usr_hr_1',
          note: 'Resume matches core criteria. Moving to initial screening.',
          at: screenDate
        });

        if (['Interview', 'Selected', 'Offered', 'Rejected', 'Withdrawn'].includes(assignedStage)) {
          const intDate = subDays(Math.max(appliedDaysAgo - 6, 3));
          
          // Seed Interview record
          const intId = `int_${intIdCounter++}`;
          const isUpcoming = (cIdx % 4 === 0);
          const intStartsAt = isUpcoming ? addDays(2 + a) : subDays(Math.max(appliedDaysAgo - 7, 2));

          interviews.push({
            id: intId,
            applicationId: appId,
            title: `Technical & Cultural Interview - ${job.title}`,
            startsAt: intStartsAt,
            durationMin: 45,
            mode: a % 2 === 0 ? 'Video' : 'Phone',
            location: a % 2 === 0 ? 'https://meet.example.com/hireflow-interview' : '+1 555-0100 ext 44',
            participants: ['usr_hr_1', 'usr_hr_2'],
            status: isUpcoming ? 'scheduled' : 'completed',
            createdBy: 'usr_hr_1',
            updatedAt: intStartsAt
          });

          stageHistory.push({
            id: `hist_${histIdCounter++}`,
            applicationId: appId,
            fromStage: 'Screening',
            toStage: 'Interview',
            actorId: 'usr_hr_1',
            note: 'Screening passed. Scheduled panel interview.',
            at: intDate
          });

          if (!isUpcoming) {
            interviewFeedback.push({
              id: `fb_${intId}`,
              interviewId: intId,
              authorId: 'usr_hr_1',
              rating: Math.min(5, rating + 1),
              recommendation: rating >= 4 ? 'Strong yes' : (rating >= 3 ? 'Yes' : 'No'),
              comments: 'Candidate demonstrated deep conceptual clarity and great collaborative communication skills.',
              at: intDate
            });
          }

          if (['Selected', 'Offered'].includes(assignedStage)) {
            const selectDate = subDays(Math.max(appliedDaysAgo - 10, 2));
            stageHistory.push({
              id: `hist_${histIdCounter++}`,
              applicationId: appId,
              fromStage: 'Interview',
              toStage: 'Selected',
              actorId: 'usr_hr_2',
              note: 'Interview feedback positive. Selected for offer generation.',
              at: selectDate
            });

            if (assignedStage === 'Offered') {
              const offerDate = subDays(Math.max(appliedDaysAgo - 14, 1));
              const offerSalary = Math.round((job.salaryMin + job.salaryMax) / 2);
              const offerId = `off_${offerIdCounter++}`;
              const offerStatus = cIdx % 2 === 0 ? 'accepted' : 'issued';

              offers.push({
                id: offerId,
                applicationId: appId,
                templateId: 'tmpl_standard',
                salary: offerSalary,
                startDate: addDays(14),
                status: offerStatus,
                renderedBody: offerTemplates[0].body
                  .replace('{{candidate_name}}', users.find(u => u.id === cand.userId)?.name || 'Candidate')
                  .replace(/{{job_title}}/g, job.title)
                  .replace(/{{company_name}}/g, companies[0].name)
                  .replace('{{salary}}', offerSalary.toLocaleString())
                  .replace('{{start_date}}', addDays(14).split('T')[0])
                  .replace('{{hr_name}}', 'Elena Rostova'),
                issuedAt: offerDate,
                respondedAt: offerStatus === 'accepted' ? subDays(Math.max(appliedDaysAgo - 16, 0)) : null
              });

              // Add Onboarding Tasks for accepted offers
              if (offerStatus === 'accepted') {
                onboardingTasks.push(
                  { id: `task_${offerId}_1`, offerId, title: 'Submit signed direct deposit form', owner: 'candidate', dueDate: addDays(10), done: true },
                  { id: `task_${offerId}_2`, offerId, title: 'Upload Government-issued photo ID', owner: 'candidate', dueDate: addDays(12), done: false },
                  { id: `task_${offerId}_3`, offerId, title: 'Provision IT developer hardware and credentials', owner: 'hr', dueDate: addDays(13), done: false },
                  { id: `task_${offerId}_4`, offerId, title: 'Schedule 30-day orientation buddy sync', owner: 'hr', dueDate: addDays(14), done: false }
                );
              }

              stageHistory.push({
                id: `hist_${histIdCounter++}`,
                applicationId: appId,
                fromStage: 'Selected',
                toStage: 'Offered',
                actorId: 'usr_hr_1',
                note: `Official offer issued ($${offerSalary.toLocaleString()}).`,
                at: offerDate
              });
            }
          } else if (assignedStage === 'Rejected') {
            stageHistory.push({
              id: `hist_${histIdCounter++}`,
              applicationId: appId,
              fromStage: 'Interview',
              toStage: 'Rejected',
              actorId: 'usr_hr_1',
              note: 'Profile did not meet required senior experience benchmark.',
              at: subDays(Math.max(appliedDaysAgo - 12, 1))
            });
          } else if (assignedStage === 'Withdrawn') {
            stageHistory.push({
              id: `hist_${histIdCounter++}`,
              applicationId: appId,
              fromStage: 'Interview',
              toStage: 'Withdrawn',
              actorId: cand.userId,
              note: 'Candidate accepted competing local offer.',
              at: subDays(Math.max(appliedDaysAgo - 12, 1))
            });
          }
        }
      }

      // Enqueue Mock Notifications (~15% failed for demo retry capability)
      const isFailed = (notifIdCounter % 7 === 0);
      notifications.push({
        id: `notif_${notifIdCounter++}`,
        type: 'stage_update',
        toUserId: cand.userId,
        subject: `Update on your application for ${job.title} at ${companies[0].name}`,
        body: `Hello, your application has progressed to stage: ${assignedStage}. Please check your portal for next steps.`,
        status: isFailed ? 'failed' : 'sent',
        attempts: isFailed ? 1 : 1,
        lastError: isFailed ? 'Connection timeout to mock mail gateway' : null,
        createdAt: appliedAt,
        sentAt: isFailed ? null : appliedAt
      });

      // System Activity Entry
      activityLog.push({
        id: `act_${actIdCounter++}`,
        actorId: 'usr_hr_1',
        action: 'application.stage_changed',
        entityType: 'application',
        entityId: appId,
        at: appliedAt,
        meta: { jobTitle: job.title, stage: assignedStage }
      });
    }
  }

  return {
    companies,
    users,
    jobs,
    candidateProfiles,
    applications,
    stageHistory,
    interviews,
    interviewFeedback,
    offerTemplates,
    offers,
    onboardingTasks,
    notifications,
    activityLog
  };
}

/**
 * Initializes or resets the database in localStorage
 * @param {boolean} forceReset 
 */
export function initDatabase(forceReset = false) {
  const existing = storage.get(DB_KEY, null);
  if (!existing || forceReset) {
    const seed = generateSeedData();
    storage.set(DB_KEY, seed);
    return seed;
  }
  return existing;
}

/**
 * Reset demo data helper
 */
export function resetDemoData() {
  const seed = generateSeedData();
  storage.set(DB_KEY, seed);
  sessionStorage.removeItem('hireflow_banner_dismissed');
  return seed;
}
