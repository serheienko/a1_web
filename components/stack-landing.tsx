// components/stack-landing.tsx
//
// 29.10.2026 (мастер-план «Языковые версии сайта»). Тело посадочной по стеку, общее для украинского
// адреса /jobs/stack/<slug> и языкового /en/jobs/stack/<slug>. Раньше оно лежало прямо в странице;
// вынесено, чтобы у двух версий не разъехалось содержимое. При locale подписи идут ОДНИМ языком.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/pagination";
import { LANDING_PAGE_SIZE } from "@/lib/seo/paged";
import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";
import { LOCALES, LOCALE_TAG, LOCALE_VISIBILITY_CLASS, T, type Locale } from "@/components/t";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { postsForTech } from "@/lib/a1/tech-index";
import { buildLandingInsights } from "@/lib/seo/landing-insights";
import { LandingInsightsBlock } from "@/components/landing-insights";
import { MIN_SEGMENT_POSTS } from "@/lib/seo/segments";
import { SegmentLinks } from "@/components/segment-page";
import { fill, TXT } from "@/components/hiring-page";
import { currentMonthKey, hiringMonth, monthLabel } from "@/lib/seo/hiring-month";
import { linksForGlobalLevels, linksForGlobalRoles, linksForTech, articleLinks, interviewLinks } from "@/lib/seo/segment-links";
import { TECH_LANDINGS, techLandingCountLine, techLandingH1, techLandingLead, type TechLanding } from "@/lib/seo/tech-landings";
import { localizedPath, SITE_URL } from "@/lib/seo/hreflang";

function CountLine({ template, n, locale }: { template: Record<Locale, string>; n: number; locale?: Locale }) {
  const num = n.toLocaleString("uk-UA").replace(/ /g, " ");
  if (locale) {
    const [before = "", after = ""] = template[locale].split("{n}");
    return (
      <>
        {before}
        {num}
        {after}
      </>
    );
  }
  return (
    <>
      {LOCALES.map((l) => {
        const [before = "", after = ""] = template[l].split("{n}");
        return (
          <span key={l} className={LOCALE_VISIBILITY_CLASS[l]}>
            {before}
            {num}
            {after}
          </span>
        );
      })}
    </>
  );
}

export async function StackLanding({ landing, page, locale }: { landing: TechLanding; page: number; locale?: Locale }) {
  const all = await postsForTech(landing.tech);
  if (all.length < MIN_SEGMENT_POSTS) notFound();
  const posts = all.slice((page - 1) * LANDING_PAGE_SIZE, page * LANDING_PAGE_SIZE);
  if (page > 1 && posts.length === 0) notFound();
  const totalPages = Math.max(1, Math.ceil(all.length / LANDING_PAGE_SIZE));
  const avatarBlurs = await Promise.all(posts.map((post) => generateAvatarBlurDataUrl(post.author.avatarUrl)));
  const hiring = await hiringMonth(currentMonthKey()).catch(() => null);
  const insights = page === 1 ? buildLandingInsights(all, landing.tech) : null;
  const basePath = localizedPath(`/jobs/stack/${landing.slug}`, locale);
  const h1 = techLandingH1(landing.label);

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe" {...(locale ? { lang: LOCALE_TAG[locale] } : {})}>
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildLandingBreadcrumbJsonLd(locale ? h1[locale] : h1.uk, `${SITE_URL}${basePath}`)),
        }}
      />

      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <Link href={localizedPath("/", locale)} className="transition hover:text-accent">
          {locale ? "Jobs" : <T uk="Вакансії" en="Jobs" ru="Вакансии" de="Stellen" es="Vacantes" fr="Offres" pl="Oferty" ptBR="Vagas" zh="职位" />}
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          {locale ? h1[locale] : <T {...h1} />}
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          <CountLine template={techLandingCountLine(landing.label)} n={all.length} locale={locale} />
        </p>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          {locale ? techLandingLead(landing.label)[locale] : <T {...techLandingLead(landing.label)} />}
        </p>
      </header>

      {/* 14.10.2026: «Хто наймає <стек>» за текущий месяц, если срез есть. */}
      {hiring?.byStack[landing.slug] ? (
        <p className="-mt-4 mb-8">
          <Link href={`/jobs/hiring/${hiring.month}/${landing.slug}`} className="text-accent no-underline hover:underline">
            <T {...fill(TXT.h1Stack, { month: monthLabel(hiring.month), label: landing.label })} /> →
          </Link>
        </p>
      ) : null}

      {insights ? <LandingInsightsBlock data={insights} /> : null}

      {posts.length === 0 ? (
        <EmptyState
          message={
            locale ? (
              "No open jobs with this stack yet."
            ) : (
              <T uk="Поки немає відкритих вакансій з цим стеком." en="No open jobs with this stack yet." ru="Пока нет открытых вакансий с этим стеком." de="Noch keine offenen Stellen mit diesem Stack." es="Aún no hay vacantes con este stack." fr="Pas encore d'offres avec ce stack." pl="Nie ma jeszcze ofert z tym stackiem." ptBR="Ainda não há vagas com esta stack." zh="该技术栈暂无开放职位。" />
            )
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {posts.map((post, i) => (
              <li key={post.id}>
                <PostCard post={post} avatarBlurDataUrl={avatarBlurs[i]} locale={locale} />
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <Pagination basePath={basePath} params={new URLSearchParams()} page={page} hasMore={page < totalPages} totalPages={totalPages} />
          ) : null}
        </>
      )}

      <section className="mt-12 border-t border-neutral-100 pt-6 dark:border-neutral-800">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          {locale ? "Other stacks" : <T uk="Інші стеки" en="Other stacks" ru="Другие стеки" de="Weitere Stacks" es="Otros stacks" fr="Autres stacks" pl="Inne stacki" ptBR="Outras stacks" zh="其他技术栈" />}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {TECH_LANDINGS.filter((item) => item.slug !== landing.slug).map((item) => (
            <li key={item.slug}>
              <Link
                href={localizedPath(`/jobs/stack/${item.slug}`, locale)}
                className="inline-block rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 no-underline transition hover:bg-accent/10 hover:text-accent dark:bg-neutral-800 dark:text-neutral-300"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <SegmentLinks
        locale={locale}
        groups={[
          ...interviewLinks({ techSlug: landing.slug }),
          ...(await linksForTech(landing.slug)),
          ...(await linksForGlobalLevels()),
          ...(await linksForGlobalRoles()),
          ...articleLinks(["zarplaty-v-it-za-tehnologiyamy", "top-tehnologiy-dlya-roboty-v-it", "persha-robota-v-it-bez-dosvidu"]),
        ]}
      />
    </main>
  );
}
