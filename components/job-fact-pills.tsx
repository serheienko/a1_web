// components/job-fact-pills.tsx
//
// 2026-09-19 (Александр, скриншот конкурента: «мы можем какие-то ключевые
// вещи ещё выводить в теги наверх?»). Три плашки рядом с обычными
// тегами: сколько нужно опыта, какой английский, в какой области
// продукт. Что и почему извлекаем -- lib/a1/job-facts.ts.
//
// Иконка своя на КАЖДЫЙ ТИП, а не на значение: портфель -- опыт, значок
// перевода -- язык, здание -- отрасль. Так же сделано у конкурента, и
// это единственный вариант, который не требует ничего генерировать.
//
// Серверный компонент: плашки обязаны быть в HTML сразу -- это и для
// человека первое, что он видит, и для робота наши собственные слова,
// которых нет на источнике.

import { T, type Locale } from "@/components/t";
import { englishLabel, type JobFacts } from "@/lib/a1/job-facts";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400";

export function hasAnyFact(facts: JobFacts): boolean {
  return facts.experienceYears !== null || facts.english !== null || facts.domain !== null;
}

/** «від 2 років» на девяти языках, с правильной единицей для единицы. */
function experienceText(n: number): Record<Locale, string> {
  return {
    uk: n === 1 ? "від 1 року" : `від ${n} років`,
    en: n === 1 ? "from 1 year" : `from ${n} years`,
    ru: n === 1 ? "от 1 года" : `от ${n} лет`,
    de: n === 1 ? "ab 1 Jahr" : `ab ${n} Jahren`,
    es: n === 1 ? "desde 1 año" : `desde ${n} años`,
    fr: n === 1 ? "dès 1 an" : `dès ${n} ans`,
    pl: n === 1 ? "od 1 roku" : `od ${n} lat`,
    ptBR: n === 1 ? "a partir de 1 ano" : `a partir de ${n} anos`,
    zh: `${n} 年以上`,
  };
}

function englishText(level: string): Record<Locale, string> {
  return {
    uk: `Англійська ${level}`,
    en: `English ${level}`,
    ru: `Английский ${level}`,
    de: `Englisch ${level}`,
    es: `Inglés ${level}`,
    fr: `Anglais ${level}`,
    pl: `Angielski ${level}`,
    ptBR: `Inglês ${level}`,
    zh: `英语 ${level}`,
  };
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2"></rect>
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  );
}

function LanguageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path d="M3 5h10M8 3v2c0 4-2.5 7-5 8"></path>
      <path d="M6 10c1.5 2.5 4 4.5 7 5"></path>
      <path d="M13 21l4-10 4 10"></path>
      <path d="M14.5 17h5"></path>
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2"></rect>
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"></path>
    </svg>
  );
}

export function JobFactPills({ facts }: { facts: JobFacts }) {
  const level = facts.english ? englishLabel(facts.english) : "";
  return (
    <>
      {facts.experienceYears !== null &&
        (() => {
          const t = experienceText(facts.experienceYears);
          return (
            <span className={PILL}>
              <BriefcaseIcon />
              <T uk={t.uk} en={t.en} ru={t.ru} de={t.de} es={t.es} fr={t.fr} pl={t.pl} ptBR={t.ptBR} zh={t.zh} />
            </span>
          );
        })()}

      {level !== "" &&
        (() => {
          const t = englishText(level);
          return (
            <span className={PILL}>
              <LanguageIcon />
              <T uk={t.uk} en={t.en} ru={t.ru} de={t.de} es={t.es} fr={t.fr} pl={t.pl} ptBR={t.ptBR} zh={t.zh} />
            </span>
          );
        })()}

      {facts.domain && (
        <span className={PILL}>
          <BuildingIcon />
          {/* Название отрасли не переводим: FinTech и iGaming на всех
              девяти языках пишутся одинаково. */}
          {facts.domain}
        </span>
      )}
    </>
  );
}
