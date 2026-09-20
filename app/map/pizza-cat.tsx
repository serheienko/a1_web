// app/map/pizza-cat.tsx — кот с пиццей справа от заголовка на /map.
//
// Aleksandr, 2026-09-20: «видишь справа есть пустое место, поставь туда
// pizza cat и пусть появляется плавно при загрузке» — прислал .tgs,
// телеграмный стикер. Внутри это обычный Lottie (векторная анимация,
// 512×512, 3 секунды, зациклена), просто сжатый gzip'ом.
//
// Два решения, чтобы эта картинка не утяжелила сайт:
//
// 1. Сама анимация лежит НЕ в коде, а в public/pizza-cat.json (290 КБ) и
//    подгружается запросом. Так она не попадает в JS-бандл и не приезжает
//    к людям, которые открыли любую другую страницу.
// 2. Библиотека lottie-web (ещё ~250 КБ) подключается динамическим
//    import() уже в браузере, после того как страница показалась. До этого
//    момента страница полностью читается без неё — кот тут украшение,
//    а не содержание.
//
// Обе вещи хорошо жмутся при передаче, так что по факту это порядка
// 150 КБ на одну эту страницу.
//
// Кто попросил систему убрать анимации — получает статичный первый кадр:
// lottie умеет это сам через autoplay: false.
"use client";

import { useEffect, useRef, useState } from "react";

export function PizzaCat() {
  const box = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let anim: { destroy: () => void } | null = null;
    let dead = false;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      try {
        const lottie = (await import("lottie-web")).default;
        if (dead || !box.current) return;
        anim = lottie.loadAnimation({
          container: box.current,
          renderer: "svg",
          loop: !calm,
          autoplay: !calm,
          path: "/pizza-cat.json",
        });
        // Проявляем только когда кадр уже отрисован — иначе в плавное
        // появление попадёт пустой прямоугольник.
        (anim as unknown as { addEventListener: (e: string, f: () => void) => void })
          .addEventListener("DOMLoaded", () => { if (!dead) setShown(true); });
      } catch {
        // Не загрузилось — и ладно: на странице просто не будет кота.
      }
    })();

    return () => { dead = true; anim?.destroy(); };
  }, []);

  return (
    <div
      ref={box}
      aria-hidden
      className={`pointer-events-none mx-auto w-full max-w-[17rem] transition-opacity duration-700 ease-out ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
