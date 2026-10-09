// components/news/news-view.tsx
//
// 08.10.2026. Страница новости «IT новини». Серверный компонент: разметка
// NewsArticle / BreadcrumbList / FAQPage, блок «Коротко», живые блоки
// (клиентские, lib/news + components/news/visuals), источник, плашка
// Telegram-бота, связанные новости. Один язык на страницу (как в блоге).

import Link from "next/link";
import { Suspense } from "react";
import type { ReactNode } from "react";
import type { NewsArticle, NewsBlock } from "@/lib/news/types";
import { altNews, relatedNews } from "@/lib/news/articles";
import { liveAi } from "@/lib/news/live";
import { readingMinutes } from "@/lib/news/util";
import { ExpertsGrid, LiveMarket, PriceCalc, ScoreBars, SizeCalc, StatsRow } from "@/components/news/visuals";

const SITE_URL = "https://jobs.a1appp.com";
const BOT_URL = "https://t.me/a1jobs_bot";

/** [текст](/путь) и **жирный** внутри строки. */
function inline(text: string): ReactNode[] {
  return text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g).map((part, i) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link as unknown as [string, string, string];
      if (/^https?:\/\//.test(href)) {
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-2 hover:underline">
            {label}
          </a>
        );
      }
      return (
        <Link key={i} href={href} className="text-accent underline-offset-2 hover:underline">
          {label}
        </Link>
      );
    }
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    return part;
  });
}

function plain(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "");
}

const T = {
  uk: {
    editorial: "Редакція A1",
    min: "хв читання",
    short: "Коротко",
    source: "Першоджерело",
    sourceNote: "Усі цифри в цьому розділі взято зі сторінки першоджерела; власні висновки редакції позначено окремо.",
    breadcrumbHome: "A1 Jobs",
    breadcrumbNews: "IT новини",
    readEn: "Read in English",
    related: "Ще з IT новин",
    faq: "Часті запитання",
    botTitle: "Вакансії під цю тему — у Telegram",
    botText: "Підключіть бота A1: надішлемо нові вакансії за вашим фільтром, щойно вони з’являться.",
    botBtn: "Підключити бота",
    liveLabels: {
      world: "ML/Data вакансій у світі",
      ua: "ML/Data вакансій в Україні",
      share: "частка серед усіх вакансій A1",
      salaryMl: "медіана річної зарплати в ML (USD)",
      salaryAll: "медіана по всіх вакансіях із зарплатою",
      basedOn: "Рахуємо з усіх відкритих вакансій A1; зарплати — лише там, де їх указано (USD, рік). Теги: Machine Learning, Data Science, PyTorch, TensorFlow.",
      open: "Відкрити",
    },
    locale: "uk-UA",
    dateLocale: "uk-UA",
  },
  en: {
    editorial: "A1 Editorial",
    min: "min read",
    short: "In short",
    source: "Primary source",
    sourceNote: "All figures in this article come from the primary source page; the editorial opinion is labelled separately.",
    breadcrumbHome: "A1 Jobs",
    breadcrumbNews: "IT News",
    readEn: "Читати українською",
    related: "More IT news",
    faq: "FAQ",
    botTitle: "Jobs on this topic, in Telegram",
    botText: "Connect the A1 bot and we will message you new jobs matching your filter as soon as they appear.",
    botBtn: "Connect the bot",
    liveLabels: {
      world: "ML/Data jobs worldwide",
      ua: "ML/Data jobs in Ukraine",
      share: "share of all A1 jobs",
      salaryMl: "median yearly pay in ML (USD)",
      salaryAll: "median across all jobs with pay",
      basedOn: "Calculated from every open A1 job; pay only where it is stated (USD, per year). Tags: Machine Learning, Data Science, PyTorch, TensorFlow.",
      open: "Open",
    },
    locale: "en-US",
    dateLocale: "en-US",
  },
} as const;

function LiveSkeleton({ title }: { title: string }) {
  return (
    <div className="my-8 rounded-2xl bg-neutral-100 p-5 dark:bg-neutral-900" aria-busy="true">
      <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </div>
      <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
    </div>
  );
}

async function LiveBlock({ title, caption, t }: { title: string; caption: string; t: (typeof T)["uk"] | (typeof T)["en"] }) {
  const data = await liveAi();
  if (data.mlWorld + data.mlUa === 0) return null;
  return <LiveMarket title={title} caption={caption} data={data} locale={t.locale} labels={t.liveLabels} />;
}

