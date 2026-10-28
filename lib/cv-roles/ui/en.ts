import type { RoleUi } from "@/lib/cv-roles/types";

// English. Shared labels for "CV example by role" pages (28.10.2026).
export const en: RoleUi = {
  breadcrumbExamples: "CV examples",
  titleTpl: "{role} CV Example {year} + Free PDF | A1",
  descriptionTpl:
    "{role} CV example for {year}: what recruiters check, skills and salaries from real A1 jobs, sample summaries. Build your free PDF CV.",
  h1Tpl: "{role} CV example ({year})",
  leadTpl:
    "What to put in your {role} CV, which skills employers ask for and what they pay, based on real A1 job posts. Build the same kind of PDF CV from your profile for free.",
  ctaCreate: "Create my free CV",
  ctaDownload: "Download my CV",
  ctaFill: "Complete my profile",
  signedInHint: "Your CV is built from your profile. The fuller your profile, the stronger your CV.",
  h2Recruiters: "What recruiters look for first",
  h2Skills: "What {n} A1 job posts ask for",
  skillsNote: "Share of A1 job posts for this role that mention the skill.",
  skillsFallback: "Key skills for this role",
  h2Salary: "Salaries in A1 job posts",
  salaryNote: "Median salary range in job posts that publish a salary, USD per month.",
  salaryFrom: "from",
  salaryTo: "to",
  h2Summaries: "Sample summaries",
  levels: { junior: "Junior", middle: "Middle", senior: "Senior" },
  h2Tip: "Tip for this role",
  h2Github: "How to show projects and GitHub",
  githubText:
    "Links to 2-3 real projects say more than a long list of technologies: briefly explain what you built yourself and what came of it. Verify GitHub in your A1 profile by signing in to GitHub, and your CV gets a tile with your activity calendar and real contribution count.",
  h2Mistakes: "Common IT CV mistakes",
  mistakes: [
    "Listing duties instead of results. Instead of \"worked on the backend\", say what changed: speed, number of users, fewer bugs.",
    "Listing every technology you have ever touched. Keep the ones you can discuss in an interview and show your level.",
    "Sending one CV to every job. Match skill names to the wording of the job post so both recruiters and ATS software find you.",
    "Missing or broken links to code and portfolio. Open every link before you send the CV.",
    "Typos and inconsistent tech names, like \"javascript\", \"JS\" and \"JavaScript\" in one document. Spell them the way the official docs do.",
  ],
  h2Faq: "FAQ",
  faq: [
    {
      q: "How long should your {role} CV be?",
      a: "One page is enough for junior and middle levels; seniors can use two. An A1 CV fits on one page and neatly continues on a second if your profile is large.",
    },
    {
      q: "How do I write my first {role} CV with no experience?",
      a: "Show study and pet projects, courses, hackathons and volunteer work. A verified GitHub with an activity calendar on your A1 CV clearly shows that you practice regularly.",
    },
    {
      q: "Which skills should your {role} CV list?",
      a: "The ones that appear most often in job posts: see the stats above. Each skill level on an A1 CV comes from the slider in your profile, so rate yourself honestly.",
    },
    {
      q: "Should my {role} CV be in English?",
      a: "For international companies and jobs abroad, yes. A1 detects the CV language from your profile text: fill in your profile in English and the headings will be in English too.",
    },
  ],
  h2Related: "Related roles",
  h2Jobs: "Latest {role} jobs",
  jobsMore: "All jobs",
  hubTitle: "CV examples by role",
  hubLead:
    "What recruiters look for, which skills A1 job posts ask for and what they pay. Pick your role.",
};
