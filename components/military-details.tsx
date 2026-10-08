"use client";

// Плавное раскрытие баннера «Військо в цифрах» (08.10.2026, Александр:
// «чтобы список и кнопка плавно разъезжались»). Остаётся обычным <details>:
// без JS работает как раньше, всё содержимое лежит в HTML. JS только
// анимирует высоту панели и сдвигает всё, что ниже (фильтры, список вакансий).

import { useRef, type ReactNode } from "react";

const OPEN_MS = 420;
const CLOSE_MS = 320;
const EASE = "cubic-bezier(.22,.8,.24,1)";

export function MilitaryDetails({
  open,
  className,
  summary,
  children,
}: {
  open: boolean;
  className?: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);

  function onToggleClick(e: React.MouseEvent) {
    const d = detailsRef.current;
    const p = panelRef.current;
    if (!d || !p || typeof p.animate !== "function") return; // нет WAAPI -- обычное поведение
    e.preventDefault();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    animRef.current?.cancel();
    animRef.current = null;
    d.classList.remove("mil-closing");

    if (!d.open) {
      d.open = true;
      if (reduce) return;
      const h = p.offsetHeight;
      p.style.overflow = "hidden";
      const a = p.animate(
        { height: ["0px", `${h}px`], opacity: [0, 1] },
        { duration: OPEN_MS, easing: EASE },
      );
      animRef.current = a;
      a.onfinish = a.oncancel = () => {
        p.style.overflow = "";
        if (animRef.current === a) animRef.current = null;
      };
    } else {
      if (reduce) {
        d.open = false;
        return;
      }
      const h = p.offsetHeight;
      d.classList.add("mil-closing"); // подпись и стрелка меняются сразу
      p.style.overflow = "hidden";
      const a = p.animate(
        { height: [`${h}px`, "0px"], opacity: [1, 0] },
        { duration: CLOSE_MS, easing: EASE },
      );
      animRef.current = a;
      a.onfinish = () => {
        d.open = false;
        d.classList.remove("mil-closing");
        p.style.overflow = "";
        if (animRef.current === a) animRef.current = null;
      };
      a.oncancel = () => {
        p.style.overflow = "";
      };
    }
  }

  return (
    <details ref={detailsRef} open={open} className={className}>
      <summary
        onClick={onToggleClick}
        className="relative block cursor-pointer select-none overflow-hidden p-5 sm:p-6"
      >
        {summary}
      </summary>
      <div ref={panelRef}>{children}</div>
    </details>
  );
}
