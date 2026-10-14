// lib/news/thumb-art.ts
//
// 14.10.2026 (Александр: «узоров всего четыре, всё однотипное… заведи правил хотя бы 20, чтобы по-разному
// миксовались и были чуть-чуть в тему новости, и не платить за картинки»). Обложка новости рисуется кодом:
// 26 узоров -- 6 общих и по 2 на каждую тему (ИИ, безопасность, веб, языки, облако, open source, рынок,
// инструменты, мобильные, данные) × 10 оттенков × случайные детали от слага (высоты столбиков, точки,
// линии). Тема берётся из рубрики новости: обложка «в тему», у каждой новости своя, uk и en одинаковые.
//
// Результат -- SVG-строка: её рисует и список новостей (components/news/news-thumb.tsx), и картинка для
// соцсетей и Google (app/news/[slug]/opengraph-image.tsx). Бесплатно, мгновенно, без чужих картинок.

export type ThumbHue = { bg0: string; bg1: string; bg2: string; hi: string; lo: string };

export const THUMB_HUES: Record<string, ThumbHue> = {
  blue: { bg0: "#1b3a95", bg1: "#0a1240", bg2: "#03051f", hi: "#7aa2ff", lo: "#2a78d6" },
  green: { bg0: "#1d7a3a", bg1: "#0b3d1e", bg2: "#031a0c", hi: "#7bf0a0", lo: "#25a653" },
  violet: { bg0: "#5b2aa8", bg1: "#2a1163", bg2: "#0e0524", hi: "#c19bff", lo: "#7a46d6" },
  orange: { bg0: "#b8420f", bg1: "#5c1f06", bg2: "#210a02", hi: "#ff9a62", lo: "#e0561c" },
  red: { bg0: "#b3202a", bg1: "#560e14", bg2: "#210306", hi: "#ff7a80", lo: "#e0343e" },
  teal: { bg0: "#0f6b6e", bg1: "#073a45", bg2: "#021c24", hi: "#5fe0d0", lo: "#1d9aa6" },
  rose: { bg0: "#a3205a", bg1: "#4f0e2e", bg2: "#1c0511", hi: "#ff8fc0", lo: "#d6407f" },
  amber: { bg0: "#9a5a10", bg1: "#4d2a08", bg2: "#1c0e02", hi: "#ffc15e", lo: "#d98a1c" },
  cyan: { bg0: "#0d6fa8", bg1: "#08395c", bg2: "#021626", hi: "#6fd3ff", lo: "#1f9ae0" },
  lime: { bg0: "#5f8a12", bg1: "#2c4309", bg2: "#101a02", hi: "#c8f26b", lo: "#8cc21f" },
};
const HUE_KEYS = Object.keys(THUMB_HUES);

export type Topic = "ai" | "security" | "web" | "languages" | "cloud" | "oss" | "market" | "tools" | "mobile" | "data" | "generic";

const TOPIC_RULES: [Topic, RegExp][] = [
  ["ai", /(\bші\b|штучн|\bai\b|artificial|\bии\b|machine learning|нейро)/i],
  ["security", /(безпек|security|безопасн|кібер|cyber)/i],
  ["web", /(\bвеб\b|\bweb\b|браузер|browser)/i],
  ["languages", /(\bмови\b|мов програм|languages|языки)/i],
  ["cloud", /(хмар|cloud|облак|devops)/i],
  ["oss", /(open source|відкрит)/i],
  ["market", /(ринок|market|рынок|бізнес|business|інвест)/i],
  ["tools", /(інструмент|tools|инструмент)/i],
  ["mobile", /(мобіл|mobile|мобил|\bios\b|android)/i],
  ["data", /(дані|\bdata\b|данные|бази|database)/i],
];

export function topicOf(kicker: string): Topic {
  for (const [t, re] of TOPIC_RULES) if (re.test(kicker)) return t;
  return "generic";
}

function hashOf(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
  return x >>> 0;
}

