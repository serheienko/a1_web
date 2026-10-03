// app/game-map/music.ts -- фонова музика карти A1 (03.10.2026).
//
// Александр: «на карті іконка звуку і фонова музика в дусі Відьмака;
// треки грають один за одним у випадковому порядку, при повторному
// заході не з початку, перехід між треками плавний, як в iOS, і щоб
// не роздуло вагу».
//
// Як зроблено:
// 1. Черга. Треки перемішуються, черга і місце в треку запам'ятовуються
//    в браузері (localStorage). Наступний візит продовжує з того ж
//    місця. Коли черга скінчилась -- нове перемішування, і останній трек
//    не може стати першим (двічі поспіль одне й те саме не грає).
// 2. Плавний перехід. Два програвачі по черзі: за XFADE секунд до кінця
//    наступний трек вступає тихо й наростає, а старий згасає. Гучність
//    керується через Web Audio (GainNode), бо на iPhone звичайна
//    audio.volume не працює. Без Web Audio -- запасний шлях через volume.
// 3. Вага. Нічого не вантажиться, поки звук не ввімкнули. Далі -- лише
//    поточний трек і наступний за PREFETCH секунд до кінця. Формати:
//    opus у .ogg (Chrome/Firefox, 64 кбіт/с) і aac у .m4a (Safari, 96).
// 4. Без автозапуску (браузери забороняють звук без кліку). Вибір
//    «увімкнено» запам'ятовується: на новому заході музика вступає від
//    першого дотику до карти.
// 5. Вкладка у фоні -- пауза, повернулись -- грає далі.
//
// Один програвач на сторінку (синглтон): карта перемонтовується при
// зміні регіону, а музика при цьому не обривається. Гасить його
// обгортка ./game-map.tsx, коли сторінку карти покидають.

// Імена файлів у public/game-map/music (без розширення). Додати трек --
// покласти N.ogg і N.m4a і дописати сюди.
const TRACKS = ['1', '2', '3', '4', '5', '6', '7'];
const BASE = '/game-map/music/';
const KEY = 'a1-map-music';
const VOL = 0.4; // фон: чути, але не заважає
const XFADE = 6; // секунд перехресного переходу
const PREFETCH = 25; // за стільки секунд до кінця підвантажуємо наступний
const FADE_IN = 1.6;
const FADE_OUT = 0.6;

type Deck = { el: HTMLAudioElement; gain: GainNode | null; name: string | null; raf: number };
type Saved = { v: 1; on: boolean; q: string[]; i: number; t: number };

function shuffle(list: string[], avoidFirst?: string | null): string[] {
  const a = list.slice();
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    const x = a[k] as string; a[k] = a[j] as string; a[j] = x;
  }
  if (avoidFirst && a.length > 1 && a[0] === avoidFirst) {
    const j = 1 + Math.floor(Math.random() * (a.length - 1));
    const x = a[0] as string; a[0] = a[j] as string; a[j] = x;
  }
  return a;
}

function samePlaylist(q: unknown): q is string[] {
  return Array.isArray(q) && q.length === TRACKS.length && TRACKS.every((t) => q.includes(t));
}

