// @ts-nocheck
// app/game-map/engine.ts -- игровая карта A1, версия 2 (02.10.2026).
//
// Александр: новые упрощённые ассеты (light/dark, 89 штук), основа карты
// рисуется кодом («пока нарисуем кодом, а потом, если что, подменим фон»),
// ~50 живых компаний разного размера, карточка компании прямо возле
// здания, «оживление» (облака с тенями, туман, свет, птицы, корабли).
//
// Основа -- векторная: границы стран Natural Earth 10m в варианте точки
// зрения Украины (Крым -- Украина), упрощены и спроецированы заранее
// (public/game-map/v2/geo.json). Поэтому при любом приближении резко.
// Готовую картинку-фон можно подставить позже через opts.baseImage.
//
// Без фреймворка: mountGameMap(root, opts) возвращает функцию очистки.

export type MapCompany = {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  n: number; // число живых вакансий
  city: string;
  lng: number;
  lat: number;
  jobs: { title: string; slug: string }[];
  userId?: string | null;
  bio?: string | null;
  website?: string | null;
  employees?: number | null;
  est?: number | null;
  occupation?: string | null;
};

const LEVELS = [1, 2, 4, 6, 10, 15, 25, 40]; // от скольких вакансий уровень 1..8
const SIZE = [22, 25, 29, 33, 38, 44, 51, 60]; // ширина здания в единицах карты
const PINS = ['pin-sky-blue', 'pin-mint', 'pin-orange', 'pin-pink', 'pin-teal', 'pin-yellow'];

const PAL = {
  light: {
    sea: '#2f7f9e', sea2: '#1f6386', shallow: 'rgba(170,225,225,.55)', wave: 'rgba(255,255,255,.35)',
    land: '#93aa6c', land2: '#88a062', ua: '#d3dc76', ua2: '#bccb5c',
    border: '#e0b252', borderDark: 'rgba(90,60,20,.55)', uaBorder: '#f3c95a',
    river: '#4ea3c8', lake: '#3d93b8', label: 'rgba(60,45,25,.55)', fog: '246,239,222',
    light: 'rgba(255,214,140,', vignette: 'rgba(40,60,40,', fogA: 0.28,
  },
  dark: {
    sea: '#0f2a43', sea2: '#0a1d31', shallow: 'rgba(80,140,170,.35)', wave: 'rgba(170,210,255,.18)',
    land: '#2f4a3a', land2: '#27402f', ua: '#4d6a3c', ua2: '#425c33',
    border: '#b98a3d', borderDark: 'rgba(0,0,0,.55)', uaBorder: '#e2b456',
    river: '#2f6f95', lake: '#22597c', label: 'rgba(220,210,180,.5)', fog: '20,30,48',
    light: 'rgba(150,170,255,', vignette: 'rgba(5,10,20,', fogA: 0.5,
  },
};

