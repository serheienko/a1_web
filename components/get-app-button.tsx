// components/get-app-button.tsx
//
// Александр, 18.09.2026: «мне не нравится, что она сильно длинная и
// большая... Может, мы просто поставим иконку мобильника и рядом такую
// типа эту иконку скачать?»
//
// Почему ОДИН значок, а не два рядом. Два значка -- это два предмета,
// которые человек расшифровывает по очереди: телефон сам по себе
// читается как «позвонить» или «контакты», а стрелка вниз рядом с ним --
// как «скачать файл с этой страницы». Вместе они не складываются в
// «поставить приложение». Здесь стрелка УЖЕ ВНУТРИ телефона -- это один
// предмет, читается сразу и занимает вдвое меньше места.
//
// Размер и форма -- ровно как у аватара справа: круг 44px. Вся шапка
// собрана из круглых элементов такой высоты (см. историю выравнивания
// аватара в components/site-nav.tsx), любой другой размер выбивается.
//
// Александр, 19.09.2026, второй заход: «Выровняй иконки, я уже просил».
// Первый заход (ниже) выровнял КРУЖКИ -- и они действительно совпадают,
// оба 44px с обводкой в 1px, это померено в живой странице. Не совпадало
// содержимое: аватар-кот заполняет свой круг целиком, а значок телефона
// занимал 20px из 44, то есть 45% -- на глаз кнопка из-за этого читается
// мельче и пустее соседа. Значок увеличен до 24px (55% круга) -- обычная
// пропорция для значка в круге, при которой он не выглядит потерянным.
//
// Александр, 18.09.2026 (скриншот двух кружков): «Выровняй кнопки по
// высоте». Оба были h-11 (44px), но обводка рисовалась по-разному:
// у аватара ring-1 -- это кольцо СНАРУЖИ круга (46px по внешнему
// краю), а здесь был border -- рамка ВНУТРИ (44px). Отсюда и разница
// в два пикселя, которая на глаз читается как «кнопка меньше».
// Теперь обводка тоже ring-1 (+ та же shadow-sm), внешние размеры
// совпадают ровно.
//
// Подпись не видна, но она есть -- <T/> внутри sr-only. Значок без
// текста должен чем-то представляться читалке с экрана, а девять
// языков в атрибут title не помещаются: атрибуты <T/> не умеет.
//
// Куда ведёт -- на /download, где уже лежат обе кнопки магазинов. Прямая
// ссылка в App Store не годится: с компьютера и с Android человек
// попадёт не туда.
//
// Александр, 19.09.2026: «при наведении на кнопку скачать на мобилу
// показывай превью страницы как на странице download». На самой
// /download при наведении на «Сайт A1» открывается окошко с живой
// главной (app/download/site-preview.tsx) -- здесь ровно тот же приём,
// только наоборот: из шапки сайта заглядываем на /download.
//
// Переиспользовано, а не написано заново: раскрытие и закрытие по
// наведению -- общий хук lib/use-hover-panel.ts (он же у меню аватара и
// у кнопки фильтров), приёмы с рамкой -- те же три, что расписаны в
// шапке app/download/site-preview.tsx:
//
// 1. Рамка грузится не сразу, а через HOVER_INTENT_MS: мышь, просто
//    проехавшая через кнопку, ничего не тянет.
// 2. Загрузившись один раз, рамка больше не размонтируется -- панель
//    «паркуется» в нулевой размер. Запрос к серверу ровно один за
//    посещение, а не по одному на каждое наведение.
// 3. Пока рамка грузится (и если браузер откажется её показать) под ней
//    лежит логотип на тёмной подложке -- пустого окна не будет никогда.
//
// Рамка same-origin, /download отдаётся статикой, поэтому лишней работы
// серверу это не создаёт. pointer-events внутри выключены: клик по
// превью ведёт на страницу, а не проваливается внутрь чужого скролла.
// Панель прилипает к кнопке отступом (pt-2), а не зазором: между ними
// не должно быть «мёртвой» полосы, иначе окно залипает -- ровно та
// грабля, что описана первым пунктом в шапке lib/use-hover-panel.ts.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { T } from "@/components/t";
import { useHoverPanel } from "@/lib/use-hover-panel";

const HOVER_INTENT_MS = 250;

