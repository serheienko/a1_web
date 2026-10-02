// app/game-map/map-loader.tsx -- загрузка карты внутри её рамки: размытое
// превью, блик и компас. Те же классы, что у загрузчика в engine.ts,
// поэтому переход «загрузка → карта» без скачка.
import { T } from "@/components/t";

export function MapLoader() {
  return (
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
  );
}
