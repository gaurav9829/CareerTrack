// Inserts ~12 clearly FAKE jobs so the UI has data for demos.
// Mix of statuses: published/active, published/expired, draft, closed.
// Run: npm run seed:jobs   (run seed:admin first - jobs need a createdBy admin)
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Admin = require('../models/Admin');
const Job = require('../models/Job');

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n) => new Date(Date.now() + n * DAY);

// All companies, people and details below are fictional.
const fakeJobs = [
  {
    title: 'Frontend Developer',
    company: 'TechNova Solutions',
    location: 'Bengaluru, Karnataka',
    employmentType: 'Full-time',
    experienceLevel: 'Junior',
    salary: { min: 450000, max: 700000, currency: 'INR' },
    description:
      'Build responsive React interfaces for a fictional SaaS dashboard used by demo customers.',
    responsibilities: [
      'Build reusable React components',
      'Work with designers on UI polish',
      'Write clean, tested code',
    ],
    qualifications: ['B.Tech/BCA or equivalent', '1+ year with React'],
    skills: ['React', 'JavaScript', 'Tailwind CSS', 'Git'],
    benefits: ['Health insurance', 'Flexible hours', 'Learning budget'],
    applicationInstructions: 'Apply through this portal with your latest résumé.',
    deadline: inDays(21),
    status: 'published',
  },
  {
    title: 'Backend Engineer (Node.js)',
    company: 'DataBridge Systems',
    location: 'Hyderabad, Telangana',
    employmentType: 'Full-time',
    experienceLevel: 'Mid',
    salary: { min: 800000, max: 1400000, currency: 'INR' },
    description: 'Design REST APIs and data models for a demo logistics platform.',
    responsibilities: ['Design Express APIs', 'Model MongoDB schemas', 'Add automated tests'],
    qualifications: ['3+ years backend experience', 'Strong JS fundamentals'],
    skills: ['Node.js', 'Express', 'MongoDB', 'Jest'],
    benefits: ['Relocation support', 'Annual bonus'],
    applicationInstructions: 'Attach a PDF résumé.',
    deadline: inDays(14),
    status: 'published',
  },
  {
    title: 'MERN Stack Intern',
    company: 'PixelForge Labs',
    location: 'Remote (India)',
    employmentType: 'Internship',
    experienceLevel: 'Fresher',
    salary: { min: 15000, max: 25000, currency: 'INR' },
    description: 'Six-month internship on a fictional portfolio-builder product (stipend/month).',
    responsibilities: ['Ship small features', 'Fix reported bugs', 'Join daily standups'],
    qualifications: ['Final-year student or graduate', 'Basic React + Node'],
    skills: ['React', 'Node.js', 'MongoDB'],
    benefits: ['Mentorship', 'Certificate', 'PPO opportunity'],
    applicationInstructions: 'Internship - mention available joining date in your cover letter.',
    deadline: inDays(30),
    status: 'published',
  },
  {
    title: 'DevOps Associate',
    company: 'CloudNest Infra',
    location: 'Pune, Maharashtra',
    employmentType: 'Full-time',
    experienceLevel: 'Junior',
    salary: { min: 500000, max: 800000, currency: 'INR' },
    description: 'Automate deployments for a demo cloud-hosting dashboard.',
    responsibilities: ['Write CI pipelines', 'Containerize services', 'Monitor uptime'],
    qualifications: ['Linux fundamentals', 'Docker basics'],
    skills: ['Docker', 'GitHub Actions', 'AWS', 'Linux'],
    benefits: ['Certification reimbursement'],
    deadline: inDays(10),
    status: 'published',
  },
  {
    title: 'UI/UX Designer',
    company: 'Brightline Studio',
    location: 'Mumbai, Maharashtra',
    employmentType: 'Contract',
    experienceLevel: 'Mid',
    salary: { min: null, max: null, currency: 'INR' },
    description: 'Design flows and mockups for fictional client projects.',
    responsibilities: ['Wireframes', 'Design systems', 'Usability reviews'],
    qualifications: ['Portfolio required', '3+ years design experience'],
    skills: ['Figma', 'Prototyping', 'Design Systems'],
    benefits: [],
    deadline: inDays(18),
    status: 'published',
  },
  {
    title: 'Data Analyst',
    company: 'MetricWise Analytics',
    location: 'Chennai, Tamil Nadu',
    employmentType: 'Full-time',
    experienceLevel: 'Mid',
    salary: { min: 600000, max: 900000, currency: 'INR' },
    description: 'Turn demo e-commerce data into dashboards and insight reports.',
    responsibilities: ['SQL reporting', 'Build dashboards', 'Present insights'],
    qualifications: ['2+ years analytics experience', 'SQL fluency'],
    skills: ['SQL', 'Power BI', 'Python', 'Excel'],
    benefits: ['Health insurance', 'Flexible hours'],
    deadline: inDays(25),
    status: 'published',
  },
  {
    title: 'QA Automation Engineer',
    company: 'TestCraft Technologies',
    location: 'Noida, Uttar Pradesh',
    employmentType: 'Full-time',
    experienceLevel: 'Junior',
    salary: { min: 400000, max: 650000, currency: 'INR' },
    description: 'Automate regression suites for a demo banking portal.',
    responsibilities: ['Write Playwright tests', 'Own regression runs', 'Report bugs'],
    qualifications: ['1+ year QA experience', 'Basics of JS'],
    skills: ['Playwright', 'JavaScript', 'Jest'],
    benefits: ['Annual bonus'],
    deadline: inDays(12),
    status: 'published',
  },
  {
    title: 'Mobile App Developer (Flutter)',
    company: 'AppOrbit Media',
    location: 'Ahmedabad, Gujarat',
    employmentType: 'Full-time',
    experienceLevel: 'Mid',
    salary: { min: 700000, max: 1100000, currency: 'INR' },
    description: 'Build a demo news-reader app for Android and iOS from one codebase.',
    responsibilities: ['Feature screens', 'API integration', 'Store releases'],
    qualifications: ['2+ years Flutter'],
    skills: ['Flutter', 'Dart', 'REST APIs'],
    benefits: ['Health insurance', 'Learning budget'],
    deadline: inDays(-5), // already expired on purpose
    status: 'published',
  },
  {
    title: 'Technical Writer (Documentation)',
    company: 'DocsHaven',
    location: 'Remote (India)',
    employmentType: 'Freelance',
    experienceLevel: 'Junior',
    salary: { min: null, max: null, currency: 'INR' },
    description: 'Write developer guides for a fictional API-first product.',
    responsibilities: ['Draft guides', 'Keep docs updated'],
    qualifications: ['Clear written English', 'Basic coding knowledge'],
    skills: ['Technical Writing', 'Markdown'],
    benefits: [],
    deadline: null, // no deadline - stays open
    status: 'published',
  },
  {
    title: 'Python Instructor (Part-time)',
    company: 'CodeAcademy Junction',
    location: 'Kolkata, West Bengal',
    employmentType: 'Part-time',
    experienceLevel: 'Senior',
    salary: { min: 300000, max: 450000, currency: 'INR' },
    description: 'Teach evening Python batches for a demo training institute.',
    responsibilities: ['Take live classes', 'Review assignments'],
    qualifications: ['3+ years teaching or industry experience'],
    skills: ['Python', 'Teaching', 'Django'],
    benefits: [],
    deadline: inDays(40),
    status: 'draft', // intentionally NOT visible to the public
  },
  {
    title: 'Engineering Manager - Web',
    company: 'TechNova Solutions',
    location: 'Bengaluru, Karnataka',
    employmentType: 'Full-time',
    experienceLevel: 'Lead',
    salary: { min: 2500000, max: 3500000, currency: 'INR' },
    description: 'Lead a small web team for a fictional fintech dashboard.',
    responsibilities: ['Mentor engineers', 'Own delivery', 'Hire'],
    qualifications: ['6+ years experience', 'Team leadership'],
    skills: ['Leadership', 'React', 'Node.js'],
    benefits: ['Health insurance', 'ESOPs'],
    deadline: inDays(-20),
    status: 'closed', // intentionally closed
  },
  {
    title: 'WordPress Developer',
    company: 'SiteSmith Agency',
    location: 'Jaipur, Rajasthan',
    employmentType: 'Contract',
    experienceLevel: 'Junior',
    salary: { min: 250000, max: 400000, currency: 'INR' },
    description: 'Customize themes and plugins for small-business demo sites.',
    responsibilities: ['Theme customization', 'Plugin fixes'],
    qualifications: ['1+ year WordPress'],
    skills: ['WordPress', 'PHP', 'CSS'],
    benefits: [],
    deadline: inDays(15),
    status: 'draft',
  },
];

async function seedJobs() {
  await connectDB();

  const admin = await Admin.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
  if (!admin) {
    console.error('[seed] No admin found. Run `npm run seed:admin` first.');
    process.exit(1);
  }

  // Re-running the seed replaces all jobs. Applications are NOT touched here,
  // but a fresh demo usually starts from an empty database anyway.
  await Job.deleteMany({});
  const docs = fakeJobs.map((job) => ({
    ...job,
    createdBy: admin._id,
    publishedAt: job.status === 'published' ? new Date() : null,
  }));
  await Job.insertMany(docs);

  const counts = {
    published: await Job.countDocuments({ status: 'published' }),
    draft: await Job.countDocuments({ status: 'draft' }),
    closed: await Job.countDocuments({ status: 'closed' }),
  };
  console.log(`[seed] Inserted ${docs.length} fake jobs:`, counts);
}

module.exports = { seedJobs, fakeJobs };

if (require.main === module) {
  seedJobs()
    .then(() => disconnectDB())
    .catch((err) => {
      console.error('[seed] Failed:', err.message);
      process.exit(1);
    });
}
