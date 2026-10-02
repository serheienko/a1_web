// app/game-map/loading.tsx -- пока сервер собирает карту, показываем не
// скелетон ленты (app/loading.tsx), а ту же рамку карты: размытое превью
// карты, блик и компас (02.10.2026, Александр: «підвантаження карти має
// працювати всередині її фрейму… інша анімація, можливо через блюр»).
// Классы те же, что у загрузчика внутри engine.ts, -- переход без скачка.
import { T } from "@/components/t";
import { GAME_MAP_CSS } from "./engine";

export default function GameMapLoading() {
  return (
    <main className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
      <style>{GAME_MAP_CSS}</style>
      <div className="gm2">
        <div className="gm-load">
          <div className="gm-lbg" />
          <div className="gm-lpill">
            <svg className="gm-compass" viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
              <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="2" opacity=".55" />
              <g className="gm-needle">
                <path d="M20 6l4 14h-8z" fill="#c0392b" />
                <path d="M20 34l-4-14h8z" fill="currentColor" opacity=".75" />
              </g>
              <circle cx="20" cy="20" r="2.2" fill="currentColor" />
            </svg>
            <T uk="Малюємо карту…" en="Drawing the map…" ru="Рисуем карту…" de="Karte wird gezeichnet…" es="Dibujando el mapa…" fr="Dessin de la carte…" pl="Rysujemy mapę…" ptBR="Desenhando o mapa…" zh="正在绘制地图…" />
          </div>
        </div>
      </div>
    </main>
  );
}
