// lib/seo/tech-catalog.ts
//
// 2026-09-20 (Александр: «надо добавить теги по стеку как мы и планировали»).
//
// ЧТО ЭТО. Полный список технологий, по которым можно отобрать ленту, --
// все семьдесят девять из словаря lib/seo/job-tech-tags.ts, разложенные по
// разделам и снабжённые slug'ами для адреса (?stack=<slug>).
//
// ПОЧЕМУ ОТДЕЛЬНО ОТ tech-landings.ts. Посадочных страниц намеренно
// шестнадцать: страница с тремя вакансиями не нужна ни Google, ни нам. А
// фильтр -- дело другое: человек ищет Rust или Appium именно потому, что
// таких вакансий мало, и «нет в списке» он читает как «у вас такого нет».
// Поэтому фильтр знает весь словарь, а посадочные -- по-прежнему свою
// короткую выборку; TECH_LANDINGS остаётся источником правды для адресов
// /jobs/stack/<slug>, и slug'и здесь совпадают с ним буква в букву.
//
// ПОРЯДОК разделов -- от того, что спрашивают чаще, к тому, что реже.
// Внутри раздела -- как в словаре: язык, потом его фреймворки рядом.

import type { Locale } from "@/components/t";

export type TechEntry = {
  /** Часть адреса: ?stack=<slug>. */
  slug: string;
  /** Каноническое имя из словаря lib/seo/job-tech-tags.ts, буква в букву. */
  tech: string;
};

export type TechGroup = {
  id: string;
  title: Record<Locale, string>;
  items: TechEntry[];
};

const t = (slug: string, tech: string): TechEntry => ({ slug, tech });

