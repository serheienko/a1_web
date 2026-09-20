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
// главной (app/download/site-preview.tsx) -- здесь тот же приём, только
// наоборот: из шапки сайта заглядываем на /download.
//
// 20.09.2026, ЧЕТВЁРТЫЙ ЗАХОД И СМЕНА ПОДХОДА (Александр, скриншот:
// «окно плохо выглядит, нам не надо показывать кнопки установки, нам
// надо крупно показать текст и полностью кота»).
//
// Три предыдущих захода тянули сюда живую страницу в <iframe> и ужимали
// её. Это тупик по устройству: в окошко лезет ВСЁ, что есть наверху
// страницы -- и кнопки магазинов, и меню, -- а кот обрезается краем
// кадра. Крупнее буквы тоже не сделать: у /download текучая типографика,
// после ужатия 36px и 40px дают на экране одинаковые 13.6px (померено).
//
// Поэтому рамки больше нет. Окошко собрано здесь из двух вещей, которые
// и надо показать: картинка с котом целиком и заголовок страницы своим
// размером. Что это даёт:
//
// 1. Кот виден полностью. Картинка широкая (1672x941), кот сидит в
//    правой половине, слева пустой космос. Кадр 16:10 с прижатием
//    вправо срезает часть пустоты -- кот становится крупнее и при этом
//    целиком в кадре. Тот же приём, что на самой /download
//    (background-position: right center), только кадр другой.
// 2. Текст настоящего размера -- 20px, а не ужатые 13.6px. Он лежит под
//    картинкой, а не поверх неё: поверх он налез бы на кота, ведь
//    свободна только левая треть кадра.
// 3. Кнопок магазинов нет вовсе. Окошко -- приглашение зайти, а ставить
//    приложение человек будет на самой странице.
// 4. Ничего не грузится и не ждёт: одна картинка вместо целой страницы.
//    Окошко открывается мгновенно, и обвязка с «загружается/не
//    загрузилось» больше не нужна.
//
// Заголовок берём из того же файла, что и сама страница
// (app/download/copy.ts) -- иначе тексты разъедутся при первой же
// правке. Девять языков показываются тем же способом, что и <T/>:
// девять span-ов подряд, видим один (components/t.tsx).
//
// Панель прилипает к кнопке отступом (pt-2), а не зазором: между ними
// не должно быть «мёртвой» полосы, иначе окно залипает -- ровно та
// грабля, что описана первым пунктом в шапке lib/use-hover-panel.ts.
"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { DOWNLOAD_COPY } from "@/app/download/copy";
import { LOCALES, LOCALE_VISIBILITY_CLASS, T } from "@/components/t";
import { useHoverPanel } from "@/lib/use-hover-panel";

export function GetAppButton() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { rendered, visible, handleMouseEnter, handleMouseLeave } = useHoverPanel(open, setOpen, [
    { trigger: wrapRef, panel: panelRef },
  ]);

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

      {rendered && (
        <div ref={panelRef} className="absolute right-0 top-full z-50 w-[440px] pt-2">
          <Link
            href="/download"
            className={
              "block overflow-hidden rounded-2xl bg-[#03051f] shadow-xl ring-1 ring-black/10 transition duration-200 ease-out dark:ring-white/10 " +
              (visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")
            }
          >
            {/* Кот целиком: кадр 16:10, картинка прижата вправо. */}
            <span className="relative block aspect-[16/10] w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/download/hero.webp"
                alt=""
                width={1672}
                height={941}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover object-right"
              />
              {/* Мягкий переход картинки в подпись: без него стык
                  читается как склейка двух разных карточек. */}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-16 bg-gradient-to-b from-transparent to-[#03051f]" />
            </span>

            <span className="block px-5 pb-5 pt-1">
              <span className="block text-[20px] font-semibold leading-[1.2] text-white">
                {LOCALES.map((locale) => (
                  <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
                    {DOWNLOAD_COPY[locale].headline}{" "}
                    <span className="text-[#7aa2ff]">{DOWNLOAD_COPY[locale].headlineAccent}</span>
                  </span>
                ))}
              </span>
              <span className="mt-2 block text-[13px] leading-snug text-white/65">
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
