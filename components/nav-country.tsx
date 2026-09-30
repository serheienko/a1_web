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
  return (
    <CountryPicker
      basePath="/"
      current={searchParams.get("country") ?? undefined}
      options={list}
      compact
      preserveParams={pathname === "/"}
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
