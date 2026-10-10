// components/news/news-list.tsx -- список новостей одного языка (для /news и /news/en).
// Свежая новость -- крупная карточка, остальные -- строки с миниатюрой слева.
import Link from "next/link";
import type { NewsArticle } from "@/lib/news/types";
import { altNews } from "@/lib/news/articles";
import { newsDate, readingMinutes } from "@/lib/news/util";
import { NewsThumb } from "@/components/news/news-thumb";

const L = {
  uk: { min: "хв читання", other: "Read in English" },
  en: { min: "min read", other: "Читати українською" },
} as const;

function Meta({ a, pool }: { a: NewsArticle; pool: NewsArticle[] }) {
  const t = L[a.lang];
  const alt = altNews(a, pool);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-neutral-500 dark:text-neutral-400">
      <span className="font-medium uppercase tracking-wide text-accent">{a.kicker}</span>
      <span>·</span>
      <time dateTime={a.published}>{newsDate(a.published, a.lang)}</time>
      <span>·</span>
      <span>{readingMinutes(a)} {t.min}</span>
      {alt ? (
        <Link
          href={`/news/${alt.slug}`}
          hrefLang={alt.lang}
          lang={alt.lang}
          title={t.other}
          className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 transition hover:bg-accent/10 hover:text-accent dark:bg-neutral-800 dark:text-neutral-300"
        >
          {alt.lang.toUpperCase()}
        </Link>
      ) : null}
    </div>
  );
}

export function NewsList({ items, pool }: { items: NewsArticle[]; pool?: NewsArticle[] }) {
  const all = pool ?? items;
  const [first, ...rest] = items;
  if (!first) return null;
  return (
    <div className="mt-8 flex flex-col gap-6">
      <article className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-neutral-200 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-neutral-900 dark:ring-neutral-800" lang={first.lang}>
        <Link href={`/news/${first.slug}`} className="grid gap-0 sm:grid-cols-[1.1fr_1fr]">
          <NewsThumb thumb={first.thumb} seed={first.slug} className="sm:h-full sm:aspect-auto sm:min-h-[220px]" />
          <span className="flex flex-col justify-center gap-2 p-5 sm:p-6">
            <span className="text-[13px] text-neutral-400">{first.lang === "uk" ? "Свіже" : "Latest"}</span>
            <span className="text-2xl font-bold leading-tight tracking-tight text-neutral-900 transition group-hover:text-accent dark:text-neutral-50">{first.h1}</span>
            <span className="line-clamp-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{first.description}</span>
          </span>
        </Link>
        <div className="border-t border-neutral-100 px-5 py-3 sm:px-6 dark:border-neutral-800">
          <Meta a={first} pool={all} />
        </div>
      </article>

      {rest.map((a) => (
        <article key={a.slug} lang={a.lang} className="group grid grid-cols-[112px_1fr] gap-4 sm:grid-cols-[200px_1fr] sm:gap-5">
          <Link href={`/news/${a.slug}`} tabIndex={-1} className="block self-start overflow-hidden rounded-2xl ring-1 ring-neutral-200 transition group-hover:ring-accent/40 dark:ring-neutral-800">
            <NewsThumb thumb={a.thumb} seed={a.slug} />
          </Link>
          <div className="min-w-0">
            <Meta a={a} pool={all} />
            <Link href={`/news/${a.slug}`} className="mt-1 block text-lg font-semibold leading-snug text-neutral-900 transition group-hover:text-accent dark:text-neutral-50 sm:text-xl">{a.h1}</Link>
            <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-[15px]">{a.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
