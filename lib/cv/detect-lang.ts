// lib/cv/detect-lang.ts
//
// 28.10.2026 (Александр): язык PDF-резюме угадываем по тексту профиля --
// «если у человека заполнено на испанском, то и CV ему на испанском».
// Без сети и без ИИ: считаем буквы и частые короткие слова. Навыки не
// смотрим (они почти всегда английские: Flutter, Figma). Если текста мало
// или язык не ясен -- язык интерфейса (fallback).

export type CvLang = "uk" | "ru" | "en" | "de" | "es" | "fr" | "pl" | "ptBR" | "zh";
export const CV_LANGS: CvLang[] = ["uk", "ru", "en", "de", "es", "fr", "pl", "ptBR", "zh"];

const STOP: Record<Exclude<CvLang, "uk" | "ru" | "zh">, string[]> = {
  en: ["the", "and", "with", "for", "of", "to", "in", "my", "is", "i", "on", "at", "as", "experience", "work", "team"],
  de: ["und", "der", "die", "das", "mit", "ich", "für", "ein", "eine", "bei", "von", "zu", "ist", "im", "auf", "erfahrung"],
  es: ["y", "de", "la", "el", "en", "con", "para", "los", "las", "por", "una", "un", "mi", "soy", "experiencia", "del"],
  fr: ["et", "de", "la", "le", "les", "des", "en", "avec", "pour", "un", "une", "je", "du", "sur", "dans", "expérience"],
  pl: ["i", "w", "z", "na", "do", "się", "jest", "oraz", "jestem", "dla", "nie", "od", "przy", "doświadczenie", "pracy", "jako"],
  ptBR: ["e", "de", "da", "do", "em", "com", "para", "os", "as", "uma", "um", "sou", "na", "no", "experiência", "trabalho"],
};

const MARKS: Partial<Record<CvLang, RegExp>> = {
  pl: /[ąęłńśźżĄĘŁŃŚŹŻ]/g,
  de: /[äöüßÄÖÜ]/g,
  es: /[ñ¿¡]/g,
  fr: /[àâèêëîïôûùœÀÂÈÊËÎÏÔÛÙŒ]/g,
  ptBR: /[ãõÃÕ]/g,
};

function count(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

export function detectCvLang(texts: (string | null | undefined)[], fallback: CvLang): CvLang {
  const text = texts.filter(Boolean).join(" ").replace(/https?:\/\/\S+/g, " ");
  const letters = count(text, /\p{L}/gu);
  if (letters < 30) return fallback;

  const cjk = count(text, /[㐀-鿿]/g);
  if (cjk / letters > 0.2) return "zh";

  const cyr = count(text, /[Ѐ-ӿ]/g);
  if (cyr / letters > 0.4) {
    const uk = count(text, /[іїєґІЇЄҐ]/g);
    const ru = count(text, /[ыэъёЫЭЪЁ]/g);
    if (uk > ru) return "uk";
    if (ru > uk) return "ru";
    return fallback === "ru" ? "ru" : "uk";
  }

  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (words.length < 8) return fallback;
  let best: CvLang | null = null;
  let bestScore = 0;
  for (const lang of Object.keys(STOP) as (keyof typeof STOP)[]) {
    const set = new Set(STOP[lang]);
    let score = words.filter((w) => set.has(w)).length;
    const re = MARKS[lang];
    if (re) score += count(text, re) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  // Меньше трёх «попаданий» -- это скорее список навыков, чем текст.
  return best && bestScore >= 3 ? best : fallback;
}
