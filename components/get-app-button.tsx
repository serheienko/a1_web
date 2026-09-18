// components/get-app-button.tsx
//
// Александр, 18.09.2026: «Сделай где-то кнопку на сайте "A1 app" со
// ссылкой на апку. Надо подумать, где это будет уместно на 2 стора».
//
// Куда ведёт. На /download -- нашу же страницу, где уже лежат обе кнопки
// магазинов (app/download/copy.ts). Вести прямо в App Store нельзя: с
// компьютера человек попадёт на страницу приложения, которое он не может
// поставить, а с Android -- вообще не туда. Страница решает это сама.
//
// Где стоит. В шапке слева от аватара, на экранах от sm и шире. На
// телефоне её нет намеренно: там шапка и так плотная, а сверху уже висит
// components/app-open-banner.tsx, который делает ровно эту работу и умеет
// открыть уже установленное приложение.
import Link from "next/link";
import { T } from "@/components/t";

export function GetAppButton() {
  return (
    <Link
      href="/download"
      className="group hidden h-11 shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 no-underline transition hover:border-accent/40 hover:text-accent sm:flex dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-accent/40 dark:hover:text-accent"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 animate-share-lift"
        aria-hidden="true"
      >
        <rect x="6" y="2" width="12" height="20" rx="3" />
        <path d="M11 18h2" />
      </svg>
      <T
        uk="A1 застосунок"
        en="A1 app"
        ru="Приложение A1"
        de="A1 App"
        es="App A1"
        fr="App A1"
        pl="Aplikacja A1"
        ptBR="App A1"
        zh="A1 应用"
      />
    </Link>
  );
}
