// app/download-new/story-controller.tsx
//
// Невидимый «режиссёр» прокрутки-презентации. Делает две вещи:
//  1) элементы с data-reveal появляются, когда доезжают до экрана
//     (ставит им data-in), а шаги получают data-in, и в их «телефонах»
//     запускаются сценки;
//  2) пишет в --story-p долю пройденного пути (0..1) — по ней растёт
//     линия между шагами.
// Пока скрипт не сработал, всё видно (скрывает только [data-ready]), поэтому
// без JS страница читается целиком — и поисковик видит весь текст.
"use client";

import { useEffect } from "react";

export function StoryController({ targetId }: { targetId: string }) {
  useEffect(() => {
    const root = document.getElementById(targetId);
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.setAttribute("data-in", "1"));
      return;
    }

    root.setAttribute("data-ready", "1");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "1");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach((el) => io.observe(el));

    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = root!.getBoundingClientRect();
        const p = (window.innerHeight * 0.65 - r.top) / Math.max(1, r.height);
        root!.style.setProperty("--story-p", Math.max(0, Math.min(1, p)).toFixed(3));
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      root.removeAttribute("data-ready");
    };
  }, [targetId]);

  return null;
}
