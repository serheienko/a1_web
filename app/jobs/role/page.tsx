export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/role/page.tsx -- «Вакансії за професією»: указатель всех профессий.
//
// 25.10.2026 (Александр: «сделать хорошую страничку, чтобы всё отлично
// искалось по ролям... для SEO, чтобы было толково»). Страницы профессий
// (/jobs/role/<slug>) были и раньше, но собирались только в общем каталоге
// одной строкой ссылок. Здесь -- отдельный узел: профессии разложены по
// направлениям, у каждой число открытых вакансий и, если есть, ссылка на
// зарплаты. Сюда ведут каталог, главная и фильтр «Роль»; отсюда -- все
// живые страницы профессий. Только роли выше порога MIN_SEGMENT_POSTS, так
// что битых ссылок нет.

import type { Metadata } from "next";
import Link from "next/link";
import { T, type Locale } from "@/components/t";
import { globalRoleCounts } from "@/lib/a1/segment-index";
import { salaryRoles } from "@/lib/a1/salary-index";
import { roleInfo, type JobRole } from "@/lib/seo/job-role";
import { ROLE_LABELS } from "@/lib/seo/role-labels";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";

const SITE_URL = "https://jobs.a1appp.com";
const PAGE_URL = `${SITE_URL}/jobs/role`;
const TITLE = "Вакансії за професією — QA, DevOps, дизайн, PM, маркетинг, продажі | A1 Jobs";
const DESCRIPTION =
  "Усі професії в IT в одному місці: розробка, QA, DevOps, дані, дизайн, Project і Product Manager, маркетинг, продажі, HR, підтримка. Свіжі вакансії щодня, з числом відкритих позицій і зарплатами.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

type Group = { title: Record<Locale, string>; roles: JobRole[] };

const GROUPS: Group[] = [
  {
    title: { uk: "Розробка", en: "Development", ru: "Разработка", de: "Entwicklung", es: "Desarrollo", fr: "Développement", pl: "Programowanie", ptBR: "Desenvolvimento", zh: "开发" },
    roles: ["frontend", "backend", "fullstack", "mobile", "software", "embedded", "gamedev", "blockchain", "ai", "architect", "lead"],
  },
  {
    title: { uk: "Якість та інфраструктура", en: "Quality & infrastructure", ru: "Качество и инфраструктура", de: "Qualität & Infrastruktur", es: "Calidad e infraestructura", fr: "Qualité & infrastructure", pl: "Jakość i infrastruktura", ptBR: "Qualidade e infraestrutura", zh: "质量与基础设施" },
    roles: ["qa", "devops", "security", "dba", "network", "support"],
  },
  {
    title: { uk: "Дані та аналітика", en: "Data & analysis", ru: "Данные и аналитика", de: "Daten & Analyse", es: "Datos y análisis", fr: "Données & analyse", pl: "Dane i analiza", ptBR: "Dados e análise", zh: "数据与分析" },
    roles: ["data", "ba"],
  },
  {
    title: { uk: "Продукт і дизайн", en: "Product & design", ru: "Продукт и дизайн", de: "Produkt & Design", es: "Producto y diseño", fr: "Produit & design", pl: "Produkt i design", ptBR: "Produto e design", zh: "产品与设计" },
    roles: ["pm", "design", "motion", "techwriter"],
  },
  {
    title: { uk: "Маркетинг", en: "Marketing", ru: "Маркетинг", de: "Marketing", es: "Marketing", fr: "Marketing", pl: "Marketing", ptBR: "Marketing", zh: "市场营销" },
    roles: ["marketing", "ppc", "seo", "aso", "smm", "content", "affiliate"],
  },
  {
    title: { uk: "Продажі та клієнти", en: "Sales & customers", ru: "Продажи и клиенты", de: "Vertrieb & Kunden", es: "Ventas y clientes", fr: "Ventes & clients", pl: "Sprzedaż i klienci", ptBR: "Vendas e clientes", zh: "销售与客户" },
    roles: ["sales", "account", "devrel"],
  },
  {
    title: { uk: "Бізнес-системи", en: "Business systems", ru: "Бизнес-системы", de: "Business-Systeme", es: "Sistemas empresariales", fr: "Systèmes d'entreprise", pl: "Systemy biznesowe", ptBR: "Sistemas empresariais", zh: "企业系统" },
    roles: ["sap", "salesforce", "erp"],
  },
  {
    title: { uk: "Люди, гроші й операції", en: "People, finance & operations", ru: "Люди, финансы и операции", de: "Personal, Finanzen & Operations", es: "Personas, finanzas y operaciones", fr: "RH, finance & opérations", pl: "Ludzie, finanse i operacje", ptBR: "Pessoas, finanças e operações", zh: "人事、财务与运营" },
    roles: ["clevel", "recruiter", "finance", "legal", "ops", "office", "education", "localization", "moderation"],
  },
  {
    title: { uk: "Інженерія та оборона", en: "Engineering & defense", ru: "Инженерия и оборона", de: "Ingenieurwesen & Verteidigung", es: "Ingeniería y defensa", fr: "Ingénierie & défense", pl: "Inżynieria i obronność", ptBR: "Engenharia e defesa", zh: "工程与国防" },
    roles: ["hardware", "military"],
  },
];

