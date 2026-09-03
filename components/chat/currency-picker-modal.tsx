// components/chat/currency-picker-modal.tsx
//
// 2026-09-03 (Aleksandr's Calculations-feature reference video: a "$"
// button on the calculator panel opens a "Валюта" popup -- search field
// on top, a wrapping grid of pill buttons below, the active one ringed).
// Same self-contained-modal shell as components/daily-uploads-modal.tsx
// (backdrop + centered rounded-2xl card, this app's own established
// convention for a modal, not a dedicated <dialog>).
//
// The reference video's own pill grid (USD/UAH/EUR/JPY/GBP/CNY/CAD/AUD/
// HKD/SGD/CHF) is reproduced as-is, plus PLN/BRL -- this app's own
// locale switcher (components/t.tsx) covers pl/ptBR, neither of which
// the reference list itself had a currency for. `code` is what actually
// goes over the wire (app/api/chats/send/route.ts's SendInput lowercases
// a 3-letter code); `symbol` is display-only.
"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/components/t";

type StringKey = "title" | "search";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: {
    uk: "Валюта", en: "Currency", ru: "Валюта", de: "Währung", es: "Moneda",
    fr: "Devise", pl: "Waluta", ptBR: "Moeda", zh: "货币",
  },
  search: {
    uk: "Пошук", en: "Search", ru: "Поиск", de: "Suchen", es: "Buscar",
    fr: "Rechercher", pl: "Szukaj", ptBR: "Pesquisar", zh: "搜索",
  },
};

function t(key: StringKey, lang: Locale): string {
  return STRINGS[key][lang];
}

const CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "Australian Dollar" },
  { code: "HKD", symbol: "$", name: "Hong Kong Dollar" },
  { code: "SGD", symbol: "$", name: "Singapore Dollar" },
  { code: "CHF", symbol: "Fr.", name: "Swiss Franc" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
];

type Props = {
  lang: Locale;
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
};

export function CurrencyPickerModal({ lang, selected, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [query]);
  const selectedUpper = selected.toUpperCase();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-center text-[15px] font-semibold text-[#335ef7] dark:text-[#0c8ce9]">
          {t("title", lang)}
        </h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search", lang)}
          autoFocus
          className="mb-3 w-full rounded-full bg-black/5 px-4 py-2.5 text-[14px] text-[#262a34] outline-none placeholder:text-neutral-400 dark:bg-white/10 dark:text-white dark:placeholder:text-neutral-500"
        />
        <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
          {filtered.map((c) => {
            const active = c.code === selectedUpper;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onSelect(c.code);
                  onClose();
                }}
                className={`rounded-full border px-4 py-2 text-[14px] font-medium transition ${
                  active
                    ? "border-[#335ef7] text-[#335ef7] dark:border-[#0c8ce9] dark:text-[#0c8ce9]"
                    : "border-transparent bg-black/5 text-[#262a34] hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                }`}
              >
                {c.code} {c.symbol}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="w-full py-4 text-center text-[13px] text-neutral-400 dark:text-neutral-500">{query}</p>
          )}
        </div>
      </div>
    </div>
  );
}
