// components/events/collection-page.tsx -- страницы-подборки «Події»: серия, тема, место.
// Серия -- вечная страница (в индексе всегда). Тема и место -- только когда в подборке
// не меньше MIN_COLLECTION событий, иначе noindex (тонкие страницы поиску не нужны).
import Link from "next/link";
import type { EvLang, EventItem } from "@/lib/events/types";
import { breadcrumbJsonLd } from "@/lib/events/seo";
import { SITE_URL, placeChipLabel, collectPlaces, collectTags, eventPath, indexPath, placePath, seriesPath, sortByStart, todayKyiv, topicPath } from "@/lib/events/util";
import { EventRow } from "./event-row";

const TXT = {
  uk: { events: "Події", upcoming: "Найближчі події", archive: "Архів", none: "Найближчих дат поки немає. Ми стежимо за оновленнями й додамо їх одразу, як організатори оголосять нове видання.",
        topics: "Інші теми", places: "Інші міста й країни", all: "Усі події", editions: "видань у каталозі" },
  en: { events: "Events", upcoming: "Upcoming events", archive: "Archive", none: "No upcoming dates yet. We watch for updates and add the next edition as soon as the organisers announce it.",
        topics: "Other topics", places: "Other cities and countries", all: "All events", editions: "editions in the catalogue" },
} as const;

export type CollKind = "series" | "topic" | "place";

export function CollectionPage({
  kind, lang, title, lead, events, all, path, crumb,
}: { kind: CollKind; lang: EvLang; title: string; lead: string; events: EventItem[]; all: EventItem[]; path: string; crumb?: { name: string; path: string } }) {
  const t = TXT[lang];
  const today = todayKyiv();
  const sorted = [...events].sort(sortByStart);
  const up = sorted.filter((e) => e.end >= today);
  const past = sorted.filter((e) => e.end < today).reverse();
  const tags = collectTags(all, today).filter((c) => c.n >= 3).slice(0, 14);
  const places = collectPlaces(all, today).filter((c) => c.n >= 3).slice(0, 14);
  const crumbs = breadcrumbJsonLd([{ name: t.events, path: indexPath(lang) }, ...(crumb ? [crumb] : []), { name: title, path }]);
  const list = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description: lead,
    url: `${SITE_URL}${path}`,
    inLanguage: lang === "uk" ? "uk-UA" : "en",
    mainEntity: { "@type": "ItemList", itemListElement: sorted.slice(0, 30).map((e, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}${eventPath(e.slug, lang)}`, name: e.name })) },
  };
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-12 pb-fab-safe">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(list) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <nav aria-label="breadcrumb" className="text-[13px] text-neutral-500 dark:text-neutral-400">
        <Link href={indexPath(lang)} className="hover:text-accent">{t.events}</Link>
      </nav>
      <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-neutral-900 sm:text-[36px] dark:text-neutral-50">{title}</h1>
      <p className="mt-2 text-[16px] leading-relaxed text-neutral-600 dark:text-neutral-300">{lead}</p>

      <section className="mt-6">
        <h2 className="text-[20px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t.upcoming}</h2>
        {up.length ? (
          <ul className="mt-2">{up.map((e) => <EventRow key={e.slug} e={e} lang={lang} />)}</ul>
        ) : (
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">{t.none}</p>
        )}
      </section>

      {past.length ? (
        <section className="mt-8">
          <h2 className="text-[20px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t.archive}</h2>
          <ul className="mt-2">{past.slice(0, 20).map((e) => <EventRow key={e.slug} e={e} lang={lang} past showTags={false} />)}</ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{t.topics}</h2>
        <p className="mt-2 flex flex-wrap gap-2">
          {tags.map((c) => (
            <Link key={c.slug} href={topicPath(c.slug, lang)} className="rounded-full bg-accent/10 px-3 py-1 text-[13px] font-medium text-accent hover:bg-accent/20">{c.label}</Link>
          ))}
        </p>
        <h2 className="mt-5 text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{t.places}</h2>
        <p className="mt-2 flex flex-wrap gap-2">
          {places.map((c) => (
            <Link key={c.slug} href={placePath(c.slug, lang)} className="rounded-full bg-neutral-100 px-3 py-1 text-[13px] font-medium text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300">{placeChipLabel(c.label, lang)}</Link>
          ))}
        </p>
        <p className="mt-5"><Link href={indexPath(lang)} className="text-[14px] font-semibold text-accent hover:underline">{t.all} →</Link></p>
      </section>
    </main>
  );
}

export { seriesPath };
