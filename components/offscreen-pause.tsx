// components/offscreen-pause.tsx -- бесконечные CSS-анимации спят за краем экрана (29.10.2026).
//
// Александр: «сайт чуть-чуть тормозит Мак». Замер: вкладка без дела держала
// процессор на 20-60% -- переливы и пятна футера, 160 мигающих квадратиков на
// CV Builder и пр. крутятся всегда, даже когда их не видно. Любой блок с
// атрибутом data-pause-offscreen получает data-offscreen, пока он за краем
// экрана, и CSS (app/globals.css) ставит его анимации на паузу. На экране всё
// выглядит как раньше.
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function OffscreenPause() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.removeAttribute("data-offscreen");
          else e.target.setAttribute("data-offscreen", "");
        }
      },
      { rootMargin: "100px" },
    );
    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll("[data-pause-offscreen]").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    };
    scan();
    // Блоки, которые появляются позже (подгрузка, клиентские экраны).
    let t: ReturnType<typeof setTimeout> | null = null;
    const mo = new MutationObserver(() => {
      if (t) return;
      t = setTimeout(() => {
        t = null;
        scan();
      }, 500);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
      if (t) clearTimeout(t);
    };
  }, [pathname]);
  return null;
}
