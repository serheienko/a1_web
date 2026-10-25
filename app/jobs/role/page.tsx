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
import { T } from "@/components/t";
import { globalRoleCounts } from "@/lib/a1/segment-index";
import { salaryCountriesForRole } from "@/lib/a1/salary-index";
import { roleInfo, type JobRole } from "@/lib/seo/job-role";
import { orderedRoles, RoleHubGrid } from "@/components/role-hub";
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

export default async function Page() {
  const counts = await globalRoleCounts();
  const byRole = new Map<JobRole, number>(counts.map((c) => [c.role, c.count]));
  const ordered = orderedRoles(byRole);
  // 25.10.2026 (Александр: «для Украины показываются не целевые зарплаты»).
  // Этот указатель -- Украина и удалённые, поэтому «Зарплати» ведут на
  // украинскую вилку и только там, где её хватает посчитать.
  const salaryLists = await Promise.all(ordered.map((r) => salaryCountriesForRole(r).catch(() => [])));
  const withSalary = new Set(ordered.filter((_, i) => (salaryLists[i] ?? []).some((x) => x.cc === "ua")));
  const listed = ordered;
  const extra: JobRole[] = [];

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

      <RoleHubGrid
        counts={byRole}
        roleHref={(r) => `/jobs/role/${r}`}
        salaryHref={(r) => (withSalary.has(r) ? `/jobs/salary/${r}/ua` : null)}
      />
    </main>
  );
}
