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

type Lang = "uk" | "en" | "ru" | "de" | "es" | "fr" | "pl" | "ptBR" | "zh";

const BASE = "/game-map/neptune";

/** Фраза-ключ: регистр, пробелы, апостроф и знаки не важны. */
const SECRET = new Set(["mrkitresidence", "mrkitsresidence", "misterkitresidence", "residenceofmrkit", "mrkithouse", "mrkitshouse"]);
export function isNeptuneSecret(q: string): boolean {
  return SECRET.has(q.toLowerCase().replace(/[^a-z]/g, ""));
}

const STR: Record<Lang, { title: string; sub: string; found: string; close: string; flying: string }> = {
  uk: { title: "Резиденція Mr Kit", sub: "Нептун, всесвіт A1", found: "Ти знайшов секретну локацію 🤫", close: "Повернутися на карту", flying: "Летимо на Нептун…" },
  en: { title: "Mr Kit's Residence", sub: "Neptune, A1 Universe", found: "You found a secret location 🤫", close: "Back to the map", flying: "Flying to Neptune…" },
  ru: { title: "Резиденция Mr Kit", sub: "Нептун, вселенная A1", found: "Ты нашёл секретную локацию 🤫", close: "Вернуться на карту", flying: "Летим на Нептун…" },
  de: { title: "Mr Kits Residenz", sub: "Neptun, A1-Universum", found: "Du hast einen geheimen Ort gefunden 🤫", close: "Zurück zur Karte", flying: "Flug zum Neptun…" },
  es: { title: "Residencia de Mr Kit", sub: "Neptuno, universo A1", found: "Encontraste un lugar secreto 🤫", close: "Volver al mapa", flying: "Volando a Neptuno…" },
  fr: { title: "Résidence de Mr Kit", sub: "Neptune, univers A1", found: "Tu as trouvé un lieu secret 🤫", close: "Retour à la carte", flying: "En route pour Neptune…" },
  pl: { title: "Rezydencja Mr Kita", sub: "Neptun, wszechświat A1", found: "Znalazłeś sekretne miejsce 🤫", close: "Wróć do mapy", flying: "Lecimy na Neptuna…" },
  ptBR: { title: "Residência do Mr Kit", sub: "Netuno, universo A1", found: "Você achou um lugar secreto 🤫", close: "Voltar ao mapa", flying: "Voando para Netuno…" },
  zh: { title: "Mr Kit 的官邸", sub: "海王星，A1 宇宙", found: "你发现了一个秘密地点 🤫", close: "返回地图", flying: "正在飞往海王星…" },
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
  { src: "butler", x: 665, y: 712, w: 86 },
  { src: "fish", x: 1120, y: 705, w: 130, cls: "np-neon" },
  { src: "crystals-s", x: 470, y: 765, w: 110, cls: "np-glint", delay: 1.3 },
  { src: "geyser", x: 1215, y: 770, w: 118 },
];

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
  residence: 895 / 900, ground: 742 / 1100, butler: 290 / 260, "butler-wave": 260 / 260, drone: 224 / 220, quad: 239 / 260, turret: 175 / 160,
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
export function openNeptune(opts: { lang?: string; onClose?: () => void } = {}): () => void {
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
  house.innerHTML = `<img src="${BASE}/residence.webp" alt="${t.title}" draggable="false"><span class="np-tint"></span><span class="np-tint np-tint-b"></span>`;
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
  place(waver, 935, 712, 86, ASPECT.butler);
  waver.innerHTML = `<img src="${BASE}/butler.webp" alt="" draggable="false"><img class="np-wave" src="${BASE}/butler-wave.webp" alt="" draggable="false">`;
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
    `<div class="np-chip"><span class="np-chip-ic">🪐</span><span><b></b><small></small></span></div><button type="button" class="np-x" aria-label=""><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`,
  );
  (head.querySelector("b") as HTMLElement).textContent = t.title;
  (head.querySelector("small") as HTMLElement).textContent = t.sub;
  const xBtn = head.querySelector(".np-x") as HTMLButtonElement;
  xBtn.setAttribute("aria-label", t.close);
  xBtn.title = t.close;
  root.appendChild(head);
  const found = el("div", "np-found");
  found.textContent = t.found;
  root.appendChild(found);
  const loading = el("div", "np-loading");
  loading.textContent = t.flying;
  root.appendChild(loading);

  const fit = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    // На телефоне (вертикально) чуть крупнее: края острова можно обрезать, дом важнее.
    const s = Math.min(vw / (vh > vw * 1.3 ? 1120 : 1250), vh / 860);
    stage.style.transform = `translate(-50%,-50%) scale(${s})`;
  };
  fit();
  window.addEventListener("resize", fit);

  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.body.appendChild(root);
  requestAnimationFrame(() => root.classList.add("np-in"));

  // Сначала грузим картинки (за туманом), потом «ныряем».
  let alive = true;
  preload(["residence", "ground", ...new Set(PIECES.map((p) => p.src)), "butler-wave", "holo", "drone", "quad"]).then(() => {
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
.np-root{position:fixed;inset:0;z-index:2147483000;overflow:hidden;background:radial-gradient(120% 90% at 50% 40%,#16246b 0%,#0b1440 45%,#04071c 100%);opacity:0;transition:opacity .45s ease;font-family:inherit;color:#fff;-webkit-tap-highlight-color:transparent}
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
.np-ground{filter:drop-shadow(0 40px 60px rgba(0,0,0,.45));animation:np-float 9s ease-in-out infinite}
@keyframes np-float{0%,100%{translate:0 0}50%{translate:0 -8px}}
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
.np-wave{animation:np-wave 1.1s steps(1) infinite}
@keyframes np-wave{0%{opacity:0}50%{opacity:1}}
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
.np-x:hover{background:rgba(51,94,247,.6);transform:scale(1.05)}
.np-found{position:absolute;left:50%;bottom:max(22px,env(safe-area-inset-bottom));transform:translate(-50%,10px);padding:9px 16px;border-radius:999px;background:rgba(10,16,48,.55);border:1px solid rgba(160,190,255,.25);font-size:14px;white-space:nowrap;opacity:0;transition:opacity .6s 1.4s,transform .6s 1.4s}
.np-ready .np-found{opacity:1;transform:translate(-50%,0)}
.np-loading{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:15px;color:rgba(210,222,255,.85);transition:opacity .4s}
.np-ready .np-loading{opacity:0}
@media (prefers-reduced-motion: reduce){.np-root *,.np-root *::after{animation:none!important;transition:none!important}.np-vp{transform:none!important}}
`;
