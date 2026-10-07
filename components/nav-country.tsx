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

function NavCountryInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  if (pathname.startsWith("/talents") || pathname.startsWith("/chats")) return null;
  // Пока список не пришёл, рисуем кнопку с одной Україною -- шапка не
  // прыгает, когда цифры подъедут.
  const list = options ?? [{ code: "UA", count: 0 }];
  // 01.10.2026 (Александр: «первый выбор страна, потом тег»): на посадочных тегов
  // страна меняется, а тег остаётся -- иначе выбор страны выкидывал на главную.
  // «Топ 100» и «Бронювання» от страны не зависят, у них прежнее поведение.
  const onLanding = isCountryLanding(pathname);
  return (
    <CountryPicker
      basePath={onLanding ? pathname : "/"}
      current={searchParams.get("country") ?? undefined}
      options={list}
      compact
      preserveParams={pathname === "/" || onLanding}
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

/**
 * 07.10.2026 (Александр): на тестовой копии страна переезжает из шапки
 * первым элементом в ряд чипов на всех лентах -- освобождает место под
 * «Try Alpha». Остаётся «плашкой» (стекло, флаг, стрелка, список), а не
 * чипом: страна -- состояние, а не переключатель. Только на компьютере;
 * на телефоне селектор по-прежнему над рядом.
 */
export function RowCountryPicker({
  basePath,
  current,
  worldDefault = false,
}: {
  basePath: string;
  current?: string;
  worldDefault?: boolean;
}) {
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
  return (
    <CountryPicker
      basePath={basePath}
      current={current}
      options={options ?? [{ code: "UA", count: 0 }]}
      inRow
      worldDefault={worldDefault}
    />
  );
}
