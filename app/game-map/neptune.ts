// app/game-map/neptune.ts
//
// 24.10.2026 (Александр, суббота, «есть вдохновение»): секретная пасхалка на
// карте A1. В поиске карты вводишь «Mr Kit residence» + Enter -- карта ныряет
// в туман и открывается резиденция Mr Kit на планете Нептун: дом с ушками в
// центре (~30% экрана), вокруг дворецкие, дроны, кристаллы, гейзер, неоновая
// рыба, голограмма A1. Дом «играет цветами» -- там дискотека. Края в тумане.
//
// Решения (Александр выбрал сам):
// - отдельная сцена поверх карты, а не остров на самой карте -- основную
//   карту не трогаем, глючить нечему;
// - дом -- новый, с ушками и диско-куполом;
// - карта в приложении -- та же страница сайта, так что пасхалка есть и там.
//
// Модуль грузится только после секретной фразы (import() в engine.ts), картинки
// (~700 КБ webp, public/game-map/neptune) -- тоже. Остальным ничего не весит.
// Вся анимация -- CSS transform/opacity (дёшево для телефона), при
// prefers-reduced-motion она выключена.

import { MapMusic, getMapMusic } from "./music";

type Lang = "uk" | "en" | "ru" | "de" | "es" | "fr" | "pl" | "ptBR" | "zh";

const BASE = "/game-map/neptune";

/** Фраза-ключ: регистр, пробелы, апостроф и знаки не важны. */
const SECRET = new Set(["mrkitresidence", "mrkitsresidence", "misterkitresidence", "residenceofmrkit", "mrkithouse", "mrkitshouse"]);
export function isNeptuneSecret(q: string): boolean {
  return SECRET.has(q.toLowerCase().replace(/[^a-z]/g, ""));
}

const STR: Record<Lang, { title: string; sub: string; found: string; close: string; flying: string; mOn?: string; mOff?: string }> = {
  uk: { mOn: "Увімкнути музику", mOff: "Вимкнути музику", title: "Резиденція Mr Kit", sub: "Нептун, всесвіт A1", found: "Ти знайшов секретну локацію 🤫", close: "Повернутися на карту", flying: "Летимо на Нептун…" },
  en: { mOn: "Turn music on", mOff: "Turn music off", title: "Mr Kit's Residence", sub: "Neptune, A1 Universe", found: "You found a secret location 🤫", close: "Back to the map", flying: "Flying to Neptune…" },
  ru: { mOn: "Включить музыку", mOff: "Выключить музыку", title: "Резиденция Mr Kit", sub: "Нептун, вселенная A1", found: "Ты нашёл секретную локацию 🤫", close: "Вернуться на карту", flying: "Летим на Нептун…" },
  de: { mOn: "Musik an", mOff: "Musik aus", title: "Mr Kits Residenz", sub: "Neptun, A1-Universum", found: "Du hast einen geheimen Ort gefunden 🤫", close: "Zurück zur Karte", flying: "Flug zum Neptun…" },
  es: { mOn: "Activar música", mOff: "Desactivar música", title: "Residencia de Mr Kit", sub: "Neptuno, universo A1", found: "Encontraste un lugar secreto 🤫", close: "Volver al mapa", flying: "Volando a Neptuno…" },
  fr: { mOn: "Activer la musique", mOff: "Couper la musique", title: "Résidence de Mr Kit", sub: "Neptune, univers A1", found: "Tu as trouvé un lieu secret 🤫", close: "Retour à la carte", flying: "En route pour Neptune…" },
  pl: { mOn: "Włącz muzykę", mOff: "Wyłącz muzykę", title: "Rezydencja Mr Kita", sub: "Neptun, wszechświat A1", found: "Znalazłeś sekretne miejsce 🤫", close: "Wróć do mapy", flying: "Lecimy na Neptuna…" },
  ptBR: { mOn: "Ligar música", mOff: "Desligar música", title: "Residência do Mr Kit", sub: "Netuno, universo A1", found: "Você achou um lugar secreto 🤫", close: "Voltar ao mapa", flying: "Voando para Netuno…" },
  zh: { mOn: "打开音乐", mOff: "关闭音乐", title: "Mr Kit 的官邸", sub: "海王星，A1 宇宙", found: "你发现了一个秘密地点 🤫", close: "返回地图", flying: "正在飞往海王星…" },
};