/** Детерминированный «случай» от слага: у каждой новости свои детали, но одинаковые при каждом показе. */
function rng(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ctx = { r: () => number; h: ThumbHue };
type Motif = (c: Ctx) => string;

const f = (n: number) => n.toFixed(1);

// Поле рисования 160×100; текст новости (цифра и подпись) живёт в нижней левой трети, узор -- выше и правее.

// ---------- общие ----------
const dots: Motif = ({ r, h }) => {
  let s = "";
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 16; x++) {
      const on = r() < 0.12;
      s += `<circle cx="${f(14 + x * 8.6)}" cy="${f(12 + y * 8)}" r="${on ? 2.2 : 1.5}" fill="${on ? h.hi : "rgba(255,255,255,.14)"}"${on ? ` filter="url(#g)"` : ""}/>`;
    }
  return s;
};
const bars: Motif = ({ r, h }) => {
  let s = "";
  const n = 12;
  let v = 18 + r() * 10;
  for (let i = 0; i < n; i++) {
    v = Math.max(10, Math.min(46, v + (r() - 0.35) * 12));
    s += `<rect x="${f(12 + i * 11.5)}" y="${f(52 - v)}" width="8" height="${f(v)}" rx="1.5" fill="url(#lg)"/>`;
  }
  return s;
};
const spark: Motif = ({ r, h }) => {
  const pts: string[] = [];
  let y = 40 + r() * 10;
  for (let i = 0; i <= 12; i++) {
    y = Math.max(8, Math.min(52, y - 3 + (r() - 0.5) * 12));
    pts.push(`${f(12 + i * 11.3)},${f(y)}`);
  }
  const last = pts[pts.length - 1]!.split(",");
  return `<polyline fill="none" stroke="${h.hi}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" points="${pts.join(" ")}"/><circle cx="${last[0]}" cy="${last[1]}" r="3" fill="${h.hi}" filter="url(#g)"/>`;
};
const rings: Motif = ({ r, h }) => {
  const cx = 112 + r() * 20;
  const cy = 30 + r() * 10;
  return [26, 18, 10]
    .map((rad, i) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${rad}" fill="none" stroke="${h.hi}" stroke-width="2" opacity="${0.3 + i * 0.3}"/>`)
    .join("") + `<circle cx="${f(cx)}" cy="${f(cy)}" r="3" fill="${h.hi}" filter="url(#g)"/>`;
};
const waves: Motif = ({ r, h }) => {
  let s = "";
  for (let k = 0; k < 4; k++) {
    const amp = 4 + r() * 6;
    const ph = r() * 6;
    let d = "";
    for (let x = 0; x <= 160; x += 4) d += `${x === 0 ? "M" : "L"}${x},${f(16 + k * 10 + Math.sin(x / 14 + ph) * amp)}`;
    s += `<path d="${d}" fill="none" stroke="${k % 2 ? h.lo : h.hi}" stroke-width="1.6" opacity="${0.35 + k * 0.15}"/>`;
  }
  return s;
};
const nodes: Motif = ({ r, h }) => {
  let s = "";
  for (let x = 10; x <= 150; x += 14) s += `<line x1="${x}" y1="4" x2="${x}" y2="60" stroke="rgba(255,255,255,.06)"/>`;
  for (let y = 6; y <= 60; y += 12) s += `<line x1="4" y1="${y}" x2="156" y2="${y}" stroke="rgba(255,255,255,.06)"/>`;
  const pts = Array.from({ length: 5 }, () => [10 + Math.round(r() * 10) * 14, 6 + Math.round(r() * 4) * 12] as const);
  for (let i = 1; i < pts.length; i++) s += `<line x1="${pts[i - 1]![0]}" y1="${pts[i - 1]![1]}" x2="${pts[i]![0]}" y2="${pts[i]![1]}" stroke="${h.lo}" stroke-width="1.4"/>`;
  for (const [x, y] of pts) s += `<circle cx="${x}" cy="${y}" r="2.6" fill="${h.hi}" filter="url(#g)"/>`;
  return s;
};

// ---------- ИИ ----------
const neural: Motif = ({ r, h }) => {
  const layers = [3, 5, 4, 2];
  const xs = [92, 108, 124, 140];
  const pos = layers.map((n, li) => Array.from({ length: n }, (_, i) => [xs[li]!, 32 + (i - (n - 1) / 2) * 10] as const));
  let s = "";
  for (let li = 0; li < pos.length - 1; li++)
    for (const a of pos[li]!) for (const b of pos[li + 1]!) s += `<line x1="${a[0]}" y1="${f(a[1])}" x2="${b[0]}" y2="${f(b[1])}" stroke="${h.lo}" stroke-width=".6" opacity="${f(0.25 + r() * 0.5)}"/>`;
  for (const l of pos) for (const [x, y] of l) s += `<circle cx="${x}" cy="${f(y)}" r="2.6" fill="${r() < 0.4 ? h.hi : "rgba(255,255,255,.35)"}"/>`;
  return s;
};
const chip: Motif = ({ r, h }) => {
  const x = 100 + r() * 14;
  const y = 10;
  let s = `<rect x="${f(x)}" y="${y}" width="40" height="40" rx="5" fill="rgba(255,255,255,.06)" stroke="${h.hi}" stroke-width="1.6"/>`;
  s += `<rect x="${f(x + 12)}" y="${y + 12}" width="16" height="16" rx="2" fill="${h.hi}" opacity=".85" filter="url(#g)"/>`;
  for (let i = 0; i < 5; i++) {
    const o = 6 + i * 7;
    s += `<line x1="${f(x + o)}" y1="${y - 5}" x2="${f(x + o)}" y2="${y}" stroke="${h.lo}" stroke-width="1.4"/><line x1="${f(x + o)}" y1="${y + 40}" x2="${f(x + o)}" y2="${y + 45}" stroke="${h.lo}" stroke-width="1.4"/>`;
    s += `<line x1="${f(x - 5)}" y1="${y + o}" x2="${f(x)}" y2="${y + o}" stroke="${h.lo}" stroke-width="1.4"/><line x1="${f(x + 40)}" y1="${y + o}" x2="${f(x + 45)}" y2="${y + o}" stroke="${h.lo}" stroke-width="1.4"/>`;
  }
  return s;
};

// ---------- безопасность ----------
const shield: Motif = ({ r, h }) => {
  const x = 110 + r() * 12;
  return `<path d="M${f(x)} 8 L${f(x + 20)} 15 V31 C${f(x + 20)} 44 ${f(x + 10)} 50 ${f(x)} 54 C${f(x - 10)} 50 ${f(x - 20)} 44 ${f(x - 20)} 31 V15 Z" fill="rgba(255,255,255,.07)" stroke="${h.hi}" stroke-width="1.8"/><path d="M${f(x - 8)} 31 L${f(x - 2)} 37 L${f(x + 9)} 24" fill="none" stroke="${h.hi}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#g)"/>`;
};
const lockScan: Motif = ({ r, h }) => {
  const x = 116 + r() * 10;
  let s = "";
  for (let i = 0; i < 4; i++) s += `<path d="M${f(x - 14 - i * 8)} ${f(34 + i * 2)} A${14 + i * 8} ${14 + i * 8} 0 0 1 ${f(x + 14 + i * 8)} ${f(34 + i * 2)}" fill="none" stroke="${h.lo}" stroke-width="1.2" opacity="${f(0.7 - i * 0.15)}"/>`;
  s += `<rect x="${f(x - 9)}" y="30" width="18" height="15" rx="3" fill="${h.hi}" opacity=".9"/><path d="M${f(x - 5)} 30 V25 a5 5 0 0 1 10 0 V30" fill="none" stroke="${h.hi}" stroke-width="2"/>`;
  return s;
};

// ---------- веб ----------
const browser: Motif = ({ r, h }) => {
  const x = 84 + r() * 10;
  let s = `<rect x="${f(x)}" y="6" width="64" height="46" rx="4" fill="rgba(255,255,255,.06)" stroke="${h.hi}" stroke-width="1.4"/><line x1="${f(x)}" y1="14" x2="${f(x + 64)}" y2="14" stroke="${h.hi}" stroke-width="1"/>`;
  for (let i = 0; i < 3; i++) s += `<circle cx="${f(x + 5 + i * 5)}" cy="10" r="1.3" fill="${h.hi}"/>`;
  s += `<rect x="${f(x + 6)}" y="19" width="${f(20 + r() * 14)}" height="12" rx="2" fill="${h.lo}" opacity=".8"/>`;
  for (let i = 0; i < 3; i++) s += `<rect x="${f(x + 6)}" y="${35 + i * 5}" width="${f(24 + r() * 28)}" height="2.4" rx="1.2" fill="rgba(255,255,255,.35)"/>`;
  return s;
};
const globe: Motif = ({ r, h }) => {
  const cx = 118 + r() * 12;
  const cy = 30;
  let s = `<circle cx="${f(cx)}" cy="${cy}" r="22" fill="none" stroke="${h.hi}" stroke-width="1.6"/>`;
  for (const rx of [8, 15]) s += `<ellipse cx="${f(cx)}" cy="${cy}" rx="${rx}" ry="22" fill="none" stroke="${h.lo}" stroke-width="1"/>`;
  for (const dy of [-11, 0, 11]) s += `<line x1="${f(cx - 22 + Math.abs(dy) * 0.4)}" y1="${cy + dy}" x2="${f(cx + 22 - Math.abs(dy) * 0.4)}" y2="${cy + dy}" stroke="${h.lo}" stroke-width="1"/>`;
  return s + `<circle cx="${f(cx + 9)}" cy="${cy - 8}" r="2.6" fill="${h.hi}" filter="url(#g)"/>`;
};

// ---------- языки ----------
const codeLines: Motif = ({ r, h }) => {
  let s = `<text x="88" y="24" font-family="monospace" font-size="18" font-weight="700" fill="${h.hi}" opacity=".9">&lt;/&gt;</text>`;
  for (let i = 0; i < 6; i++) {
    const ind = [0, 6, 12, 6, 12, 0][i]!;
    s += `<rect x="${f(88 + ind)}" y="${30 + i * 4.4}" width="${f(16 + r() * 34)}" height="2.4" rx="1.2" fill="${i % 3 === 1 ? h.hi : "rgba(255,255,255,.35)"}"/>`;
  }
  return s;
};
const braces: Motif = ({ r, h }) => {
  let s = `<text x="92" y="48" font-family="monospace" font-size="46" font-weight="700" fill="${h.lo}">{</text><text x="132" y="48" font-family="monospace" font-size="46" font-weight="700" fill="${h.lo}">}</text>`;
  for (let i = 0; i < 3; i++) s += `<circle cx="${f(116 + i * 6)}" cy="32" r="2.4" fill="${h.hi}"${r() < 0.6 ? ` filter="url(#g)"` : ""}/>`;
  return s;
};

// ---------- облако ----------
const cloudUp: Motif = ({ r, h }) => {
  const x = 104 + r() * 10;
  let s = `<path d="M${f(x)} 40 a10 10 0 0 1 2-19.8 a14 14 0 0 1 26.5-3.6 a11 11 0 0 1 9.5 23.4 Z" fill="rgba(255,255,255,.07)" stroke="${h.hi}" stroke-width="1.8"/>`;
  s += `<path d="M${f(x + 18)} 36 V22 M${f(x + 12)} 28 L${f(x + 18)} 22 L${f(x + 24)} 28" fill="none" stroke="${h.hi}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#g)"/>`;
  for (let i = 0; i < 5; i++) s += `<circle cx="${f(x - 6 + r() * 50)}" cy="${f(46 + r() * 10)}" r="1.3" fill="${h.lo}"/>`;
  return s;
};
const servers: Motif = ({ r, h }) => {
  let s = "";
  for (let i = 0; i < 4; i++) {
    const y = 8 + i * 12;
    s += `<rect x="96" y="${y}" width="52" height="9" rx="2" fill="rgba(255,255,255,.07)" stroke="${h.lo}" stroke-width="1"/>`;
    s += `<circle cx="102" cy="${y + 4.5}" r="1.6" fill="${r() < 0.7 ? h.hi : "rgba(255,255,255,.3)"}"/>`;
    s += `<rect x="108" y="${y + 3.5}" width="${f(10 + r() * 24)}" height="2" rx="1" fill="rgba(255,255,255,.3)"/>`;
  }
  return s;
};

// ---------- open source ----------
const branches: Motif = ({ r, h }) => {
  const y = 34;
  let s = `<line x1="80" y1="${y}" x2="152" y2="${y}" stroke="${h.lo}" stroke-width="2"/>`;
  const b1 = 92 + r() * 10;
  const b2 = 120 + r() * 10;
  s += `<path d="M${f(b1)} ${y} C${f(b1 + 8)} ${y} ${f(b1 + 6)} ${y - 18} ${f(b1 + 16)} ${y - 18} H${f(b2)} C${f(b2 + 8)} ${y - 18} ${f(b2 + 6)} ${y} ${f(b2 + 14)} ${y}" fill="none" stroke="${h.hi}" stroke-width="2"/>`;
  for (const x of [84, b1, b2 + 14, 150]) s += `<circle cx="${f(x)}" cy="${y}" r="3.2" fill="${h.bg2}" stroke="${h.hi}" stroke-width="1.8"/>`;
  s += `<circle cx="${f(b1 + 16)}" cy="${y - 18}" r="3.2" fill="${h.hi}" filter="url(#g)"/>`;
  return s;
};
const stars: Motif = ({ r, h }) => {
  const pts = Array.from({ length: 7 }, () => [86 + r() * 66, 6 + r() * 46] as const);
  let s = "";
  for (let i = 1; i < pts.length; i++) s += `<line x1="${f(pts[i - 1]![0])}" y1="${f(pts[i - 1]![1])}" x2="${f(pts[i]![0])}" y2="${f(pts[i]![1])}" stroke="${h.lo}" stroke-width=".8" opacity=".7"/>`;
  for (const [x, y] of pts) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.4 + r() * 1.8)}" fill="${h.hi}" filter="url(#g)"/>`;
  return s;
};

