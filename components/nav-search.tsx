// components/nav-search.tsx
//
// Александр, 18.09.2026: «поиск с фильтрами наверное надо показывать не
// только на главной для удобства... мб пусть живет почти везде и просто
// редиректит потом».
//
// Строка поиска в шапке принадлежит форме фильтров
// (components/filters-form.tsx): та телепортирует свою десктопную
// половину в #nav-search-slot. Но форму подключают только две страницы
// -- лента и таланты, -- и на всех остальных место в шапке пустовало.
//
// ПОЧЕМУ ОТДЕЛЬНЫЙ КОМПОНЕНТ, А НЕ ТА ЖЕ ФОРМА ВЕЗДЕ. Первым заходом
// (коммит d5aa939, откачен) форма была подключена в общем макете
// app/layout.tsx. Собралось и задеплоилось, но на живом сайте в шапке
// не появлялось ничего: на страницах, кроме ленты, разметки формы не
// было даже в ответе сервера. Разбираться в этом дальше -- часы, а
// цена ошибки высокая: форма тянет с бэкенда справочники категорий и
// тегов, то есть два сетевых запроса на КАЖДОЙ странице сайта, и на
// ленте она к тому же ломается, если отрисоваться дважды.
//
// Здесь другой подход: маленький собственный компонент, который умеет
// ровно то, что нужно на чужой странице, -- поле ввода, подсказки по
// людям и переход на ленту. Никаких серверных данных он не просит,
// живёт внутри той же шапки (components/site-nav.tsx) и потому не
// может не отрисоваться.
//
// ЧТО ОН НЕ ДЕЛАЕТ. Кнопки фильтров тут нет: сами фильтры (категории,
// теги, место) живут на ленте, и человек попадает туда первым же
// запросом. Мобильной версии тоже нет -- на телефоне шапка узкая, а
// строка поиска сверху переписки или профиля выглядела бы поломкой.
//
// ЗАПРОС УХОДИТ ПО ENTER, а не на каждую букву: на ленте поиск ищет по
// мере набора, потому что человек уже в выдаче, а отсюда первая же
// буква уносила бы его с его страницы да ещё и мусорила в истории
// браузера.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { SearchIcon } from "@/components/search-icon";
import { ClearIcon } from "@/components/clear-icon";
import { CachedAvatar } from "@/components/cached-avatar";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import type { UserSearchHit } from "@/app/api/users/search/route";

/** Подпись поля -- та же, что у формы фильтров, чтобы шапка читалась одинаково. */
const PLACEHOLDER: Record<Locale, string> = {
  uk: "Пошук", en: "Search", ru: "Поиск", de: "Suche", es: "Buscar",
  fr: "Recherche", pl: "Szukaj", ptBR: "Buscar", zh: "搜索",
};

/** Заголовок группы подсказок -- «Користувачі», как на ленте. */
const USERS: Record<Locale, string> = {
  uk: "Користувачі", en: "Users", ru: "Пользователи", de: "Nutzer", es: "Usuarios",
  fr: "Utilisateurs", pl: "Użytkownicy", ptBR: "Usuários", zh: "用户",
};

export function NavSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [people, setPeople] = useState<UserSearchHit[]>([]);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Язык читаем с класса на <html>, как это делает сама форма фильтров:
  // <T/> не умеет подставлять текст в атрибуты вроде placeholder.
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);

  const needle = query.trim();

  // Люди -- с той же задержкой в 350 мс, что и на ленте: набор ника это
  // несколько нажатий подряд, дёргать сервер на каждое незачем.
  useEffect(() => {
    if (!focused || needle.length < 2) {
      setPeople([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(needle.toLowerCase())}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && data?.ok) setPeople(data.users ?? []);
        })
        .catch(() => {
          // Подсказка -- приятное дополнение: не вышло, значит её просто нет.
          if (!cancelled) setPeople([]);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [needle, focused]);

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  function submit() {
    const q = query.trim();
    setFocused(false);
    router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
  }

  return (
    <div className="relative flex w-full items-center">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // С задержкой: клик по подсказке должен успеть сработать после
          // того, как поле потеряло фокус.
          blurTimer.current = setTimeout(() => setFocused(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          submit();
        }}
        placeholder={PLACEHOLDER[lang]}
        className="w-full rounded-full border border-neutral-300 bg-white py-1.5 pl-9 pr-8 text-sm text-neutral-900 outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      />
      {query.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setPeople([]);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 transition hover:text-neutral-600 dark:hover:text-neutral-200"
          aria-label={PLACEHOLDER[lang]}
        >
          <ClearIcon className="h-4 w-4" />
        </button>
      )}

      {focused && people.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <div className="py-1">
            <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {USERS[lang]}
            </div>
            {people.map((u) => (
              <button
                key={u.userId}
                type="button"
                onClick={() => {
                  setFocused(false);
                  router.push(`/u/${u.username}`);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <CachedAvatar
                  src={u.avatarUrl ?? pickDefaultCatAvatar(u.username)}
                  blurDataURL={u.avatarBlurDataUrl ?? BLUR_DATA_URL}
                  size={56}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-neutral-800 dark:text-neutral-200">{u.fullName}</span>
                  <span className="block truncate text-[12px] text-neutral-400 dark:text-neutral-500">@{u.username}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
