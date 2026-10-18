// components/events/index-page.tsx -- главная раздела «Події» (uk и en).
import Link from "next/link";
import { loadEvents } from "@/lib/events/store";
import { collectTags, indexPath, todayKyiv } from "@/lib/events/util";
import type { EvLang } from "@/lib/events/types";
import { EventsExplorer } from "./events-explorer";
import type { ListEvent } from "./event-row";
import { SITE_URL } from "@/lib/events/util";
import { T } from "@/components/t";
import { tt } from "@/lib/events/ui";

// Названия переключателя uk/en страниц: только для тех, кто читает по-украински, по-русски или по-английски.
const SWITCH = {
  uk: { other: "EN", otherLabel: "English version" },
  en: { other: "UA", otherLabel: "Українською" },
} as const;

export async function EventsIndexPage({ lang }: { lang: EvLang }) {
  const t = SWITCH[lang];
  const h1Text = lang === "uk" ? "IT-події" : "Tech events";
  const all = await loadEvents();
  const today = todayKyiv();
  const tags = collectTags(all, today);
  const list: ListEvent[] = all
    .filter((e) => e.end >= today)
    .sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name))
    .map((e) => ({ slug: e.slug, name: e.name, start: e.start, end: e.end, city: e.city, country: e.country, online: e.online, tags: e.tags, image: e.image, price: e.price, free: e.free, format: e.format }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${h1Text} | A1 Jobs`,
    url: `${SITE_URL}${indexPath(lang)}`,
    inLanguage: lang === "uk" ? "uk-UA" : "en",
    mainEntity: { "@type": "ItemList", itemListElement: list.slice(0, 50).map((e, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}${lang === "uk" ? "/events/" : "/events/en/"}${e.slug}`, name: e.name })) },
  };
  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EventsExplorer
        events={list}
        tags={tags}
        lang={lang}
        today={today}
        heading={
          <>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50"><T {...tt("h1")} /></h1>
              <Link href={indexPath(lang === "uk" ? "en" : "uk")} hrefLang={lang === "uk" ? "en" : "uk"} className="mt-2 hidden shrink-0 rounded-full lang-uk:inline-block lang-ru:inline-block lang-en:inline-block bg-neutral-100 px-3 py-1 text-[12px] font-semibold text-neutral-600 transition hover:bg-accent/10 hover:text-accent dark:bg-neutral-800 dark:text-neutral-300" title={t.otherLabel}>{t.other}</Link>
            </div>
            <p className="mt-2 max-w-2xl text-neutral-500 dark:text-neutral-400"><T {...tt("lead")} /></p>
          </>
        }
      />
    </main>
  );
}
