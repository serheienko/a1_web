// components/app-promo.tsx
//
// 30.09.2026 (Александр: «ролик-презентация приложения справа от ленты
// в рамке телефона, показывать пару раз, крестиком убирать, чтобы
// пропадал затуханием»).
//
// Что это. Маленькое видео-превью приложения (укр. для украинской
// ленты, англ. для остального мира) в рамке телефона в свободном поле
// справа от ленты на широком десктопе. Тап по нему ведёт на /download
// (там кнопки магазинов и QR). Справа, а не слева: так оно стоит рядом
// с плавающими кнопками «Чати»/«+» и читается как «вот приложение».
//
// Когда показываем.
//   • только на «/» и «/talents» (лента) и только при ширине окна
//     ≥ 1280px: колонка ленты 768px + по ~256px свободного места с
//     каждой стороны. Уже — не показываем и видео не скачиваем;
//   • не больше двух визитов. «Визит» = одна вкладка/сессия: счётчик
//     в localStorage растёт один раз за сессию (sessionStorage-метка),
//     поэтому обновление страницы внутри визита не тратит показ;
//   • крестик = «больше никогда» (dismissed в localStorage), плавное
//     затухание 400 мс и только потом размонтирование.
//
// Двигать. Окно (видео + карточка с QR) можно перетащить мышью куда
// угодно (30.09.2026, Александр: «таскать по экрану туда-сюда, но
// дефолтное место где сейчас»). Храним смещение ОТ дефолтной позиции
// (а не абсолютные координаты): пока не двигали — стоит ровно там, где
// стояло, а на другой ширине окна дефолт сам подстраивается. Смещение
// держим в пределах экрана и помним в localStorage (ошибки глотаем).
// Короткий клик без движения по-прежнему ведёт на /download.
//
// Видео грузится только после монтирования и простоя браузера
// (requestIdleCallback), preload="none" пока не нужно; без звука, по
// кругу, playsInline. При prefers-reduced-motion — только постер.
// Любые исключения localStorage (приватный режим) глотаем: тогда
// просто не показываем, чтобы не мозолить глаза без возможности
// закрыть навсегда.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useActiveLocale } from "@/lib/use-active-locale";

const KEY = "a1_app_promo_v1";
const SEEN = "a1_app_promo_seen";
const POS_KEY = "a1_app_promo_pos_v1";
const DRAG_THRESHOLD = 5; // px: меньше — это клик, не перетаскивание
const EDGE = 8; // px отступ от края экрана при ограничении
const TOP_MIN = 88; // px: липкая шапка сайта (≈77px, z-45) выше окна — под неё не заезжаем
const MAX_VISITS = 2;
const MIN_WIDTH = 1280;
const FEED_PATHS = new Set(["/", "/talents"]);

// Нижний край кадра в роликах светится тонкой белой полосой (артефакт
// краёв исходных скриншотов). Увеличиваем картинку на 4% от верхней
// кромки: лишнее уходит под скругление рамки, полоса обрезается.
const MEDIA_FIX = { transform: "scale(1.04)", transformOrigin: "50% 0" } as const;

