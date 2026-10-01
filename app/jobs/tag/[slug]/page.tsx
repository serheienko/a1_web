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
import { postsForFact } from "@/lib/a1/facts-index";
import { FACT_LANDINGS, findFactLanding } from "@/lib/seo/fact-landings";
import { Pagination } from "@/components/pagination";
import { SegmentLinks } from "@/components/segment-page";
import { articleLinks } from "@/lib/seo/segment-links";
import { LandingCountryBadge } from "@/components/landing-country-badge";
import { landingCountry, withCountry } from "@/lib/seo/landing-country";
import { parsePageParam, toURLSearchParams, FEED_PAGE_SIZE } from "@/lib/a1/feed";

const ARTICLES_FOR_TAG: Record<string, string[]> = {
  "no-experience": ["persha-robota-v-it-bez-dosvidu", "rynok-it-vakansiy"],
  reservation: ["it-vakansii-z-bronyuvannyam", "rynok-it-vakansiy"],
  "with-salary": ["zarplaty-v-it-za-tehnologiyamy", "viddalena-robota-na-inozemnu-kompaniyu"],
};

const SITE_URL = "https://jobs.a1appp.com";

/** Сколько вакансий показываем. Без пагинации намеренно: странице нужен
 *  один адрес, а не хвост из ?page=, который размывает её вес. */
const LIMIT = 40;

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

  return {
    // 30.09.2026: вариант со страной -- фильтр, не витрина: не индексируем.
    ...(country ? { robots: { index: false, follow: true } } : {}),
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
  };
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
  const everywhere = await postsForFact(landing.slug);
  const all = country
    ? everywhere.filter((post) => post.location?.country?.toUpperCase() === country)
    : everywhere;
  const posts = country
    ? all.slice((page - 1) * FEED_PAGE_SIZE, page * FEED_PAGE_SIZE)
    : all.slice(0, LIMIT);
  const totalPages = Math.max(1, Math.ceil(all.length / FEED_PAGE_SIZE));
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
          {country ? (
            <Pagination
              basePath={`/jobs/tag/${landing.slug}`}
              params={new URLSearchParams({ country: country.toLowerCase() })}
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