// Сцена в своих координатах 1600x1000; x,y -- точка «ног» спрайта (низ по центру).
type Piece = { src: string; x: number; y: number; w: number; cls?: string; z?: number; delay?: number };
const PIECES: Piece[] = [
  { src: "turret", x: 330, y: 470, w: 64, cls: "np-turret" },
  { src: "spire", x: 1330, y: 475, w: 90 },
  { src: "ship", x: 440, y: 520, w: 190, cls: "np-hover" },
  { src: "dish", x: 1170, y: 525, w: 140, cls: "np-dish" },
  { src: "disco", x: 575, y: 575, w: 62, cls: "np-disco" },
  { src: "crystals", x: 335, y: 610, w: 150, cls: "np-glint" },
  { src: "pylon", x: 1290, y: 610, w: 112, cls: "np-pylon" },
  { src: "statue", x: 555, y: 665, w: 92, cls: "np-shine" },
  { src: "disco", x: 1030, y: 640, w: 62, cls: "np-disco", delay: 0.7 },
  { src: "butler", x: 668, y: 712, w: 96, cls: "np-idle" },
  // Рыба -- на снегу между двумя лунками (раньше одна нога стояла в воде, Александр).
  { src: "fish", x: 1180, y: 652, w: 124, cls: "np-neon" },
  { src: "crystals-s", x: 470, y: 765, w: 110, cls: "np-glint", delay: 1.3 },
  { src: "geyser", x: 1215, y: 770, w: 118 },
];

// Окна дома: x, y, ширина, высота в % от картинки (вырезаны из residence-windows.webp).
// Каждое окно -- отдельный «огонёк гирлянды» (Александр: «как огни на новогодней ёлке»).
const WINDOWS = [38.11,16.98,3.67,3.91,59.44,18.88,6.33,8.94,41.22,20.67,2.11,2.12,36.22,30.28,3.0,4.02,41.78,31.84,5.67,4.47,67.44,32.4,2.0,1.45,50.33,32.85,5.78,3.91,24.33,33.07,2.89,2.46,59.22,33.07,5.11,3.58,34.33,36.31,3.67,2.01,67.33,36.42,3.33,2.01,65.33,36.65,1.11,1.12,32.89,37.99,0.89,1.01,48.11,38.88,5.44,3.91,61.78,39.22,2.0,2.79,39.22,40.11,1.11,1.34,84.22,40.67,4.44,3.46,33.78,42.12,2.56,1.79,67.33,42.46,2.56,2.35,64.67,43.24,0.78,1.68,39.11,46.15,2.22,4.58,61.78,46.26,2.33,5.7,78.11,46.48,1.33,1.34,56.44,46.82,0.89,1.45,66.11,47.71,3.89,2.57,34.11,47.82,3.89,2.68,48.56,48.16,4.89,5.59,64.67,50.17,0.78,2.46,72.11,50.73,2.0,1.45,82.56,52.85,3.0,2.01,64.78,53.63,4.11,1.9,73.78,53.85,0.89,1.01,35.56,53.97,2.11,1.23,92.78,54.75,3.22,2.57,69.22,55.08,2.78,2.23,58.33,55.87,1.67,1.12,43.89,55.98,3.89,1.45,19.89,56.54,1.11,1.79,64.56,58.1,2.33,3.13,37.11,58.44,2.11,5.03,15.22,58.55,1.44,1.23,12.89,60.0,8.0,5.03,47.78,60.45,4.78,5.7,56.56,60.56,1.67,5.7,87.56,61.34,1.56,1.56,25.89,61.79,1.0,1.01,11.0,62.35,1.22,0.89,87.33,63.24,5.89,7.26,37.0,64.02,2.22,2.23,10.0,64.13,1.11,0.89,13.78,64.58,17.67,5.03,32.33,65.36,1.56,2.01,63.78,65.36,1.67,2.68,66.22,65.36,1.0,1.12,47.78,66.03,4.78,5.47,79.56,66.82,5.44,4.58,92.89,66.82,1.0,1.56,40.89,67.26,1.11,4.47,69.78,68.04,1.22,1.79,67.78,68.16,1.56,1.23,3.44,68.72,0.89,1.23,74.56,69.05,4.89,2.35,29.56,69.5,5.89,3.02,5.0,69.72,1.78,1.68,24.11,71.73,2.44,1.79,11.33,72.18,1.44,1.45,66.44,72.4,3.33,5.25,13.11,72.63,1.89,1.45,15.44,73.07,2.11,1.45,18.0,73.3,1.44,1.34,4.67,73.63,2.56,4.58,87.11,73.63,5.44,7.37,56.56,73.74,2.0,6.03,62.0,73.97,2.89,5.92,31.44,74.64,1.44,1.34,52.67,74.64,1.56,2.57,82.67,74.75,2.89,5.7,75.89,74.97,5.44,6.26,97.33,75.2,1.0,1.23,43.0,75.75,4.56,5.92,11.89,76.09,4.67,5.36,29.67,76.87,0.78,1.01,50.78,78.1,3.0,2.35,66.78,78.99,2.22,1.56,23.11,79.33,0.78,1.68,34.11,79.55,4.44,3.35,24.33,79.66,2.33,2.12,27.22,80.45,2.44,2.12,90.89,80.45,4.0,3.24,63.0,81.45,1.0,1.23,88.44,82.35,2.11,2.23,87.0,82.79,1.11,2.12,23.56,83.91,4.0,4.8,80.78,84.58,0.89,2.01,77.78,84.92,2.67,2.35,51.0,85.36,1.33,2.01,72.78,85.36,4.44,2.57,89.78,85.36,4.89,5.81,52.67,85.81,3.33,2.35,67.89,85.81,4.44,2.23,56.56,86.48,3.0,2.23,60.0,86.82,1.0,2.01,21.44,87.37,0.89,1.56,75.56,89.83,5.0,5.14,52.22,90.39,5.89,4.8,68.89,90.73,5.56,4.69,48.33,93.74,1.89,1.79,85.33,94.3,1.67,2.35,64.56,96.31,2.33,2.79];
const LIGHTS = ["#ff4fd8", "#3ee8ff", "#ffd84d", "#9b7bff", "#5dff9e", "#ff7a4d"];

