"use client";

// components/telegram-subscribe.tsx
//
// 2026-09-20. Кнопка «Telegram bot» -- то, ради чего фильтры вообще затевались:
// без неё человек их наклацал, посмотрел и ушёл навсегда.
//
// ФОРМА И МЕСТО -- после трёх заходов вживую. Сначала была широкая синяя плашка
// в шапке панели. Потом, по просьбе Александра («не хочу, чтобы она столько
// внимания забирала»), -- маленькая пилюля под строкой выбранной категории.
// Посмотрев обе, он вернулся к первой, но с двумя условиями: объяснить, что это
// за бот, и дать возможность убрать кнопку совсем. Итог -- широкая заливка в
// фирменном синем Telegram наверху панели, под ней строка про то, что делает
// бот, и крестик.
//
// ПРО КРЕСТИК. Человеку, который бота не хочет, кнопка мозолит глаза при каждом
// открытии фильтров -- и это ровно тот случай, когда предложение начинает
// раздражать вместо того, чтобы привлекать. Отказ запоминается в браузере
// (localStorage) и больше кнопка не появляется. Хранилище может быть недоступно
// -- в приватном окне, при запрете на данные сайта -- поэтому и чтение, и
// запись обёрнуты в try/catch: не прочиталось, значит кнопка просто показана.
//
// Появляется только когда фильтр хоть чем-то задан. Подписка на пустой фильтр
// означала бы «шли мне вообще всё» -- спам и отписка на третий день.
//
// Два нажатия и ни одного экрана настроек: сайт меняет текущий адрес на
// одноразовый код (app/api/telegram/subscribe), а бот по этому коду узнаёт
// фильтр. Внутри бота человек ничего не настраивает -- всё выбрано здесь.

import { useEffect, useState } from "react";
import { T } from "@/components/t";
import { useActiveLocale } from "@/components/claim-form";

type State = "idle" | "loading" | "error";

const DISMISS_KEY = "a1_tg_bot_dismissed";

export function TelegramSubscribe({ hasFilters }: { hasFilters: boolean }) {
  const locale = useActiveLocale();
  const [state, setState] = useState<State>("idle");
  // Первый рисунок -- всегда «не скрыто»: то же самое видит сервер, и React не
  // ругается на расхождение. Сохранённый отказ применяется сразу после.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      // Хранилище недоступно -- показываем кнопку, это не повод ломаться.
    }
  }, []);

  if (!hasFilters || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Не запомнилось -- кнопка вернётся при следующем заходе. Терпимо.
    }
  }

  async function subscribe() {
    setState("loading");
    try {
      const res = await fetch("/api/telegram/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filter: window.location.search.replace(/^\?/, ""), locale }),
      });
      const data = (await res.json()) as { url?: string };
      if (!res.ok || !data.url) {
        setState("error");
        return;
      }
      setState("idle");
      // Новая вкладка, а не переход: человек остаётся на своей выдаче, и после
      // Telegram ему некуда возвращаться "назад".
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="relative mb-2 px-1 pt-1">
      <button
        type="button"
        onClick={dismiss}
        aria-label={DISMISS_LABEL[locale] ?? DISMISS_LABEL.uk}
        className="absolute right-1.5 top-1.5 z-10 rounded-full p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <button
        type="button"
        onClick={subscribe}
        disabled={state === "loading"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2AABEE] px-4 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#229ED9] active:scale-[0.995] disabled:opacity-60"
      >
        <TelegramIcon className="h-5 w-5" />
        {state === "loading" ? (
          <T uk="Готуємо…" en="Preparing…" ru="Готовим…" de="Moment…" es="Preparando…" fr="Un instant…" pl="Chwilka…" ptBR="Preparando…" zh="准备中…" />
        ) : (
          // Название не переводим: это имя продукта, оно одинаково везде.
          <span>Telegram bot</span>
        )}
      </button>

      <p className="mt-2 px-1 text-center text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">
        {state === "error" ? (
          <T uk="Не вийшло. Спробуй ще раз трохи згодом." en="Didn't work. Try again in a moment." ru="Не получилось. Попробуй ещё раз чуть позже." de="Hat nicht geklappt. Versuch es gleich noch mal." es="No funcionó. Inténtalo de nuevo en un momento." fr="Ça n'a pas marché. Réessaie dans un instant." pl="Nie udało się. Spróbuj za chwilę." ptBR="Não deu certo. Tente de novo em instantes." zh="没成功，请稍后再试。" />
        ) : (
          <T
            uk="Бот надсилає нові вакансії за вашими фільтрами — раз на день, без спаму"
            en="The bot sends new jobs matching your filters — once a day, no spam"
            ru="Бот присылает новые вакансии по вашим фильтрам — раз в день, без спама"
            de="Der Bot schickt neue Jobs zu deinen Filtern — einmal täglich, kein Spam"
            es="El bot envía nuevas vacantes según tus filtros: una vez al día, sin spam"
            fr="Le bot envoie les nouvelles offres selon tes filtres — une fois par jour, sans spam"
            pl="Bot wysyła nowe oferty według Twoich filtrów — raz dziennie, bez spamu"
            ptBR="O bot envia novas vagas dos seus filtros — uma vez por dia, sem spam"
            zh="机器人按你的筛选条件发送新职位 — 每天一次，不发垃圾消息"
          />
        )}
      </p>
    </div>
  );
}

const DISMISS_LABEL: Record<string, string> = {
  uk: "Сховати", en: "Hide", ru: "Скрыть", de: "Ausblenden", es: "Ocultar",
  fr: "Masquer", pl: "Ukryj", ptBR: "Ocultar", zh: "隐藏",
};

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21.9 4.3 18.8 19c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.4-5 9-8.2c.4-.3-.1-.5-.6-.2L6.7 12.3 1.9 10.8c-1-.3-1-1 .2-1.5l18.5-7.2c.9-.3 1.6.2 1.3 2.2z" />
    </svg>
  );
}
