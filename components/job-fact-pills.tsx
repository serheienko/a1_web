// components/job-fact-pills.tsx
//
// 2026-09-19 (Александр, скриншот конкурента: «мы можем какие-то ключевые
// вещи ещё выводить в теги наверх?»). Три плашки рядом с обычными
// тегами: сколько нужно опыта, какой английский, в какой области
// продукт. Что и почему извлекаем -- lib/a1/job-facts.ts.
//
// Серверный компонент: плашки обязаны быть в HTML сразу -- это и для
// человека первое, что он видит, и для робота наши собственные слова,
// которых нет на источнике.

import { T, type Locale } from "@/components/t";
import { englishLabel, type JobFacts } from "@/lib/a1/job-facts";

// 2026-09-19 (Александр, после первого же просмотра вживую: «убери
// везде эти иконки в тегах, они плохо выглядят»). Плашка теперь ровно
// та же, что у обычных тегов рядом, -- одна строка текста и всё.
const PILL =
  "rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400";

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

export function JobFactPills({ facts }: { facts: JobFacts }) {
  const level = facts.english ? englishLabel(facts.english) : "";
  return (
    <>
      {facts.experienceYears !== null &&
        (() => {
          const t = experienceText(facts.experienceYears);
          return (
            <span className={PILL}>
              <T uk={t.uk} en={t.en} ru={t.ru} de={t.de} es={t.es} fr={t.fr} pl={t.pl} ptBR={t.ptBR} zh={t.zh} />
            </span>
          );
        })()}

      {level !== "" &&
        (() => {
          const t = englishText(level);
          return (
            <span className={PILL}>
              <T uk={t.uk} en={t.en} ru={t.ru} de={t.de} es={t.es} fr={t.fr} pl={t.pl} ptBR={t.ptBR} zh={t.zh} />
            </span>
          );
        })()}

      {facts.domain && (
        <span className={PILL}>
          {/* Название отрасли не переводим: FinTech и iGaming на всех
              девяти языках пишутся одинаково. */}
          {facts.domain}
        </span>
      )}
    </>
  );
}