const CITY_UA = { Kyiv: 'Київ', Kiev: 'Київ', Lviv: 'Львів', Odesa: 'Одеса', Odessa: 'Одеса', Kharkiv: 'Харків', Dnipro: 'Дніпро', Zaporizhzhia: 'Запоріжжя', Vinnytsia: 'Вінниця', 'Ivano-Frankivsk': 'Івано-Франківськ', Chernihiv: 'Чернігів', Poltava: 'Полтава', Uzhhorod: 'Ужгород', Chernivtsi: 'Чернівці', Zhytomyr: 'Житомир', Cherkasy: 'Черкаси', Mykolaiv: 'Миколаїв', Kherson: 'Херсон', Sumy: 'Суми', Rivne: 'Рівне', Lutsk: 'Луцьк', Ternopil: 'Тернопіль', Khmelnytskyi: 'Хмельницький', Kropyvnytskyi: 'Кропивницький', Bila_Tserkva: 'Біла Церква', Irpin: 'Ірпінь', Brovary: 'Бровари', Mukachevo: 'Мукачево' };
function cityUa(c) { if (!c) return ''; const k = String(c).trim(); return CITY_UA[k] || CITY_UA[k.replace(/\s+/g, '_')] || k; }
function empLabel(n) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return 'співробітник'; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'співробітники'; return 'співробітників'; }
const FLAG_COLORS = ['#c0392b', '#2e86c1', '#28a06a', '#d68910', '#8e44ad', '#16a085', '#d35400', '#2c3e9e'];

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const EMP_LEVELS = [1, 5, 15, 40, 100, 250, 600, 1500];
function levelBy(arr, n) { let l = 1; for (let i = 0; i < arr.length; i++) if (n >= arr[i]) l = i + 1; return l; }
// 02.10.2026 (Александр): размер дома -- и от числа сотрудников, и от
// числа вакансий. Сотрудники весят больше (это размер компании), вакансии
// добавляют; если сотрудников компания не указала -- только вакансии.
function sizeLevel(c) {
  const lv = levelBy(LEVELS, c.n || 0);
  if (!c.employees) return lv;
  const le = levelBy(EMP_LEVELS, c.employees);
  return Math.max(1, Math.min(8, Math.round(le * 0.65 + lv * 0.35)));
}
function level(n) { let l = 1; for (let i = 0; i < LEVELS.length; i++) if (n >= LEVELS[i]) l = i + 1; return l; }
function plural(n) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return 'вакансія'; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'вакансії'; return 'вакансій'; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export function mountGameMap(root, opts) {
  const base = opts.base || '/game-map/v2';
  const companiesIn = opts.companies || [];
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let theme = opts.theme === 'dark' ? 'dark' : 'light';
  let destroyed = false;
  const cleanup = [];

  root.innerHTML = `
    <canvas class="gm-cv"></canvas>
    <div class="gm-top">
      <div class="gm-left">
        <div class="gm-title">Карта компаній <span class="gm-count"></span></div>
        <div class="gm-search"><input class="gm-q" type="search" placeholder="Знайти компанію…" autocomplete="off" aria-label="Знайти компанію"><div class="gm-sug" role="listbox"></div></div>
      </div>
      <div class="gm-right">
        <button class="gm-btn gm-theme" type="button"></button>
        <button class="gm-btn gm-fs" type="button" aria-label="На весь екран" title="На весь екран">⛶</button>
      </div>
    </div>
    <div class="gm-zoom"><button class="gm-btn" data-z="in" type="button" aria-label="Приблизити">+</button><button class="gm-btn" data-z="out" type="button" aria-label="Віддалити">−</button></div>
    <div class="gm-guide"><img alt="" class="gm-mascot"><div class="gm-say">Наведи на будиночок — покажу, хто там працює</div></div>
    <div class="gm-pop" role="dialog" aria-live="polite"></div>
    <div class="gm-load">Малюємо карту…</div>`;
  const cv = root.querySelector('.gm-cv');
  const ctx = cv.getContext('2d');
  const pop = root.querySelector('.gm-pop');
  const themeBtn = root.querySelector('.gm-theme');
  const mascot = root.querySelector('.gm-mascot');
  const qIn = root.querySelector('.gm-q');
  const sug = root.querySelector('.gm-sug');
  const fsBtn = root.querySelector('.gm-fs');
  root.querySelector('.gm-count').textContent = companiesIn.length ? `· ${companiesIn.length}` : '';

  let geo = null, man = null;
  const imgs = { light: {}, dark: {} };
  const shadowCache = {};
  let W = 0, H = 0, dpr = 1;
  const view = { x: 0, y: 0, s: 1 };
  let minS = 0.3, maxS = 4;
  let cos = [];
  let hover = null, pinned = null;
  let baseCache = null; // { key, canvas }
  let flagMeta = {};
  const flagCache = {};
  const logoImgs = {};
  const allies = new Set();
  let allyKnown = false;
  let t0 = performance.now();

  // ---------- загрузка ----------
  function loadImg(src) { return new Promise((res) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
  async function loadTheme(th) {
    const keys = Object.keys(man);
    await Promise.all(keys.map(async (k) => { if (!imgs[th][k]) imgs[th][k] = await loadImg(`${base}/${th}/${k}.webp`); }));
  }
  const PREF = ['', 'nature/', 'sea-sky/', 'markers/', 'travelers/', 'mascot/'];
  function sprite(k) {
    for (const p of PREF) { const kk = p + k; const im = imgs[theme][kk] || imgs.light[kk] || imgs.dark[kk]; if (im) return im; }
    return null;
  }
  function shadowOf(k) {
    const key = theme + k; if (shadowCache[key]) return shadowCache[key];
    const im = sprite(k); if (!im) return null;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#0d1a10'; x.fillRect(0, 0, c.width, c.height);
    return (shadowCache[key] = c);
  }

  // ---------- флаги компаний: цвет компании + логотип, развеваются ----------
  function logoOf(c) {
    if (!c.avatar) return null;
    if (logoImgs[c.id] !== undefined) return logoImgs[c.id];
    logoImgs[c.id] = null;
    const i = new Image(); i.decoding = 'async';
    i.onload = () => { logoImgs[c.id] = i; c.color = logoBgColor(i) || dominantColor(i) || c.color; c.logoBg = !!logoBgColor(i); for (const k in flagCache) if (k.startsWith(c.id + '|')) delete flagCache[k]; };
    i.src = c.avatar;
    return null;
  }
  // Колір фону логотипа: найчастіший колір по краях картинки.
  const bgMemo = new WeakMap();
  function logoBgColor(img) {
    if (bgMemo.has(img)) return bgMemo.get(img);
    let res = null;
    try {
      const n = 32, cv2 = document.createElement('canvas'); cv2.width = cv2.height = n; const x = cv2.getContext('2d');
      x.drawImage(img, 0, 0, n, n); const d = x.getImageData(0, 0, n, n).data;
      const bins = {}; let total = 0;
      for (let i = 1; i < n - 1; i++) for (const [px, py] of [[i, 1], [i, n - 2], [1, i], [n - 2, i]]) {
        const o = (py * n + px) * 4; total++; if (d[o + 3] < 200) continue;
        const key = (d[o] >> 4) + ',' + (d[o + 1] >> 4) + ',' + (d[o + 2] >> 4);
        const b = bins[key] || (bins[key] = [0, 0, 0, 0]); b[0] += d[o]; b[1] += d[o + 1]; b[2] += d[o + 2]; b[3]++;
      }
      let best = null; for (const k in bins) if (!best || bins[k][3] > best[3]) best = bins[k];
      if (best && best[3] >= total * 0.45) res = `rgb(${Math.round(best[0] / best[3])},${Math.round(best[1] / best[3])},${Math.round(best[2] / best[3])})`;
    } catch { res = null; }
    bgMemo.set(img, res); return res;
  }
  function dominantColor(img) {
    try {
      const n = 24, cv2 = document.createElement('canvas'); cv2.width = cv2.height = n; const x = cv2.getContext('2d');
      x.drawImage(img, 0, 0, n, n); const d = x.getImageData(0, 0, n, n).data;
      let best = null, bs = 0; const bins = {};
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3]; if (a < 128) continue;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const sat = mx - mn; if (sat < 50 || mx < 60) continue;
        const key = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5); bins[key] = (bins[key] || 0) + sat;
        if (bins[key] > bs) { bs = bins[key]; best = [r, g, b]; }
      }
      return best ? `rgb(${best[0]},${best[1]},${best[2]})` : null;
    } catch { return null; }
  }
  function flagCanvas(c, entry) {
    const key = `${c.id}|${theme}|${entry[0]}|${logoImgs[c.id] ? 1 : 0}`;
    if (flagCache[key]) return flagCache[key];
    const src = sprite('flags/' + entry[0]); if (!src) return null;
    const w = src.width, h = src.height, cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h;
    const x = cv2.getContext('2d');
    // ткань флага в цвет компании, тени и обводка остаются (multiply)
    // ткань — рівно в колір фону логотипа, складки й обводка зі спрайта (multiply по сірому)
    x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = c.color; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'multiply'; x.filter = 'grayscale(1) brightness(1.12)'; x.drawImage(src, 0, 0); x.filter = 'none';
    x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-over';
    const logo = logoImgs[c.id];
    if (logo && h > 20) {
      const r = Math.min(w, h) * 0.3, cx = w * 0.52, cy = h * 0.46;
      x.save(); x.beginPath(); if (!c.logoBg) { x.arc(cx, cy, r + 2.5, 0, 7); x.fillStyle = 'rgba(255,255,255,.95)'; x.fill(); }
      x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip(); x.drawImage(logo, cx - r, cy - r, r * 2, r * 2); x.restore();
    }
    return (flagCache[key] = cv2);
  }
  function drawFlags(c, k, bx, by, bw, t) {
    const fk = k.replace('/level-0', '/'); const meta = flagMeta[`${theme}/${fk}`] || flagMeta[`light/${fk}`]; if (!meta) return;
    const sc = bw / meta.w;
    for (const e of meta.f) {
      const fc = flagCanvas(c, e); if (!fc) continue;
      const fx = bx + e[1] * sc, fy = by + e[2] * sc, fw = e[3] * sc, fh = e[4] * sc;
      const slices = 10, amp = reduce ? 0 : fh * 0.09;
      for (let i = 0; i < slices; i++) {
        const u0 = i / slices, sw = fc.width / slices;
        const dy = Math.sin(t * 3.2 - u0 * 5 + c.h % 7) * amp * u0;
        ctx.drawImage(fc, i * sw, 0, sw + 0.6, fc.height, fx + u0 * fw, fy + dy, fw / slices + 0.3, fh);
      }
    }
  }

  // ---------- проекция и компании ----------
  function proj(lng, lat) { return [(lng - geo.lon0) * geo.k * geo.c, (geo.lat1 - lat) * geo.k]; }
  function layout() {
    const list = companiesIn.map((c) => {
      const l = sizeLevel(c); const [x, y] = proj(c.lng, c.lat); const h = hash(c.id || c.name);
      return { ...c, l, x, y, hx: x, hy: y, w: SIZE[l - 1], forest: h % 10 < 3, pin: PINS[h % PINS.length], h, color: FLAG_COLORS[h % FLAG_COLORS.length], cityUa: cityUa(c.city) };
    }).sort((a, b) => b.n - a.n);
    // Разводим соседей по спирали: в Киеве десятки компаний в одной точке.
    const placed = [];
    for (const c of list) {
      const r = c.w * 0.5;
      let ang = (c.h % 360) * Math.PI / 180, step = 0;
      while (step < 400) {
        const rr = step === 0 ? 0 : 6 + Math.sqrt(step) * 7;
        const x = c.hx + Math.cos(ang) * rr, y = c.hy + Math.sin(ang) * rr * 0.75;
        if (!placed.some((p) => (p.x - x) ** 2 + ((p.y - y) * 1.25) ** 2 < (p.w * 0.5 + r) ** 2 * 0.95)) { c.x = x; c.y = y; break; }
        ang += 2.399963; step++;
      }
      placed.push(c);
    }
    return list;
  }

  // ---------- текстура земли ----------
  const patterns = {};
  function landPattern(th) {
    if (patterns[th]) return patterns[th];
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    let seed = th === 'dark' ? 11 : 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const px = rnd() * 256, py = rnd() * 256, r = 10 + rnd() * 36;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      const light = rnd() > 0.5;
      g.addColorStop(0, light ? (th === 'dark' ? 'rgba(140,170,120,.10)' : 'rgba(255,245,190,.16)') : (th === 'dark' ? 'rgba(0,0,0,.14)' : 'rgba(40,80,30,.12)'));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { x.save(); x.translate(ox, oy); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.restore(); }
    }
    for (let i = 0; i < 260; i++) { x.fillStyle = th === 'dark' ? 'rgba(200,220,160,.05)' : 'rgba(60,90,30,.07)'; x.fillRect(rnd() * 256, rnd() * 256, 1.5, 1.5); }
    return (patterns[th] = ctx.createPattern(c, 'repeat'));
  }

  function pathRing(x, r) { x.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) x.lineTo(r[i], r[i + 1]); x.closePath(); }

  // ---------- основа карты (кэш на текущий вид) ----------
  function renderBase() {
    const key = `${theme}|${Math.round(view.x)}|${Math.round(view.y)}|${view.s.toFixed(4)}|${W}|${H}|${dpr}`;
    if (baseCache && baseCache.key === key) return baseCache.canvas;
    const c = baseCache?.canvas || document.createElement('canvas');
    c.width = Math.max(1, W * dpr); c.height = Math.max(1, H * dpr);
    const x = c.getContext('2d'); const P = PAL[theme];
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sg = x.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, P.sea); sg.addColorStop(1, P.sea2);
    x.fillStyle = sg; x.fillRect(0, 0, W, H);
    x.save(); x.translate(view.x, view.y); x.scale(view.s, view.s);
    const px = 1 / view.s;
    // мелководье вдоль берега
    x.lineJoin = 'round'; x.strokeStyle = P.shallow; x.lineWidth = 16 * px + 6;
    x.beginPath(); for (const co of geo.countries) for (const r of co.r) pathRing(x, r); x.stroke();
    x.lineWidth = 7 * px + 3; x.strokeStyle = P.shallow; x.stroke();
    // волны
    x.strokeStyle = P.wave; x.lineWidth = 1.3 * px; x.lineCap = 'round';
    x.beginPath();
    for (const [wx, wy] of geo.waves) { const s = 9; x.moveTo(wx - s, wy); x.quadraticCurveTo(wx - s / 2, wy - 3.5, wx, wy); x.quadraticCurveTo(wx + s / 2, wy - 3.5, wx + s, wy); }
    x.stroke();
    // суша
    const pat = landPattern(theme);
    for (const co of geo.countries) {
      x.beginPath(); for (const r of co.r) pathRing(x, r);
      if (co.ua) { const g = x.createLinearGradient(0, 300, 0, 1000); g.addColorStop(0, P.ua); g.addColorStop(1, P.ua2); x.fillStyle = g; }
      else { x.fillStyle = (hash(co.a3) % 2) ? P.land : P.land2; }
      x.fill();
      if (pat) { x.save(); x.globalAlpha = 1; x.fillStyle = pat; x.fill(); x.restore(); }
    }
    // озёра и реки
    x.fillStyle = P.lake; x.beginPath(); for (const r of geo.lakes) pathRing(x, r); x.fill();
    x.strokeStyle = P.river; x.lineCap = 'round'; x.lineJoin = 'round';
    for (const rv of geo.rivers) { x.lineWidth = Math.max(0.9, (7 - Math.min(6, rv.s)) * 0.75) * px + (rv.s <= 3 ? 1.6 : 0.7); x.beginPath(); const p = rv.p; x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.stroke(); }
    // границы: тёмная подложка + золотой пунктир
    for (const co of geo.countries) {
      x.beginPath(); for (const r of co.r) pathRing(x, r);
      x.setLineDash([]); x.strokeStyle = P.borderDark; x.lineWidth = (co.ua ? 4.2 : 2.6) * px; x.stroke();
      x.setLineDash(co.ua ? [] : [5 * px, 3.5 * px]); x.strokeStyle = co.ua ? P.uaBorder : P.border; x.lineWidth = (co.ua ? 2.4 : 1.3) * px; x.stroke();
    }
    x.setLineDash([]);
    // свечение Украины
    const ua = geo.countries.find((c) => c.ua);
    if (ua) { x.save(); x.beginPath(); for (const r of ua.r) pathRing(x, r); x.shadowColor = theme === 'dark' ? 'rgba(240,200,110,.55)' : 'rgba(255,220,120,.9)'; x.shadowBlur = 14; x.strokeStyle = 'rgba(255,225,140,.35)'; x.lineWidth = 3 * px; x.stroke(); x.restore(); }
    // подписи стран (мелко, когда далеко)
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const co of geo.countries) {
      if (co.ua) continue;
      const fs = Math.max(9, Math.min(15, 13 * Math.sqrt(view.s))) * px;
      x.font = `600 ${fs}px Georgia, 'Times New Roman', serif`; x.fillStyle = P.label; x.fillText(co.name, co.c[0], co.c[1]);
    }
    x.restore();
    baseCache = { key, canvas: c };
    return c;
  }

  // ---------- оживление ----------
  const clouds = Array.from({ length: 7 }, (_, i) => ({
    k: ['cloud-white-long', 'cloud-white-round', 'cloud-pink', 'cloud-white-blush', 'cloud-white-pink', 'cloud-pink-long', 'cloud-white-round'][i],
    x: (i * 0.153 + 0.05) % 1, y: 0.08 + ((i * 0.37) % 0.85), w: 150 + (i % 3) * 50, v: 0.006 + (i % 4) * 0.0025,
  }));
  const birds = { t: -999, path: null };
  const walkers = [];

  function drawSprite(k, x, y, w, alpha = 1, anchorY = 1) {
    const im = sprite(k); if (!im) return null;
    const h = w * im.height / im.width;
    if (alpha !== 1) ctx.globalAlpha = alpha;
    ctx.drawImage(im, x - w / 2, y - h * anchorY, w, h);
    if (alpha !== 1) ctx.globalAlpha = 1;
    return h;
  }

  function onScreen(x, y, m = 120) { const sx = x * view.s + view.x, sy = y * view.s + view.y; return sx > -m && sy > -m && sx < W + m && sy < H + m; }

  function frame(now) {
    if (destroyed) return;
    const t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(renderBase(), 0, 0, W, H);
    ctx.save(); ctx.translate(view.x, view.y); ctx.scale(view.s, view.s);
    const zoom = view.s / minS;
    // декор (по y, чтобы ближние перекрывали дальние)
    const items = [];
    for (const d of geo.decor) {
      const [k, x, y, sc] = d; if (!onScreen(x, y)) continue;
      const big = k.startsWith('mountain'); const sea = /ship|whale|fish|lighthouse/.test(k);
      const w = (big ? 80 : sea ? 40 : k.startsWith('tree') ? 22 : 18) * sc;
      items.push({ y, draw: () => {
        let yy = y, xx = x, a = 1;
        if (!reduce && sea && !k.startsWith('lighthouse')) { yy += Math.sin(t * 1.3 + x) * 1.6; xx += Math.sin(t * 0.07 + y) * 18; }
        if (!reduce && k.startsWith('whale')) a = Math.max(0, Math.sin(t * 0.25 + x * 0.01)) ** 0.6;
        if (a > 0.02) drawSprite(k, xx, yy, w, a);
      } });
    }
    // компании
    const far = zoom < 1.6;
    for (const c of cos) {
      if (!onScreen(c.x, c.y, 160)) { c._r = null; continue; }
      items.push({ y: c.y, draw: () => drawCompany(c, t, far) });
    }
    // путешественники
    for (const wk of walkers) {
      const p = (t * wk.v + wk.ph) % 2; const k = p < 1 ? p : 2 - p;
      const x = wk.a[0] + (wk.b[0] - wk.a[0]) * k, y = wk.a[1] + (wk.b[1] - wk.a[1]) * k + (reduce ? 0 : -Math.abs(Math.sin(t * 6 + wk.ph)) * 1.5);
      if (onScreen(x, y)) items.push({ y, draw: () => { ctx.save(); if ((p < 1) !== (wk.b[0] > wk.a[0])) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); } drawSprite(wk.k, x, y, 16); ctx.restore(); } });
    }
    items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
    drawCityLabels();
    // птицы
    if (!reduce) {
      if (t - birds.t > 26) { birds.t = t; const y0 = 200 + Math.random() * (geo.h - 400); birds.path = { y0, dir: Math.random() > 0.5 ? 1 : -1 }; }
      const bt = t - birds.t; if (birds.path && bt < 22) {
        const { y0, dir } = birds.path; const bx = dir > 0 ? -60 + bt * 110 : geo.w + 60 - bt * 110;
        for (let i = 0; i < 3; i++) { const fx = bx - dir * i * 26, fy = y0 + i * 14 - bt * 6; ctx.save(); ctx.translate(fx, fy); ctx.scale(dir, 0.75 + 0.25 * Math.sin(t * 9 + i)); drawSprite(i === 1 ? 'bird-seabird' : 'bird-gull', 0, 0, 22); ctx.restore(); }
      }
    }
    // облака с тенями (выше всего)
    for (const cl of clouds) {
      const x = (((cl.x + (reduce ? 0 : t * cl.v)) % 1.2) - 0.1) * geo.w, y = cl.y * geo.h;
      const sh = shadowOf(cl.k), im = sprite(cl.k); if (!im) continue; const h = cl.w * im.height / im.width;
      if (sh) { ctx.globalAlpha = theme === 'dark' ? 0.14 : 0.09; ctx.drawImage(sh, x - cl.w / 2 + 40, y - h / 2 + 55, cl.w, h); }
      ctx.globalAlpha = Math.min(0.8, 0.45 + (2.2 - Math.min(2.2, zoom)) * 0.18) * (theme === 'dark' ? 0.5 : 1);
      ctx.drawImage(im, x - cl.w / 2, y - h / 2, cl.w, h); ctx.globalAlpha = 1;
    }
    ctx.restore();
    // свет и туман (поверх экрана)
    const P = PAL[theme];
    const lx = W * (0.25 + 0.5 * (reduce ? 0.3 : (Math.sin(t * 0.03) * 0.5 + 0.5))), ly = -H * 0.2;
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 1.1);
    lg.addColorStop(0, P.light + (theme === 'dark' ? '.10)' : '.20)')); lg.addColorStop(1, P.light + '0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, `rgba(${P.fog},0)`); vg.addColorStop(1, `rgba(${P.fog},${P.fogA})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (!reduce) for (let i = 0; i < 3; i++) {
      const fx = W * (0.1 + 0.8 * ((i * 0.37 + t * 0.004 * (i + 1)) % 1)), fy = H * (i === 1 ? 0.92 : 0.08 + i * 0.4);
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 260); fg.addColorStop(0, `rgba(${P.fog},${theme === 'dark' ? .2 : .14})`); fg.addColorStop(1, `rgba(${P.fog},0)`);
      ctx.fillStyle = fg; ctx.fillRect(fx - 260, fy - 260, 520, 520);
    }
    placePopup();
  }

  let cityGroups = [];
  function buildCityGroups() {
    const g = {};
    for (const c of cos) { const k = c.cityUa || '—'; (g[k] ||= []).push(c); }
    cityGroups = Object.entries(g).map(([name, list]) => {
      const xs = list.map((c) => c.x), ys = list.map((c) => c.y);
      return { name, n: list.length, x: (Math.min(...xs) + Math.max(...xs)) / 2, y: Math.max(...ys) };
    });
  }
  function drawCityLabels() {
    const P = theme === 'dark';
    for (const g of cityGroups) {
      if (!onScreen(g.x, g.y, 60)) continue;
      const fs = Math.max(11, Math.min(17, 12 + (g.n > 5 ? 3 : 0))) / view.s;
      const y = g.y + (view.s > minS * 3.2 ? 26 : 12) / view.s;
      ctx.font = `700 italic ${fs}px Georgia, 'Times New Roman', serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const label = g.n > 1 ? `${g.name} · ${g.n}` : g.name;
      const tw = ctx.measureText(label).width, pad = 6 / view.s;
      ctx.fillStyle = P ? 'rgba(15,22,36,.72)' : 'rgba(251,245,230,.82)';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(g.x - tw / 2 - pad, y - pad * 0.5, tw + pad * 2, fs + pad, fs) : ctx.rect(g.x - tw / 2 - pad, y - pad * 0.5, tw + pad * 2, fs + pad); ctx.fill();
      ctx.fillStyle = P ? '#f0e2bd' : '#5a3d16'; ctx.fillText(label, g.x, y);
    }
  }
  function drawCompany(c, t, far) {
    const act = c === hover || c === pinned;
    if (far && c.l <= 3 && !act) {
      // мелкие издалека -- булавки
      const w = 15; const h = drawSprite(c.pin, c.x, c.y, w) || w;
      c._r = { x: c.x, y: c.y - h / 2, w, h };
      return;
    }
    const k = (c.forest ? 'forest/' : 'buildings/') + `level-0${c.l}`;
    const w = c.w * (act ? 1.08 : 1);
    // тень-эллипс под зданием
    ctx.fillStyle = theme === 'dark' ? 'rgba(0,0,0,.35)' : 'rgba(40,50,20,.22)';
    ctx.beginPath(); ctx.ellipse(c.x, c.y - 1, w * 0.42, w * 0.11, 0, 0, 7); ctx.fill();
    if (act && !reduce) {
      const p = (t * 1.2) % 1;
      ctx.strokeStyle = `rgba(255,214,120,${0.85 * (1 - p)})`; ctx.lineWidth = 2.2 / view.s;
      ctx.beginPath(); ctx.ellipse(c.x, c.y - 1, w * (0.45 + p * 0.35), w * (0.13 + p * 0.1), 0, 0, 7); ctx.stroke();
    }
    logoOf(c);
    const im = sprite(k); const h = im ? w * im.height / im.width : w;
    const bx = c.x - w / 2, by = c.y + w * 0.04 - h;
    if (im) ctx.drawImage(im, bx, by, w, h);
    drawFlags(c, k, bx, by, w, t);
    if (c.userId && allies.has(c.userId)) { const a = sprite('markers/ally'); if (a) { const aw = Math.max(9, w * 0.32); ctx.drawImage(a, c.x + w * 0.22, by + h * 0.18, aw, aw * a.height / a.width); } }
    c._r = { x: c.x, y: c.y - h / 2, w, h };
    if (act || (view.s > minS * 3.2 && c.l >= 4) || view.s > minS * 5) {
      const fs = 11 / view.s; ctx.font = `700 ${fs}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = 3 / view.s; ctx.strokeStyle = theme === 'dark' ? 'rgba(0,0,0,.75)' : 'rgba(255,250,235,.95)'; ctx.strokeText(c.name, c.x, c.y + 4 / view.s);
      ctx.fillStyle = theme === 'dark' ? '#f4ead2' : '#3a2a14'; ctx.fillText(c.name, c.x, c.y + 4 / view.s);
    }
  }

  // ---------- карточка компании возле здания ----------
  let popFor = null;
  function popupHtml(c) {
    const jobs = (c.jobs || []).slice(0, 3).map((j) => `<a href="/jobs/${esc(j.slug)}">${esc(j.title)}</a>`).join('');
    const ava = c.avatar ? `<img src="${esc(c.avatar)}" alt="">` : `<span>${esc((c.name || '?').slice(0, 1))}</span>`;
    const prof = c.username ? `<a class="gm-p" href="/u/${esc(c.username)}">Профіль компанії</a>` : '';
    const sub = [c.cityUa, c.est ? `з ${c.est} року` : ''].filter(Boolean).join(' · ');
    const chips = [
      `<span class="gm-chip g">💼 ${c.n} ${plural(c.n)}</span>`,
      c.employees ? `<span class="gm-chip">👥 ${c.employees} ${empLabel(c.employees)}</span>` : '',
      c.occupation ? `<span class="gm-chip">${esc(c.occupation)}</span>` : '',
    ].join('');
    let site = '';
    if (c.website) { try { const u = new URL(c.website.startsWith('http') ? c.website : 'https://' + c.website); site = `<a class="gm-site" href="${esc(u.href)}" target="_blank" rel="noopener nofollow">🔗 ${esc(u.hostname.replace(/^www\./, ''))}</a>`; } catch { site = ''; } }
    const bio = c.bio ? `<p class="gm-bio">${esc(c.bio)}</p>` : '';
    const isAlly = c.userId && allies.has(c.userId);
    const ally = c.userId ? `<button class="gm-ally${isAlly ? ' on' : ''}" type="button" title="${isAlly ? 'Ваш союзник (у контактах)' : 'Додати в союзники — компанія з’явиться у ваших контактах'}" aria-label="Додати в союзники">${isAlly ? '✓' : '+'}</button>` : '';
    return `<div class="gm-ph" style="--fc:${esc(c.color)}"><div class="gm-ava">${ava}</div><div class="gm-pt"><b>${esc(c.name)}</b><small>${esc(sub)}</small></div><button class="gm-x" type="button" aria-label="Закрити">×</button></div>
      <div class="gm-chips">${chips}</div>
      ${bio}${site}
      ${jobs ? `<div class="gm-jobs">${jobs}</div>` : ''}
      <div class="gm-acts">${prof}${ally}</div>`;
  }
  async function addAlly(c) {
    if (!c.userId || allies.has(c.userId)) return;
    try {
      const r = await fetch('/api/contacts/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: c.userId }) });
      if (r.status === 401) { location.href = '/sign-in?next=' + encodeURIComponent(location.pathname); return; }
      if (!r.ok) throw new Error(String(r.status));
      allies.add(c.userId); popFor = null; showPopup(c);
    } catch { const b = pop.querySelector('.gm-ally'); if (b) { b.textContent = '!'; b.title = 'Не вдалося додати, спробуйте ще раз'; } }
  }
  async function loadAllies() {
    try {
      const r = await fetch('/api/contacts/list'); if (!r.ok) return;
      const j = await r.json(); const list = j.contacts || j.data || j.items || [];
      for (const it of list) { const id = it.userId || it.user?.id || it.user?._id || it.user || it.id; if (typeof id === 'string') allies.add(id); }
      allyKnown = true;
    } catch { /* гость: союзников нет */ }
  }
  function showPopup(c) {
    if (popFor !== c) { popFor = c; if (c) { pop.innerHTML = popupHtml(c); } }
    pop.classList.toggle('on', !!c);
    if (c) mascot.parentElement.classList.add('off');
  }
  function placePopup() {
    const c = popFor; if (!c || !c._r) return;
    const sx = c._r.x * view.s + view.x, top = (c._r.y - c._r.h / 2) * view.s + view.y, bot = (c._r.y + c._r.h / 2) * view.s + view.y;
    const pw = pop.offsetWidth || 280, ph = pop.offsetHeight || 160;
    let left = Math.max(8, Math.min(W - pw - 8, sx - pw / 2));
    let y = top - ph - 10, below = false;
    if (y < 8) { y = bot + 10; below = true; }
    y = Math.max(8, Math.min(H - ph - 8, y));
    pop.style.transform = `translate(${Math.round(left)}px,${Math.round(y)}px)`;
    const ax = Math.max(16, Math.min(pw - 16, sx - left));
    pop.style.setProperty('--ax', `${ax}px`); pop.classList.toggle('below', below);
  }

  // ---------- ввод ----------
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = root.clientWidth; H = root.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    minS = Math.max(W / geo.w, H / geo.h); maxS = minS * 7;
    if (view.s < minS) view.s = minS; clamp(); baseCache = null;
  }
  function clamp() {
    const w = geo.w * view.s, h = geo.h * view.s;
    view.x = Math.min(0, Math.max(W - w, view.x)); view.y = Math.min(0, Math.max(H - h, view.y));
  }
  function zoomAt(px, py, ns) {
    ns = Math.max(minS, Math.min(maxS, ns)); const mx = (px - view.x) / view.s, my = (py - view.y) / view.s;
    view.s = ns; view.x = px - mx * ns; view.y = py - my * ns; clamp();
  }
  let anim = null;
  function flyTo(px, py, ns) { const from = { ...view }; const start = performance.now();
    const mx = (px - view.x) / view.s, my = (py - view.y) / view.s; const target = Math.max(minS, Math.min(maxS, ns));
    anim = () => { const k = Math.min(1, (performance.now() - start) / 320); const e = 1 - (1 - k) ** 3;
      const s = from.s + (target - from.s) * e; view.s = s; view.x = px - mx * s; view.y = py - my * s; clamp(); if (k >= 1) anim = null; };
  }
  function hit(px, py) {
    let best = null, bd = 1e9;
    for (const c of cos) { if (!c._r) continue; const sx = c._r.x * view.s + view.x, sy = c._r.y * view.s + view.y;
      const hw = Math.max(14, c._r.w * view.s * 0.5), hh = Math.max(14, c._r.h * view.s * 0.5);
      const dx = px - sx, dy = py - sy; if (Math.abs(dx) < hw && Math.abs(dy) < hh) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = c; } } }
    return best;
  }
  const pts = new Map(); let drag = null, pinch = null, moved = 0;
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); cleanup.push(() => el.removeEventListener(ev, fn, o)); };
  on(cv, 'pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0;
    if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; else { drag = null; const a = [...pts.values()]; pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), s: view.s }; } });
  on(cv, 'pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    if (!pts.has(e.pointerId)) { if (e.pointerType === 'mouse' && !pinned) { const c = hit(e.clientX - r.left, e.clientY - r.top); if (c !== hover) { hover = c; showPopup(c); } cv.style.cursor = c ? 'pointer' : 'grab'; } return; }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const a = [...pts.values()];
    if (a.length >= 2 && pinch) { const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); zoomAt((a[0].x + a[1].x) / 2 - r.left, (a[0].y + a[1].y) / 2 - r.top, pinch.s * d / pinch.d); moved = 99; }
    else if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy)); view.x = drag.vx + dx; view.y = drag.vy + dy; clamp(); }
  });
  const up = (e) => { const tap = moved < 6 && pts.size === 1; pts.delete(e.pointerId); if (pts.size < 2) pinch = null; drag = null;
    if (tap) { const r = cv.getBoundingClientRect(); const c = hit(e.clientX - r.left, e.clientY - r.top); pinned = c; hover = c; showPopup(c); } };
  on(cv, 'pointerup', up); on(cv, 'pointercancel', (e) => { pts.delete(e.pointerId); pinch = null; drag = null; });
  on(cv, 'pointerleave', (e) => { if (e.pointerType === 'mouse' && !pinned) { hover = null; showPopup(null); } });
  on(cv, 'wheel', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, view.s * Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
  on(root, 'click', (e) => {
    const z = e.target.closest('[data-z]'); if (z) { flyTo(W / 2, H / 2, view.s * (z.dataset.z === 'in' ? 1.6 : 1 / 1.6)); return; }
    if (e.target.closest('.gm-x')) { pinned = null; hover = null; showPopup(null); return; }
    if (e.target.closest('.gm-theme')) setTheme(theme === 'dark' ? 'light' : 'dark');
    if (e.target.closest('.gm-ally') && popFor) addAlly(popFor);
    if (e.target.closest('.gm-fs')) toggleFs();
    const si = e.target.closest('[data-ci]'); if (si) { pickCompany(cos[Number(si.dataset.ci)]); }
  });
  // ---------- на весь экран ----------
  function toggleFs(force) {
    const on = force ?? !root.classList.contains('gm-full');
    root.classList.toggle('gm-full', on); document.documentElement.classList.toggle('gm-noscroll', on);
    fsBtn.textContent = on ? '✕' : '⛶'; fsBtn.title = on ? 'Вийти з повного екрана' : 'На весь екран'; fsBtn.setAttribute('aria-label', fsBtn.title);
    requestAnimationFrame(() => resize());
  }
  cleanup.push(() => document.documentElement.classList.remove('gm-noscroll'));
  // ---------- поиск компании ----------
  let sugIdx = -1, sugList = [];
  function renderSug() {
    const q = qIn.value.trim().toLowerCase();
    sugList = q.length < 1 ? [] : cos.map((c, i) => ({ c, i, p: c.name.toLowerCase().indexOf(q) })).filter((o) => o.p >= 0).sort((a, b) => a.p - b.p || b.c.n - a.c.n).slice(0, 8);
    sugIdx = sugList.length ? 0 : -1;
    sug.innerHTML = sugList.length ? sugList.map((o, k) => `<button type="button" class="gm-si${k === sugIdx ? ' on' : ''}" data-ci="${o.i}" role="option"><b>${esc(o.c.name)}</b><small>${esc(o.c.cityUa)} · ${o.c.n} ${plural(o.c.n)}</small></button>`).join('')
      : (q ? '<div class="gm-none">Нічого не знайшли</div>' : '');
    sug.classList.toggle('on', !!q);
  }
  function pickCompany(c) {
    if (!c) return; qIn.value = c.name; sug.classList.remove('on'); qIn.blur();
    const target = Math.max(view.s, minS * 4.2);
    const from = { ...view }, start = performance.now();
    const tx = W / 2 - c.x * target, ty = H / 2 - (c.y - 20) * target;
    anim = () => { const k = Math.min(1, (performance.now() - start) / 650); const e = 1 - (1 - k) ** 3;
      view.s = from.s + (target - from.s) * e; view.x = from.x + (tx - from.x) * e; view.y = from.y + (ty - from.y) * e; clamp(); baseCache = null;
      if (k >= 1) { anim = null; pinned = c; hover = c; showPopup(c); } };
  }
  on(qIn, 'input', renderSug);
  on(qIn, 'focus', renderSug);
  on(qIn, 'keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!sugList.length) return; sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + sugList.length) % sugList.length; sug.querySelectorAll('.gm-si').forEach((b, k) => b.classList.toggle('on', k === sugIdx)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (sugIdx >= 0) pickCompany(sugList[sugIdx].c); }
    else if (e.key === 'Escape') { sug.classList.remove('on'); qIn.blur(); }
  });
  on(qIn, 'blur', () => setTimeout(() => sug.classList.remove('on'), 150));
  on(window, 'resize', () => resize());
  on(document, 'keydown', (e) => { if (e.key === 'Escape' && document.activeElement !== qIn) { if (popFor) { pinned = null; hover = null; showPopup(null); } else if (root.classList.contains('gm-full')) toggleFs(false); } });

  async function setTheme(th) {
    theme = th; root.classList.toggle('gm-dark', th === 'dark'); baseCache = null;
    themeBtn.textContent = th === 'dark' ? '☀ День' : '☾ Вечір';
    mascot.src = `${base}/${th}/mascot/mascot-wave.webp`;
    await loadTheme(th);
  }

  let raf = 0;
  (async () => {
    [geo, man, flagMeta] = await Promise.all([fetch(`${base}/geo.json`).then((r) => r.json()), fetch(`${base}/manifest.json`).then((r) => r.json()), fetch(`${base}/flags.json`).then((r) => r.json()).catch(() => ({}))]);
    for (const k in flagMeta) for (const e of flagMeta[k].f) man['flags/' + e[0]] = [e[3], e[4]];
    loadAllies();
    if (destroyed) return;
    cos = layout();
    buildCityGroups();
    const cities = Object.values(geo.cities);
    const cats = ['cat-amber', 'cat-coral', 'cat-honey', 'cat-lilac', 'cat-peach', 'cat-rose', 'cat-sage', 'cat-teal'];
    for (let i = 0; i < 6; i++) { const a = cities[(i * 5) % cities.length], b = cities[(i * 5 + 3) % cities.length]; walkers.push({ k: cats[i], a, b, v: 0.012 + i * 0.002, ph: i * 0.37 }); }
    await setTheme(theme);
    root.querySelector('.gm-load').remove();
    resize();
    // старт: Украина целиком в кадре
    const kyiv = geo.cities['Київ'];
    view.s = Math.max(minS, Math.min(maxS, Math.min(W / 1250, H / 820)));
    view.x = W / 2 - (kyiv[0] + 60) * view.s; view.y = H / 2 - (kyiv[1] + 210) * view.s; clamp();
    startLoop();
    loadTheme(theme === 'dark' ? 'light' : 'dark');
  })();
  function startLoop() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function tick(now) { if (destroyed) return; if (anim) anim(); frame(now); raf = requestAnimationFrame(tick); }); }
  const vis = () => { if (document.hidden) cancelAnimationFrame(raf); else if (geo) startLoop(); };
  on(document, 'visibilitychange', vis);

  return () => { destroyed = true; cancelAnimationFrame(raf); cleanup.forEach((f) => f()); root.innerHTML = ''; };
}

