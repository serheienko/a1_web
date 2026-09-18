export const runtime = "nodejs";
// Час, как у остальных посадочных: это витрина стека, а не живая лента,
// и обход всех вакансий (lib/a1/tech-index.ts) не должен повторяться
// чаще, чем содержимое реально меняется.
export const revalidate = 3600;

// app/jobs/stack/[slug]/page.tsx
//
// 2026-09-18. Посадочная по стеку: /jobs/stack/python и ещё пятнадцать.
// Зачем они и почему стали возможны только сейчас -- в шапке
// lib/seo/tech-landings.ts.
//
// Адрес с отдельным сегментом "stack" не случайно: /jobs/<slug> -- это
// страница вакансии, и любое новое статическое имя прямо под /jobs
// пришлось бы держать в голове вечно. Здесь пересечься нечему.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";
import { LOCALES, LOCALE_VISIBILITY_CLASS, T, type Locale } from "@/components/t";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { postsForTech } from "@/lib/a1/tech-index";
import {
  TECH_LANDINGS,
  findTechLanding,
  techLandingCountLine,
  techLandingH1,
  techLandingLead,
  techLandingMeta,
} from "@/lib/seo/tech-landings";

const SITE_URL = "https://jobs.a1appp.com";

/** Сколько вакансий показываем. Без пагинации намеренно: странице нужен
 *  один адрес, а не хвост из ?page=, который размывает её вес. */
const LIMIT = 40;

type Props = { params: Promise<{ slug: string }> };

// generateStaticParams здесь НЕТ намеренно. Каждая такая страница
// поднимает обход всех вакансий (lib/a1/tech-index.ts), а сборка
// раскладывает страницы по нескольким процессам -- общий кэш между ними
// не работает, и шестнадцать страниц дали бы до шестнадцати полных
// обходов прямо во время сборки. Сборка на Vercel ограничена по времени,
// и sitemap уже делает один такой обход. Поэтому страницы собираются при
// первом обращении и живут час; адреса Google всё равно берёт из
// sitemap.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const landing = findTechLanding((await params).slug);
  if (!landing) return {};
  const meta = techLandingMeta(landing.label);
  const url = `${SITE_URL}/jobs/stack/${landing.slug}`;

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: { title: meta.title, description: meta.description, url, type: "website" },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

/** Число внутри фразы на девяти языках -- тот же приём, что в
 *  components/job-landing.tsx: рисуем все девять, видимый выбирает CSS. */
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

export default async function Page({ params }: Props) {
  const landing = findTechLanding((await params).slug);
  if (!landing) notFound();

  const all = await postsForTech(landing.tech);
  const posts = all.slice(0, LIMIT);
  const avatarBlurs = await Promise.all(posts.map((post) => generateAvatarBlurDataUrl(post.author.avatarUrl)));

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildLandingBreadcrumbJsonLd(
              techLandingH1(landing.label).uk,
              `${SITE_URL}/jobs/stack/${landing.slug}`,
            ),
          ),
        }}
      />

      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <Link href="/" className="transition hover:text-accent">
          <T uk="Вакансії" en="Jobs" ru="Вакансии" de="Stellen" es="Vacantes" fr="Offres" pl="Oferty" ptBR="Vagas" zh="职位" />
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          <T {...techLandingH1(landing.label)} />
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          <CountLine template={techLandingCountLine(landing.label)} n={all.length} />
        </p>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          <T {...techLandingLead(landing.label)} />
        </p>
      </header>

      {posts.length === 0 ? (
        <EmptyState
          message={
            <T uk="Поки немає відкритих вакансій з цим стеком." en="No open jobs with this stack yet." ru="Пока нет открытых вакансий с этим стеком." de="Noch keine offenen Stellen mit diesem Stack." es="Aún no hay vacantes con este stack." fr="Pas encore d'offres avec ce stack." pl="Nie ma jeszcze ofert z tym stackiem." ptBR="Ainda não há vagas com esta stack." zh="该技术栈暂无开放职位。" />
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {posts.map((post, i) => (
            <li key={post.id}>
              <PostCard post={post} avatarBlurDataUrl={avatarBlurs[i]} />
            </li>
          ))}
        </ul>
      )}

      {/* Перелинковка между посадочными: и человеку соседний стек под
          рукой, и роботу маршрут по всем шестнадцати страницам с любой
          из них. */}
      <section className="mt-12 border-t border-neutral-100 pt-6 dark:border-neutral-800">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          <T uk="Інші стеки" en="Other stacks" ru="Другие стеки" de="Weitere Stacks" es="Otros stacks" fr="Autres stacks" pl="Inne stacki" ptBR="Outras stacks" zh="其他技术栈" />
        </h2>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {TECH_LANDINGS.filter((item) => item.slug !== landing.slug).map((item) => (
            <li key={item.slug}>
              <Link
                href={`/jobs/stack/${item.slug}`}
                className="inline-block rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 no-underline transition hover:bg-accent/10 hover:text-accent dark:bg-neutral-800 dark:text-neutral-300"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
