// lib/seo/job-role.ts
//
// 01.10.2026 (SEO, по анализу ключевых слов: «вакансії qa», «тестувальник
// робота», «робота дизайнер», «project manager вакансії»). Профессия
// вакансии по ЗАГОЛОВКУ -- тем же способом, что уровень (lib/seo/job-level.ts):
// описание не смотрим, там названия чужих ролей встречаются в тексте про
// команду. Вакансия может попасть в несколько профессий («Product Designer
// & Researcher»), поэтому здесь список, а не одно значение.
//
// Границы слова заданы вручную: \b в JS не понимает кириллицу.

export type JobRole = "qa" | "frontend" | "backend" | "fullstack" | "mobile" | "devops" | "data" | "design" | "pm";

export type RoleInfo = {
  slug: JobRole;
  /** Подпись в ссылках и заголовках (английская, как в самих вакансиях). */
  label: string;
  /** Украинское название профессии для заголовков: «QA та тестування». */
  uk: string;
  ru: string;
  /** Что люди пишут в поиске -- идёт в описание страницы. */
  uk_hint: string;
  rx: RegExp;
};

const B = "(^|[^a-zа-яіїєґ0-9])";
const E = "([^a-zа-яіїєґ0-9]|$)";
const rx = (body: string) => new RegExp(`${B}(${body})${E}`, "i");

export const ROLES: RoleInfo[] = [
  {
    slug: "qa",
    label: "QA",
    uk: "QA та тестування",
    ru: "QA и тестирование",
    uk_hint: "QA, тестувальник, QA automation, SDET",
    rx: rx("qa|qe|sdet|quality assurance|quality engineer|test engineer|test automation|software tester|tester|тестувальник[а-яіїєґ]*|тестировщик[а-яіїєґ]*"),
  },
  {
    slug: "frontend",
    label: "Frontend",
    uk: "Frontend-розробка",
    ru: "Frontend-разработка",
    uk_hint: "Frontend, React, Vue, Angular, JavaScript",
    rx: rx("front[- ]?end|react developer|react engineer|vue developer|angular developer|ui developer"),
  },
  {
    slug: "backend",
    label: "Backend",
    uk: "Backend-розробка",
    ru: "Backend-разработка",
    uk_hint: "Backend, Java, Python, Node.js, .NET, Go",
    rx: rx("back[- ]?end|server[- ]side|java developer|python developer|node\\.?js developer|golang developer|go developer|\\.net developer|php developer|ruby developer"),
  },
  {
    slug: "fullstack",
    label: "Fullstack",
    uk: "Fullstack-розробка",
    ru: "Fullstack-разработка",
    uk_hint: "Fullstack, full-stack developer",
    rx: rx("full[- ]?stack"),
  },
  {
    slug: "mobile",
    label: "Mobile",
    uk: "Мобільна розробка",
    ru: "Мобильная разработка",
    uk_hint: "iOS, Android, Flutter, React Native, Swift, Kotlin",
    rx: rx("mobile|ios|android|flutter|react native|swift developer|kotlin developer"),
  },
  {
    slug: "devops",
    label: "DevOps",
    uk: "DevOps та інфраструктура",
    ru: "DevOps и инфраструктура",
    uk_hint: "DevOps, SRE, Cloud, Kubernetes, системний адміністратор",
    rx: rx("devops|sre|site reliability|platform engineer|cloud engineer|infrastructure engineer|system administrator|sysadmin|systems engineer|devsecops"),
  },
  {
    slug: "data",
    label: "Data",
    uk: "Дані та AI",
    ru: "Данные и AI",
    uk_hint: "Data Analyst, Data Scientist, Data Engineer, ML, BI, аналітик даних",
    rx: rx("data (scientist|analyst|engineer|architect)|data science|machine learning|ml engineer|ai engineer|bi (developer|analyst|engineer)|analytics engineer|business intelligence|аналітик даних|аналитик данных"),
  },
  {
    slug: "design",
    label: "Design",
    uk: "UI/UX та дизайн",
    ru: "UI/UX и дизайн",
    uk_hint: "UI/UX дизайнер, Product Designer, графічний дизайнер",
    rx: rx("designer|ux|ui/ux|ux/ui|product design|design lead|дизайнер[а-яіїєґ]*"),
  },
  {
    slug: "pm",
    label: "Project & Product",
    uk: "Project та Product Manager",
    ru: "Project и Product Manager",
    uk_hint: "Project Manager, Product Manager, Product Owner, Scrum Master",
    rx: rx("project manager|product manager|product owner|scrum master|delivery manager|program manager|проджект[а-яіїєґ]*|продакт[а-яіїєґ]*"),
  },
];

export const JOB_ROLES: JobRole[] = ROLES.map((r) => r.slug);

export function roleInfo(slug: string): RoleInfo | null {
  return ROLES.find((r) => r.slug === slug) ?? null;
}

export function extractRoles(title: string): JobRole[] {
  return ROLES.filter((r) => r.rx.test(title)).map((r) => r.slug);
}
