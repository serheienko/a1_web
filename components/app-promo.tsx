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
const MAX_VISITS = 2;
const MIN_WIDTH = 1280;
const FEED_PATHS = new Set(["/", "/talents"]);

// Нижний край кадра в роликах светится тонкой белой полосой (артефакт
// краёв исходных скриншотов). Увеличиваем картинку на 4% от верхней
// кромки: лишнее уходит под скругление рамки, полоса обрезается.
const MEDIA_FIX = { transform: "scale(1.04)", transformOrigin: "50% 0" } as const;

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

export function AppPromo() {
  const pathname = usePathname();
  const locale = useActiveLocale();
  const [wide, setWide] = useState(false);
  const [mounted, setMounted] = useState(false); // решение «показывать»
  const [visible, setVisible] = useState(false); // для fade in/out
  const [media, setMedia] = useState(false); // можно грузить видео
  const [reduce, setReduce] = useState(false);
  const decided = useRef(false);

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

  return (
    <div
      className="pointer-events-none fixed z-30 transition-opacity duration-[400ms] ease-out"
      style={{
        top: 96,
        left: "calc(50% + 384px + 28px)",
        width: "clamp(156px, calc(((100vw - 768px) / 2 - 56px) * 0.82), 230px)",
        opacity: visible ? 1 : 0,
      }}
    >
      <Link
        href="/download"
        aria-label={label}
        className="pointer-events-auto relative block rounded-[34px] bg-neutral-950 p-[7px] shadow-[0_24px_60px_rgba(20,10,80,0.35)] ring-1 ring-white/15 transition-transform duration-300 hover:-translate-y-1"
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
    </div>
  );
}
