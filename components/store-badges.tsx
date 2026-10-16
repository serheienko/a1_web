// components/store-badges.tsx
//
// 14.10.2026 (Александр: «логотипы download iOS и Google Play»). Кнопки
// магазинов в привычном для всех виде: чёрная плашка, значок магазина,
// мелкая строка сверху и название магазина крупно. Ссылки -- те же, что
// на /download (app/download/copy.ts, правятся в одном месте).
// Серверный компонент: девять языков в разметке, видимый выбирает CSS.
//
// 16.10.2026: убраны пометки data-umami-event -- Umami выключена. Клики по
// этим двум кнопкам в подвале пока не считаются нигде: счётчик (lib/track.ts)
// работает из браузера, а этот компонент серверный, и ради одного события
// делать его клиентским не хочется. На странице /download клики считаются
// (app/download/interactions.tsx), а подвал подождёт отдельной задачи.

import { DOWNLOAD_LINKS } from "@/app/download/copy";
import { T } from "@/components/t";

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.536c-.03-3.017 2.463-4.463 2.575-4.534-1.4-2.05-3.58-2.332-4.355-2.363-1.855-.188-3.62 1.09-4.56 1.09-.94 0-2.39-1.063-3.93-1.034-2.02.03-3.885 1.175-4.925 2.985-2.1 3.64-.537 9.03 1.51 11.985 1 1.445 2.19 3.067 3.75 3.01 1.505-.06 2.073-.973 3.89-.973 1.817 0 2.33.973 3.92.94 1.62-.026 2.645-1.47 3.635-2.92 1.145-1.675 1.615-3.295 1.643-3.378-.036-.016-3.152-1.21-3.183-4.808M14.79 3.9c.83-1.006 1.39-2.404 1.237-3.798-1.195.048-2.644.796-3.502 1.8-.77.89-1.444 2.313-1.263 3.678 1.334.104 2.697-.678 3.528-1.68" />
    </svg>
  );
}

/** Треугольник Google Play в четыре цвета. */
function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
      <path fill="#00A0FF" d="M3.6 1.8 13.4 11.9 3.6 22c-.33-.2-.55-.6-.55-1.1V2.9c0-.5.22-.9.55-1.1z" />
      <path fill="#00D26A" d="M3.6 1.8c.33-.2.77-.2 1.25.07L16.8 9.3l-3.4 2.6z" />
      <path fill="#FF3A44" d="M3.6 22 13.4 11.9l3.4 2.7-11.95 7.33c-.48.27-.92.27-1.25.07z" />
      <path fill="#FFC900" d="m16.8 9.3 3.55 2.03c.95.55.95 1.43 0 1.98L16.8 14.6l-3.4-2.7z" />
    </svg>
  );
}

const badge =
  "group inline-flex h-12 min-w-[150px] items-center gap-2.5 rounded-xl bg-black px-3.5 text-white ring-1 ring-black/10 " +
  "transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 dark:ring-white/20 dark:hover:ring-white/40";

export function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <a href={DOWNLOAD_LINKS.appStore} rel="noopener" className={badge} data-track="footer-ios" aria-label="App Store">
        <AppleGlyph />
        <span className="flex flex-col leading-none">
          <span className="text-[10px] font-medium tracking-wide opacity-90">
            <T uk="Завантажте в" en="Download on the" ru="Загрузите в" de="Laden im" es="Descárgalo en" fr="Télécharger dans" pl="Pobierz w" ptBR="Baixar na" zh="下载于" />
          </span>
          <span className="mt-1 text-[17px] font-semibold tracking-tight">App Store</span>
        </span>
      </a>
      <a href={DOWNLOAD_LINKS.googlePlay} rel="noopener" className={badge} data-track="footer-android" aria-label="Google Play">
        <PlayGlyph />
        <span className="flex flex-col leading-none">
          <span className="text-[10px] font-medium uppercase tracking-wide opacity-90">
            <T uk="Доступно в" en="Get it on" ru="Доступно в" de="Jetzt bei" es="Disponible en" fr="Disponible sur" pl="Pobierz z" ptBR="Disponível no" zh="立即获取" />
          </span>
          <span className="mt-1 text-[17px] font-semibold tracking-tight">Google Play</span>
        </span>
      </a>
    </div>
  );
}
