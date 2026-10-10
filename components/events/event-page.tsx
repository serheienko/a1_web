// components/events/event-page.tsx -- страница одного события (uk и en).
import Link from "next/link";
import { notFound } from "next/navigation";
import type { EvLang, EventItem } from "@/lib/events/types";
import { loadEvents } from "@/lib/events/store";
import { breadcrumbJsonLd, eventJsonLd } from "@/lib/events/seo";
import { FORMAT_LABEL, SITE_URL, cityLabel, countryLabel, eventPath, fmtDay, fmtRange, indexPath, placeLabel, placePath, placeSlugOf, seriesPath, sortByStart, tagSlug, todayKyiv, topicPath } from "@/lib/events/util";
import { findTechLanding } from "@/lib/seo/tech-landings";
import { DateTile } from "./date-tile";
import { EventCover } from "./event-cover";
import { EventRow } from "./event-row";

const TXT = {
  uk: {
    events: "Події", when: "Коли", where: "Де", format: "Формат", price: "Вартість", lang: "Мова програми", free: "Безкоштовно",
    go: "Перейти на сайт події", ics: "Додати в календар", ended: "Подія вже відбулася", editions: "Усі видання", similar: "Схожі події",
    cfp: "Приймають доповіді", cfpUntil: "до", cfpGo: "Подати доповідь", jobs: "Вакансії по темі", jobsLead: "Шукаєте роботу в цій темі? Відкриті вакансії:",
    src: "Дані про подію", note: "Перед поїздкою перевірте дату й ціну на сайті організатора.", aboutSeries: "Про серію",
  },
  en: {
    events: "Events", when: "When", where: "Where", format: "Format", price: "Price", lang: "Program language", free: "Free",
    go: "Go to the event site", ics: "Add to calendar", ended: "This event has already taken place", editions: "All editions", similar: "Similar events",
    cfp: "Call for papers is open", cfpUntil: "until", cfpGo: "Submit a talk", jobs: "Jobs on this topic", jobsLead: "Looking for a job in this area? Open vacancies:",
    src: "Event data", note: "Please check the date and price on the organiser's site before you go.", aboutSeries: "About the series",
  },
} as const;

const LANG_NAMES: Record<string, { uk: string; en: string }> = {
  UK: { uk: "Українська", en: "Ukrainian" }, EN: { uk: "Англійська", en: "English" }, DE: { uk: "Німецька", en: "German" },
  FR: { uk: "Французька", en: "French" }, ES: { uk: "Іспанська", en: "Spanish" }, PL: { uk: "Польська", en: "Polish" },
  PT: { uk: "Португальська", en: "Portuguese" }, IT: { uk: "Італійська", en: "Italian" }, NL: { uk: "Нідерландська", en: "Dutch" },
};
function langNames(codes: string, lang: "uk" | "en"): string {
  return codes.split(/[,\s/]+/).filter(Boolean).map((c) => LANG_NAMES[c.toUpperCase()]?.[lang] ?? c).join(", ");
}

