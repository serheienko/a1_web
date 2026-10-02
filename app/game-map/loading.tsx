// app/game-map/loading.tsx -- пока открывается страница карты, вместо
// скелетона ленты (app/loading.tsx) -- та же рамка карты с загрузчиком.
import { GAME_MAP_CSS } from "./engine";
import { MapLoader } from "./map-loader";

export default function GameMapLoading() {
  return (
    <main className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
      <style>{GAME_MAP_CSS}</style>
      <div className="gm2">
        <MapLoader />
      </div>
    </main>
  );
}
