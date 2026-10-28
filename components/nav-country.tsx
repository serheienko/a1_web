"use client";

// components/nav-country.tsx
//
// 30.09.2026 (Александр, скриншоты: «кнопки слиплись», «на остальных
// страницах тоже должна быть кнопка переключатель страны»).
//
// ЧТО БЫЛО. Селектор страны рисовала форма фильтров (filters-form.tsx),
// телепортируя его в #nav-search-slot -- а этот слот имеет потолок
// ширины 12rem. Поиск, кнопка фильтров и страна делили одни 192px и
// налезали друг на друга. Плюс форма есть только на ленте, поэтому на
// странице вакансии и в профиле страны не было вовсе.
//
// ЧТО ТЕПЕРЬ. Селектор живёт в самой шапке (site-nav.tsx) отдельным
// блоком СРАЗУ ПОСЛЕ слота поиска: у поиска снова его прежняя ширина,
// у страны -- своя. Виден на десктопе на всех страницах, кроме
// «Фахівці» (там вакансий нет, страна к ним не относится); на телефоне
// его по-прежнему рисует мобильный блок формы фильтров на ленте.
// Список стран и счётчики берёт из /api/countries (часовой кеш) один
// раз на вкладку.

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CountryPicker, type CountryOption } from "@/components/country-picker";

let cache: CountryOption[] | null = null;
let inflight: Promise<CountryOption[]> | null = null;

function loadOptions(): Promise<CountryOption[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/countries")
      .then((r) => r.json())
      .then((d) => {
        const options: CountryOption[] = Array.isArray(d?.options) ? d.options : [];
        if (options.length > 0) cache = options;
        return options;
      })
      .catch(() => [])
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Посадочные, где страна и тег работают вместе: форматы работы и «фактовые» теги. */
export function isCountryLanding(pathname: string): boolean {
  return /^\/jobs\/(remote|office|hybrid)\/?$/.test(pathname) || /^\/jobs\/tag\/(?!reservation\/?$)[^/]+\/?$/.test(pathname);
}

/** Селектор страны для посадочной на телефоне (в шапке на телефоне его нет). */
export function LandingCountryPicker({ basePath, current }: { basePath: string; current?: string }) {
  const [options, setOptions] = useState<CountryOption[] | null>(cache);
  useEffect(() => {
    let alive = true;
    loadOptions().then((o) => {
      if (alive && o.length > 0) setOptions(o);
    });
    return () => {
      alive = false;
    };
  }, []);
  return <CountryPicker basePath={basePath} current={current} options={options ?? [{ code: "UA", count: 0 }]} />;
}

/**
 * 25.10.2026 (Александр: «если я на странице по ролям меняю сверху гео --
 * показывать страницу по ролям именно этой страны; такая же логика с
 * зарплатами; по всем странам из списка»). Для указателя профессий,
 * страниц профессии и зарплат выбор страны ведёт на ту же страницу другой
 * страны. Украина и «Весь світ» для профессий -- общая страница (Украина +
 * удалённые); для зарплат «Весь світ» -- сводка по всем странам, Украина --
 * своя украинская вилка.
 */
export function segmentCountryRoute(pathname: string): { current: string; href: (code: string) => string } | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  const lc = (code: string) => code.toLowerCase();
  const general = (code: string) => code === "UA" || code === "WW";

  if (p === "/jobs/role") {
    return { current: "UA", href: (c) => (general(c) ? "/jobs/role" : `/jobs/country/${lc(c)}/roles`) };
  }
  let m = p.match(/^\/jobs\/country\/([a-z]{2})\/roles$/);
  if (m) {
    return { current: (m[1] ?? "UA").toUpperCase(), href: (c) => (general(c) ? "/jobs/role" : `/jobs/country/${lc(c)}/roles`) };
  }
  m = p.match(/^\/jobs\/role\/([a-z0-9-]+)(?:\/([a-z]{2}))?$/);
  if (m) {
    const role = m[1];
    return { current: m[2] ? m[2].toUpperCase() : "UA", href: (c) => (general(c) ? `/jobs/role/${role}` : `/jobs/role/${role}/${lc(c)}`) };
  }
  m = p.match(/^\/jobs\/salary\/([a-z0-9-]+)(?:\/([a-z]{2}))?$/);
  if (m) {
    const role = m[1];
    return { current: m[2] ? m[2].toUpperCase() : "WW", href: (c) => (c === "WW" ? `/jobs/salary/${role}` : `/jobs/salary/${role}/${lc(c)}`) };
  }
  return null;
}

