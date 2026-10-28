// lib/cv-landing/registry.ts -- адреса и языки страницы «CV Builder» (28.10.2026).
// /cv-builder -- украинская (главная), /cv-builder/<lang> -- остальные 8.
// Каждая версия ссылается на все остальные (hreflang), x-default -- английская.
import type { CvLandingContent, CvLandingLang } from "@/lib/cv-landing/types";
import { uk } from "@/lib/cv-landing/content/uk";
import { en } from "@/lib/cv-landing/content/en";
import { ru } from "@/lib/cv-landing/content/ru";
import { de } from "@/lib/cv-landing/content/de";
import { es } from "@/lib/cv-landing/content/es";
import { fr } from "@/lib/cv-landing/content/fr";
import { pl } from "@/lib/cv-landing/content/pl";
import { ptBR } from "@/lib/cv-landing/content/ptBR";
import { zh } from "@/lib/cv-landing/content/zh";

export const CV_LANDING_SITE = "https://jobs.a1appp.com";

export const CV_LANDING: Record<CvLandingLang, CvLandingContent> = { uk, en, ru, de, es, fr, pl, ptBR, zh };

/** Сегмент адреса для не-украинских версий. */
export const CV_LANDING_SEGMENT: Record<Exclude<CvLandingLang, "uk">, string> = {
  en: "en",
  ru: "ru",
  de: "de",
  es: "es",
  fr: "fr",
  pl: "pl",
  ptBR: "pt-br",
  zh: "zh",
};

export const CV_LANDING_HREFLANG: Record<CvLandingLang, string> = {
  uk: "uk",
  en: "en",
  ru: "ru",
  de: "de",
  es: "es",
  fr: "fr",
  pl: "pl",
  ptBR: "pt-BR",
  zh: "zh-Hans",
};

export const CV_LANDING_OG_LOCALE: Record<CvLandingLang, string> = {
  uk: "uk_UA",
  en: "en_US",
  ru: "ru_RU",
  de: "de_DE",
  es: "es_ES",
  fr: "fr_FR",
  pl: "pl_PL",
  ptBR: "pt_BR",
  zh: "zh_CN",
};

export const CV_LANDING_LANGS = Object.keys(CV_LANDING) as CvLandingLang[];

export function cvLandingPath(lang: CvLandingLang): string {
  return lang === "uk" ? "/cv-builder" : `/cv-builder/${CV_LANDING_SEGMENT[lang]}`;
}

export function cvLandingLangFromSegment(seg: string): CvLandingLang | null {
  const hit = (Object.entries(CV_LANDING_SEGMENT) as [Exclude<CvLandingLang, "uk">, string][]).find(([, s]) => s === seg.toLowerCase());
  return hit ? hit[0] : null;
}

export function cvLandingAlternates(lang: CvLandingLang) {
  const languages: Record<string, string> = {};
  for (const l of CV_LANDING_LANGS) languages[CV_LANDING_HREFLANG[l]] = `${CV_LANDING_SITE}${cvLandingPath(l)}`;
  languages["x-default"] = `${CV_LANDING_SITE}${cvLandingPath("en")}`;
  return { canonical: `${CV_LANDING_SITE}${cvLandingPath(lang)}`, languages };
}
