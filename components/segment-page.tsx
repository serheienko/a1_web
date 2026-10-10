// components/segment-page.tsx
//
// 30.09.2026. Общая начинка SEO-сегментов (город, уровень, страна +
// технология...): заголовок, число, список вакансий с нумерацией страниц
// (по 20, ?page=N, 08.10.2026) и блок перелинковки.
// Серверный компонент; тексты приходят девятью языками, видимый
// выбирает CSS (тот же приём, что в components/job-landing.tsx).

import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";
import { LOCALES, LOCALE_VISIBILITY_CLASS, T, type Locale } from "@/components/t";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/pagination";
import { LANDING_PAGE_SIZE } from "@/lib/seo/paged";
import type { WebPost } from "@/types/web-post";

const SITE_URL = "https://jobs.a1appp.com";

type L = Record<Locale, string>;

export type SegmentLinkGroup = { title: L; links: { href: string; label: string }[] };

function CountLine({ template, n }: { template: L; n: number }) {
  return (
    <>
      {LOCALES.map((locale) => {
        const [before = "", after = ""] = template[locale].split("{n}");
        return (
          <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
            {before}
            {n.toLocaleString("uk-UA").replace(/ /g, " ")}
            {after}
          </span>
        );
      })}
    </>
  );
}

export function SegmentLinks({ groups }: { groups: SegmentLinkGroup[] }) {
  const shown = groups.filter((g) => g.links.length > 0);
  if (shown.length === 0) return null;
  return (
    <section className="mt-12 flex flex-col gap-6 border-t border-neutral-100 pt-6 dark:border-neutral-800">
      {shown.map((group, i) => (
        <div key={i}>
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            <T {...group.title} />
          </h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {group.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-block rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 no-underline transition hover:bg-accent/10 hover:text-accent dark:bg-neutral-800 dark:text-neutral-300"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {/* 10.10.2026. Выход на каталог всех витрин. Этот блок есть на каждой
          сегментной странице, поэтому одна строка здесь связывает все три
          тысячи посадочных с их общим указателем -- и для человека, и для
          робота. */}
      <div>
        <Link
          href="/jobs/catalog"
          className="text-sm text-neutral-500 no-underline transition hover:text-accent dark:text-neutral-400"
        >
          <T
            uk="Усі добірки вакансій →"
            en="All job collections →"
            ru="Все подборки вакансий →"
            de="Alle Job-Sammlungen →"
            es="Todas las colecciones →"
            fr="Toutes les sélections →"
            pl="Wszystkie zbiory ofert →"
            ptBR="Todas as coleções →"
            zh="全部职位合集 →"
          />
        </Link>
      </div>
    </section>
  );
}

export async function SegmentPage({
  h1,
  countLine,
  lead,
  posts,
  breadcrumbName,
  path,
  groups,
  page = 1,
}: {
  h1: L;
  countLine: L;
  lead: L;
  posts: WebPost[];
  breadcrumbName: string;
  /** Адрес страницы без домена: «/jobs/city/kyiv». */
  path: string;
  groups: SegmentLinkGroup[];
  /** Номер страницы списка (?page=N), с 1. */
  page?: number;
}) {
  // 08.10.2026: страницы по 20 с нумерацией (раньше -- только первые 40, дальше листать было некуда).
  const shown = posts.slice((page - 1) * LANDING_PAGE_SIZE, page * LANDING_PAGE_SIZE);
  if (page > 1 && shown.length === 0) notFound();
  const totalPages = Math.max(1, Math.ceil(posts.length / LANDING_PAGE_SIZE));
  const avatarBlurs = await Promise.all(shown.map((post) => generateAvatarBlurDataUrl(post.author.avatarUrl)));

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLandingBreadcrumbJsonLd(breadcrumbName, `${SITE_URL}${path}`)) }}
      />

      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <Link href="/" className="transition hover:text-accent">
          <T uk="Вакансії" en="Jobs" ru="Вакансии" de="Stellen" es="Vacantes" fr="Offres" pl="Oferty" ptBR="Vagas" zh="职位" />
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          <T {...h1} />
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          <CountLine template={countLine} n={posts.length} />
        </p>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          <T {...lead} />
        </p>
      </header>

      {shown.length === 0 ? (
        <EmptyState
          message={
            <T uk="Поки немає відкритих вакансій." en="No open jobs yet." ru="Пока нет открытых вакансий." de="Noch keine offenen Stellen." es="Aún no hay vacantes." fr="Pas encore d'offres." pl="Nie ma jeszcze ofert." ptBR="Ainda não há vagas." zh="暂无开放职位。" />
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {shown.map((post, i) => (
            <li key={post.id}>
              <PostCard post={post} avatarBlurDataUrl={avatarBlurs[i]} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <Pagination basePath={path} params={new URLSearchParams()} page={page} hasMore={page < totalPages} totalPages={totalPages} />
      ) : null}

      <SegmentLinks groups={groups} />
    </main>
  );
}