// QR из /download (он ведёт на умную ссылку /get: iPhone уходит в App
// Store, Android в Google Play). Тот же путь, что проверен на странице.
const QR_PATH =
  "M0 0h7v1h-7zM9 0h2v1h-2zM12 0h4v1h-4zM18 0h1v1h-1zM22 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h2v1h-2zM15 1h1v1h-1zM20 1h1v1h-1zM22 1h1v1h-1zM28 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM8 2h1v1h-1zM10 2h2v1h-2zM14 2h1v1h-1zM16 2h1v1h-1zM19 2h2v1h-2zM22 2h1v1h-1zM24 2h3v1h-3zM28 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h2v1h-2zM11 3h2v1h-2zM14 3h2v1h-2zM17 3h4v1h-4zM22 3h1v1h-1zM24 3h3v1h-3zM28 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM12 4h4v1h-4zM17 4h4v1h-4zM22 4h1v1h-1zM24 4h3v1h-3zM28 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM13 5h2v1h-2zM16 5h2v1h-2zM20 5h1v1h-1zM22 5h1v1h-1zM28 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h7v1h-7zM8 7h3v1h-3zM12 7h2v1h-2zM19 7h1v1h-1zM0 8h1v1h-1zM6 8h1v1h-1zM8 8h3v1h-3zM12 8h1v1h-1zM14 8h2v1h-2zM17 8h1v1h-1zM21 8h2v1h-2zM25 8h3v1h-3zM0 9h1v1h-1zM3 9h3v1h-3zM7 9h3v1h-3zM12 9h1v1h-1zM14 9h1v1h-1zM18 9h2v1h-2zM24 9h1v1h-1zM26 9h2v1h-2zM5 10h2v1h-2zM10 10h1v1h-1zM12 10h1v1h-1zM17 10h1v1h-1zM22 10h2v1h-2zM1 11h2v1h-2zM5 11h1v1h-1zM8 11h1v1h-1zM14 11h3v1h-3zM19 11h2v1h-2zM22 11h1v1h-1zM24 11h2v1h-2zM3 12h2v1h-2zM6 12h2v1h-2zM10 12h1v1h-1zM12 12h3v1h-3zM20 12h1v1h-1zM22 12h1v1h-1zM28 12h1v1h-1zM0 13h1v1h-1zM2 13h1v1h-1zM7 13h1v1h-1zM9 13h1v1h-1zM12 13h3v1h-3zM18 13h2v1h-2zM22 13h3v1h-3zM27 13h2v1h-2zM0 14h1v1h-1zM5 14h3v1h-3zM10 14h1v1h-1zM13 14h4v1h-4zM21 14h1v1h-1zM25 14h2v1h-2zM2 15h4v1h-4zM7 15h1v1h-1zM10 15h1v1h-1zM12 15h3v1h-3zM16 15h1v1h-1zM20 15h3v1h-3zM24 15h1v1h-1zM26 15h1v1h-1zM28 15h1v1h-1zM1 16h3v1h-3zM5 16h2v1h-2zM9 16h1v1h-1zM12 16h1v1h-1zM14 16h2v1h-2zM17 16h1v1h-1zM20 16h2v1h-2zM25 16h2v1h-2zM0 17h2v1h-2zM4 17h1v1h-1zM7 17h1v1h-1zM9 17h1v1h-1zM12 17h1v1h-1zM16 17h1v1h-1zM19 17h6v1h-6zM26 17h3v1h-3zM0 18h4v1h-4zM5 18h3v1h-3zM11 18h1v1h-1zM13 18h2v1h-2zM16 18h2v1h-2zM19 18h4v1h-4zM25 18h1v1h-1zM28 18h1v1h-1zM0 19h1v1h-1zM4 19h2v1h-2zM7 19h1v1h-1zM9 19h2v1h-2zM12 19h1v1h-1zM14 19h3v1h-3zM18 19h1v1h-1zM21 19h1v1h-1zM23 19h1v1h-1zM0 20h1v1h-1zM2 20h1v1h-1zM4 20h1v1h-1zM6 20h3v1h-3zM10 20h1v1h-1zM12 20h1v1h-1zM16 20h1v1h-1zM18 20h1v1h-1zM20 20h5v1h-5zM26 20h3v1h-3zM8 21h1v1h-1zM10 21h1v1h-1zM12 21h2v1h-2zM16 21h5v1h-5zM24 21h2v1h-2zM0 22h7v1h-7zM10 22h8v1h-8zM19 22h2v1h-2zM22 22h1v1h-1zM24 22h3v1h-3zM0 23h1v1h-1zM6 23h1v1h-1zM12 23h2v1h-2zM17 23h4v1h-4zM24 23h1v1h-1zM27 23h2v1h-2zM0 24h1v1h-1zM2 24h3v1h-3zM6 24h1v1h-1zM10 24h4v1h-4zM15 24h3v1h-3zM19 24h7v1h-7zM27 24h1v1h-1zM0 25h1v1h-1zM2 25h3v1h-3zM6 25h1v1h-1zM9 25h2v1h-2zM12 25h1v1h-1zM16 25h1v1h-1zM18 25h1v1h-1zM21 25h1v1h-1zM25 25h3v1h-3zM0 26h1v1h-1zM2 26h3v1h-3zM6 26h1v1h-1zM9 26h6v1h-6zM18 26h1v1h-1zM21 26h7v1h-7zM0 27h1v1h-1zM6 27h1v1h-1zM9 27h1v1h-1zM11 27h1v1h-1zM15 27h1v1h-1zM19 27h1v1h-1zM22 27h1v1h-1zM25 27h2v1h-2zM28 27h1v1h-1zM0 28h7v1h-7zM8 28h1v1h-1zM12 28h2v1h-2zM16 28h1v1h-1zM18 28h2v1h-2zM26 28h1v1h-1z";

