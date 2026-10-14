"use client";

// components/nav-progress.tsx -- тонкая полоска загрузки вверху экрана при переходе между страницами.
//
// 14.10.2026 (Александр: «нажимаешь с телефона на статистику -- и ничего не происходит, даже лоудера нет,
// потом бах -- резко открывается; ощущение, что баг»). Переходы по <Link> в Next.js идут без перезагрузки
// страницы, поэтому браузер свою полоску не показывает, а скелета загрузки на корне у нас нет (убран
// ради «мягкого 404», см. коммит 477bfe5). Пока сервер собирает тяжёлую страницу (холодная /stats --
// до 30+ секунд), человек не видел вообще ничего.
//
// Как работает: ловим клик по внутренней ссылке -> сразу показываем полоску, она ползёт к 90 %;
// как только адрес в браузере сменился (Next зовёт history.pushState в момент показа новой страницы) --
// добегает до 100 % и гаснет. Ссылки в новой вкладке, с модификаторами, якоря на той же странице,
// mailto/tel и внешние сайты -- не трогаем.

import { useEffect, useRef, useState } from "react";

const START = 0.08;
const CAP = 0.9;
const GIVE_UP_MS = 90_000;

function isInternalNav(e: MouseEvent): boolean {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const a = e.target instanceof Element ? (e.target.closest("a[href]") as HTMLAnchorElement | null) : null;
  if (!a) return false;
  if (a.target && a.target !== "_self") return false;
  if (a.hasAttribute("download")) return false;
  const raw = a.getAttribute("href") || "";
  if (!raw || raw.startsWith("#") || /^(mailto|tel|sms|javascript):/i.test(raw)) return false;
  let url: URL;
  try {
    url = new URL(a.href, window.location.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  // та же страница (в т.ч. только якорь) -- перехода не будет
  if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
  // файлы и API -- не страницы
  if (url.pathname.startsWith("/api/") || /\.(pdf|png|jpe?g|webp|svg|xml|txt|zip)$/i.test(url.pathname)) return false;
  return true;
}

export function NavProgress() {
  const [value, setValue] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const giveUp = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);

  useEffect(() => {
    const clear = () => {
      if (timer.current) clearInterval(timer.current);
      if (giveUp.current) clearTimeout(giveUp.current);
      timer.current = null;
      giveUp.current = null;
    };

    const finish = () => {
      if (!active.current) return;
      active.current = false;
      clear();
      setValue(1);
      if (hide.current) clearTimeout(hide.current);
      hide.current = setTimeout(() => {
        setVisible(false);
        setValue(0);
      }, 280);
    };

    const start = () => {
      if (hide.current) clearTimeout(hide.current);
      clear();
      active.current = true;
      setVisible(true);
      setValue(START);
      // ползём к 90 %: чем ближе, тем медленнее -- на долгой странице полоска не «застывает» резко
      timer.current = setInterval(() => {
        setValue((v) => (v >= CAP ? v : v + (CAP - v) * 0.06));
      }, 200);
      giveUp.current = setTimeout(finish, GIVE_UP_MS);
    };

    const onClick = (e: MouseEvent) => {
      if (isInternalNav(e)) start();
    };

    // Новый адрес = новая страница уже на экране.
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    let lastPath = window.location.pathname + window.location.search;
    const check = () => {
      const now = window.location.pathname + window.location.search;
      if (now !== lastPath) {
        lastPath = now;
        finish();
      }
    };
    history.pushState = function (...args: Parameters<History["pushState"]>) {
      const r = origPush.apply(this, args);
      check();
      return r;
    };
    history.replaceState = function (...args: Parameters<History["replaceState"]>) {
      const r = origReplace.apply(this, args);
      check();
      return r;
    };
    const onPop = () => check();

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    // Ушли со страницы целиком (обычная загрузка) -- полоску не держим.
    window.addEventListener("pageshow", finish);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pageshow", finish);
      history.pushState = origPush;
      history.replaceState = origReplace;
      clear();
      if (hide.current) clearTimeout(hide.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[1000] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 250ms ease" }}
    >
      <div
        className="h-full origin-left rounded-r-full bg-[linear-gradient(90deg,#335ef7,#8b5cf6,#22d3ee)] shadow-[0_0_8px_rgba(51,94,247,0.6)]"
        style={{ transform: `scaleX(${value})`, transition: "transform 200ms ease-out" }}
      />
    </div>
  );
}