// ---------- рынок ----------
const candles: Motif = ({ r, h }) => {
  let s = "";
  let p = 34;
  for (let i = 0; i < 11; i++) {
    const o = p;
    p = Math.max(10, Math.min(50, p + (r() - 0.55) * 10));
    const up = p < o;
    const x = 22 + i * 12;
    s += `<line x1="${x + 2.5}" y1="${f(Math.min(o, p) - 3 - r() * 4)}" x2="${x + 2.5}" y2="${f(Math.max(o, p) + 3 + r() * 4)}" stroke="${up ? h.hi : h.lo}" stroke-width="1"/>`;
    s += `<rect x="${x}" y="${f(Math.min(o, p))}" width="5" height="${f(Math.max(1.5, Math.abs(o - p)))}" fill="${up ? h.hi : h.lo}"/>`;
  }
  return s;
};
const donut: Motif = ({ r, h }) => {
  const cx = 122 + r() * 10;
  const cy = 30;
  const R = 18;
  const C = 2 * Math.PI * R;
  const a = 0.35 + r() * 0.4;
  return `<circle cx="${f(cx)}" cy="${cy}" r="${R}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="7"/><circle cx="${f(cx)}" cy="${cy}" r="${R}" fill="none" stroke="${h.hi}" stroke-width="7" stroke-dasharray="${f(C * a)} ${f(C)}" transform="rotate(-90 ${f(cx)} ${cy})" filter="url(#g)"/><circle cx="${f(cx)}" cy="${cy}" r="${R}" fill="none" stroke="${h.lo}" stroke-width="7" stroke-dasharray="${f(C * 0.2)} ${f(C)}" stroke-dashoffset="${f(-C * a)}" transform="rotate(-90 ${f(cx)} ${cy})"/>`;
};

