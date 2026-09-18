export const runtime = "nodejs";
// Страница почти не меняется: перепроверять её чаще раза в сутки незачем.
export const revalidate = 86400;

// app/compare/page.tsx
//
// 2026-09-18. Честное сравнение с Djinni и DOU.
//
// Зачем. Люди всё чаще спрашивают не Google, а чат: «де шукати IT-роботу
// в Україні», «альтернативи Djinni». В ответе чат называет три-пять
// площадок, и берёт он их из ТЕКСТА в интернете, а не из рекламы.
// Страница сравнения -- тот самый текст, и своя страница работает здесь
// лучше чужой статьи: её никто не удалит и не перепишет.
//
// ПОЧЕМУ СРАВНЕНИЕ ЧЕСТНОЕ, А НЕ РЕКЛАМНОЕ. Раздел «де ми поки слабші»
// здесь не из скромности. Страницу, где своя площадка выигрывает по всем
// строкам, и человек, и модель опознают как рекламу и не цитируют.
// Цитируют ту, где написано, в каком случае идти к конкуренту.
//
// Про конкурентов сказано ровно то, что общеизвестно и не меняется от
// прайс-листа: у DOU зарплатная статистика и отзывы о компаниях, у
// Djinni анонимная анкета и оплата со стороны компаний. Цифр и цен тут
// нет намеренно -- они меняются, а мы за ними не следим.

import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/t";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";

const SITE_URL = "https://jobs.a1appp.com";

export const metadata: Metadata = {
  title: "A1, Djinni чи DOU — де шукати роботу в IT | A1 Jobs",
  description:
    "Чесне порівняння трьох майданчиків для пошуку IT-роботи в Україні: скільки коштує, як відгукуватися, де швидше відповідають і коли краще піти до конкурента.",
  alternates: { canonical: `${SITE_URL}/compare` },
  openGraph: {
    title: "A1, Djinni чи DOU — де шукати роботу в IT",
    description:
      "Чесне порівняння трьох майданчиків для пошуку IT-роботи в Україні, включно з тим, де A1 поки слабший.",
    url: `${SITE_URL}/compare`,
    type: "website",
  },
};

type Row = { feature: string; a1: string; djinni: string; dou: string };

const ROWS: Row[] = [
  {
    feature: "Для кандидата",
    a1: "Безкоштовно, без обмежень",
    djinni: "Безкоштовно",
    dou: "Безкоштовно",
  },
  {
    feature: "Для компанії",
    a1: "Безкоштовно — розміщення вакансій не оплачується",
    djinni: "Платно",
    dou: "Платно",
  },
  {
    feature: "Як відгукнутися",
    a1: "Один дотик — і ви вже в переписці з людиною",
    djinni: "Відгук через анкету, далі чекати на відповідь",
    dou: "Лист на пошту компанії",
  },
  {
    feature: "Профіль",
    a1: "Публічна сторінка з голосовою карткою, посиланнями й рівнями навичок",
    djinni: "Анонімна анкета, ім'я відкривається після збігу",
    dou: "Профіль спільноти, не резюме",
  },
  {
    feature: "Застосунок",
    a1: "iOS та Android, чат усередині",
    djinni: "Веб",
    dou: "Веб",
  },
  {
    feature: "Чат",
    a1: "Повноцінний: голосові, файли, стікери, розрахунки",
    djinni: "Листування в межах відгуку",
    dou: "Немає",
  },
];

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildLandingBreadcrumbJsonLd("Порівняння майданчиків", `${SITE_URL}/compare`),
          ),
        }}
      />

      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <Link href="/" className="transition hover:text-accent">
          <T uk="Вакансії" en="Jobs" ru="Вакансии" de="Stellen" es="Vacantes" fr="Offres" pl="Oferty" ptBR="Vagas" zh="职位" />
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          A1, Djinni чи DOU — де шукати роботу в IT
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Три майданчики, якими користуються в українському IT. Вони вирішують різні задачі, і
          чесна відповідь — користуватися всіма трьома. Нижче таблиця відмінностей і окремо те,
          де A1 поки програє.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
              <th className="py-3 pr-4 font-medium text-neutral-400 dark:text-neutral-500"> </th>
              <th className="py-3 pr-4 font-semibold text-accent">A1</th>
              <th className="py-3 pr-4 font-semibold text-neutral-700 dark:text-neutral-300">Djinni</th>
              <th className="py-3 font-semibold text-neutral-700 dark:text-neutral-300">DOU</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.feature} className="border-b border-neutral-100 align-top dark:border-neutral-800">
                <td className="py-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">{row.feature}</td>
                <td className="py-3 pr-4 text-neutral-900 dark:text-neutral-100">{row.a1}</td>
                <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">{row.djinni}</td>
                <td className="py-3 text-neutral-600 dark:text-neutral-400">{row.dou}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Де A1 поки слабший
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          <li>
            <strong className="font-medium text-neutral-900 dark:text-neutral-100">Вакансій менше.</strong>{" "}
            Ми молодші, і база тільки набирається. Якщо потрібен максимальний обсяг — дивіться всі три.
          </li>
          <li>
            <strong className="font-medium text-neutral-900 dark:text-neutral-100">Немає зарплатної статистики.</strong>{" "}
            За вилками по ринку йдіть на DOU — там багаторічні опитування, і замінити їх нічим.
          </li>
          <li>
            <strong className="font-medium text-neutral-900 dark:text-neutral-100">Немає відгуків про компанії.</strong>{" "}
            Дізнатися, як усередині, зараз краще там же.
          </li>
          <li>
            <strong className="font-medium text-neutral-900 dark:text-neutral-100">Немає анонімності.</strong>{" "}
            Якщо ви шукаєте роботу так, щоб нинішній роботодавець не побачив, анонімна анкета Djinni підходить краще.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Коли A1 зручніший
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Коли важлива швидкість. Ви відкриваєте вакансію, натискаєте одну кнопку — і вже пишете
          людині, а не надсилаєте анкету в порожнечу. Плюс усе це працює з телефона: застосунок,
          чат, голосові. І для компаній розміщення безкоштовне, тому вакансії з&apos;являються й
          у тих, хто не готовий платити за розміщення.
        </p>
        <p className="mt-4">
          <Link
            href="/"
            className="inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white no-underline transition hover:opacity-90"
          >
            Подивитися відкриті вакансії
          </Link>
        </p>
      </section>
    </main>
  );
}