export async function EventPage({ slug, lang }: { slug: string; lang: EvLang }) {
  const t = TXT[lang];
  const all = await loadEvents();
  const e = all.find((x) => x.slug === slug);
  if (!e) notFound();
  const today = todayKyiv();
  const past = e.end < today;
  const siblings = all.filter((x) => x.series === e.series).sort(sortByStart);
  const tagSet = new Set(e.tags);
  const similar = all
    .filter((x) => x.slug !== e.slug && x.series !== e.series && x.end >= today && x.tags.some((tg) => tagSet.has(tg)))
    .sort((a, b) => b.tags.filter((tg) => tagSet.has(tg)).length - a.tags.filter((tg) => tagSet.has(tg)).length || sortByStart(a, b))
    .slice(0, 6);
  const techLinks = e.tags
    .map((tg) => findTechLanding(tagSlug(tg)))
    .filter((x): x is NonNullable<typeof x> => !!x)
    .slice(0, 4);
  const cfpOpen = !!e.cfpUrl && !!e.cfpEnd && e.cfpEnd >= today && !past;
  const jsonLd = eventJsonLd(e, lang);
  const crumbs = breadcrumbJsonLd([
    { name: t.events, path: indexPath(lang) },
    { name: e.seriesName, path: seriesPath(e.series, lang) },
    { name: e.name, path: eventPath(e.slug, lang) },
  ]);
  const price = e.free ? t.free : e.price;
  const pslugs = placeSlugOf(e);
  const places: { slug: string; label: string }[] = [];
  if (e.city && !e.online && pslugs[0]) places.push({ slug: pslugs[0], label: cityLabel(e.city, lang) });
  if (e.country && pslugs.length) places.push({ slug: pslugs[pslugs.length - 1] ?? "", label: countryLabel(e.country, lang) });
  const place = placeLabel(e, lang);
  const facts: [string, string][] = [
    [t.when, fmtRange(e.start, e.end, lang)],
    ...(place ? ([[t.where, place]] as [string, string][]) : []),
    [t.format, FORMAT_LABEL[e.format][lang] + (e.online ? (lang === "uk" ? " · онлайн" : " · online") : "")],
    ...(price ? ([[t.price, price]] as [string, string][]) : []),
    ...(e.locales ? ([[t.lang, langNames(e.locales, lang)]] as [string, string][]) : []),
  ];
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-12 pb-fab-safe">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <nav aria-label="breadcrumb" className="text-[13px] text-neutral-500 dark:text-neutral-400">
        <Link href={indexPath(lang)} className="hover:text-accent">{t.events}</Link>
        <span className="px-1.5">›</span>
        <Link href={seriesPath(e.series, lang)} className="hover:text-accent">{e.seriesName}</Link>
      </nav>

      <EventCover src={e.image} name={e.name} seed={e.slug} label={FORMAT_LABEL[e.format][lang]} big className="mt-4 aspect-[16/8] w-full rounded-2xl" />

      <div className="mt-5 flex items-start gap-4">
        <DateTile start={e.start} lang={lang} size="lg" past={past} />
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-neutral-900 sm:text-[34px] dark:text-neutral-50">{e.name}</h1>
          <p className="mt-1 text-[15px] text-neutral-500 dark:text-neutral-400">{[place, fmtRange(e.start, e.end, lang)].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      {past ? <p className="mt-4 rounded-xl bg-neutral-100 px-4 py-2.5 text-[14px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{t.ended}.</p> : null}

      <p className="mt-5 text-[17px] leading-relaxed text-neutral-800 dark:text-neutral-200">{e.summary[lang]}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <a href={e.url} target="_blank" rel="noopener nofollow" className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90">{t.go} ↗</a>
        {!past ? <a href={`/api/events/ics/${e.slug}`} className="rounded-full bg-neutral-100 px-5 py-2.5 text-[15px] font-semibold text-neutral-800 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700">{t.ics}</a> : null}
      </div>

      <dl className="mt-6 grid gap-x-6 gap-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:grid-cols-2 dark:bg-neutral-900 dark:ring-neutral-800">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[12px] font-medium uppercase tracking-wide text-neutral-400">{k}</dt>
            <dd className="mt-0.5 text-[15px] font-medium text-neutral-900 dark:text-neutral-50">{v}</dd>
          </div>
        ))}
      </dl>

      {e.tags.length || places.length ? (
        <p className="mt-5 flex flex-wrap gap-2">
          {e.tags.map((tg) => (
            <Link key={tg} href={topicPath(tagSlug(tg), lang)} className="rounded-full bg-accent/10 px-3 py-1 text-[13px] font-medium text-accent hover:bg-accent/20">{tg}</Link>
          ))}
          {places.map((pl) => (
            <Link key={pl.slug} href={placePath(pl.slug, lang)} className="rounded-full bg-neutral-100 px-3 py-1 text-[13px] font-medium text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300">{pl.label}</Link>
          ))}
        </p>
      ) : null}

      {cfpOpen ? (
        <div className="mt-6 rounded-2xl bg-amber-500/10 p-4 text-[15px] text-neutral-800 dark:text-neutral-100">
          <b>{t.cfp}</b> {t.cfpUntil} {fmtDay(e.cfpEnd as string, lang)}.{" "}
          <a href={e.cfpUrl} target="_blank" rel="noopener nofollow" className="font-semibold text-accent hover:underline">{t.cfpGo} ↗</a>
        </div>
      ) : null}

      {techLinks.length ? (
        <section className="mt-8">
          <h2 className="text-[20px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t.jobs}</h2>
          <p className="mt-1 text-[14px] text-neutral-500 dark:text-neutral-400">{t.jobsLead}</p>
          <p className="mt-3 flex flex-wrap gap-2">
            {techLinks.map((l) => (
              <Link key={l.slug} href={`/jobs/stack/${l.slug}`} className="rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-[14px] font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">{l.tech}</Link>
            ))}
          </p>
        </section>
      ) : null}

      {siblings.length > 1 ? (
        <section className="mt-8">
          <h2 className="text-[20px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t.editions} · <Link href={seriesPath(e.series, lang)} className="text-accent hover:underline">{e.seriesName}</Link></h2>
          <ul className="mt-2">
            {siblings.slice(0, 6).map((s) => (
              <EventRow key={s.slug} e={s} lang={lang} past={s.end < today} showTags={false} />
            ))}
          </ul>
        </section>
      ) : null}

      {similar.length ? (
        <section className="mt-8">
          <h2 className="text-[20px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t.similar}</h2>
          <ul className="mt-2">
            {similar.map((s) => (
              <EventRow key={s.slug} e={s} lang={lang} showTags={false} />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 border-t border-neutral-200 pt-4 text-[12px] leading-relaxed text-neutral-400 dark:border-neutral-800">
        {t.note} {t.src}: <a href={e.sourceUrl} target="_blank" rel="noopener nofollow" className="underline hover:text-accent">{e.source}</a>.
      </p>
    </main>
  );
}

export type { EventItem };
export { SITE_URL };
