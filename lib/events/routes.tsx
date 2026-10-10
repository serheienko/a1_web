// lib/events/routes.tsx -- общая логика страниц «Події» (uk и en используют одно и то же).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionPage } from "@/components/events/collection-page";
import { loadEvents } from "./store";
import { eventMetadata, pairLanguages } from "./seo";
import type { EvLang, EventItem } from "./types";
import { MIN_COLLECTION, SITE_URL, collectPlaces, collectTags, indexPath, placePath, placeSlugOf, seriesPath, tagSlug, todayKyiv, topicPath, countryLabel, cityLabel } from "./util";

export async function eventMeta(slug: string, lang: EvLang): Promise<Metadata> {
  const e = (await loadEvents()).find((x) => x.slug === slug);
  if (!e) return { title: "404", robots: { index: false } };
  return eventMetadata(e, lang);
}

export function indexMeta(lang: EvLang): Metadata {
  const title = lang === "uk" ? "IT-події: конференції та мітапи в Україні, Європі, світі й онлайн | A1 Jobs" : "Tech events: conferences & meetups in Ukraine, Europe, worldwide and online | A1 Jobs";
  const description =
    lang === "uk"
      ? "Календар IT-конференцій і мітапів: дати, місця, теми й короткий опис кожної події. Україна, Європа, світ та онлайн. Оновлюється щодня."
      : "A calendar of tech conferences and meetups: dates, places, topics and a short take on each event. Ukraine, Europe, worldwide and online. Updated daily.";
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${indexPath(lang)}`, languages: pairLanguages("/events", "/events/en") },
    openGraph: { title, description, url: `${SITE_URL}${indexPath(lang)}`, type: "website", locale: lang === "uk" ? "uk_UA" : "en_US" },
  };
}

type Found = { events: EventItem[]; all: EventItem[] };

async function inSeries(slug: string): Promise<Found & { name: string }> {
  const all = await loadEvents();
  const events = all.filter((e) => e.series === slug);
  return { all, events, name: events[0]?.seriesName ?? "" };
}

export async function seriesMeta(slug: string, lang: EvLang): Promise<Metadata> {
  const { events, name } = await inSeries(slug);
  if (!events.length) return { title: "404", robots: { index: false } };
  const title = lang === "uk" ? `${name}: дати, місце й усі видання | A1 Jobs` : `${name}: dates, venue and all editions | A1 Jobs`;
  const description = lang === "uk" ? `${name} — коли й де відбудеться наступне видання, програма та архів минулих років.` : `${name} — when and where the next edition takes place, plus the archive of past years.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${seriesPath(slug, lang)}`, languages: pairLanguages(seriesPath(slug, "uk"), seriesPath(slug, "en")) },
    openGraph: { title, description, url: `${SITE_URL}${seriesPath(slug, lang)}`, type: "website" },
  };
}

export async function SeriesRoute({ slug, lang }: { slug: string; lang: EvLang }) {
  const { events, all, name } = await inSeries(slug);
  if (!events.length) notFound();
  const next = events.filter((e) => e.end >= todayKyiv()).sort((a, b) => a.start.localeCompare(b.start))[0];
  const lead =
    lang === "uk"
      ? next
        ? `${name}: наступне видання — ${next.start.slice(0, 4)} рік. Тут зібрано дати, місце, теми й архів попередніх видань.`
        : `${name}: усі видання, які ми знаємо. Щойно організатори оголосять нову дату, вона з’явиться тут.`
      : next
        ? `${name}: the next edition is in ${next.start.slice(0, 4)}. Dates, venue, topics and the archive of earlier editions are collected here.`
        : `${name}: every edition we know of. As soon as the organisers announce a new date, it will appear here.`;
  return <CollectionPage kind="series" lang={lang} title={name} lead={lead} events={events} all={all} path={seriesPath(slug, lang)} />;
}

async function inTopic(slug: string): Promise<Found & { label: string }> {
  const all = await loadEvents();
  const events = all.filter((e) => e.tags.some((t) => tagSlug(t) === slug));
  const label = events[0]?.tags.find((t) => tagSlug(t) === slug) ?? "";
  return { all, events, label };
}

const topicTitle = (label: string, lang: EvLang) => (lang === "uk" ? `${label}: конференції та мітапи` : `${label} conferences and meetups`);

export async function topicMeta(slug: string, lang: EvLang): Promise<Metadata> {
  const { events, label } = await inTopic(slug);
  if (!events.length) return { title: "404", robots: { index: false } };
  const title = `${topicTitle(label, lang)} | A1 Jobs`;
  const description =
    lang === "uk"
      ? `Найближчі ${label}-події: дати, міста, вартість і короткий опис. Конференції й мітапи в Україні, Європі, світі та онлайн.`
      : `Upcoming ${label} events: dates, cities, prices and a short take on each. Conferences and meetups in Ukraine, Europe, worldwide and online.`;
  const live = events.length >= MIN_COLLECTION;
  return {
    title,
    description,
    robots: live ? undefined : { index: false, follow: true },
    alternates: { canonical: `${SITE_URL}${topicPath(slug, lang)}`, languages: pairLanguages(topicPath(slug, "uk"), topicPath(slug, "en")) },
    openGraph: { title, description, url: `${SITE_URL}${topicPath(slug, lang)}`, type: "website" },
  };
}

export async function TopicRoute({ slug, lang }: { slug: string; lang: EvLang }) {
  const { events, all, label } = await inTopic(slug);
  if (!events.length) notFound();
  const up = events.filter((e) => e.end >= todayKyiv()).length;
  const lead =
    lang === "uk"
      ? `${up ? `Найближчих подій за темою «${label}»: ${up}.` : `Найближчих подій за темою «${label}» поки немає.`} Дати, міста й короткий опис кожної; архів минулих видань нижче.`
      : `${up ? `Upcoming ${label} events: ${up}.` : `No upcoming ${label} events yet.`} Dates, cities and a short take on each; the archive of earlier editions is below.`;
  return <CollectionPage kind="topic" lang={lang} title={topicTitle(label, lang)} lead={lead} events={events} all={all} path={topicPath(slug, lang)} />;
}

async function inPlace(slug: string): Promise<Found & { label: string; isCountry: boolean }> {
  const all = await loadEvents();
  const events = all.filter((e) => placeSlugOf(e).includes(slug));
  const first = events[0];
  let label = "";
  let isCountry = false;
  if (first) {
    const s = placeSlugOf(first);
    isCountry = s[s.length - 1] === slug && !(first.city && !first.online && s[0] === slug);
    label = isCountry ? first.country : first.city;
  }
  return { all, events, label, isCountry };
}

const placeTitle = (label: string, lang: EvLang) => (lang === "uk" ? `IT-події: ${label}` : `Tech events in ${label}`);

export async function placeMeta(slug: string, lang: EvLang): Promise<Metadata> {
  const { events, label, isCountry } = await inPlace(slug);
  if (!events.length) return { title: "404", robots: { index: false } };
  const shown = isCountry ? countryLabel(label, lang) : cityLabel(label, lang);
  const title = `${placeTitle(shown, lang)} | A1 Jobs`;
  const description =
    lang === "uk"
      ? `IT-конференції та мітапи: ${shown}. Найближчі дати, теми, вартість і короткий опис кожної події.`
      : `Tech conferences and meetups in ${shown}: upcoming dates, topics, prices and a short take on each event.`;
  const live = events.length >= MIN_COLLECTION;
  return {
    title,
    description,
    robots: live ? undefined : { index: false, follow: true },
    alternates: { canonical: `${SITE_URL}${placePath(slug, lang)}`, languages: pairLanguages(placePath(slug, "uk"), placePath(slug, "en")) },
    openGraph: { title, description, url: `${SITE_URL}${placePath(slug, lang)}`, type: "website" },
  };
}

export async function PlaceRoute({ slug, lang }: { slug: string; lang: EvLang }) {
  const { events, all, label, isCountry } = await inPlace(slug);
  if (!events.length) notFound();
  const shown = isCountry ? countryLabel(label, lang) : cityLabel(label, lang);
  const up = events.filter((e) => e.end >= todayKyiv()).length;
  const lead =
    lang === "uk"
      ? `${up ? `Найближчих IT-подій: ${up}.` : "Найближчих дат поки немає."} ${shown} — конференції, мітапи й воркшопи з датами, темами та коротким описом.`
      : `${up ? `Upcoming tech events: ${up}.` : "No upcoming dates yet."} ${shown} — conferences, meetups and workshops with dates, topics and a short take on each.`;
  return <CollectionPage kind="place" lang={lang} title={placeTitle(shown, lang)} lead={lead} events={events} all={all} path={placePath(slug, lang)} />;
}

export { collectPlaces, collectTags };
