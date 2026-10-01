// components/blog/article-view.tsx
//
// 01.10.2026. Страница статьи блога: заголовок, блоки текста, живые
// таблицы из индекса вакансий, FAQ, связанные статьи, разметка Article /
// BreadcrumbList / FAQPage. Серверный компонент.

import Link from "next/link";
import type { ReactNode } from "react";
import type { Article, Block, DataBlockId } from "@/lib/blog/types";
import { relatedArticles } from "@/lib/blog/articles";
import { countryStats, marketStats, type CountryStats, type MarketStats } from "@/lib/a1/stats-index";
import { countrySegments } from "@/lib/a1/segment-index";
import { countryByCode, flagEmoji } from "@/lib/seo/countries";
import { cityLabel, levelLabel, MIN_SEGMENT_POSTS } from "@/lib/seo/segments";

const SITE_URL = "https://jobs.a1appp.com";

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

const fmtN = (n: number, lang: "uk" | "en") => n.toLocaleString(lang === "uk" ? "uk-UA" : "en-US").replace(/ /g, " ");
const fmtK = (n: number) => `$${Math.round(n / 1000)}k`;

function Bars({ rows, lang }: { rows: { label: ReactNode; count: number }[]; lang: "uk" | "en" }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="not-prose my-5 flex flex-col gap-2">
      {rows.map((r, i) => (
        <li key={i} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr_auto]">
          <span className="truncate text-neutral-700 dark:text-neutral-300">{r.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <span className="block h-full rounded-full bg-accent/70" style={{ width: `${Math.max(3, (r.count / max) * 100)}%` }} />
          </span>
          <span className="tabular-nums text-neutral-500 dark:text-neutral-400">{fmtN(r.count, lang)}</span>
        </li>
      ))}
    </ul>
  );
}

const SKIP_TECH = new Set(["Jira", "Excel", "REST", "Git"]);

