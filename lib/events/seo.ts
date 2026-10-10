// lib/events/seo.ts -- разметка и метаданные страниц «Події».
import type { Metadata } from "next";
import type { EvLang, EventItem } from "./types";
import { SITE_URL, eventPath, fmtRange, indexPath, placeLabel } from "./util";

/** schema.org/Event -- данные совпадают с тем, что человек видит на странице. */
export function eventJsonLd(e: EventItem, lang: EvLang) {
  const url = `${SITE_URL}${eventPath(e.slug, lang)}`;
  const place = e.city || e.country ? { "@type": "Place", name: placeLabel(e, lang), address: { "@type": "PostalAddress", ...(e.city ? { addressLocality: e.city } : {}), ...(e.country ? { addressCountry: e.country } : {}) } } : null;
  const mode = e.online ? (place ? "https://schema.org/MixedEventAttendanceMode" : "https://schema.org/OnlineEventAttendanceMode") : "https://schema.org/OfflineEventAttendanceMode";
  const location = e.online ? (place ? [place, { "@type": "VirtualLocation", url: e.url }] : { "@type": "VirtualLocation", url: e.url }) : place ?? { "@type": "VirtualLocation", url: e.url };
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.name,
    description: e.summary[lang],
    startDate: e.start,
    endDate: e.end,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: mode,
    location,
    ...(e.image ? { image: [e.image] } : {}),
    url,
    inLanguage: lang === "uk" ? "uk-UA" : "en",
    ...(e.free ? { isAccessibleForFree: true, offers: { "@type": "Offer", url: e.url, price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" } } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}

export function eventMetadata(e: EventItem, lang: EvLang): Metadata {
  const when = fmtRange(e.start, e.end, lang);
  const where = placeLabel(e, lang);
  const title = `${e.name} — ${when}${where ? `, ${where}` : ""} | A1 Jobs`;
  const body = e.summary[lang];
  const description = (body.length > 150 ? body.slice(0, 147).replace(/\s+\S*$/, "") + "…" : body);
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}${eventPath(e.slug, lang)}`,
      languages: { "uk-UA": `${SITE_URL}${eventPath(e.slug, "uk")}`, en: `${SITE_URL}${eventPath(e.slug, "en")}`, "x-default": `${SITE_URL}${eventPath(e.slug, "uk")}` },
    },
    openGraph: {
      title: e.name,
      description,
      url: `${SITE_URL}${eventPath(e.slug, lang)}`,
      type: "website",
      locale: lang === "uk" ? "uk_UA" : "en_US",
      ...(e.image ? { images: [{ url: e.image }] } : {}),
    },
    twitter: { card: e.image ? "summary_large_image" : "summary" },
  };
}

export function pairLanguages(pathUk: string, pathEn: string) {
  return { "uk-UA": `${SITE_URL}${pathUk}`, en: `${SITE_URL}${pathEn}`, "x-default": `${SITE_URL}${pathUk}` };
}

export { indexPath };
