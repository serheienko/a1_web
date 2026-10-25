// components/role-hub.tsx -- сетка профессий по направлениям.
//
// 25.10.2026. Вынесена из app/jobs/role/page.tsx: та же сетка нужна указателю
// профессий по стране (app/jobs/country/[code]/roles/page.tsx). Александр:
// «если я на этой странице меняю сверху гео -- показывать страницу по ролям
// именно этой страны, и так же с зарплатами».

import Link from "next/link";
import { T, type Locale } from "@/components/t";
import { roleInfo, type JobRole } from "@/lib/seo/job-role";
import { ROLE_LABELS } from "@/lib/seo/role-labels";

type Group = { title: Record<Locale, string>; roles: JobRole[] };

export const ROLE_GROUPS: Group[] = [
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

const OTHER: Record<Locale, string> = { uk: "Інше", en: "Other", ru: "Другое", de: "Sonstiges", es: "Otros", fr: "Autres", pl: "Inne", ptBR: "Outros", zh: "其他" };
const JOBS_WORD: Record<Locale, string> = { uk: "вакансій", en: "jobs", ru: "вакансий", de: "Jobs", es: "vacantes", fr: "offres", pl: "ofert", ptBR: "vagas", zh: "个职位" };
const SALARY_WORD: Record<Locale, string> = { uk: "Зарплати", en: "Salaries", ru: "Зарплаты", de: "Gehälter", es: "Salarios", fr: "Salaires", pl: "Wynagrodzenia", ptBR: "Salários", zh: "薪资" };

/** Роли в порядке показа (для ItemList и подсчёта направлений). */
export function orderedRoles(counts: Map<JobRole, number>): JobRole[] {
  const listed = ROLE_GROUPS.flatMap((g) => g.roles).filter((r) => counts.has(r));
  const extra = [...counts.keys()].filter((r) => !ROLE_GROUPS.some((g) => g.roles.includes(r)));
  return [...listed, ...extra];
}

export function RoleHubGrid({
  counts,
  roleHref,
  salaryHref,
}: {
  counts: Map<JobRole, number>;
  roleHref: (r: JobRole) => string;
  /** null -- у роли нет зарплатной страницы, ссылку не рисуем. */
  salaryHref: (r: JobRole) => string | null;
}) {
  const extra = [...counts.keys()].filter((r) => !ROLE_GROUPS.some((g) => g.roles.includes(r)));
  const groups = extra.length ? [...ROLE_GROUPS, { title: OTHER, roles: extra }] : ROLE_GROUPS;
  return (
    <div className="mt-8 space-y-9">
      {groups.map((g) => {
        const roles = g.roles.filter((r) => counts.has(r)).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
        if (roles.length === 0) return null;
        return (
          <section key={g.title.en}>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              <T {...g.title} />
            </h2>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {roles.map((r) => {
                const info = roleInfo(r);
                const salary = salaryHref(r);
                return (
                  <li key={r}>
                    <div className="role-card group relative rounded-2xl border border-neutral-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_10px_28px_-16px_rgba(51,94,247,.45)] dark:border-neutral-800 dark:bg-neutral-900">
                      <Link href={roleHref(r)} className="block after:absolute after:inset-0 after:content-['']">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-[16px] font-semibold text-neutral-900 transition group-hover:text-accent dark:text-neutral-50">
                            <T {...ROLE_LABELS[r]} />
                          </span>
                          <span className="shrink-0 text-[13px] tabular-nums text-neutral-500 dark:text-neutral-400">
                            {counts.get(r)} <T {...JOBS_WORD} />
                          </span>
                        </span>
                        {info ? <span className="mt-1 block text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">{info.uk_hint}</span> : null}
                      </Link>
                      {salary ? (
                        <Link href={salary} className="relative z-10 mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline">
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
  );
}
