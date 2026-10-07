// lib/dictation-langs.ts
//
// Язык диктовки голосом -- общий для Magic Wand и Alpha (07.10.2026).
// Распознавание браузера не умеет само определять язык, поэтому язык
// выбирают рядом с микрофоном; выбор запоминается и общий для обоих мест.
// По умолчанию -- язык сайта.

export const DICT_LANGS: { code: string; name: string; flag: string; bcp: string }[] = [
  { code: "uk", name: "Українська", flag: "🇺🇦", bcp: "uk-UA" },
  { code: "en", name: "English", flag: "🇬🇧", bcp: "en-US" },
  { code: "ru", name: "Русский", flag: "🌐", bcp: "ru-RU" },
  { code: "zh", name: "中文", flag: "🇨🇳", bcp: "zh-CN" },
  { code: "de", name: "Deutsch", flag: "🇩🇪", bcp: "de-DE" },
  { code: "pl", name: "Polski", flag: "🇵🇱", bcp: "pl-PL" },
  { code: "es", name: "Español", flag: "🇪🇸", bcp: "es-ES" },
  { code: "fr", name: "Français", flag: "🇫🇷", bcp: "fr-FR" },
  { code: "pt", name: "Português", flag: "🇧🇷", bcp: "pt-BR" },
];

export const DICT_LANG_KEY = "a1-mw-dict-lang";

/** Saved choice, else the site language, else English. */
export function initialDictLang(siteLang: string): string {
  try {
    const saved = typeof window !== "undefined" ? localStorage.getItem(DICT_LANG_KEY) : null;
    if (saved && DICT_LANGS.some((l) => l.code === saved)) return saved;
  } catch {}
  const site = siteLang === "ptBR" ? "pt" : siteLang;
  return DICT_LANGS.some((l) => l.code === site) ? site : "en";
}

export function saveDictLang(code: string) {
  try {
    localStorage.setItem(DICT_LANG_KEY, code);
  } catch {}
}

export function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  );
}