function DataTable({ id, s, c, lang }: { id: DataBlockId; s: MarketStats; c?: CountryStats; lang: "uk" | "en" }) {
  const uk = lang === "uk";
  switch (id) {
    case "country-summary":
      if (!c) return null;
      return (
        <Bars
          lang={lang}
          rows={[
            { label: "Open roles", count: c.total },
            { label: "Remote", count: c.remote },
            { label: "Hybrid", count: c.hybrid },
          ]}
        />
      );
    case "country-salary":
      if (!c?.salaryUsd) return null;
      return (
        <p className="my-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          Median advertised pay across {fmtN(c.salaryUsd.n, lang)} roles that state a USD salary: <strong>{fmtK(c.salaryUsd.median)}</strong> a year
          (typical range {fmtK(c.salaryUsd.p25)}–{fmtK(c.salaryUsd.p75)}).
        </p>
      );
    case "country-levels":
      if (!c) return null;
      return (
        <Bars
          lang={lang}
          rows={c.levels.map((l) => ({
            label: l.count >= MIN_SEGMENT_POSTS ? <Link href={`/jobs/country/${c.cc.toLowerCase()}/${l.level}`} className="hover:text-accent">{levelLabel(l.level)}</Link> : levelLabel(l.level),
            count: l.count,
          }))}
        />
      );
    case "country-tech":
      if (!c) return null;
      return (
        <Bars
          lang={lang}
          rows={c.tech.slice(0, 12).map((t) => ({
            label: t.slug && t.href && t.count >= MIN_SEGMENT_POSTS ? <Link href={`/jobs/country/${c.cc.toLowerCase()}/${t.slug}`} className="hover:text-accent">{t.tech}</Link> : t.tech,
            count: t.count,
          }))}
        />
      );
    case "country-cities":
      if (!c) return null;
      return <Bars lang={lang} rows={c.cities.map((x) => ({ label: x.city, count: x.count }))} />;
    case "country-employers":
      if (!c) return null;
      return (
        <Bars
          lang={lang}
          rows={c.employers.map((e) => ({
            label: e.href ? <Link href={e.href} className="hover:text-accent">{e.name}</Link> : e.name,
            count: e.count,
          }))}
        />
      );
    case "summary":
      return (
        <Bars
          lang={lang}
          rows={[
            { label: uk ? "Усього відкритих" : "All open roles", count: s.total },
            { label: uk ? "Україна і для українців" : "Ukraine & Ukrainian-friendly", count: s.ua },
            { label: uk ? "Інші країни" : "Other countries", count: s.world },
            { label: "🌏 Worldwide", count: s.worldwide },
          ]}
        />
      );
    case "uk-levels":
      return (
        <Bars
          lang={lang}
          rows={s.uaLevels.map((l) => ({
            label: <Link href={`/jobs/level/${l.level}`} className="hover:text-accent">{levelLabel(l.level)}</Link>,
            count: l.count,
          }))}
        />
      );
    case "uk-format":
      return (
        <Bars
          lang={lang}
          rows={[
            { label: <Link href="/jobs/remote" className="hover:text-accent">{uk ? "Віддалено" : "Remote"}</Link>, count: s.uaFormat.remote },
            { label: <Link href="/jobs/hybrid" className="hover:text-accent">{uk ? "Гібрид" : "Hybrid"}</Link>, count: s.uaFormat.hybrid },
            { label: <Link href="/jobs/office" className="hover:text-accent">{uk ? "Офіс" : "On-site"}</Link>, count: s.uaFormat.office },
          ]}
        />
      );
    case "uk-cities":
      return <Bars lang={lang} rows={s.uaCities.map((c) => ({ label: cityLabel(c.city, "uk"), count: c.count }))} />;
    case "uk-tech":
    case "world-tech": {
      const list = (id === "uk-tech" ? s.uaTech : s.worldTech).filter((t) => !SKIP_TECH.has(t.tech));
      return (
        <Bars
          lang={lang}
          rows={list.slice(0, 15).map((t) => ({
            label: t.href ? <Link href={t.href} className="hover:text-accent">{t.tech}</Link> : t.tech,
            count: t.count,
          }))}
        />
      );
    }
    case "world-countries":
      return (
        <Bars
          lang={lang}
          rows={s.worldCountries.map((c) => {
            const country = countryByCode(c.cc);
            const name = country ? (uk ? country.uk : country.en) : c.cc;
            return {
              label: (
                <Link href={`/jobs/country/${c.cc.toLowerCase()}`} className="hover:text-accent">
                  {flagEmoji(c.cc)} {name}
                </Link>
              ),
              count: c.count,
            };
          })}
        />
      );
    case "salary-by-tech":
      return (
        <div className="not-prose my-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="py-2 pr-3 font-medium">{uk ? "Технологія" : "Technology"}</th>
                <th className="py-2 pr-3 font-medium">{uk ? "Медіана / рік" : "Median / year"}</th>
                <th className="py-2 pr-3 font-medium">{uk ? "Типова вилка" : "Typical range"}</th>
                <th className="py-2 font-medium">{uk ? "Вакансій" : "Jobs"}</th>
              </tr>
            </thead>
            <tbody>
              {s.salaryByTech.slice(0, 20).map((t) => (
                <tr key={t.tech} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 pr-3 text-neutral-800 dark:text-neutral-200">
                    {t.href ? <Link href={t.href} className="hover:text-accent">{t.tech}</Link> : t.tech}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{fmtK(t.median)}</td>
                  <td className="py-2 pr-3 tabular-nums text-neutral-500">{fmtK(t.p25)}–{fmtK(t.p75)}</td>
                  <td className="py-2 tabular-nums text-neutral-500">{fmtN(t.n, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function BlockView({ block, stats, countries, lang, id }: { block: Block; stats: MarketStats | null; countries: Map<string, CountryStats>; lang: "uk" | "en"; id?: string }) {
  switch (block.t) {
    case "p":
      return <p className="my-4 text-[16px] leading-[1.75] text-neutral-700 dark:text-neutral-300">{inline(block.text)}</p>;
    case "h2":
      return <h2 id={id} className="mt-10 mb-2 scroll-mt-20 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{block.text}</h2>;
    case "h3":
      return <h3 className="mt-6 mb-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{block.text}</h3>;
    case "ul":
      return (
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-[16px] leading-[1.7] text-neutral-700 dark:text-neutral-300">
          {block.items.map((it, i) => <li key={i}>{inline(it)}</li>)}
        </ul>
      );
    case "ol":
      return (
        <ol className="my-4 list-decimal space-y-1.5 pl-6 text-[16px] leading-[1.7] text-neutral-700 dark:text-neutral-300">
          {block.items.map((it, i) => <li key={i}>{inline(it)}</li>)}
        </ol>
      );
    case "note":
      return (
        <p className="my-5 rounded-xl bg-neutral-50 px-4 py-3 text-[14px] leading-relaxed text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          {inline(block.text)}
        </p>
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
    case "data":
      if (!stats) return null;
      return (
        <figure className="my-6">
          {block.title ? <figcaption className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{block.title}</figcaption> : null}
          <DataTable id={block.id} s={stats} c={block.cc ? countries.get(block.cc.toUpperCase()) : undefined} lang={lang} />
          {block.caption ? <p className="text-[13px] text-neutral-400">{block.caption}</p> : null}
        </figure>
      );
  }
}

export async function ArticleView({ article }: { article: Article }) {
  const uk = article.lang === "uk";
  const needsData = article.blocks.some((b) => b.t === "data");
  const stats = needsData ? await marketStats().catch(() => null) : null;
  const ccs = [...new Set(article.blocks.flatMap((b) => (b.t === "data" && b.cc ? [b.cc.toUpperCase()] : [])))];
  const countries = new Map<string, CountryStats>();
  for (const cc of ccs) {
    const st = await countryStats(cc).catch(() => null);
    if (st) countries.set(cc, st);
  }
  // Ссылки на сегменты страны (/jobs/country/<cc>/<сегмент>) оставляем только живые:
  // в сегменте 10+ вакансий. Иначе читатель попадёт на пустую noindex-страницу.
  const liveSeg = new Map<string, Set<string>>();
  for (const b of article.blocks) {
    if (b.t !== "links") continue;
    for (const l of b.links) {
      const m = /^\/jobs\/country\/([a-z]{2})\/([^/?#]+)$/.exec(l.href);
      if (m && m[1] && !liveSeg.has(m[1])) {
        const seg = await countrySegments(m[1]).catch(() => null);
        liveSeg.set(m[1], new Set(seg ? [...seg.stacks.map((x) => x.slug), ...seg.levels.map((x) => x.level as string), ...(seg.remote > 0 ? ["remote"] : [])] : []));
      }
    }
  }
  const blocks: Block[] = article.blocks.map((b) =>
    b.t === "links"
      ? {
          ...b,
          links: b.links.filter((l) => {
            const m = /^\/jobs\/country\/([a-z]{2})\/([^/?#]+)$/.exec(l.href);
            return !m || !m[1] || !m[2] || !!liveSeg.get(m[1])?.has(m[2]);
          }),
        }
      : b,
  );
  const url = `${SITE_URL}/blog/${article.slug}`;
  const headingIds = new Map<number, string>();
  const headings: { id: string; text: string }[] = [];
  article.blocks.forEach((b, i) => {
    if (b.t === "h2") {
      const id = `s${headings.length + 1}`;
      headingIds.set(i, id);
      headings.push({ id, text: b.text });
    }
  });
  const words = article.blocks.reduce((n, b) => n + ("text" in b ? b.text.split(/\s+/).length : "items" in b ? b.items.join(" ").split(/\s+/).length : 0), 0);
  const minutes = Math.max(1, Math.round(words / 200));
  const related = relatedArticles(article);
  const dateLabel = new Date(article.updated).toLocaleDateString(uk ? "uk-UA" : "en-US", { day: "numeric", month: "long", year: "numeric" });

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.h1,
      description: article.description,
      inLanguage: article.lang,
      datePublished: article.published,
      dateModified: article.updated,
      mainEntityOfPage: url,
      image: `${url}/opengraph-image`,
      wordCount: words,
      author: { "@type": "Organization", name: "A1 Jobs", url: SITE_URL },
      publisher: { "@type": "Organization", name: "A1 Jobs", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: uk ? "Вакансії" : "Jobs", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: uk ? "Блог" : "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: article.h1, item: url },
      ],
    },
    ...(article.faq?.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: article.faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <Link href="/" className="transition hover:text-accent">{uk ? "Вакансії" : "Jobs"}</Link>
        <span aria-hidden="true" className="px-1.5">/</span>
        <Link href="/blog" className="transition hover:text-accent">{uk ? "Блог" : "Blog"}</Link>
      </nav>
      <article lang={article.lang}>
        <header className="mb-6">
          <div className="text-[12px] font-medium uppercase tracking-wide text-accent">{article.kicker}</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">{article.h1}</h1>
          <p className="mt-3 text-[13px] text-neutral-400">
            {uk ? "Оновлено" : "Updated"}: <time dateTime={article.updated}>{dateLabel}</time> · {minutes} {uk ? "хв читання" : "min read"} · {uk ? "Редакція A1 Jobs" : "A1 Jobs editorial"}
          </p>
        </header>
        {headings.length >= 3 ? (
          <nav aria-label={uk ? "Зміст" : "Contents"} className="mb-6 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-900">
            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{uk ? "Зміст" : "In this article"}</div>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] text-neutral-700 dark:text-neutral-300">
              {headings.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className="hover:text-accent">{h.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {blocks.map((b, i) => <BlockView key={i} block={b} stats={stats} countries={countries} lang={article.lang} id={b.t === "h2" ? headingIds.get(i) : undefined} />)}
        <p className="mt-10 rounded-xl bg-neutral-50 px-4 py-3 text-[13px] leading-relaxed text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          {uk
            ? "Звідки цифри: ми щодня збираємо відкриті вакансії з сайтів компаній і рахуємо їх у власній базі A1 Jobs. Числа в таблицях оновлюються автоматично, без ручних правок."
            : "Where the numbers come from: we collect open roles from company career pages every day and count them in our own A1 Jobs database. Figures in the tables refresh automatically, with no manual edits."}
        </p>
        {article.faq?.length ? (
          <section className="mt-10">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{uk ? "Часті запитання" : "FAQ"}</h2>
            <dl className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {article.faq.map((f, i) => (
                <div key={i} className="py-4">
                  <dt className="font-medium text-neutral-900 dark:text-neutral-100">{f.q}</dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{inline(f.a)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </article>
      {related.length ? (
        <section className="mt-12 border-t border-neutral-100 pt-6 dark:border-neutral-800">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{uk ? "Читайте також" : "Read next"}</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {related.map((a) => (
              <li key={a.slug}>
                <Link href={`/blog/${a.slug}`} className="text-[15px] text-neutral-800 hover:text-accent dark:text-neutral-200">{a.h1}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