export const TECH_GROUPS: TechGroup[] = [
  {
    id: "lang",
    title: {
      uk: "Мови та фреймворки",
      en: "Languages & frameworks",
      ru: "Языки и фреймворки",
      de: "Sprachen & Frameworks",
      es: "Lenguajes y frameworks",
      fr: "Langages et frameworks",
      pl: "Języki i frameworki",
      ptBR: "Linguagens e frameworks",
      zh: "语言与框架",
    },
    items: [
      t("javascript", "JavaScript"),
      t("typescript", "TypeScript"),
      t("react", "React"),
      t("react-native", "React Native"),
      t("nextjs", "Next.js"),
      t("angular", "Angular"),
      t("vue", "Vue.js"),
      t("nodejs", "Node.js"),
      t("python", "Python"),
      t("django", "Django"),
      t("fastapi", "FastAPI"),
      t("java", "Java"),
      t("spring", "Spring"),
      t("kotlin", "Kotlin"),
      t("swift", "Swift"),
      t("objective-c", "Objective-C"),
      t("flutter", "Flutter"),
      t("dart", "Dart"),
      t("php", "PHP"),
      t("laravel", "Laravel"),
      t("symfony", "Symfony"),
      t("ruby", "Ruby"),
      t("rails", "Rails"),
      t("golang", "Go"),
      t("rust", "Rust"),
      t("csharp", "C#"),
      t("dotnet", ".NET"),
      t("cpp", "C++"),
      t("scala", "Scala"),
      t("elixir", "Elixir"),
    ],
  },
  {
    id: "data",
    title: {
      uk: "Бази та дані",
      en: "Databases & data",
      ru: "Базы и данные",
      de: "Datenbanken & Daten",
      es: "Bases de datos y datos",
      fr: "Bases de données",
      pl: "Bazy i dane",
      ptBR: "Bancos e dados",
      zh: "数据库与数据",
    },
    items: [
      t("sql", "SQL"),
      t("postgresql", "PostgreSQL"),
      t("mysql", "MySQL"),
      t("mongodb", "MongoDB"),
      t("redis", "Redis"),
      t("elasticsearch", "Elasticsearch"),
      t("kafka", "Kafka"),
      t("rabbitmq", "RabbitMQ"),
      t("graphql", "GraphQL"),
      t("rest", "REST"),
    ],
  },
  {
    id: "cloud",
    title: {
      uk: "Хмари та DevOps",
      en: "Cloud & DevOps",
      ru: "Облака и DevOps",
      de: "Cloud & DevOps",
      es: "Cloud y DevOps",
      fr: "Cloud et DevOps",
      pl: "Chmura i DevOps",
      ptBR: "Nuvem e DevOps",
      zh: "云与 DevOps",
    },
    items: [
      t("aws", "AWS"),
      t("gcp", "GCP"),
      t("azure", "Azure"),
      t("docker", "Docker"),
      t("kubernetes", "Kubernetes"),
      t("terraform", "Terraform"),
      t("ansible", "Ansible"),
      t("linux", "Linux"),
      t("cicd", "CI/CD"),
      t("git", "Git"),
      t("jenkins", "Jenkins"),
    ],
  },
  {
    id: "ml",
    title: {
      uk: "ML та аналітика",
      en: "ML & analytics",
      ru: "ML и аналитика",
      de: "ML & Analytics",
      es: "ML y analítica",
      fr: "ML et analytique",
      pl: "ML i analityka",
      ptBR: "ML e analytics",
      zh: "机器学习与分析",
    },
    items: [
      t("machine-learning", "Machine Learning"),
      t("data-science", "Data Science"),
      t("pytorch", "PyTorch"),
      t("tensorflow", "TensorFlow"),
      t("pandas", "Pandas"),
      t("spark", "Spark"),
      t("airflow", "Airflow"),
      t("tableau", "Tableau"),
      t("power-bi", "Power BI"),
      t("excel", "Excel"),
    ],
  },
  {
    id: "qa",
    title: {
      uk: "Тестування",
      en: "Testing",
      ru: "Тестирование",
      de: "Testing",
      es: "Testing",
      fr: "Tests",
      pl: "Testowanie",
      ptBR: "Testes",
      zh: "测试",
    },
    items: [
      t("selenium", "Selenium"),
      t("cypress", "Cypress"),
      t("playwright", "Playwright"),
      t("appium", "Appium"),
    ],
  },
  {
    id: "design",
    title: {
      uk: "Дизайн та движки",
      en: "Design & engines",
      ru: "Дизайн и движки",
      de: "Design & Engines",
      es: "Diseño y motores",
      fr: "Design et moteurs",
      pl: "Design i silniki",
      ptBR: "Design e engines",
      zh: "设计与引擎",
    },
    items: [
      t("figma", "Figma"),
      t("photoshop", "Photoshop"),
      t("illustrator", "Illustrator"),
      t("blender", "Blender"),
      t("unity", "Unity"),
      t("unreal", "Unreal Engine"),
    ],
  },
  {
    id: "marketing",
    title: {
      uk: "Маркетинг",
      en: "Marketing",
      ru: "Маркетинг",
      de: "Marketing",
      es: "Marketing",
      fr: "Marketing",
      pl: "Marketing",
      ptBR: "Marketing",
      zh: "市场营销",
    },
    items: [t("seo", "SEO"), t("ppc", "PPC"), t("google-ads", "Google Ads"), t("meta-ads", "Meta Ads")],
  },
  {
    id: "business",
    title: {
      uk: "Бізнес-системи",
      en: "Business systems",
      ru: "Бизнес-системы",
      de: "Business-Systeme",
      es: "Sistemas de negocio",
      fr: "Systèmes métier",
      pl: "Systemy biznesowe",
      ptBR: "Sistemas de negócio",
      zh: "业务系统",
    },
    items: [t("salesforce", "Salesforce"), t("sap", "SAP"), t("1c", "1C"), t("jira", "Jira")],
  },
];

export const TECH_CATALOG: TechEntry[] = TECH_GROUPS.flatMap((group) => group.items);

const BY_SLUG = new Map(TECH_CATALOG.map((item) => [item.slug, item]));
const BY_TECH = new Map(TECH_CATALOG.map((item) => [item.tech, item]));

/** Каноническое имя технологии по slug'у из адреса; undefined для чужого. */
export function techForSlug(slug: string): string | undefined {
  return BY_SLUG.get(slug)?.tech;
}

export function slugForTech(tech: string): string | undefined {
  return BY_TECH.get(tech)?.slug;
}
