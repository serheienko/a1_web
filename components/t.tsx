// components/t.tsx
//
// Aleksandr, 2026-08-27: "дефолтный язык - укр. + добавить локализации на
// наши языки" — default UI language is Ukrainian, with Russian (what the
// whole site was written in until now) available as a switch.
//
// 2026-08-27 follow-up: "давай добавлять локализацию на наш сайт...
// сейчас локализуем, что у нас есть интерфейсные, их не так уж и много" —
// extended from the original uk/ru pair to all 9 languages the app's own
// Settings → Language screen offers: English, Українська, Русский,
// Deutsch, Español, Français, Polski, Português (Brasil), 简体中文.
//
// Scope unchanged: the site's own static chrome copy — nav, page
// headers, filter labels, empty/error states, badges. NOT user-generated
// content (post text, profile bios, category/tag names) — that comes
// from the backend/authors in whatever language they wrote it in,
// translating that is a separate, much bigger problem this doesn't
// attempt.
//
// Renders ALL 9 strings server-side and lets CSS (the `lang-XX:` variants
// in app/globals.css) decide which one is visible — exactly the trick
// already used for the two logo SVGs in site-nav.tsx (dark:hidden /
// hidden dark:block). Zero client JS needed per-string, works inside
// server components, and — importantly — doesn't touch cookies()/
// headers() anywhere, so the ISR'd feed pages (app/page.tsx,
// app/talents/page.tsx) keep revalidating on their normal schedule
// instead of being forced into per-request dynamic rendering.
export type Locale = "uk" | "en" | "ru" | "de" | "es" | "fr" | "pl" | "ptBR" | "zh";

// Every supported locale, in the same order the switcher lists them.
export const LOCALES: Locale[] = ["uk", "en", "ru", "de", "es", "fr", "pl", "ptBR", "zh"];

// Locale code -> the `lang-XX` class app/globals.css defines a variant
// for. Kept as its own map (not just `lang-${locale}`) because "ptBR"
// isn't a valid CSS custom-variant/class fragment as-is (lowercased to
// "ptbr" — see app/globals.css).
export const LOCALE_CLASS: Record<Locale, string> = {
  uk: "lang-uk",
  en: "lang-en",
  ru: "lang-ru",
  de: "lang-de",
  es: "lang-es",
  fr: "lang-fr",
  pl: "lang-pl",
  ptBR: "lang-ptbr",
  zh: "lang-zh",
};

// 2026-08-27 bugfix: the T() component below used to build each span's
// className by string concatenation — "hidden " + LOCALE_CLASS[locale] +
// ":inline". Tailwind v4 generates CSS only for class names its build-time
// scanner can find as a COMPLETE literal string somewhere in the source;
// a runtime-concatenated string never appears as one token anywhere in
// the file, so "lang-en:inline" (etc.) was never generated for ANY
// locale — every <T/> span sitewide rendered `display: none` permanently,
// for every language (caught live: nav tabs collapsed to an empty pill,
// page headings vanished). This map spells out each locale's full class
// string as a literal, so Tailwind's scanner can actually see it.
export const LOCALE_VISIBILITY_CLASS: Record<Locale, string> = {
  uk: "hidden lang-uk:inline",
  en: "hidden lang-en:inline",
  ru: "hidden lang-ru:inline",
  de: "hidden lang-de:inline",
  es: "hidden lang-es:inline",
  fr: "hidden lang-fr:inline",
  pl: "hidden lang-pl:inline",
  ptBR: "hidden lang-ptbr:inline",
  zh: "hidden lang-zh:inline",
};

// BCP-47 tag for the <html lang="..."> attribute — distinct from the
// LOCALE_CLASS values above (those are CSS-safe fragments, this is what
// actually belongs in the lang attribute).
export const LOCALE_TAG: Record<Locale, string> = {
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

export function T(props: Record<Locale, string>) {
  return (
    <>
      {LOCALES.map((locale) => (
        <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
          {props[locale]}
        </span>
      ))}
    </>
  );
}