// ---------- инструменты ----------
const terminal: Motif = ({ r, h }) => {
  let s = `<rect x="86" y="6" width="64" height="44" rx="4" fill="rgba(0,0,0,.35)" stroke="${h.lo}" stroke-width="1.2"/>`;
  for (let i = 0; i < 4; i++) {
    s += `<text x="91" y="${17 + i * 9}" font-family="monospace" font-size="7" fill="${h.hi}">$</text>`;
    s += `<rect x="97" y="${12.5 + i * 9}" width="${f(12 + r() * 36)}" height="2.4" rx="1.2" fill="rgba(255,255,255,.4)"/>`;
  }
  return s + `<rect x="97" y="${12 + 4 * 9}" width="5" height="4" fill="${h.hi}" filter="url(#g)"/>`;
};
const gear: Motif = ({ r, h }) => {
  const cx = 120 + r() * 10;
  const cy = 30;
  let d = "";
  const teeth = 10;
  for (let i = 0; i < teeth * 2; i++) {
    const ang = (i / (teeth * 2)) * Math.PI * 2;
    const rad = i % 2 ? 16 : 21;
    d += `${i ? "L" : "M"}${f(cx + Math.cos(ang) * rad)},${f(cy + Math.sin(ang) * rad)}`;
  }
  return `<path d="${d}Z" fill="rgba(255,255,255,.07)" stroke="${h.hi}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${f(cx)}" cy="${cy}" r="6" fill="none" stroke="${h.hi}" stroke-width="2" filter="url(#g)"/>`;
};

