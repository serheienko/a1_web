// lib/cv-roles/registry.ts -- тексты и адреса страниц «пример резюме» (28.10.2026).
import type { CvLandingLang } from "@/lib/cv-landing/types";
import type { RoleSlug, RoleText, RoleUi } from "@/lib/cv-roles/types";
import { CV_LANDING_SEGMENT, CV_LANDING_SITE, CV_LANDING_HREFLANG, CV_LANDING_LANGS } from "@/lib/cv-landing/registry";
import { uk as uiUk } from "@/lib/cv-roles/ui/uk";
import { en as uiEn } from "@/lib/cv-roles/ui/en";
import { ru as uiRu } from "@/lib/cv-roles/ui/ru";
import { de as uiDe } from "@/lib/cv-roles/ui/de";
import { es as uiEs } from "@/lib/cv-roles/ui/es";
import { fr as uiFr } from "@/lib/cv-roles/ui/fr";
import { pl as uiPl } from "@/lib/cv-roles/ui/pl";
import { ptBR as uiPtBR } from "@/lib/cv-roles/ui/ptBR";
import { zh as uiZh } from "@/lib/cv-roles/ui/zh";
import { uk as tUk } from "@/lib/cv-roles/text/uk";
import { en as tEn } from "@/lib/cv-roles/text/en";
import { ru as tRu } from "@/lib/cv-roles/text/ru";
import { de as tDe } from "@/lib/cv-roles/text/de";
import { es as tEs } from "@/lib/cv-roles/text/es";
import { fr as tFr } from "@/lib/cv-roles/text/fr";
import { pl as tPl } from "@/lib/cv-roles/text/pl";
import { ptBR as tPtBR } from "@/lib/cv-roles/text/ptBR";
import { zh as tZh } from "@/lib/cv-roles/text/zh";

export const ROLE_UI: Record<CvLandingLang, RoleUi> = { uk: uiUk, en: uiEn, ru: uiRu, de: uiDe, es: uiEs, fr: uiFr, pl: uiPl, ptBR: uiPtBR, zh: uiZh };
export const ROLE_TEXT: Record<CvLandingLang, Record<RoleSlug, RoleText>> = { uk: tUk, en: tEn, ru: tRu, de: tDe, es: tEs, fr: tFr, pl: tPl, ptBR: tPtBR, zh: tZh };

/** Сегмент языка в адресе роли: у украинского тоже есть («uk»), т.к. /cv-builder/<role> занят языками. */
export function roleLangSegment(lang: CvLandingLang): string {
  return lang === "uk" ? "uk" : CV_LANDING_SEGMENT[lang];
}

export function rolePath(lang: CvLandingLang, slug: RoleSlug): string {
  return `/cv-builder/${roleLangSegment(lang)}/${slug}`;
}

export function roleLangFromSegment(seg: string): CvLandingLang | null {
  if (seg.toLowerCase() === "uk") return "uk";
  const hit = (Object.entries(CV_LANDING_SEGMENT) as [Exclude<CvLandingLang, "uk">, string][]).find(([, s]) => s === seg.toLowerCase());
  return hit ? hit[0] : null;
}

export function roleAlternates(lang: CvLandingLang, slug: RoleSlug) {
  const languages: Record<string, string> = {};
  for (const l of CV_LANDING_LANGS) languages[CV_LANDING_HREFLANG[l]] = `${CV_LANDING_SITE}${rolePath(l, slug)}`;
  languages["x-default"] = `${CV_LANDING_SITE}${rolePath("en", slug)}`;
  return { canonical: `${CV_LANDING_SITE}${rolePath(lang, slug)}`, languages };
}

export const fillTpl = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