export const GAME_MAP_CSS = `
.gm2.gm-page{border-radius:0;border:0;border-top:1px solid rgba(160,120,60,.25)}
.gm2{position:relative;height:calc(100dvh - 140px);min-height:480px;overflow:hidden;border-radius:18px;border:1px solid #d8c8a2;background:#2f7f9e;font:15px/1.4 system-ui,-apple-system,sans-serif;color:#2b2114;user-select:none;-webkit-user-select:none}
.gm2.gm-dark{border-color:#2b3a52;background:#0f2a43;color:#efe6cf}
.gm2 .gm-cv{display:block;touch-action:none;cursor:grab}
.gm2 .gm-top{position:absolute;left:12px;right:12px;top:12px;display:flex;justify-content:space-between;align-items:center;gap:8px;pointer-events:none}
.gm2 .gm-top>*{pointer-events:auto}
.gm2 .gm-title{box-sizing:border-box;height:36px;display:flex;align-items:center;gap:4px;line-height:1;background:rgba(251,245,230,.92);border:1px solid rgba(160,120,60,.35);border-radius:999px;padding:7px 14px;font:700 15px Georgia,'Times New Roman',serif;color:#4a3518;box-shadow:0 3px 10px rgba(0,0,0,.18)}
.gm2 .gm-count{font:600 13px system-ui;color:#8a6a3a}
.gm2 .gm-btn{border:1px solid rgba(160,120,60,.35);background:rgba(251,245,230,.92);color:#5a4022;border-radius:999px;min-height:38px;min-width:38px;padding:0 14px;font:600 14px system-ui;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.18)}
.gm2.gm-dark .gm-title,.gm2.gm-dark .gm-btn{background:rgba(18,28,44,.9);border-color:rgba(120,150,210,.35);color:#e9dfc4}
.gm2.gm-dark .gm-count{color:#a9b6d8}
.gm2 .gm-zoom{position:absolute;right:12px;bottom:12px;display:flex;flex-direction:column;gap:8px}
.gm2 .gm-zoom .gm-btn{width:42px;height:42px;padding:0;font-size:20px;border-radius:13px}
.gm2 .gm-guide{position:absolute;left:10px;bottom:8px;display:flex;align-items:flex-end;gap:6px;pointer-events:none;transition:opacity .4s}
.gm2 .gm-guide.off{opacity:0}
.gm2 .gm-mascot{width:78px;height:auto;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))}
.gm2 .gm-say{margin-bottom:46px;max-width:190px;background:rgba(251,245,230,.95);border:1px solid rgba(160,120,60,.35);border-radius:14px 14px 14px 4px;padding:8px 11px;font-size:13px;color:#4a3518;box-shadow:0 3px 10px rgba(0,0,0,.18)}
.gm2.gm-dark .gm-say{background:rgba(18,28,44,.92);color:#e9dfc4;border-color:rgba(120,150,210,.35)}
@media (max-width:560px){.gm2 .gm-say{display:none}.gm2 .gm-mascot{width:58px}}
.gm2 .gm-pop{position:absolute;left:0;top:0;width:290px;max-width:calc(100% - 16px);background:#fbf5e6;border:2px solid #c99a52;border-radius:16px;padding:12px 13px 13px;box-shadow:0 12px 30px rgba(40,25,5,.35);opacity:0;visibility:hidden;transition:opacity .16s ease,visibility 0s .16s;display:flex;flex-direction:column;gap:9px;will-change:transform}
.gm2 .gm-pop.on{opacity:1;visibility:visible;transition:opacity .16s ease}
.gm2 .gm-pop::after{content:"";position:absolute;left:calc(var(--ax,50%) - 8px);bottom:-9px;width:14px;height:14px;background:#fbf5e6;border-right:2px solid #c99a52;border-bottom:2px solid #c99a52;transform:rotate(45deg)}
.gm2 .gm-pop.below::after{bottom:auto;top:-9px;transform:rotate(225deg)}
.gm2.gm-dark .gm-pop,.gm2.gm-dark .gm-pop::after{background:#16233a;border-color:#7d8fc9}
.gm2 .gm-ph{display:flex;align-items:center;gap:10px}
.gm2 .gm-ava{width:42px;height:42px;border-radius:50%;overflow:hidden;flex:none;background:#e9dcbc;display:grid;place-items:center;font:700 18px Georgia,serif;color:#6b4a1e;box-shadow:0 0 0 2px #c99a52}
.gm2 .gm-ava img{width:100%;height:100%;object-fit:cover}
.gm2 .gm-pt{flex:1;min-width:0;display:flex;flex-direction:column}
.gm2 .gm-pt b{font:700 16px Georgia,'Times New Roman',serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gm2 .gm-pt small{opacity:.7;font-size:12px}
.gm2 .gm-x{border:0;background:none;font-size:22px;line-height:1;color:inherit;opacity:.6;cursor:pointer;padding:2px 4px;align-self:flex-start}
.gm2 .gm-badge{align-self:flex-start;font:700 12px system-ui;padding:4px 10px;border-radius:999px;background:#2f7a4d;color:#fff}
.gm2 .gm-jobs{display:flex;flex-direction:column;gap:5px}
.gm2 .gm-jobs a{font-size:13px;color:inherit;text-decoration:none;padding:6px 9px;border-radius:9px;background:rgba(150,110,50,.12);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gm2 .gm-jobs a:hover{background:rgba(150,110,50,.22)}
.gm2.gm-dark .gm-jobs a{background:rgba(140,160,220,.12)}
.gm2 .gm-acts{display:flex;gap:8px}
.gm2 .gm-p{flex:1;text-align:center;text-decoration:none;font:600 13px system-ui;padding:9px 12px;border-radius:10px;background:#a8571f;color:#fff}
.gm2.gm-dark .gm-p{background:#5b6fc0}
.gm2.gm-full{position:fixed;inset:0;z-index:80;height:auto;min-height:0;border-radius:0;border:0}
html.gm-noscroll,html.gm-noscroll body{overflow:hidden}
.gm2 .gm-left{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}
.gm2 .gm-right{display:flex;gap:8px}
.gm2 .gm-search{position:relative}
.gm2 .gm-q{box-sizing:border-box;width:220px;max-width:46vw;height:36px;margin:0;-webkit-appearance:none;appearance:none;border-radius:999px;border:1px solid rgba(160,120,60,.35);background:rgba(251,245,230,.95);padding:0 14px;font:500 14px system-ui;color:#4a3518;box-shadow:0 3px 10px rgba(0,0,0,.18);outline:none}
.gm2 .gm-q::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none;width:18px;height:18px;margin-left:6px;cursor:pointer;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18'%3E%3Ccircle cx='9' cy='9' r='9' fill='%23b8894a'/%3E%3Cpath d='M6 6l6 6M12 6l-6 6' stroke='%23fbf5e6' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E") center/18px no-repeat;opacity:.85}.gm2 .gm-q::-webkit-search-cancel-button:hover{opacity:1}.gm2.gm-dark .gm-q::-webkit-search-cancel-button{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18'%3E%3Ccircle cx='9' cy='9' r='9' fill='%236f86b8'/%3E%3Cpath d='M6 6l6 6M12 6l-6 6' stroke='%23121c2c' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E")}
.gm2 .gm-q:focus{border-color:#c99a52;box-shadow:0 0 0 3px rgba(201,154,82,.3)}
.gm2.gm-dark .gm-q{background:rgba(18,28,44,.92);color:#e9dfc4;border-color:rgba(120,150,210,.35)}
.gm2 .gm-sug{position:absolute;top:44px;left:0;width:300px;max-width:80vw;background:#fbf5e6;border:1px solid #c99a52;border-radius:14px;box-shadow:0 12px 30px rgba(40,25,5,.3);padding:5px;display:none;flex-direction:column;gap:2px;z-index:3}
.gm2 .gm-sug.on{display:flex}
.gm2.gm-dark .gm-sug{background:#16233a;border-color:#7d8fc9}
.gm2 .gm-si{display:flex;flex-direction:column;align-items:flex-start;text-align:left;border:0;background:none;color:inherit;padding:8px 10px;border-radius:10px;cursor:pointer;font:inherit}
.gm2 .gm-si small{opacity:.65;font-size:12px}
.gm2 .gm-si.on,.gm2 .gm-si:hover{background:rgba(150,110,50,.15)}
.gm2 .gm-none{padding:10px;font-size:13px;opacity:.7}
@media (max-width:560px){.gm2 .gm-title{display:none}.gm2 .gm-q{width:170px}}
.gm2 .gm-pop{width:330px}
.gm2 .gm-ph{border-left:4px solid var(--fc,#c99a52);padding-left:8px;margin-left:-4px}
.gm2 .gm-chips{display:flex;flex-wrap:wrap;gap:5px}
.gm2 .gm-chip{font:600 12px system-ui;padding:4px 9px;border-radius:999px;background:rgba(150,110,50,.14)}
.gm2 .gm-chip.g{background:#2f7a4d;color:#fff}
.gm2.gm-dark .gm-chip{background:rgba(140,160,220,.16)}.gm2.gm-dark .gm-chip.g{background:#2f7a4d}
.gm2 .gm-bio{margin:0;font-size:13px;line-height:1.45;opacity:.9;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.gm2 .gm-site{font-size:13px;color:#a8571f;text-decoration:none;align-self:flex-start}
.gm2.gm-dark .gm-site{color:#9fb1ff}
.gm2 .gm-ally{flex:none;width:40px;border-radius:10px;border:2px solid #a8571f;background:none;color:#a8571f;font:700 20px system-ui;cursor:pointer;line-height:1}
.gm2 .gm-ally.on{background:#2f7a4d;border-color:#2f7a4d;color:#fff}
.gm2.gm-dark .gm-ally{border-color:#7d8fc9;color:#c9d3ff}.gm2.gm-dark .gm-ally.on{background:#2f7a4d;border-color:#2f7a4d;color:#fff}
.gm2 .gm-load{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font:600 16px Georgia,serif;background:inherit}
`;
