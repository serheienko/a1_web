// app/download-new/stats-pill.tsx
//
// Aleksandr, 23.10.2026: «зелёная пульсирующая точка, число вакансий; при
// нажатии разворачивается в список». Свёрнутая плашка: точка, число вакансий и
// слово («53 040 вакансій»). Нажатие раскрывает список: компании, страны,
// новые за сутки. Раскрывается поверх страницы (не двигает заголовок), закрывается
// повторным нажатием, нажатием в сторону или Esc. Подписи приходят готовыми
// из серверной страницы (там девять языков), числа — из ./live-number.tsx.
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
        <button type="button" className={n.statsHead} aria-expanded={open} aria-controls="live-more" onClick={() => setOpen((v) => !v)}>
          <span className={n.liveDot} aria-hidden="true" />
          <LiveNumber field="jobs" className={n.headNum} />
          <span className={n.headLabel}>{jobs}</span>
          <svg className={n.chev} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className={n.more} id="live-more" aria-hidden={!open}>
          <div className={n.moreInner}>
            <div className={n.row}>
              <LiveNumber field="companies" className={n.rowNum} />
              <span className={n.rowLabel}>{companies}</span>
            </div>
            <div className={n.row}>
              <LiveNumber field="countries" className={n.rowNum} />
              <span className={n.rowLabel}>{countries}</span>
            </div>
            <div className={n.row}>
              <LiveNumber field="today" className={n.rowNum} prefix="+" />
              <span className={n.rowLabel}>{today}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
