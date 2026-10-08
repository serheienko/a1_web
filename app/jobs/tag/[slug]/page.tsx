export const runtime = "nodejs";
// Час, как у посадочных по стеку: это витрина признака, а не живая
// лента, и обход всех вакансий (lib/a1/facts-index.ts) не должен
// повторяться чаще, чем содержимое реально меняется.
export const revalidate = 3600;

// app/jobs/tag/[slug]/page.tsx
//
// 2026-09-19. Посадочные по признакам, которых у бэкенда нет:
// /jobs/tag/no-experience и /jobs/tag/reservation. Тексты -- в
// lib/seo/fact-landings.ts, список вакансий -- lib/a1/facts-index.ts.
//
// Шаблон намеренно повторяет app/jobs/stack/[slug]/page.tsx: та же
// хлебная крошка, тот же заголовок со строкой-счётчиком, тот же список
// карточек и та же перелинковка внизу. Своего изобретать нечего.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";
import { LOCALES, LOCALE_VISIBILITY_CLASS, T, type Locale } from "@/components/t";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { postsForFact, militaryItems } from "@/lib/a1/facts-index";
import { MilitaryBanner } from "@/components/military-banner";
import { buildMilitaryStats } from "@/lib/a1/military";
import { FACT_LANDINGS, findFactLanding } from "@/lib/seo/fact-landings";
import { Pagination } from "@/components/pagination";
import { SegmentLinks } from "@/components/segment-page";
import { articleLinks } from "@/lib/seo/segment-links";
import { LandingCountryBadge } from "@/components/landing-country-badge";
import { landingCountry, withCountry } from "@/lib/seo/landing-country";
import { LandingBar } from "@/components/landing-bar";
import { keepInUkraineFeed } from "@/lib/a1/feed";
import { worldwideKind } from "@/lib/seo/worldwide-kind";
import { parsePageParam, toURLSearchParams } from "@/lib/a1/feed";
import { LANDING_PAGE_SIZE, pagedMeta } from "@/lib/seo/paged";

const ARTICLES_FOR_TAG: Record<string, string[]> = {
  "no-experience": ["persha-robota-v-it-bez-dosvidu", "rynok-it-vakansiy"],
  reservation: ["it-vakansii-z-bronyuvannyam", "rynok-it-vakansiy"],
  "with-salary": ["zarplaty-v-it-za-tehnologiyamy", "viddalena-robota-na-inozemnu-kompaniyu"],
};

const SITE_URL = "https://jobs.a1appp.com";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// generateStaticParams здесь НЕТ по той же причине, что и у посадочных
// по стеку: каждая такая страница поднимает обход всех вакансий, а
// сборка раскладывает страницы по разным процессам -- общий кэш между
// ними не работает. Страницы собираются при первом обращении и живут
// час; адреса Google всё равно берёт из карты сайта.

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const landing = findFactLanding((await params).slug);
  if (!landing) return {};
  const url = `${SITE_URL}/jobs/tag/${landing.slug}`;
  const country = landingCountry(await searchParams);

  const page = parsePageParam(toURLSearchParams(await searchParams));
  const sp0 = await searchParams;
  // 08.10.2026: «з бронюванням / без» -- тоже фильтр, а не отдельная витрина.
  const typed = landing.slug === "reservation" && (sp0.type === "with" || sp0.type === "without");
  return pagedMeta({
    // 30.09.2026: вариант со страной -- фильтр, не витрина: не индексируем.
    ...(country || typed ? { robots: { index: false, follow: true } } : {}),
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: landing.metaTitle,
      description: landing.metaDescription,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: landing.metaTitle,
      description: landing.metaDescription,
    },
  }, url, country || typed ? 1 : page);
}

/** Число внутри фразы на девяти языках -- тот же приём, что у
 *  посадочных по стеку: рисуем все девять, видимый выбирает CSS. */
function CountLine({ template, n }: { template: Record<Locale, string>; n: number }) {
  return (
    <>
      {LOCALES.map((locale) => {
        const [before = "", after = ""] = template[locale].split("{n}");
        return (
          <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
            {before}
            {n.toLocaleString("uk-UA").replace(/ /g, " ")}
            {after}
          </span>
        );
      })}
    </>
  );
}

