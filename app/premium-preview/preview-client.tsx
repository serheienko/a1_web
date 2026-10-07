"use client";

import { useEffect, useState } from "react";
import { AlphaPaywall, preloadAlpha, startAlphaMusic } from "@/components/alpha-paywall";

export function PreviewClient() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [premium, setPremium] = useState(false);
  useEffect(() => {
    setPremium(document.cookie.includes("a1_premium_test=1"));
    preloadAlpha();
  }, []);
  const togglePremium = () => {
    const next = !premium;
    document.cookie = `a1_premium_test=${next ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    setPremium(next);
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
        Тестове середовище · Premium
      </div>
      <h1 className="text-2xl font-bold">A1 Premium — пісочниця</h1>
      <p className="text-[#6b6b78]">Тут збираємо Premium до виходу на основний сайт. Оплата ще не підключена.</p>
      <button
        type="button"
        onClick={() => {
          setMsg(null);
          startAlphaMusic();
          setOpen(true);
        }}
        className="rounded-full px-6 py-3 font-bold text-white"
        style={{ background: "linear-gradient(100deg,#3575ff 0%,#6a4dff 55%,#963fff 100%)" }}
      >
        Відкрити Alpha Search
      </button>
      <button type="button" onClick={togglePremium} className="text-sm font-medium text-[#335ef7] underline">
        Тест: Premium {premium ? "увімкнено — вимкнути" : "вимкнено — увімкнути"}
      </button>
      {msg && <p className="text-sm font-medium text-[#6a4dff]">{msg}</p>}
      <AlphaPaywall
        open={open}
        onClose={() => setOpen(false)}
        onActivate={(plan) => {
          setOpen(false);
          setMsg(`Тест: обрано тариф «${plan === "year" ? "Рік" : plan === "quarter" ? "3 місяці" : "Місяць"}». Оплату підключимо пізніше.`);
        }}
      />
    </main>
  );
}