function el(tag: string, cls: string, html?: string): HTMLElement {
  const n = document.createElement(tag);
  n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function place(n: HTMLElement, x: number, y: number, w: number, aspect: number) {
  const h = w * aspect;
  n.style.cssText += `left:${x - w / 2}px;top:${y - h}px;width:${w}px;height:${h}px;`;
}

const ASPECT = {
  residence: 895 / 900, ground: 742 / 1100, butler: 256 / 260, "butler-wave": 256 / 260, drone: 224 / 220, quad: 239 / 260, turret: 175 / 160,
  ship: 358 / 340, pylon: 222 / 220, dish: 271 / 260, holo: 267 / 260, disco: 174 / 160, fish: 253 / 260, statue: 235 / 220, crystals: 294 / 300,
  "crystals-s": 236 / 220, spire: 215 / 200, geyser: 246 / 240,
} as const satisfies Record<string, number>;
const aspectOf = (k: string): number => (ASPECT as Record<string, number>)[k] ?? 1;

function preload(srcs: string[]): Promise<void> {
  return Promise.all(
    srcs.map(
      (s) =>
        new Promise<void>((res) => {
          const i = new Image();
          i.decoding = "async";
          i.onload = i.onerror = () => res();
          i.src = `${BASE}/${s}.webp`;
        }),
    ),
  ).then(() => undefined);
}

let openNow: (() => void) | null = null;

/** Открыть резиденцию. Возвращает функцию закрытия. */
export function openNeptune(opts: { lang?: string; onClose?: () => void; host?: Element | null } = {}): () => void {
  if (openNow) return openNow;
  const lang: Lang = (opts.lang && opts.lang in STR ? opts.lang : "uk") as Lang;
  const t = STR[lang];

  if (!document.getElementById("np-style")) {
    const st = document.createElement("style");
    st.id = "np-style";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  const root = el("div", "np-root");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", `${t.title} · ${t.sub}`);

  // Звёзды: одна точка + box-shadow на 120 копий (одна нода, дёшево).
  const stars = el("div", "np-stars");
  const sh: string[] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 120; i++) sh.push(`${Math.round(rnd() * 2000)}px ${Math.round(rnd() * 1400)}px 0 ${rnd() > 0.85 ? 1 : 0}px rgba(255,255,255,${(0.35 + rnd() * 0.6).toFixed(2)})`);
  stars.style.boxShadow = sh.join(",");
  const stars2 = el("div", "np-stars np-stars-b");
  stars2.style.boxShadow = sh.slice(0, 60).map((s) => s.replace(/(\d+)px (\d+)px/, (_, a, b) => `${(+a + 700) % 2000}px ${(+b + 400) % 1400}px`)).join(",");
  root.append(el("div", "np-planet"), stars, stars2);

  // Сцена
  const vp = el("div", "np-vp");
  const stage = el("div", "np-stage");
  vp.appendChild(stage);
  root.appendChild(vp);

  const ground = el("img", "np-ground") as HTMLImageElement;
  ground.src = `${BASE}/ground.webp`;
  ground.alt = "";
  place(ground, 800, 200 + 1300 * ASPECT.ground, 1300, ASPECT.ground);
  stage.appendChild(ground);

  // Пятна диско-света на льду (под домом и спрайтами).
  const floor = el("div", "np-floor");
  for (let i = 0; i < 5; i++) {
    const d = el("span", "np-spot");
    d.style.setProperty("--i", String(i));
    floor.appendChild(d);
  }
  stage.appendChild(floor);

  // Прожекторы за домом.
  const beams = el("div", "np-beams");
  for (let i = 0; i < 4; i++) {
    const b = el("span", "np-beam");
    b.style.setProperty("--i", String(i));
    beams.appendChild(b);
  }
  stage.appendChild(beams);

  const behind: Piece[] = PIECES.filter((p) => p.y < 600);
  const front: Piece[] = PIECES.filter((p) => p.y >= 600);
  const addPiece = (p: Piece) => {
    const w = el("div", `np-piece ${p.cls ?? ""}`);
    place(w, p.x, p.y, p.w, aspectOf(p.src));
    if (p.delay) w.style.animationDelay = `${p.delay}s`;
    w.innerHTML = `<img src="${BASE}/${p.src}.webp" alt="" draggable="false">`;
    stage.appendChild(w);
    return w;
  };
  behind.forEach(addPiece);

  // Дом + цветная «дискотечная» накладка по силуэту дома (mask-image).
  const house = el("div", "np-house");
  place(house, 795, 640, 520, ASPECT.residence);
  house.innerHTML = `<img src="${BASE}/residence.webp" alt="${t.title}" draggable="false"><span class="np-tint"></span><span class="np-tint np-tint-b"></span><span class="np-win"></span>`;
  {
    // Горит примерно 2/3 окон, у каждого свой цвет, темп и задержка -- мерцают вразнобой и плавно.
    const win = house.querySelector(".np-win") as HTMLElement;
    let r = 11;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    const parts: string[] = [];
    for (let i = 0; i < WINDOWS.length; i += 4) {
      if (rnd() < 0.34) continue;
      const [x, y, w, h] = WINDOWS.slice(i, i + 4);
      const c = LIGHTS[Math.floor(rnd() * LIGHTS.length)];
      parts.push(`<i style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;background:${c};--d:${(2.2 + rnd() * 2.8).toFixed(2)}s;--l:${(-rnd() * 5).toFixed(2)}s"></i>`);
    }
    win.innerHTML = parts.join("");
  }
  stage.appendChild(house);

  // Гейзер: клубы пара.
  front.forEach((p) => {
    const n = addPiece(p);
    if (p.src === "geyser") {
      for (let i = 0; i < 4; i++) {
        const s = el("span", "np-steam");
        s.style.setProperty("--i", String(i));
        n.appendChild(s);
      }
    }
  });

  // Дворецкий справа машет: два кадра по очереди.
  const waver = el("div", "np-piece np-waver");
  // Оба кадра вырезаны одним общим кадром (public/game-map/neptune/butler*.webp),
  // иначе при смене позы дворецкий «прыгал» (Александр: «кот-официант глючит»).
  place(waver, 938, 712, 96, ASPECT.butler);
  // Второй заход: два разных рисунка позы при смене кадров всё равно дёргались
  // (поднос и наклон корпуса нарисованы по-разному). Теперь он просто машет --
  // один кадр, мягко покачивается от ног.
  waver.innerHTML = `<img src="${BASE}/butler-wave.webp" alt="" draggable="false">`;
  stage.appendChild(waver);

  // В воздухе.
  const holo = el("div", "np-piece np-holo");
  place(holo, 1065, 360, 118, ASPECT.holo);
  holo.innerHTML = `<img src="${BASE}/holo.webp" alt="" draggable="false">`;
  const drone = el("div", "np-piece np-drone");
  place(drone, 470, 330, 96, ASPECT.drone);
  drone.innerHTML = `<img src="${BASE}/drone.webp" alt="" draggable="false">`;
  const quad = el("div", "np-piece np-quad");
  place(quad, 1250, 290, 128, ASPECT.quad);
  quad.innerHTML = `<img src="${BASE}/quad.webp" alt="" draggable="false">`;
  stage.append(holo, drone, quad);

  // Туман: виньетка + плывущие клубы.
  const fog = el("div", "np-fog");
  for (let i = 0; i < 5; i++) {
    const c = el("span", "np-cloud");
    c.style.setProperty("--i", String(i));
    fog.appendChild(c);
  }
  root.appendChild(fog);

  const head = el(
    "div",
    "np-head",
    `<div class="np-chip"><span class="np-chip-ic">🪐</span><span><b></b><small></small></span></div><div class="np-btns"><button type="button" class="np-m" aria-pressed="false"><span class="np-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button><button type="button" class="np-x" aria-label=""><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`,
  );
  (head.querySelector("b") as HTMLElement).textContent = t.title;
  (head.querySelector("small") as HTMLElement).textContent = t.sub;
  const xBtn = head.querySelector(".np-x") as HTMLButtonElement;
  xBtn.setAttribute("aria-label", t.close);
  xBtn.title = t.close;
  root.appendChild(head);

  // Музыка -- тот же плеер, что у карты (./music.ts): треки по кругу в случайном
  // порядке, плавный переход, выбор «включено» и место в треке помнятся. Свои
  // три трека (public/game-map/neptune/music). Музыку карты на время глушим, а
  // при выходе возвращаем. Если на карте музыка играла -- здесь сразу играет своя.
  const mapMusic = getMapMusic();
  // 24.10.2026 (Александр: «в приложении две музыки играют одновременно»).
  // Музыка карты могла включиться уже ПОСЛЕ входа сюда: она стартует не сразу
  // (сначала аудио-движок, потом play), а в приложении -- ещё и от касания поля
  // поиска. Поэтому не один раз «проверили и выключили», а следим всё время,
  // пока резиденция открыта: заиграла карта -- глушим, запоминаем, что надо
  // вернуть при выходе.
  let mapWasOn = mapMusic.playing;
  let alive0 = true;
  const unsubMap = mapMusic.subscribe((on) => {
    if (on && alive0) {
      mapWasOn = true;
      mapMusic.pause();
    }
  });
  const music = new MapMusic({ tracks: ["1", "2", "3"], base: `${BASE}/music/`, key: "a1-neptune-music" });
  const mBtn = head.querySelector(".np-m") as HTMLButtonElement;
  const unsub = music.subscribe((on) => {
    const label = (on ? t.mOff : t.mOn) ?? "";
    mBtn.classList.toggle("on", on);
    mBtn.setAttribute("aria-pressed", on ? "true" : "false");
    mBtn.setAttribute("aria-label", label);
    mBtn.title = label;
  });
  mBtn.addEventListener("click", () => music.toggle());
  if (mapWasOn) music.start();
  else music.autoResume();
  // Как на карте: если музыку тут включали раньше, она вступает от первого касания.
  const wake = (e: Event) => {
    if (!(e.target as HTMLElement).closest(".np-m")) music.autoResume();
  };
  root.addEventListener("pointerdown", wake);
  const found = el("div", "np-found");
  found.textContent = t.found;
  root.appendChild(found);
  const loading = el("div", "np-loading");
  loading.textContent = t.flying;
  root.appendChild(loading);

  // 24.10.2026 (Александр: «при зуме пальцами карта сбрасывается и выходит из
  // резиденции»): браузер зумил всю страницу, а не сцену. Теперь зум пальцами
  // (и колесо/двойной тап) работает внутри сцены: 1x..3.5x, сдвиг пальцем.
  let zoom = 1, panX = 0, panY = 0, baseS = 1;
  const clampPan = () => {
    const mx = Math.max(0, (1600 * baseS * zoom - window.innerWidth) / 2);
    const my = Math.max(0, (1000 * baseS * zoom - window.innerHeight) / 2);
    panX = Math.min(mx, Math.max(-mx, panX));
    panY = Math.min(my, Math.max(-my, panY));
  };
  const fit = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    // На телефоне (вертикально) чуть крупнее: края острова можно обрезать, дом важнее.
    baseS = Math.min(vw / (vh > vw * 1.3 ? 1120 : 1250), vh / 860);
    clampPan();
    stage.style.transform = `translate(-50%,-50%) translate(${panX}px,${panY}px) scale(${baseS * zoom})`;
  };
  fit();
  window.addEventListener("resize", fit);
  const zoomAt = (cx: number, cy: number, nz: number) => {
    nz = Math.max(1, Math.min(3.5, nz));
    const k = nz / zoom;
    const ox = cx - window.innerWidth / 2, oy = cy - window.innerHeight / 2;
    panX = ox - (ox - panX) * k;
    panY = oy - (oy - panY) * k;
    zoom = nz;
    if (zoom === 1) { panX = 0; panY = 0; }
    stage.style.transition = "";
    fit();
  };
  const pts = new Map<number, { x: number; y: number }>();
  let pinch: { d: number; z: number } | null = null;
  let lastTap = 0;
  const gdist = () => {
    const [a, b] = [...pts.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 1;
  };
  const onDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest(".np-m,.np-x")) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) pinch = { d: gdist(), z: zoom };
    else if (pts.size === 1) {
      const now = Date.now();
      if (now - lastTap < 300) zoomAt(e.clientX, e.clientY, zoom > 1.2 ? 1 : 2.2);
      lastTap = now;
    }
  };
  const onMove = (e: PointerEvent) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pts.size >= 2 && pinch) {
      const [a, b] = [...pts.values()];
      if (a && b) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.z * (gdist() / pinch.d));
    } else if (pts.size === 1 && zoom > 1) {
      panX += dx;
      panY += dy;
      fit();
    }
  };
  const onUp = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, zoom * Math.exp(-e.deltaY * 0.0015));
  };
  const stopGesture = (e: Event) => e.preventDefault();
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onUp);
  root.addEventListener("wheel", onWheel, { passive: false });
  // Safari: свой жест зума страницы
  for (const g of ["gesturestart", "gesturechange", "gestureend"]) root.addEventListener(g, stopGesture);
  // Не даём событиям уйти в карту под резиденцией (она сама двигается/зумится от пальцев).
  for (const ev of ["pointerdown", "pointermove", "pointerup", "touchstart", "touchmove", "click", "dblclick"]) {
    root.addEventListener(ev, (e) => e.stopPropagation());
  }

  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  (opts.host ?? document.body).appendChild(root);
  requestAnimationFrame(() => root.classList.add("np-in"));

  // Сначала грузим картинки (за туманом), потом «ныряем».
  let alive = true;
  preload(["residence", "residence-windows", "ground", ...new Set(PIECES.map((p) => p.src)), "butler-wave", "holo", "drone", "quad"]).then(() => {
    if (alive) root.classList.add("np-ready");
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);
  xBtn.addEventListener("click", () => close());
  setTimeout(() => xBtn.focus(), 50);

  function close() {
    if (!alive) return;
    alive = false;
    openNow = null;
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", fit);
    root.removeEventListener("pointerdown", wake);
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerup", onUp);
    root.removeEventListener("pointercancel", onUp);
    root.removeEventListener("wheel", onWheel);
    for (const g of ["gesturestart", "gesturechange", "gestureend"]) root.removeEventListener(g, stopGesture);
    unsub();
    alive0 = false;
    unsubMap();
    music.dispose();
    if (mapWasOn) mapMusic.start();
    root.classList.remove("np-in");
    root.classList.add("np-out");
    setTimeout(() => {
      root.remove();
      document.body.style.overflow = prevOverflow;
    }, 450);
    opts.onClose?.();
  }
  openNow = close;
  return close;
}