export default async function Page({ params, searchParams }: Props) {
  const landing = findFactLanding((await params).slug);
  if (!landing) notFound();
  const sp = await searchParams;
  // 30.09.2026 (Александр: выбрана страна -- тег должен показывать
  // вакансии ЭТОЙ страны, а не всего мира). Без страны -- как было:
  // одна витрина на 40 вакансий без пагинации (вес одного адреса).
  // Со страной -- обычные страницы по 20 с нумерацией.
  const country = landingCountry(sp);
  const page = parsePageParam(toURLSearchParams(sp));
  // 08.10.2026 (Александр: тег «Бронювання» -> «Військо»): на этой странице
  // все военные вакансии, а не только с бронированием; внутри -- фильтр
  // «з бронюванням / без» (?type=with|without) и баннер-статистика.
  const isMil = landing.slug === "reservation";
  const milAll = isMil ? await militaryItems() : [];
  const reservedIds = new Set(milAll.filter((i) => i.reservation).map((i) => i.post.id));
  const type = isMil && (sp.type === "with" || sp.type === "without") ? sp.type : undefined;
  const everywhere = isMil ? milAll.map((i) => i.post) : await postsForFact(landing.slug);
  // Без страны -- режим «Україна» (как лента): украинские + удалённые «отовсюду»,
  // а не вакансии всего мира под флагом Украины.
  const all = country
    ? everywhere.filter((post) =>
        country === "WW"
          ? post.location?.country?.toUpperCase() === "WW" && worldwideKind(post) !== "ua" // как пункт «Worldwide» в ленте
          : post.location?.country?.toUpperCase() === country,
      )
    : everywhere.filter(keepInUkraineFeed);
  // 08.10.2026 (Александр: «почему на бронюванні так мало компаній? нет разбивки?»): раньше без
  // страны показывались только первые 40 из 1 120, дальше листать было некуда. Теперь страницы по 20,
  // с нумерацией; каждая -- свой адрес ?page=N.
  const withCount = isMil ? all.filter((p) => reservedIds.has(p.id)).length : 0;
  const shown = type === "with" ? all.filter((p) => reservedIds.has(p.id)) : type === "without" ? all.filter((p) => !reservedIds.has(p.id)) : all;
  const posts = shown.slice((page - 1) * LANDING_PAGE_SIZE, page * LANDING_PAGE_SIZE);
  if (page > 1 && posts.length === 0) notFound();
  const totalPages = Math.max(1, Math.ceil(shown.length / LANDING_PAGE_SIZE));
  const avatarBlurs = await Promise.all(
    posts.map((post) => generateAvatarBlurDataUrl(post.author.avatarUrl)),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildLandingBreadcrumbJsonLd(landing.h1.uk, `${SITE_URL}/jobs/tag/${landing.slug}`),
          ),
        }}
      />

      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <Link href={withCountry("/", country)} className="transition hover:text-accent">
          <T uk="Вакансії" en="Jobs" ru="Вакансии" de="Stellen" es="Vacantes" fr="Offres" pl="Oferty" ptBR="Vagas" zh="职位" />
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
      </nav>

      <LandingBar country={country} basePath={`/jobs/tag/${landing.slug}`} currentKey={landing.slug} withPicker={landing.slug !== "reservation"} />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          <T {...landing.h1} />
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          <CountLine template={landing.countLine} n={all.length} />
        </p>
        {landing.lead ? (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            <T {...landing.lead} />
          </p>
        ) : null}
        {country ? <LandingCountryBadge country={country} resetHref={`/jobs/tag/${landing.slug}`} /> : null}
      </header>

      {isMil && !country && page === 1 ? (
        <MilitaryBanner stats={buildMilitaryStats(milAll.filter((i) => keepInUkraineFeed(i.post)))} />
      ) : null}

      {isMil ? (
        <nav aria-label="military filter" className="mb-5 flex flex-wrap gap-2">
          {(
            [
              { key: undefined, n: all.length, uk: "Усі", en: "All", ru: "Все" },
              { key: "with", n: withCount, uk: "З бронюванням", en: "With deferment", ru: "С бронированием" },
              { key: "without", n: all.length - withCount, uk: "Без бронювання", en: "Without deferment", ru: "Без бронирования" },
            ] as const
          ).map((f) => {
            const qs = new URLSearchParams();
            if (country) qs.set("country", country.toLowerCase());
            if (f.key) qs.set("type", f.key);
            const href = `/jobs/tag/${landing.slug}${qs.toString() ? `?${qs.toString()}` : ""}`;
            const active = type === f.key;
            return (
              <Link
                key={f.key ?? "all"}
                href={href}
                aria-current={active ? "page" : undefined}
                rel={f.key ? "nofollow" : undefined}
                className={
                  "rounded-full border px-3 py-1.5 text-[13px] font-medium transition " +
                  (active
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-neutral-200 text-neutral-600 hover:border-accent/40 hover:bg-accent/5 hover:text-accent dark:border-neutral-800 dark:text-neutral-400")
                }
              >
                <T uk={f.uk} en={f.en} ru={f.ru} de={f.en} es={f.en} fr={f.en} pl={f.en} ptBR={f.en} zh={f.en} /> · {f.n.toLocaleString("uk-UA")}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {posts.length === 0 ? (
        <EmptyState message={<T {...landing.empty} />} />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {posts.map((post, i) => (
              <li key={post.id}>
                <PostCard post={post} avatarBlurDataUrl={avatarBlurs[i]} />
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <Pagination
              basePath={`/jobs/tag/${landing.slug}`}
              params={(() => {
                const q = new URLSearchParams();
                if (country) q.set("country", country.toLowerCase());
                if (type) q.set("type", type);
                return q;
              })()}
              page={page}
              hasMore={page < totalPages}
              totalPages={totalPages}
            />
          ) : null}
        </>
      )}

      {/* Перелинковка: соседняя посадочная под рукой у человека и
          маршрут для робота. */}
      <section className="mt-12 border-t border-neutral-100 pt-6 dark:border-neutral-800">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          <T uk="Інші добірки" en="Other collections" ru="Другие подборки" de="Weitere Sammlungen" es="Otras selecciones" fr="Autres sélections" pl="Inne zestawienia" ptBR="Outras seleções" zh="其他精选" />
        </h2>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {FACT_LANDINGS.filter((item) => item.slug !== landing.slug).map((item) => (
            <li key={item.slug}>
              <Link
                href={withCountry(`/jobs/tag/${item.slug}`, country)}
                className="inline-block rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 no-underline transition hover:bg-accent/10 hover:text-accent dark:bg-neutral-800 dark:text-neutral-300"
              >
                <T {...item.chip} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
          {/* 01.10.2026: ссылки на статьи блога (lib/blog) под тему страницы. */}
      <SegmentLinks groups={articleLinks(ARTICLES_FOR_TAG[landing.slug] ?? [])} />
</main>
  );
}
