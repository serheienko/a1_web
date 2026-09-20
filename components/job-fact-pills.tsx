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
  return (
    facts.experienceYears !== null ||
    facts.english !== null ||
    facts.domain !== null ||
    facts.reservation ||
    facts.firstJob
  );
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

// 20.09.2026 (Александр, вакансия Traffband: «я соискатель с двумя
// годами, вижу тег "від 3 років" и пролистываю, хотя в тексте
// "1-3+ роки" -- меня как раз зовут»). Вилку теперь показываем целиком,
// как написано в вакансии, а не сводим к одному числу.
//
// Единицу берём по ВЕРХНЕЙ границе: «1-3 роки», но «1-5 років». Так же
// склоняют в русском и польском, поэтому мерка одна на три языка.
function yearUnit(n: number, few: string, many: string): string {
  const tail = n % 100;
  if (tail >= 12 && tail <= 14) return many;
  const last = n % 10;
  return last >= 2 && last <= 4 ? few : many;
}

function experienceRangeText(min: number, max: number, plus: boolean): Record<Locale, string> {
  // Тире -- среднее (–), типографски верное для диапазона.
  const span = `${min}\u2013${max}${plus ? "+" : ""}`;
  return {
    uk: `${span} ${yearUnit(max, "роки", "років")}`,
    en: `${span} years`,
    ru: `${span} ${yearUnit(max, "года", "лет")}`,
    de: `${span} Jahre`,
    es: `${span} años`,
    fr: `${span} ans`,
    pl: `${span} ${yearUnit(max, "lata", "lat")}`,
    ptBR: `${span} anos`,
    zh: `${span} 年`,
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

// 2026-09-19 (Александр: «бронювання действительно очень актуально
// сейчас»). Каска перед словом -- его просьба, чтобы плашку было видно
// среди остальных. Эмодзи, а не картинка: рисуется самим телефоном,
// ничего не грузится и высоту строки не ломает.
//
// Формулировка «Є бронювання» выбрана намеренно: мы пересказываем
// обещание компании, а не обещаем от себя. Компании пишут по-разному
// («бронювання за наявності військово-облікових документів»,
// «можливість бронювання для критично важливих»), и гарантировать
// человеку мы ничего не можем.
//
// Отдельным экспортируемым компонентом -- потому что ту же плашку
// показывает карточка в ленте (components/post-card.tsx). Строки должны
// жить в одном месте, иначе они разъедутся.
export function ReservationPill() {
  return (
    <span className={PILL}>
      <T
        uk="🪖 Є бронювання"
        en="🪖 Military deferment"
        ru="🪖 Есть бронирование"
        de="🪖 Freistellung vom Wehrdienst"
        es="🪖 Aplazamiento militar"
        fr="🪖 Sursis militaire"
        pl="🪖 Odroczenie od mobilizacji"
        ptBR="🪖 Adiamento militar"
        zh="🪖 兵役缓征"
      />
    </span>
  );
}

// Как категория «Без досвіду» на DOU: человек без опыта вообще.
// 2026-09-19: название приведено к тому, что стоит на посадочной
// и на чипе главной (lib/seo/fact-landings.ts) -- «Без досвіду»
// это ещё и то, как эту работу ищут в поиске.
// 2026-09-19 (Александр): эта плашка -- ТОЛЬКО на странице вакансии, в
// общей ленте её не показываем.
function FirstJobPill() {
  return (
    <span className={PILL}>
      <T
        uk="Без досвіду"
        en="No experience"
        ru="Без опыта"
        de="Ohne Erfahrung"
        es="Sin experiencia"
        fr="Sans expérience"
        pl="Bez doświadczenia"
        ptBR="Sem experiência"
        zh="无需经验"
      />
    </span>
  );
}

export function JobFactPills({ facts }: { facts: JobFacts }) {
  const level = facts.english ? englishLabel(facts.english) : "";
  return (
    <>
      {facts.experienceYears !== null &&
        (() => {
          const max = facts.experienceYearsMax;
          const t =
            max !== null
              ? experienceRangeText(facts.experienceYears, max, facts.experienceYearsPlus)
              : experienceText(facts.experienceYears);
          return (
            <span className={PILL}>
              <T uk={t.uk} en={t.en} ru={t.ru} de={t.de} es={t.es} fr={t.fr} pl={t.pl} ptBR={t.ptBR} zh={t.zh} />
            </span>
          );
        })()}

      {facts.firstJob && <FirstJobPill />}

      {facts.reservation && <ReservationPill />}

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