// 0,1 с тиші: нею «благословляємо» другий програвач у момент кліку, бо
// iPhone дозволяє грати лише тим програвачам, які вже грали від дотику.
function silentWavUrl(): string {
  const n = 4410;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const s = (o: number, str: string) => { for (let k = 0; k < str.length; k++) v.setUint8(o + k, str.charCodeAt(k)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  s(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export class MapMusic {
  playing = false;
  private wanted = false;
  private q: string[] = [];
  private nq: string[] | null = null;
  private i = 0;
  private startAt = 0;
  private ctx: AudioContext | null = null;
  private decks: Deck[] = [];
  private cur = 0;
  private fading = false;
  private hidden = false;
  private errors = 0;
  private lastSave = 0;
  private timers: number[] = [];
  private subs = new Set<(on: boolean) => void>();
  private silent: string | null = null;
  private ogg: boolean | null = null;
  private offs: (() => void)[] = [];

  constructor() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null') as Saved | null;
      if (s && s.v === 1 && samePlaylist(s.q)) {
        this.q = s.q;
        this.i = Math.min(Math.max(0, s.i | 0), this.q.length - 1);
        this.startAt = Math.max(0, +s.t || 0);
        this.wanted = !!s.on;
      }
    } catch {
      /* приватний режим */
    }
    if (!this.q.length) { this.q = shuffle(TRACKS); this.i = 0; this.startAt = 0; }
    const onVis = () => this.onVisibility();
    const onHide = () => { this.capture(); this.save(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    this.offs.push(() => document.removeEventListener('visibilitychange', onVis), () => window.removeEventListener('pagehide', onHide));
  }

  private deck(k: number): Deck { return this.decks[k] as Deck; }

  subscribe(fn: (on: boolean) => void): () => void {
    this.subs.add(fn); fn(this.playing);
    return () => { this.subs.delete(fn); };
  }
  private emit() { this.subs.forEach((f) => f(this.playing)); }

  private save() {
    this.lastSave = Date.now();
    try {
      const s: Saved = { v: 1, on: this.wanted, q: this.q, i: this.i, t: Math.round(this.startAt * 10) / 10 };
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* приватний режим */
    }
  }
  private capture() {
    const d = this.deck(this.cur);
    if (d && d.name && this.playing) this.startAt = d.el.currentTime || 0;
  }
  private later(fn: () => void, ms: number) { this.timers.push(window.setTimeout(fn, ms)); }
  private clearTimers() { this.timers.forEach((t) => clearTimeout(t)); this.timers = []; }

  private url(name: string, el: HTMLAudioElement) {
    if (this.ogg === null) this.ogg = !!el.canPlayType('audio/ogg; codecs=opus');
    return BASE + name + (this.ogg ? '.ogg' : '.m4a');
  }
  private setSrc(d: Deck, name: string) {
    if (d.name === name) return;
    d.name = name;
    d.el.preload = 'auto';
    d.el.src = this.url(name, d.el);
    d.el.load();
  }

  private setGain(d: Deck, v: number) {
    cancelAnimationFrame(d.raf);
    if (d.gain && this.ctx) { d.gain.gain.cancelScheduledValues(this.ctx.currentTime); d.gain.gain.setValueAtTime(v, this.ctx.currentTime); }
    else d.el.volume = v;
  }
  private ramp(d: Deck, to: number, sec: number) {
    cancelAnimationFrame(d.raf);
    if (d.gain && this.ctx) {
      const g = d.gain.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + sec);
      return;
    }
    const from = d.el.volume, t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / (sec * 1000));
      d.el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) d.raf = requestAnimationFrame(step);
    };
    d.raf = requestAnimationFrame(step);
  }

  private ensure() {
    if (this.decks.length) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch {
      this.ctx = null;
    }
    for (let k = 0; k < 2; k++) {
      const el = new Audio();
      el.preload = 'none';
      el.setAttribute('playsinline', '');
      let gain: GainNode | null = null;
      if (this.ctx) {
        try {
          const src = this.ctx.createMediaElementSource(el);
          gain = this.ctx.createGain();
          gain.gain.value = 0;
          src.connect(gain).connect(this.ctx.destination);
        } catch {
          gain = null;
        }
      }
      if (!gain) el.volume = 0;
      const d: Deck = { el, gain, name: null, raf: 0 };
      el.addEventListener('timeupdate', () => this.onTime(d));
      el.addEventListener('ended', () => { if (d === this.deck(this.cur) && this.playing && !this.fading) this.crossfade(true); });
      el.addEventListener('playing', () => { if (d === this.deck(this.cur)) this.errors = 0; });
      el.addEventListener('error', () => { if (d.name && d === this.deck(this.cur) && this.playing) this.onError(); });
      this.decks.push(d);
    }
  }

  // Викликати лише з кліку/дотику (інакше браузер не дасть грати).
  start() {
    if (this.playing) return;
    this.ensure();
    void this.ctx?.resume().catch(() => {});
    const d = this.deck(this.cur);
    const other = this.deck(1 - this.cur);
    // Збережене місце (якщо трек майже скінчився -- граємо його з початку).
    this.setSrc(d, this.q[this.i] as string);
    const at = this.startAt;
    const seek = () => {
      const dur = d.el.duration;
      if (at > 0 && isFinite(dur) && at < dur - XFADE - 1) { try { d.el.currentTime = at; } catch { /* ок */ } }
    };
    if (d.el.readyState >= 1) seek(); else d.el.addEventListener('loadedmetadata', seek, { once: true });
    this.setGain(d, 0);
    this.playing = true; this.wanted = true; this.hidden = false;
    this.emit(); this.save();
    d.el.play().then(() => {
      if (!this.playing) { d.el.pause(); return; }
      this.ramp(d, VOL, FADE_IN);
    }).catch(() => {
      // браузер відмовив (немає файлу, політика автозапуску)
      this.playing = false; this.emit();
    });
    // «Благословити» другий програвач тишею в межах того ж дотику.
    if (!other.name && !other.el.src) {
      this.silent ||= silentWavUrl();
      other.el.src = this.silent;
      other.el.play().then(() => other.el.pause()).catch(() => {});
    }
  }

  stop() {
    this.wanted = false;
    if (!this.playing) { this.save(); this.emit(); return; }
    this.capture();
    this.playing = false; this.fading = false;
    this.clearTimers();
    this.emit(); this.save();
    const ds = this.decks.slice();
    ds.forEach((d) => this.ramp(d, 0, FADE_OUT));
    this.later(() => { if (!this.playing) ds.forEach((d) => d.el.pause()); }, FADE_OUT * 1000 + 80);
  }

  toggle() { if (this.playing) this.stop(); else this.start(); }

  // Дотик до карти: якщо людина раніше лишила музику ввімкненою -- вмикаємо.
  autoResume() { if (this.wanted && !this.playing) this.start(); }

  private upcoming(): string {
    if (this.i + 1 < this.q.length) return this.q[this.i + 1] as string;
    this.nq ||= shuffle(TRACKS, this.q[this.q.length - 1]);
    return this.nq[0] as string;
  }
  private advance() {
    if (this.i + 1 < this.q.length) this.i++;
    else { this.q = this.nq || shuffle(TRACKS, this.q[this.q.length - 1]); this.nq = null; this.i = 0; }
    this.startAt = 0;
  }

  private onTime(d: Deck) {
    if (d !== this.deck(this.cur) || !this.playing || this.hidden) return;
    const t = d.el.currentTime, dur = d.el.duration;
    if (Date.now() - this.lastSave > 4000) { this.startAt = t; this.save(); }
    if (!isFinite(dur) || dur <= 0 || this.fading) return;
    const left = dur - t;
    if (left <= PREFETCH) this.setSrc(this.deck(1 - this.cur), this.upcoming());
    if (left <= XFADE) this.crossfade(false);
  }

  private crossfade(fast: boolean) {
    const from = this.deck(this.cur);
    const to = this.deck(1 - this.cur);
    const name = this.upcoming();
    this.advance();
    this.setSrc(to, name);
    try { to.el.currentTime = 0; } catch { /* ок */ }
    this.setGain(to, 0);
    this.cur = 1 - this.cur;
    this.fading = true;
    this.save();
    const sec = fast ? 1.2 : XFADE;
    to.el.play().then(() => {
      if (this.playing && this.deck(this.cur) === to) this.ramp(to, VOL, sec);
    }).catch(() => { if (this.playing && this.deck(this.cur) === to) this.onError(); });
    this.ramp(from, 0, sec);
    this.later(() => { from.el.pause(); this.fading = false; }, sec * 1000 + 150);
  }

  private onError() {
    this.errors++;
    if (this.errors > TRACKS.length) { this.stop(); return; }
    this.fading = false;
    this.crossfade(true);
  }

  private onVisibility() {
    if (!this.decks.length) return;
    if (document.hidden) {
      if (!this.playing) return;
      this.capture(); this.save();
      this.hidden = true;
      this.clearTimers(); this.fading = false;
      this.decks.forEach((d, k) => { d.el.pause(); if (k !== this.cur) this.setGain(d, 0); });
      return;
    }
    if (!this.hidden || !this.playing) return;
    this.hidden = false;
    const d = this.deck(this.cur);
    const resume = () => {
      this.setGain(d, 0);
      d.el.play().then(() => this.ramp(d, VOL, 1)).catch(() => { this.playing = false; this.emit(); });
    };
    if (this.ctx && this.ctx.state !== 'running') {
      this.ctx.resume().then(() => {
        // iPhone інколи не відпускає звук без нового дотику: тоді кнопка
        // гасне, а перший дотик до карти увімкне музику знову.
        if (this.ctx && this.ctx.state === 'running') resume(); else { this.playing = false; this.emit(); }
      }).catch(() => { this.playing = false; this.emit(); });
    } else resume();
  }

  dispose() {
    this.capture(); this.save();
    this.clearTimers();
    this.decks.forEach((d) => { cancelAnimationFrame(d.raf); d.el.pause(); d.el.removeAttribute('src'); d.el.load(); });
    this.decks = [];
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    if (this.silent) URL.revokeObjectURL(this.silent);
    this.offs.forEach((f) => f());
    this.playing = false; this.emit(); this.subs.clear();
  }
}

let shared: MapMusic | null = null;
export function getMapMusic(): MapMusic {
  shared ||= new MapMusic();
  return shared;
}
export function disposeMapMusic() {
  shared?.dispose();
  shared = null;
}
