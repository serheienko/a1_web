// components/nav-filters.tsx
//
// Поиск и фильтры в шапке на всех страницах, кроме ленты и талантов.
//
// ЧТО БЫЛО ДО. Сначала (d5aa939, откачен) форму фильтров подключили в
// общем макете app/layout.tsx -- серверным компонентом. Собралось,
// задеплоилось и не нарисовалось: на чужих страницах разметки формы не
// было даже в ответе сервера. Потом (310abde) в шапке жила своя
// маленькая строка поиска без фильтров -- она работала, но Александр
// справедливо заметил: «ты же сделал, чтобы при наведении она этот
// список выпадал, как и везде».
//
// ЧТО ТЕПЕРЬ. Здесь стоит та же самая FiltersForm, что и на ленте, --
// значит и поиск, и кнопка фильтров, и раскрытие списка по наведению
// ведут себя ровно так же, без второй реализации, которая неизбежно
// разъехалась бы с первой. Отличий от ленты два, оба через пропсы:
// urlMode="push" (отсюда поиск и фильтры УВОДЯТ на ленту, а не
// переписывают адрес чужой страницы) и desktopOnly (без мобильного
// блока -- на телефоне строка поиска сверху переписки выглядела бы
// поломкой).
//
// ПОЧЕМУ КЛИЕНТСКИЙ И ПОЧЕМУ СПРАВОЧНИКИ ГРУЗЯТСЯ ПОЗЖЕ. Форме нужны
// списки категорий и тегов -- это два запроса к бэкенду. Тянуть их на
// КАЖДОЙ странице сайта дорого (у проекта и так выбран бесплатный
// лимит по процессорному времени), поэтому форма рисуется сразу с
// пустыми списками -- поиск работает с первой отрисовки, -- а
// справочники подгружаются один раз, когда указатель впервые доезжает
// до шапки. К моменту, когда человек доведёт курсор до кнопки
// фильтров, список уже на месте.
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FiltersForm } from "@/components/filters-form";
import type { Category, Tag } from "@/lib/a1/datasets";

/** Страницы, где поиск и фильтры рисует сама страница. */
const OWN_SEARCH_PATHS = new Set(["/", "/talents"]);

export function NavFilters() {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const skip = OWN_SEARCH_PATHS.has(pathname);

  // Справочники -- по первому появлению указателя над шапкой. Слушатель
  // вешается на сам слот (components/site-nav.tsx, #nav-search-slot):
  // форма телепортирует свою разметку внутрь него, но слот существует
  // раньше и переживает перерисовки, поэтому он и есть надёжная точка
  // подвеса. focusin -- для тех, кто ходит с клавиатуры и мыши не
  // касается вовсе.
  useEffect(() => {
    if (skip) return;
    const slot = document.getElementById("nav-search-slot");
    if (!slot) return;
    let done = false;
    const load = () => {
      if (done) return;
      done = true;
      slot.removeEventListener("mouseenter", load);
      slot.removeEventListener("focusin", load);
      fetch("/api/post-editor/bootstrap")
        .then((res) => res.json())
        .then((data) => {
          if (!data?.ok) return;
          setCategories(data.categories ?? []);
          setTags(data.hiringTags ?? []);
        })
        .catch(() => {
          // Не вышло -- останутся поиск и кнопка фильтров с пустым
          // списком. Это хуже, чем полный список, но лучше, чем
          // сломанная шапка.
        });
    };
    slot.addEventListener("mouseenter", load);
    slot.addEventListener("focusin", load);
    return () => {
      slot.removeEventListener("mouseenter", load);
      slot.removeEventListener("focusin", load);
    };
  }, [skip]);

  if (skip) return null;

  return (
    <FiltersForm
      basePath="/"
      categories={categories}
      tags={tags}
      currentTags={[]}
      urlMode="push"
      desktopOnly
    />
  );
}
