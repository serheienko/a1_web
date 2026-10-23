// app/download-new/stats-pill.tsx
//
// Aleksandr, 23.10.2026: «зелёная пульсирующая точка, число вакансий; по нажатию
// разворачивается». Потом: «список вбок, не вниз; на десктопе показывать всё сразу и
// без вида кнопки».
//
// Телефон: свёрнуто «● 53 040 вакансій ›». Нажатие раскрывает плашку ВБОК одной
// строкой: у каждой цифры подпись под ней. Закрывается повторным нажатием, нажатием
// в сторону или Esc. Компьютер: всегда показано всё, строка статуса без рамки и
// заливки, кнопки нет (CSS её скрывает, поэтому и с клавиатуры в неё не попасть).
// Подписи приходят готовыми из серверной страницы (девять языков), числа живые из
// ./live-number.tsx.
"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { LiveNumber } from "./live-number";
import n from "./download-new.module.css";

export function StatsPill({
  jobs,
  companies,
  countries,
  today,
}: {
  jobs: ReactNode;
  companies: ReactNode;
  countries: ReactNode;
  today: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const labelId = useId();

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={n.statsWrap} ref={ref}>
      <div className={n.stats} data-open={open ? "1" : undefined}>
        <span className={n.liveDot} aria-hidden="true" />
        <span className={n.item}>
          <LiveNumber field="jobs" className={n.num} />
          <span className={n.lab} id={labelId}>{jobs}</span>
        </span>
        <span className={n.extra}>
          <span className={n.extraInner}>
            <span className={n.item}>
              <LiveNumber field="companies" className={n.num} />
              <span className={n.lab}>{companies}</span>
            </span>
            <span className={n.item}>
              <LiveNumber field="countries" className={n.num} />
              <span className={n.lab}>{countries}</span>
            </span>
            <span className={n.item}>
              <LiveNumber field="today" className={n.num} prefix="+" />
              <span className={n.lab}>{today}</span>
            </span>
          </span>
        </span>
        <svg className={n.chev} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* прозрачная кнопка поверх всей плашки: нажимается вся, а не только стрелка */}
        <button type="button" className={n.toggle} aria-expanded={open} aria-labelledby={labelId} onClick={() => setOpen((v) => !v)} />
      </div>
    </div>
  );
}