type State = { views: number; dismissed: boolean };

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { views: 0, dismissed: false };
    const p = JSON.parse(raw) as Partial<State>;
    return { views: Number(p.views) || 0, dismissed: !!p.dismissed };
  } catch {
    return { views: MAX_VISITS, dismissed: true };
  }
}

function write(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode — ignore */
  }
}

type Off = { x: number; y: number };

function readOff(): Off {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return { x: 0, y: 0 };
    const p = JSON.parse(raw) as Partial<Off>;
    return { x: Number(p.x) || 0, y: Number(p.y) || 0 };
  } catch {
    return { x: 0, y: 0 };
  }
}

function writeOff(o: Off) {
  try {
    if (o.x === 0 && o.y === 0) localStorage.removeItem(POS_KEY);
    else localStorage.setItem(POS_KEY, JSON.stringify(o));
  } catch {
    /* private mode — ignore */
  }
}

export function AppPromo() {
  const pathname = usePathname();
  const locale = useActiveLocale();
  const [wide, setWide] = useState(false);
  const [mounted, setMounted] = useState(false); // решение «показывать»
  const [visible, setVisible] = useState(false); // для fade in/out
  const [media, setMedia] = useState(false); // можно грузить видео
  const [reduce, setReduce] = useState(false);
  const decided = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [off, setOff] = useState<Off>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const offRef = useRef<Off>({ x: 0, y: 0 });
  const drag = useRef<{
    id: number;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    rect: DOMRect;
    moved: boolean;
  } | null>(null);
  const justDragged = useRef(false);

  // Не даём окну уехать за экран: прямоугольник после сдвига обязан
  // остаться целиком внутри окна браузера (с небольшим отступом).
  function clampOff(o: Off, rect: DOMRect, curr: Off): Off {
    const baseLeft = rect.left - curr.x;
    const baseTop = rect.top - curr.y;
    const minX = EDGE - baseLeft;
    const maxX = window.innerWidth - EDGE - rect.width - baseLeft;
    const minY = TOP_MIN - baseTop;
    const maxY = window.innerHeight - EDGE - rect.height - baseTop;
    return {
      x: Math.round(Math.min(Math.max(o.x, Math.min(minX, 0)), Math.max(maxX, 0))),
      y: Math.round(Math.min(Math.max(o.y, Math.min(minY, 0)), Math.max(maxY, 0))),
    };
  }

  function applyOff(o: Off) {
    offRef.current = o;
    setOff(o);
  }

  useEffect(() => {
    applyOff(readOff());
  }, []);

  // После ресайза окна возвращаем плавающее окно в видимую область.
  useEffect(() => {
    function onResize() {
      const el = boxRef.current;
      if (!el) return;
      const cur = offRef.current;
      if (cur.x === 0 && cur.y === 0) return;
      const next = clampOff(cur, el.getBoundingClientRect(), cur);
      if (next.x !== cur.x || next.y !== cur.y) {
        applyOff(next);
        writeOff(next);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return; // крестик
    const el = boxRef.current;
    if (!el) return;
    drag.current = {
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      ox: offRef.current.x,
      oy: offRef.current.y,
      rect: el.getBoundingClientRect(),
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.moved = true;
      setDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    applyOff(clampOff({ x: d.ox + dx, y: d.oy + dy }, d.rect, { x: d.ox, y: d.oy }));
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.moved) {
      justDragged.current = true;
      window.setTimeout(() => (justDragged.current = false), 0);
      setDragging(false);
      writeOff(offRef.current);
    }
  }

  // Клик, которым закончилось перетаскивание, не должен открывать /download.
  function onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (justDragged.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MIN_WIDTH}px)`);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    return () => mq.removeEventListener("change", on);
  }, []);

  const onFeed = !!pathname && FEED_PATHS.has(pathname);

  useEffect(() => {
    if (!wide || !onFeed || decided.current) return;
    decided.current = true;
    const s = read();
    if (s.dismissed) return;
    let inSession = false;
    try {
      inSession = sessionStorage.getItem(SEEN) === "1";
    } catch {
      return;
    }
    if (!inSession) {
      if (s.views >= MAX_VISITS) return;
      write({ ...s, views: s.views + 1 });
      try {
        sessionStorage.setItem(SEEN, "1");
      } catch {
        /* ignore */
      }
    }
    setMounted(true);
    const t = window.setTimeout(() => setVisible(true), 900);
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 600));
    idle(() => setMedia(true));
    return () => window.clearTimeout(t);
  }, [wide, onFeed]);

  function close(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    write({ ...read(), dismissed: true });
    setVisible(false);
    window.setTimeout(() => setMounted(false), 450);
  }

  if (!mounted || !wide || !onFeed) return null;

  const l = locale === "uk" ? "ua" : "en";
  const label = locale === "uk" ? "Завантажити A1" : "Get the A1 app";
  const closeLabel = locale === "uk" ? "Закрити" : "Close";
  const qrTitle = locale === "uk" ? "Скануй і завантаж" : "Scan to download";
  const qrHint = "App Store · Google Play";

  return (
    <div
      ref={boxRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      className="pointer-events-none fixed z-30 transition-opacity duration-[400ms] ease-out"
      style={{
        transform: `translate(${off.x}px, ${off.y}px)`,
        touchAction: "none",
        userSelect: "none",
        cursor: dragging ? "grabbing" : undefined,
        top: 96,
        left: "calc(50% + 384px + 28px)",
        width: "clamp(156px, calc(((100vw - 768px) / 2 - 56px) * 0.82), 230px)",
        opacity: visible ? 1 : 0,
      }}
    >
      <Link
        href="/download"
        aria-label={label}
        draggable={false}
        className="pointer-events-auto relative block cursor-grab rounded-[34px] bg-neutral-950 p-[7px] shadow-[0_24px_60px_rgba(20,10,80,0.35)] ring-1 ring-white/15 transition-transform duration-300 hover:-translate-y-1"
      >
        <div className="relative overflow-hidden rounded-[28px] bg-black" style={{ aspectRatio: "9 / 16" }}>
          {media && !reduce ? (
            <video
              key={l}
              className="h-full w-full object-cover"
              style={MEDIA_FIX}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={`/promo/a1-promo-${l}.jpg`}
            >
              <source src={`/promo/a1-promo-${l}.webm`} type="video/webm" />
              <source src={`/promo/a1-promo-${l}.mp4`} type="video/mp4" />
            </video>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="h-full w-full object-cover"
              style={MEDIA_FIX}
              src={`/promo/a1-promo-${l}.jpg`}
              alt=""
              draggable={false}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={closeLabel}
          title={closeLabel}
          className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-700 shadow-lg ring-1 ring-black/10 transition duration-200 ease-out hover:rotate-90 hover:scale-110 hover:bg-neutral-900 hover:text-white hover:shadow-xl active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </Link>
        <Link
          href="/download"
          aria-label={label}
          draggable={false}
          className="pointer-events-auto mt-2.5 cursor-grab flex items-center gap-3 rounded-[22px] px-3 py-2.5 text-white ring-1 ring-white/20 transition-transform duration-300 hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.95), rgba(59,91,255,0.95))",
            boxShadow: "0 12px 30px rgba(60,40,200,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          <span className="flex h-[58px] w-[58px] flex-none items-center justify-center rounded-[12px] bg-white p-[5px] text-neutral-950">
            <svg viewBox="-1 -1 31 31" className="h-full w-full" shapeRendering="crispEdges" aria-hidden="true">
              <path fill="currentColor" d={QR_PATH} />
            </svg>
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[13px] font-semibold">{qrTitle}</span>
            <span className="mt-0.5 block text-[10.5px] text-white/75">{qrHint}</span>
          </span>
        </Link>
    </div>
  );
}