export function GetAppButton() {
  const [open, setOpen] = useState(false);
  const [frameMounted, setFrameMounted] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const frameArmedRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { rendered, visible, handleMouseEnter, handleMouseLeave } = useHoverPanel(open, setOpen, [
    { trigger: wrapRef, panel: panelRef },
  ]);

  useEffect(() => {
    if (!open || frameArmedRef.current) return;
    const timer = setTimeout(() => {
      frameArmedRef.current = true;
      setFrameMounted(true);
    }, HOVER_INTENT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <div
      ref={wrapRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative hidden shrink-0 sm:block"
    >
    <Link
      href="/download"
      className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm ring-1 ring-neutral-200 transition hover:text-accent hover:ring-accent/40 dark:bg-neutral-900 dark:text-neutral-400 dark:ring-neutral-700 dark:hover:text-accent dark:hover:ring-accent/40"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Корпус телефона. */}
        <rect x="5" y="2" width="14" height="20" rx="3" />
        {/* Стрелка вниз внутри экрана -- «поставить себе на телефон».
            При наведении она подпрыгивает вниз: app/globals.css,
            @keyframes app-install-arrow. */}
        <g className="animate-app-install-arrow">
          <path d="M12 7.5v6" />
          <path d="M9.5 11l2.5 2.5L14.5 11" />
        </g>
      </svg>
      <span className="sr-only">
        <T
          uk="Завантажити застосунок A1"
          en="Get the A1 app"
          ru="Скачать приложение A1"
          de="A1-App laden"
          es="Descargar la app A1"
          fr="Télécharger l'app A1"
          pl="Pobierz aplikację A1"
          ptBR="Baixar o app A1"
          zh="下载 A1 应用"
        />
      </span>
    </Link>

      {(rendered || frameMounted) && (
        <div
          ref={panelRef}
          className={
            "absolute right-0 top-full z-50 pt-2 " +
            (rendered ? "w-[340px]" : "pointer-events-none h-0 w-0 overflow-hidden opacity-0")
          }
        >
          <Link
            href="/download"
            className={
              "block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl transition duration-200 ease-out dark:border-neutral-700 dark:bg-neutral-900 " +
              (visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")
            }
          >
            <span className="relative block aspect-[4/3] w-full overflow-hidden bg-neutral-950">
              {/* Подложка на время загрузки рамки. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/download/a1-logo.webp"
                alt=""
                width={120}
                height={120}
                loading="lazy"
                className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 opacity-70"
              />

              {frameMounted && (
                <span
                  className={
                    "absolute inset-0 block transition-opacity duration-300 " +
                    (frameLoaded ? "opacity-100" : "opacity-0")
                  }
                >
                  <iframe
                    src="/download"
                    title=""
                    aria-hidden="true"
                    tabIndex={-1}
                    scrolling="no"
                    loading="lazy"
                    /*
                     * 2026-09-19, второй заход (Александр: «что-то не
                     * влезло чуть»). Сначала рамка была шириной с
                     * телефон (390px) -- и в окошко попадала только
                     * верхушка страницы, фраза обрывалась на полуслове.
                     *
                     * Теперь рамка рисует ШИРОКИЙ вид, 1200x900, и
                     * ужимается ровно во всю ширину окошка:
                     * 1200 x 0.2833 = 340px, 900 x 0.2833 = 255px --
                     * это в точности 340x255, то есть соотношение 4:3 у
                     * контейнера. Первый экран /download помещается
                     * целиком, включая обе кнопки магазинов.
                     */
                    className="pointer-events-none h-[900px] w-[1200px] origin-top-left scale-[0.2833] border-0"
                    onLoad={(event) => {
                      try {
                        const doc = event.currentTarget.contentDocument;
                        if (doc?.body && doc.body.childElementCount > 0) setFrameLoaded(true);
                      } catch {
                        // чужой origin -- значит это не наша страница
                      }
                    }}
                  />
                </span>
              )}
            </span>

            <span className="block px-4 py-3">
              <span className="block text-[14px] font-semibold text-ink dark:text-neutral-100">
                <T
                  uk="Застосунок A1"
                  en="The A1 app"
                  ru="Приложение A1"
                  de="Die A1-App"
                  es="La app A1"
                  fr="L'app A1"
                  pl="Aplikacja A1"
                  ptBR="O app A1"
                  zh="A1 应用"
                />
              </span>
              <span className="mt-0.5 block text-[13px] text-neutral-500 dark:text-neutral-400">
                <T
                  uk="Android та iOS — вакансії й чати в кишені"
                  en="Android and iOS — jobs and chats in your pocket"
                  ru="Android и iOS — вакансии и чаты в кармане"
                  de="Android und iOS — Jobs und Chats in der Tasche"
                  es="Android e iOS: vacantes y chats en tu bolsillo"
                  fr="Android et iOS — offres et messages dans votre poche"
                  pl="Android i iOS — oferty i czaty w kieszeni"
                  ptBR="Android e iOS — vagas e chats no bolso"
                  zh="Android 与 iOS——口袋里的职位和聊天"
                />
              </span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
