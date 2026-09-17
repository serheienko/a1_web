// components/notifications-toggle.tsx
//
// Строка «Сповіщення» с переключателем в меню аккаунта.
// Александр, 17.09.2026: «мы обсуждали, но не сделали уведомления на
// десктопе, давай сделаем».
//
// Вся механика -- в lib/web-push.ts; здесь только строка и три её
// состояния. Строки нет вообще, если браузер не умеет веб-пуши или если
// ключи Firebase ещё не заданы в переменных окружения: показывать
// переключатель, который заведомо не сработает, хуже, чем не показывать
// ничего.
"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/components/t";
import {
  disablePush,
  enablePush,
  readPushState,
  refreshPushToken,
  type PushState,
} from "@/lib/web-push";

type NotificationsStringKey = "notifications" | "denied" | "failed";

const STRINGS: Record<NotificationsStringKey, Record<Locale, string>> = {
  notifications: {
    uk: "Сповіщення", en: "Notifications", ru: "Уведомления", de: "Mitteilungen",
    es: "Notificaciones", fr: "Notifications", pl: "Powiadomienia",
    ptBR: "Notificações", zh: "通知",
  },
  // Показывается, когда человек когда-то нажал «Заблокировать» в
  // браузере: вернуть разрешение из кода уже нельзя, только руками.
  denied: {
    uk: "Дозвольте сповіщення в налаштуваннях браузера",
    en: "Allow notifications in your browser settings",
    ru: "Разрешите уведомления в настройках браузера",
    de: "Mitteilungen in den Browsereinstellungen erlauben",
    es: "Permite las notificaciones en los ajustes del navegador",
    fr: "Autorisez les notifications dans les réglages du navigateur",
    pl: "Zezwól na powiadomienia w ustawieniach przeglądarki",
    ptBR: "Permita as notificações nas configurações do navegador",
    zh: "请在浏览器设置中允许通知",
  },
  failed: {
    uk: "Не вдалося увімкнути. Спробуйте ще раз",
    en: "Couldn't turn on. Try again",
    ru: "Не удалось включить. Попробуйте ещё раз",
    de: "Konnte nicht aktiviert werden. Erneut versuchen",
    es: "No se pudo activar. Inténtalo de nuevo",
    fr: "Activation impossible. Réessayez",
    pl: "Nie udało się włączyć. Spróbuj ponownie",
    ptBR: "Não foi possível ativar. Tente de novo",
    zh: "开启失败，请重试",
  },
};

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-neutral-400 dark:text-neutral-500"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function NotificationsToggle({ lang }: { lang: Locale }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // readPushState() читает localStorage и Notification.permission --
  // на сервере ни того, ни другого нет, поэтому первое значение
  // появляется только после монтирования (иначе разъедется гидрация).
  useEffect(() => {
    setState(readPushState());
  }, []);

  if (state === null || state === "unsupported" || state === "unconfigured") return null;

  const on = state === "on";

  async function toggle() {
    if (busy || state === "denied") return;
    setBusy(true);
    setFailed(false);
    try {
      if (on) {
        await disablePush();
        setState("off");
      } else {
        const result = await enablePush();
        if (result === "on") {
          setState("on");
          // Сразу показать человеку, что это работает: один тестовый
          // пуш самому себе (app/api/push/test/route.ts). Молча -- если
          // не дойдёт, ничего страшного, переключатель уже включён.
          void fetch("/api/push/test", { method: "POST" }).catch(() => {});
        } else if (result === "denied") {
          setState("denied");
        } else {
          setFailed(true);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-0.5">
      <button
        type="button"
        onClick={toggle}
        disabled={busy || state === "denied"}
        aria-pressed={on}
        className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-default disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <BellIcon />
        <span className="min-w-0 flex-1 truncate">{STRINGS.notifications[lang]}</span>
        <span
          className={
            "relative h-5 w-9 shrink-0 rounded-full transition " +
            (on ? "bg-accent" : "bg-neutral-300 dark:bg-neutral-600")
          }
          aria-hidden="true"
        >
          <span
            className={
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all " +
              (on ? "left-[1.125rem]" : "left-0.5")
            }
          />
        </span>
      </button>
      {state === "denied" && (
        <p className="px-2.5 pb-1 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
          {STRINGS.denied[lang]}
        </p>
      )}
      {failed && (
        <p className="px-2.5 pb-1 text-[11px] leading-snug text-red-500">{STRINGS.failed[lang]}</p>
      )}
    </div>
  );
}

/**
 * Тихое продление подписки при загрузке страницы -- вешается на
 * компонент, который смонтирован всегда (меню аккаунта), а не на эту
 * строку: строка живёт только пока панель открыта.
 */
export function usePushTokenRefresh() {
  useEffect(() => {
    void refreshPushToken();
  }, []);
}
