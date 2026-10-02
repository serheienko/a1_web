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

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
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
      <div class="gm-title">Карта компаній <span class="gm-count"></span></div>
      <button class="gm-btn gm-theme" type="button"></button>
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

  // ---------- проекция и компании ----------
  function proj(lng, lat) { return [(lng - geo.lon0) * geo.k * geo.c, (geo.lat1 - lat) * geo.k]; }
  function layout() {
    const list = companiesIn.map((c) => {
      const l = level(c.n); const [x, y] = proj(c.lng, c.lat); const h = hash(c.id || c.name);
      return { ...c, l, x, y, hx: x, hy: y, w: SIZE[l - 1], forest: h % 10 < 3, pin: PINS[h % PINS.length], h };
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
    const h = drawSprite(k, c.x, c.y + w * 0.04, w) || w;
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
    return `<div class="gm-ph"><div class="gm-ava">${ava}</div><div class="gm-pt"><b>${esc(c.name)}</b><small>${esc(c.city || '')}</small></div><button class="gm-x" type="button" aria-label="Закрити">×</button></div>
      <div class="gm-badge">${c.n} ${plural(c.n)}</div>
      ${jobs ? `<div class="gm-jobs">${jobs}</div>` : ''}
      <div class="gm-acts">${prof}</div>`;
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
  });
  on(window, 'resize', () => resize());
  on(document, 'keydown', (e) => { if (e.key === 'Escape') { pinned = null; hover = null; showPopup(null); } });

  async function setTheme(th) {
    theme = th; root.classList.toggle('gm-dark', th === 'dark'); baseCache = null;
    themeBtn.textContent = th === 'dark' ? '☀ День' : '☾ Вечір';
    mascot.src = `${base}/${th}/mascot/mascot-wave.webp`;
    await loadTheme(th);
  }

  let raf = 0;
  (async () => {
    [geo, man] = await Promise.all([fetch(`${base}/geo.json`).then((r) => r.json()), fetch(`${base}/manifest.json`).then((r) => r.json())]);
    if (destroyed) return;
    cos = layout();
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
.gm2{position:relative;height:calc(100dvh - 140px);min-height:480px;overflow:hidden;border-radius:18px;border:1px solid #d8c8a2;background:#2f7f9e;font:15px/1.4 system-ui,-apple-system,sans-serif;color:#2b2114;user-select:none;-webkit-user-select:none}
.gm2.gm-dark{border-color:#2b3a52;background:#0f2a43;color:#efe6cf}
.gm2 .gm-cv{display:block;touch-action:none;cursor:grab}
.gm2 .gm-top{position:absolute;left:12px;right:12px;top:12px;display:flex;justify-content:space-between;align-items:center;gap:8px;pointer-events:none}
.gm2 .gm-top>*{pointer-events:auto}
.gm2 .gm-title{background:rgba(251,245,230,.92);border:1px solid rgba(160,120,60,.35);border-radius:999px;padding:7px 14px;font:700 15px Georgia,'Times New Roman',serif;color:#4a3518;box-shadow:0 3px 10px rgba(0,0,0,.18)}
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
.gm2 .gm-load{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font:600 16px Georgia,serif;background:inherit}
`;