// ---------- мобильные ----------
const phone: Motif = ({ r, h }) => {
  const x = 112 + r() * 14;
  let s = `<rect x="${f(x)}" y="4" width="28" height="52" rx="5" fill="rgba(255,255,255,.06)" stroke="${h.hi}" stroke-width="1.6"/><rect x="${f(x + 10)}" y="7" width="8" height="2" rx="1" fill="${h.hi}"/>`;
  for (let i = 0; i < 3; i++) s += `<rect x="${f(x + 4)}" y="${13 + i * 13}" width="20" height="10" rx="2" fill="${i === 0 ? h.lo : "rgba(255,255,255,.18)"}"/>`;
  return s;
};
const appGrid: Motif = ({ r, h }) => {
  let s = "";
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 4; x++) {
      const on = r() < 0.3;
      s += `<rect x="${92 + x * 15}" y="${8 + y * 15}" width="11" height="11" rx="3" fill="${on ? h.hi : "rgba(255,255,255,.14)"}"${on ? ` filter="url(#g)"` : ""}/>`;
    }
  return s;
};

// ---------- данные ----------
const database: Motif = ({ r, h }) => {
  const x = 118 + r() * 10;
  let s = "";
  for (let i = 2; i >= 0; i--) {
    const y = 12 + i * 12;
    s += `<path d="M${f(x - 18)} ${y} v10 a18 5 0 0 0 36 0 v-10" fill="rgba(255,255,255,.06)" stroke="${h.lo}" stroke-width="1.4"/>`;
    s += `<ellipse cx="${f(x)}" cy="${y}" rx="18" ry="5" fill="${i === 0 ? h.hi : "rgba(255,255,255,.08)"}" stroke="${h.hi}" stroke-width="1.4" opacity="${i === 0 ? 0.9 : 1}"/>`;
  }
  return s;
};
const scatter: Motif = ({ r, h }) => {
  let s = `<line x1="80" y1="52" x2="154" y2="52" stroke="rgba(255,255,255,.2)"/><line x1="80" y1="52" x2="80" y2="6" stroke="rgba(255,255,255,.2)"/>`;
  for (let i = 0; i < 22; i++) {
    const x = 84 + r() * 66;
    const y = 50 - (x - 84) * 0.55 + (r() - 0.5) * 18;
    s += `<circle cx="${f(x)}" cy="${f(Math.max(8, Math.min(50, y)))}" r="1.7" fill="${r() < 0.3 ? h.hi : h.lo}"/>`;
  }
  return s + `<line x1="84" y1="48" x2="152" y2="12" stroke="${h.hi}" stroke-width="1.8" stroke-dasharray="4 3" filter="url(#g)"/>`;
};

