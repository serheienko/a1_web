// components/get-app-banner.tsx
//
// 2026-09-08: closes the deep-link loop the other direction. a1appp.com
// now redirects app-less visitors here (see app/resolve/route.ts's file
// header for the full picture); this banner sends web visitors back to
// the same Universal Link the app itself shares, so someone who already
// has the app installed can jump straight into it, and this stays the
// only place that needs updating if the "download" destination changes.
//
// Deliberately tiny/static, no client JS: `href` just needs to be the
// matching https://a1appp.com/<prefix>/<id> Universal Link for this piece
// of content — iOS/Android intercept it at the OS level when the app is
// installed, and it round-trips back through /resolve when it isn't.
import { T } from "@/components/t";

export function GetAppBanner({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 no-underline transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
    >
      <span>
        <T
          uk="Відкрити у застосунку A1"
          en="Open in the A1 app"
          ru="Открыть в приложении A1"
          de="In der A1-App öffnen"
          es="Abrir en la app A1"
          fr="Ouvrir dans l'app A1"
          pl="Otwórz w aplikacji A1"
          ptBR="Abrir no app A1"
          zh="在 A1 应用中打开"
        />
      </span>
      <span className="shrink-0 font-medium underline">
        <T
          uk="Отримати застосунок"
          en="Get the app"
          ru="Скачать приложение"
          de="App holen"
          es="Obtener la app"
          fr="Obtenir l'app"
          pl="Pobierz aplikację"
          ptBR="Baixar o app"
          zh="获取应用"
        />
      </span>
    </a>
  );
}