const JOBS_WORD: Record<Locale, string> = { uk: "вакансій", en: "jobs", ru: "вакансий", de: "Jobs", es: "vacantes", fr: "offres", pl: "ofert", ptBR: "vagas", zh: "个职位" };
const SALARY_WORD: Record<Locale, string> = { uk: "Зарплати", en: "Salaries", ru: "Зарплаты", de: "Gehälter", es: "Salarios", fr: "Salaires", pl: "Wynagrodzenia", ptBR: "Salários", zh: "薪资" };

export default async function Page() {
  const [counts, salary] = await Promise.all([globalRoleCounts(), salaryRoles().catch(() => [])]);
  const byRole = new Map(counts.map((c) => [c.role, c.count]));
  const withSalary = new Set(salary.map((s) => s.role));
  const listed = GROUPS.flatMap((g) => g.roles).filter((r) => byRole.has(r));
  // Роли, которые ни в одну группу не попали (появились позже) -- не теряем.
  const extra = counts.map((c) => c.role).filter((r) => !GROUPS.some((g) => g.roles.includes(r)));
  const groups = extra.length ? [...GROUPS, { title: { uk: "Інше", en: "Other", ru: "Другое", de: "Sonstiges", es: "Otros", fr: "Autres", pl: "Inne", ptBR: "Outros", zh: "其他" }, roles: extra }] : GROUPS;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Вакансії за професією",
    itemListElement: [...listed, ...extra].map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: roleInfo(r)?.uk ?? r,
      url: `${SITE_URL}/jobs/role/${r}`,
    })),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 pb-fab-safe sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLandingBreadcrumbJsonLd("Вакансії за професією", PAGE_URL)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <nav className="mb-4 text-[13px] text-neutral-500 dark:text-neutral-400">
        <Link href="/" className="hover:text-accent"><T uk="Вакансії" en="Jobs" ru="Вакансии" de="Jobs" es="Vacantes" fr="Offres" pl="Oferty" ptBR="Vagas" zh="职位" /></Link>
        <span className="mx-1.5">/</span>
        <Link href="/jobs/catalog" className="hover:text-accent"><T uk="Каталог" en="Catalog" ru="Каталог" de="Katalog" es="Catálogo" fr="Catalogue" pl="Katalog" ptBR="Catálogo" zh="目录" /></Link>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
        <T uk="Вакансії за професією" en="Jobs by role" ru="Вакансии по профессии" de="Jobs nach Rolle" es="Empleos por puesto" fr="Offres par métier" pl="Oferty wg stanowiska" ptBR="Vagas por função" zh="按职位类型浏览" />
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">
        <T
          uk={`Оберіть свою професію: ${listed.length + extra.length} напрямів з вакансіями в Україні та віддалено. Роль визначаємо за назвою вакансії, список оновлюється щодня.`}
          en={`Pick your role: ${listed.length + extra.length} directions with open jobs in Ukraine and remote. The role comes from the job title, the list updates daily.`}
          ru={`Выберите профессию: ${listed.length + extra.length} направлений с вакансиями в Украине и удалённо. Роль определяем по названию вакансии, список обновляется ежедневно.`}
          de={`Wählen Sie Ihre Rolle: ${listed.length + extra.length} Richtungen mit offenen Stellen in der Ukraine und remote. Die Rolle ergibt sich aus dem Jobtitel, täglich aktualisiert.`}
          es={`Elige tu puesto: ${listed.length + extra.length} áreas con vacantes en Ucrania y en remoto. El puesto sale del título de la vacante y se actualiza a diario.`}
          fr={`Choisissez votre métier : ${listed.length + extra.length} domaines avec des offres en Ukraine et à distance. Le métier vient de l'intitulé, mis à jour chaque jour.`}
          pl={`Wybierz swoje stanowisko: ${listed.length + extra.length} kierunków z ofertami w Ukrainie i zdalnie. Rolę określamy po tytule oferty, lista odświeża się codziennie.`}
          ptBR={`Escolha sua função: ${listed.length + extra.length} áreas com vagas na Ucrânia e remotas. A função vem do título da vaga, atualizada diariamente.`}
          zh={`选择你的职位：${listed.length + extra.length} 个方向，涵盖乌克兰及远程职位。职位类型根据职位名称判断，每日更新。`}
        />
      </p>

      <div className="mt-8 space-y-9">
        {groups.map((g) => {
          const roles = g.roles.filter((r) => byRole.has(r)).sort((a, b) => (byRole.get(b) ?? 0) - (byRole.get(a) ?? 0));
          if (roles.length === 0) return null;
          return (
            <section key={g.title.en}>
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                <T {...g.title} />
              </h2>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {roles.map((r) => {
                  const info = roleInfo(r);
                  return (
                    <li key={r}>
                      <div className="role-card group relative rounded-2xl border border-neutral-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_10px_28px_-16px_rgba(51,94,247,.45)] dark:border-neutral-800 dark:bg-neutral-900">
                        <Link href={`/jobs/role/${r}`} className="block after:absolute after:inset-0 after:content-['']">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="text-[16px] font-semibold text-neutral-900 transition group-hover:text-accent dark:text-neutral-50">
                              <T {...ROLE_LABELS[r]} />
                            </span>
                            <span className="shrink-0 text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400">
                              {byRole.get(r)} <T {...JOBS_WORD} />
                            </span>
                          </span>
                          {info ? <span className="mt-1 block text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">{info.uk_hint}</span> : null}
                        </Link>
                        {withSalary.has(r) ? (
                          <Link href={`/jobs/salary/${r}`} className="relative z-10 mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline">
                            <T {...SALARY_WORD} /> →
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