/**
 * 28.10.2026 (Александр: «я в фильтре Великобритания, открываю вакансию --
 * сверху переключается на Украину; надо, чтобы запоминалось»).
 *
 * ЧТО БЫЛО. Выбранная страна жила только в адресе (?country=gb). У страницы
 * вакансии, профиля и остальных страниц параметра нет, и кнопка рисовала
 * Україну, хотя человек смотрит ленту Великобритании.
 *
 * ЧТО ТЕПЕРЬ. Страну помним в sessionStorage вкладки (закрыл вкладку --
 * снова Україна по умолчанию, никаких «вечных» настроек). Где лента сама
 * решается адресом -- главная, посадочные тегов, страницы профессий и
 * зарплат -- адрес главнее и обновляет запомненное. На остальных страницах
 * кнопка показывает запомненную страну. Страницы вакансий не меняются:
 * они кэшируются и индексируются, всё делает только браузер.
 */
const COUNTRY_MEMORY_KEY = "a1.feedCountry";

function NavCountryInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [options, setOptions] = useState<CountryOption[] | null>(cache);
  const [remembered, setRemembered] = useState<string | undefined>(undefined);
  const urlParam = searchParams.get("country") ?? undefined;
  const urlDecides = pathname === "/" || isCountryLanding(pathname) || segmentCountryRoute(pathname) !== null;

  useEffect(() => {
    try {
      if (urlDecides) {
        // Лента определяется адресом: нет параметра -- это Україна.
        if (!segmentCountryRoute(pathname)) sessionStorage.setItem(COUNTRY_MEMORY_KEY, (urlParam ?? "UA").toUpperCase());
        setRemembered(undefined);
      } else if (urlParam) {
        sessionStorage.setItem(COUNTRY_MEMORY_KEY, urlParam.toUpperCase());
        setRemembered(undefined);
      } else {
        setRemembered(sessionStorage.getItem(COUNTRY_MEMORY_KEY) ?? undefined);
      }
    } catch {
      // Браузер не дал хранилище (приватный режим) -- остаётся Україна, как раньше.
    }
  }, [pathname, urlParam, urlDecides]);

  useEffect(() => {
    let alive = true;
    loadOptions().then((o) => {
      if (alive && o.length > 0) setOptions(o);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (pathname.startsWith("/talents") || pathname.startsWith("/chats")) return null;
  // Пока список не пришёл, рисуем кнопку с одной Україною -- шапка не
  // прыгает, когда цифры подъедут.
  const list = options ?? [{ code: "UA", count: 0 }];
  // 01.10.2026 (Александр: «первый выбор страна, потом тег»): на посадочных тегов
  // страна меняется, а тег остаётся -- иначе выбор страны выкидывал на главную.
  // «Топ 100» и «Бронювання» от страны не зависят, у них прежнее поведение.
  const onLanding = isCountryLanding(pathname);
  const segment = segmentCountryRoute(pathname);
  return (
    <CountryPicker
      basePath={onLanding ? pathname : "/"}
      current={segment ? segment.current : (urlParam ?? remembered)}
      options={list}
      compact
      preserveParams={pathname === "/" || onLanding}
      hrefForCode={segment?.href}
    />
  );
}

export function NavCountry() {
  return (
    <div className="hidden shrink-0 sm:block">
      <Suspense fallback={null}>
        <NavCountryInner />
      </Suspense>
    </div>
  );
}