const CSS = `
.np-root{touch-action:none;overscroll-behavior:none;position:fixed;inset:0;z-index:2147483647;overflow:hidden;background:radial-gradient(120% 90% at 50% 40%,#16246b 0%,#0b1440 45%,#04071c 100%);opacity:0;transition:opacity .45s ease;font-family:inherit;color:#fff;-webkit-tap-highlight-color:transparent}
.np-root.np-in{opacity:1}
.np-root.np-out{opacity:0}
.np-root img{display:block;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none;pointer-events:none}
.np-planet{position:absolute;width:70vmax;height:70vmax;left:-28vmax;bottom:-46vmax;border-radius:50%;background:radial-gradient(circle at 62% 30%,#7fb2ff 0%,#3463e6 32%,#1a2f9a 60%,#0b1446 80%);box-shadow:0 0 120px 30px rgba(70,120,255,.35);opacity:.55}
.np-stars{position:absolute;left:0;top:0;width:1px;height:1px;border-radius:50%;animation:np-twinkle 4s ease-in-out infinite}
.np-stars-b{animation-delay:-2s;animation-duration:5.5s}
@keyframes np-twinkle{0%,100%{opacity:.5}50%{opacity:1}}
.np-vp{position:absolute;inset:0}
.np-stage{position:absolute;left:50%;top:50%;width:1600px;height:1000px;transform-origin:50% 50%}
.np-stage>*{position:absolute}
.np-ground,.np-house,.np-piece{opacity:0;transition:opacity .8s ease}
.np-ready .np-ground,.np-ready .np-house,.np-ready .np-piece{opacity:1}
.np-vp{transform:scale(1.18);transition:transform 1.6s cubic-bezier(.2,.7,.2,1)}
.np-ready .np-vp{transform:none}
/* Остров и дом стоят на месте (Александр: «дом пусть не летает»), двигаются только спрайты и свет. */
.np-ground{filter:drop-shadow(0 40px 60px rgba(0,0,0,.45))}
.np-floor{left:330px;top:420px;width:960px;height:330px;border-radius:50%;overflow:hidden;mix-blend-mode:screen;opacity:0;transition:opacity 1s .6s}
.np-ready .np-floor{opacity:.85}
.np-spot{position:absolute;width:220px;height:110px;border-radius:50%;filter:blur(18px);background:hsl(calc(var(--i)*72 + 200) 100% 60% / .55);left:calc(var(--i)*170px);top:calc(40px + var(--i)*30px);animation:np-spot 6s ease-in-out infinite;animation-delay:calc(var(--i)*-1.2s)}
@keyframes np-spot{0%{transform:translate(0,0);filter:blur(18px) hue-rotate(0deg)}33%{transform:translate(160px,60px);filter:blur(18px) hue-rotate(120deg)}66%{transform:translate(-90px,110px);filter:blur(18px) hue-rotate(240deg)}100%{transform:translate(0,0);filter:blur(18px) hue-rotate(360deg)}}
.np-beams{left:795px;top:330px;width:0;height:0;mix-blend-mode:screen}
.np-beam{position:absolute;left:-40px;bottom:0;width:80px;height:620px;transform-origin:50% 100%;background:linear-gradient(to top,hsl(calc(var(--i)*90 + 190) 100% 65% / .55),transparent 85%);clip-path:polygon(42% 100%,58% 100%,100% 0,0 0);filter:blur(4px);animation:np-sweep 5s ease-in-out infinite alternate;animation-delay:calc(var(--i)*-1.25s);opacity:0;transition:opacity 1s 1s}
.np-ready .np-beam{opacity:1}
@keyframes np-sweep{from{transform:rotate(calc(-55deg + var(--i)*10deg))}to{transform:rotate(calc(35deg + var(--i)*8deg))}}
.np-house{filter:drop-shadow(0 18px 24px rgba(0,0,0,.4))}
.np-house>img{position:relative}
.np-tint{position:absolute;inset:0;-webkit-mask-image:url(/game-map/neptune/residence.webp);mask-image:url(/game-map/neptune/residence.webp);-webkit-mask-size:100% 100%;mask-size:100% 100%;background:linear-gradient(120deg,#ff3df2,#3df5ff,#7a5cff,#ff3df2);background-size:300% 300%;mix-blend-mode:color;opacity:.38;animation:np-disco 2.4s linear infinite,np-pulse .6s ease-in-out infinite alternate}
.np-tint-b{mix-blend-mode:overlay;opacity:.3;animation-duration:3.6s,.45s;animation-direction:reverse,alternate}
@keyframes np-disco{0%{background-position:0% 50%}100%{background-position:300% 50%}}
@keyframes np-pulse{from{opacity:.18}to{opacity:.45}}
/* Разноцветный свет из окон: маска окон вырезана из картинки дома (residence-windows.webp). */
.np-win{position:absolute;inset:0;-webkit-mask-image:url(/game-map/neptune/residence-windows.webp);mask-image:url(/game-map/neptune/residence-windows.webp);-webkit-mask-size:100% 100%;mask-size:100% 100%;filter:drop-shadow(0 0 4px rgba(255,255,255,.5))}
/* Гирлянда: каждое окно плавно разгорается и гаснет (alternate -- без скачка в конце круга). */
.np-win i{position:absolute;margin:-1%;padding:1%;box-sizing:content-box;opacity:.12;animation:np-light var(--d) ease-in-out var(--l) infinite alternate}
@keyframes np-light{0%,25%{opacity:.12}75%,100%{opacity:.95}}
.np-hover{animation:np-bob 3.2s ease-in-out infinite}
.np-holo{animation:np-bob 4s ease-in-out infinite,np-glow 1.8s ease-in-out infinite alternate}
.np-drone{animation:np-drone 7s ease-in-out infinite}
.np-quad{animation:np-quad 11s ease-in-out infinite}
@keyframes np-bob{0%,100%{translate:0 0}50%{translate:0 -14px}}
@keyframes np-glow{from{filter:drop-shadow(0 0 6px #3df5ff)}to{filter:drop-shadow(0 0 22px #6a8bff) brightness(1.15)}}
@keyframes np-drone{0%,100%{translate:0 0;rotate:-3deg}25%{translate:60px -24px;rotate:4deg}50%{translate:130px 6px;rotate:-2deg}75%{translate:50px 18px;rotate:3deg}}
@keyframes np-quad{0%,100%{translate:0 0;rotate:2deg}30%{translate:-220px 40px;rotate:-6deg}55%{translate:-120px -50px;rotate:4deg}80%{translate:40px -20px;rotate:-3deg}}
.np-dish{animation:np-dish 6s ease-in-out infinite;transform-origin:50% 80%}
@keyframes np-dish{0%,100%{rotate:-4deg}50%{rotate:5deg}}
.np-disco img{animation:np-spin 1.2s steps(6) infinite}
@keyframes np-spin{0%{filter:hue-rotate(0deg) brightness(1.1)}100%{filter:hue-rotate(360deg) brightness(1.1)}}
.np-glint{animation:np-glint 3s ease-in-out infinite}
@keyframes np-glint{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35) drop-shadow(0 0 14px #9fd8ff)}}
.np-shine{animation:np-shine 2.6s ease-in-out infinite}
@keyframes np-shine{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25) drop-shadow(0 0 12px #ffd34d)}}
.np-neon{animation:np-neon 3.5s steps(1) infinite}
@keyframes np-neon{0%,40%,44%,100%{filter:drop-shadow(0 0 10px #ff3df2)}42%{filter:brightness(.55)}}
.np-pylon{animation:np-pylon 1.1s steps(2) infinite}
@keyframes np-pylon{0%{filter:drop-shadow(0 0 6px #b06bff)}100%{filter:drop-shadow(0 0 18px #d79bff) brightness(1.2)}}
.np-turret::after{content:"";position:absolute;left:46%;bottom:88%;width:5px;height:240px;background:linear-gradient(to top,#3df5ff,transparent);filter:blur(1.5px);opacity:.6;animation:np-laser 2.2s ease-in-out infinite}
@keyframes np-laser{0%,100%{opacity:.25}50%{opacity:.85}}
.np-waver img{position:absolute;inset:0}
.np-idle{animation:np-idle 3s ease-in-out infinite}
@keyframes np-idle{0%,100%{translate:0 0}50%{translate:0 -3px}}
.np-waver{transform-origin:50% 100%;animation:np-sway 2.2s ease-in-out infinite}
@keyframes np-sway{0%,100%{rotate:-2.5deg;translate:0 0}50%{rotate:2.5deg;translate:0 -4px}}
.np-steam{position:absolute;left:38%;bottom:70%;width:44px;height:44px;border-radius:50%;background:rgba(170,240,255,.55);filter:blur(8px);animation:np-steam 3.2s ease-out infinite;animation-delay:calc(var(--i)*-.8s)}
@keyframes np-steam{0%{transform:translate(0,0) scale(.5);opacity:0}15%{opacity:.8}100%{transform:translate(18px,-170px) scale(2.2);opacity:0}}
.np-fog{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 62% 58% at 50% 54%,transparent 52%,rgba(150,170,230,.18) 70%,rgba(18,26,70,.92) 100%)}
.np-cloud{position:absolute;width:60vmax;height:22vmax;border-radius:50%;background:rgba(190,205,255,.13);filter:blur(40px);top:calc(var(--i)*21% - 6%);left:-60vmax;animation:np-cloud calc(38s + var(--i)*9s) linear infinite;animation-delay:calc(var(--i)*-11s)}
@keyframes np-cloud{to{transform:translateX(calc(100vw + 60vmax))}}
.np-head{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:max(14px,env(safe-area-inset-top)) 16px 0}
.np-chip{display:flex;align-items:center;gap:10px;padding:8px 14px 8px 10px;border-radius:999px;background:rgba(10,16,48,.55);border:1px solid rgba(160,190,255,.25);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);min-width:0}
.np-chip-ic{font-size:22px;line-height:1}
.np-chip b{display:block;font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.np-chip small{display:block;font-size:12px;color:rgba(200,215,255,.8)}
.np-x{flex:none;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;background:rgba(10,16,48,.55);border:1px solid rgba(160,190,255,.25);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer;transition:transform .15s,background .2s}
.np-x svg{transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.np-x:hover{background:rgba(255,61,242,.35);border-color:rgba(255,141,245,.6);transform:scale(1.08);box-shadow:0 0 18px rgba(255,61,242,.45)}
.np-x:hover svg{transform:rotate(90deg)}
.np-x:active{transform:scale(.94)}
.np-btns{display:flex;gap:10px;flex:none}
.np-m{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:#c8d4ff;background:rgba(10,16,48,.55);border:1px solid rgba(160,190,255,.25);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer;transition:transform .15s,background .2s,color .2s}
.np-m:hover{background:rgba(51,94,247,.6);transform:scale(1.05)}
.np-m.on{color:#ff8df5;border-color:rgba(255,141,245,.5)}
.np-eq{display:flex;align-items:flex-end;gap:3px;height:16px}
.np-eq i{display:block;width:3px;height:100%;border-radius:2px;background:currentColor;opacity:.6;transform-origin:50% 100%;transform:scaleY(.35)}
.np-m.on .np-eq i{opacity:1;animation:np-eq 1.1s ease-in-out infinite alternate}
.np-m.on .np-eq i:nth-child(2){animation-duration:.8s;animation-delay:-.3s}.np-m.on .np-eq i:nth-child(3){animation-duration:1.3s;animation-delay:-.6s}.np-m.on .np-eq i:nth-child(4){animation-duration:.95s;animation-delay:-.15s}
@keyframes np-eq{from{transform:scaleY(.25)}to{transform:scaleY(1)}}
.np-found{position:absolute;left:50%;bottom:max(22px,env(safe-area-inset-bottom));transform:translate(-50%,10px);padding:9px 16px;border-radius:999px;background:rgba(10,16,48,.55);border:1px solid rgba(160,190,255,.25);font-size:14px;white-space:nowrap;opacity:0;transition:opacity .6s 1.4s,transform .6s 1.4s}
.np-ready .np-found{opacity:1;transform:translate(-50%,0)}
.np-loading{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:15px;color:rgba(210,222,255,.85);transition:opacity .4s}
.np-ready .np-loading{opacity:0}
@media (prefers-reduced-motion: reduce){.np-root *,.np-root *::after{animation:none!important;transition:none!important}.np-vp{transform:none!important}}
`;