async function BlockView({ block, article }: { block: NewsBlock; article: NewsArticle }) {
  const t = T[article.lang];
  switch (block.t) {
    case "p":
      return <p className="my-4 text-[16px] leading-[1.75] text-neutral-700 dark:text-neutral-300">{inline(block.text)}</p>;
    case "h2":
      return <h2 className="mt-10 mb-2 scroll-mt-20 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{block.text}</h2>;
    case "ul":
      return (
        <ul className="my-4 list-disc space-y-2 pl-6 text-[16px] leading-[1.7] text-neutral-700 dark:text-neutral-300">
          {block.items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ul>
      );
    case "note":
      return (
        <p className="my-5 rounded-xl border-l-4 border-accent bg-accent/5 px-4 py-3 text-[14px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          {inline(block.text)}
        </p>
      );
    case "stats":
      return <StatsRow items={block.items} locale={t.locale} />;
    case "experts":
      return <ExpertsGrid {...block} />;
    case "scores":
      return <ScoreBars {...block} locale={t.locale} />;
    case "price":
      return <PriceCalc {...block} locale={t.locale} />;
    case "sizes":
      return <SizeCalc {...block} locale={t.locale} />;
    case "live":
      // Тяжёлый блок (считает по всей базе вакансий): текст страницы уходит сразу, этот блок догружается скелетоном.
      return (
        <Suspense fallback={<LiveSkeleton title={block.title} />}>
          <LiveBlock title={block.title} caption={block.caption} t={t} />
        </Suspense>
      );
    case "links":
      return (
        <div className="my-6">
          <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{block.title}</div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {block.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-block rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 no-underline transition hover:bg-accent/10 hover:text-accent dark:bg-neutral-800 dark:text-neutral-300">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
  }
}

export async function NewsView({ article, pool }: { article: NewsArticle; pool?: NewsArticle[] }) {
  const t = T[article.lang];
  const url = `${SITE_URL}/news/${article.slug}`;
  const alt = altNews(article, pool);
  const related = relatedNews(article, pool);
  const dateText = new Date(article.published + "T12:00:00Z").toLocaleDateString(t.dateLocale, { day: "numeric", month: "long", year: "numeric" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${url}#article`,
        headline: article.h1,
        description: article.description,
        inLanguage: article.lang === "uk" ? "uk-UA" : "en",
        datePublished: article.published,
        dateModified: article.updated,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        image: [`${url}/opengraph-image`],
        author: { "@type": "Organization", name: t.editorial, url: SITE_URL },
        publisher: { "@type": "Organization", name: "A1 Jobs", url: SITE_URL },
        isBasedOn: article.source.url,
        citation: article.source.url,
        keywords: article.tags.join(", "),
        about: article.tags.map((name) => ({ "@type": "Thing", name })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: t.breadcrumbNews, item: `${SITE_URL}/news` },
          { "@type": "ListItem", position: 3, name: article.h1, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: article.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: plain(f.a) },
        })),
      },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="breadcrumb" className="text-[13px] text-neutral-400">
        <Link href="/news" className="hover:text-accent">{t.breadcrumbNews}</Link>
        <span className="mx-1.5">/</span>
        <span>{article.kicker}</span>
      </nav>

      <article lang={article.lang}>
        <header className="mt-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-accent">{article.kicker}</div>
          <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">{article.h1}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-neutral-500 dark:text-neutral-400">
            <time dateTime={article.published}>{dateText}</time>
            <span>·</span>
            <span>{t.editorial}</span>
            <span>·</span>
            <span>{readingMinutes(article)} {t.min}</span>
            {alt ? (
              <>
                <span>·</span>
                <Link href={`/news/${alt.slug}`} hrefLang={alt.lang} lang={alt.lang} className="text-accent hover:underline">{t.readEn}</Link>
              </>
            ) : null}
          </div>
        </header>

        <section aria-label={t.short} className="mt-6 rounded-2xl bg-gradient-to-br from-[#0e1a52] to-[#03051f] p-5 text-white ring-1 ring-white/10">
          <div className="text-[11px] font-medium uppercase tracking-wide text-[#7aa2ff]">A1 Summary · {t.short}</div>
          <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-white/90">
            {article.summary.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#7aa2ff]" aria-hidden="true" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {await Promise.all(article.blocks.map(async (b, i) => <div key={i}>{await BlockView({ block: b, article })}</div>))}

        <aside className="my-8 rounded-2xl bg-neutral-50 px-4 py-4 text-[14px] leading-relaxed text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{t.source}</div>
          <a href={article.source.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[16px] font-medium text-accent hover:underline">
            {article.source.name}: {article.source.title}
          </a>
          <p className="mt-1">{t.sourceNote}</p>
        </aside>

        <aside className="my-8 flex flex-col gap-3 rounded-2xl bg-accent/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{t.botTitle}</div>
            <p className="mt-1 text-[14px] leading-snug text-neutral-600 dark:text-neutral-400">{t.botText}</p>
          </div>
          <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
            {t.botBtn}
          </a>
        </aside>

        {article.faq.length > 0 ? (
          <section className="mt-10">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{t.faq}</h2>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {article.faq.map((f) => (
                <details key={f.q} className="group py-3">
                  <summary className="cursor-pointer list-none text-[16px] font-medium text-neutral-900 dark:text-neutral-100">{f.q}</summary>
                  <p className="mt-2 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{inline(f.a)}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </article>

      {related.length > 0 ? (
        <section className="mt-12 border-t border-neutral-100 pt-8 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{t.related}</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/news/${r.slug}`} className="text-[16px] font-medium text-neutral-900 hover:text-accent dark:text-neutral-50">{r.h1}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
