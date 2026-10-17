"use client";

// components/ref-capture.tsx
//
// 17.10.2026 (Александр). Реферальная программа «Отримай Alpha».
// 1) Ссылка друга выглядит как https://jobs.a1appp.com/?ref=КОД (или любая страница сайта с ?ref=КОД,
//    в том числе вакансия, которой поделился друг). Код запоминаем в localStorage -- он переживает
//    регистрацию (письмо с подтверждением, другая вкладка), поэтому привязка не теряется.
// 2) Пока код лежит в памяти, при заходе на страницы пробуем «представиться» серверу
//    (POST /api/referral). Гость получает 401 -- тихо ждём, вошедший -- привязывается и код стирается.
//    Не чаще раза в 20 секунд, чтобы не дёргать сервер на каждом переходе.
// Ничего не рисует.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const KEY = "a1_ref";
const TRY_KEY = "a1_ref_try";
const CODE_RE = /^[2-9A-HJKMNP-Z]{7}$/;

function read(): string | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v && CODE_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function RefCapture() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("ref");
      const code = raw ? raw.trim().toUpperCase() : "";
      // Первый пригласивший остаётся навсегда -- уже сохранённый код не затираем.
      if (CODE_RE.test(code) && !read()) window.localStorage.setItem(KEY, code);
    } catch {
      /* память браузера недоступна (приватное окно) -- привязки не будет, сайт работает как обычно */
    }

    const code = read();
    if (!code) return;
    try {
      const last = Number(window.sessionStorage.getItem(TRY_KEY) ?? "0");
      if (Date.now() - last < 20_000) return;
      window.sessionStorage.setItem(TRY_KEY, String(Date.now()));
    } catch {
      /* ничего */
    }
    fetch("/api/referral", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (r) => {
        if (r.status === 401) return; // ещё не вошёл -- ждём
        // принят / уже был / плохой код / свой же код -- в любом случае больше не пробуем
        try {
          window.localStorage.removeItem(KEY);
        } catch {
          /* ничего */
        }
      })
      .catch(() => {});
  }, [pathname]);

  return null;
}
