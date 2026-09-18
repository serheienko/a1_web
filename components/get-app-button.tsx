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
// Подпись не видна, но она есть -- <T/> внутри sr-only. Значок без
// текста должен чем-то представляться читалке с экрана, а девять
// языков в атрибут title не помещаются: атрибуты <T/> не умеет.
//
// Куда ведёт -- на /download, где уже лежат обе кнопки магазинов. Прямая
// ссылка в App Store не годится: с компьютера и с Android человек
// попадёт не туда.
import Link from "next/link";
import { T } from "@/components/t";

export function GetAppButton() {
  return (
    <Link
      href="/download"
      className="group hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:border-accent/40 hover:text-accent sm:flex dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-accent/40 dark:hover:text-accent"
    >
      <svg
        width="20"
        height="20"
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
  );
}