const GENERIC: Motif[] = [dots, bars, spark, rings, waves, nodes];
const BY_TOPIC: Record<Exclude<Topic, "generic">, Motif[]> = {
  ai: [neural, chip],
  security: [shield, lockScan],
  web: [browser, globe],
  languages: [codeLines, braces],
  cloud: [cloudUp, servers],
  oss: [branches, stars],
  market: [candles, donut],
  tools: [terminal, gear],
  mobile: [phone, appGrid],
  data: [database, scatter],
};

/** Число узоров -- для проверки и описания. */
export const MOTIF_COUNT = GENERIC.length + Object.values(BY_TOPIC).reduce((n, l) => n + l.length, 0);

/** Оттенок обложки по слагу (uk и en -- одинаковый). */
export function thumbHueKey(seed: string): string {
  return HUE_KEYS[hashOf(seed.replace(/-en$/, "")) % HUE_KEYS.length]!;
}

/**
 * Полная обложка (фон + узор + лёгкая сетка) как SVG-строка, поле 160×100.
 * seed -- слаг новости, kicker -- рубрика (по ней тема).
 */
export function thumbSvg(seed: string, kicker: string): string {
  const base = seed.replace(/-en$/, "");
  const k = hashOf(base);
  const h = THUMB_HUES[thumbHueKey(base)]!;
  const r = rng(k);
  const topic = topicOf(kicker);
  // В теме -- три из четырёх новостей с тематическим узором, каждая четвёртая -- с общим (чтобы не приедалось).
  const pool = topic !== "generic" && (k >>> 4) % 4 !== 0 ? BY_TOPIC[topic] : GENERIC;
  const motif = pool[(k >>> 8) % pool.length]!;
  // Вторым слоем -- общий узор очень бледно, для глубины.
  const back = GENERIC[(k >>> 12) % GENERIC.length]!;
  const u = k.toString(36);
  const backSvg = back === motif ? "" : `<g opacity=".18" transform="translate(${f(-10 - r() * 20)} ${f(30 + r() * 10)})">${back({ r, h })}</g>`;
  // id внутри SVG -- с суффиксом новости: на странице много обложек, одинаковые id ломали бы друг друга.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">` +
    `<defs><radialGradient id="bg" cx="${(k >>> 3) % 2 ? "15%" : "85%"}" cy="0%" r="120%"><stop offset="0" stop-color="${h.bg0}"/><stop offset=".5" stop-color="${h.bg1}"/><stop offset="1" stop-color="${h.bg2}"/></radialGradient>` +
    `<linearGradient id="lg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${h.lo}"/><stop offset="1" stop-color="${h.hi}"/></linearGradient>` +
    `<filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
    `<rect width="160" height="100" fill="url(#bg)"/>` +
    backSvg +
    `<g transform="translate(0 2)">${motif({ r, h })}</g>` +
    `</svg>`;
  return svg.replace(/id="(bg|lg|g)"/g, `id="$1-${u}"`).replace(/url\(#(bg|lg|g)\)/g, `url(#$1-${u})`);
}

export function thumbDataUri(seed: string, kicker: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(thumbSvg(seed, kicker)).toString("base64")}`;
}
