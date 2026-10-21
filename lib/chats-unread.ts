// lib/chats-unread.ts
//
// Александр, 21.10.2026, при разборе десктоп-версии: «давай добавим
// возле иконки чатов» — счётчик непрочитанных. До этого общее число
// непрочитанных нигде не считалось: /api/chats/list отдаёт unreadCount
// по каждому чату, но складывал их только открытый флайаут
// (components/chats-flyout.tsx), то есть пока человек не наведёт мышь
// на кнопку чатов, он не знал, что ему написали.
//
// Устроено как lib/account-menu-open.ts — модульный стор
// (subscribe/getSnapshot, читается через useSyncExternalStore), а не
// Context: кнопка чатов висит соседом SiteNav в app/layout.tsx, и
// провайдер пришлось бы тянуть вокруг обоих поддеревьев ради одного
// числа.
//
// Опрос реже, чем у флайаута (там POLL_MS = 5000, но только пока он
// открыт): здесь опрос идёт всё время, пока человек залогинен, поэтому
// раз в 30 секунд и только при видимой вкладке. Уходя в фон, таймер
// останавливается; возвращаясь — сразу один запрос, чтобы счётчик не
// отставал на полминуты.
//
// Побочный эффект на <html data-unread> — для десктоп-обёртки
// (~/Desktop/a1_app/a1_desktop): её preload читает этот атрибут и
// ставит число на иконку в доке. Сайту атрибут не мешает.
import { authFetch } from "@/lib/auth-fetch";
import { DISPLAY_COOKIE } from "@/lib/a1/session-constants";

const POLL_MS = 30_000;

let total = 0;
let timer: number | null = null;
let users = 0;              // сколько компонентов сейчас просят счётчик
let inFlight = false;
let stopped = false;        // 401 — больше не дёргаем до перезагрузки

const listeners = new Set<() => void>();

function publish(next: number) {
  if (next === total) return;
  total = next;
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (next > 0) root.dataset.unread = String(next);
    else delete root.dataset.unread;
  }
  for (const listener of listeners) listener();
}

function signedIn() {
  return typeof document !== "undefined"
    && document.cookie.includes(`${DISPLAY_COOKIE}=`);
}

async function load() {
  if (inFlight || stopped) return;
  if (typeof document !== "undefined" && document.hidden) return;
  // Кнопка чатов висит на всех страницах, в том числе у незалогиненных —
  // им запрос не нужен вовсе.
  if (!signedIn()) {
    publish(0);
    return;
  }
  inFlight = true;
  try {
    const res = await authFetch("/api/chats/list");
    if (res.status === 401) {
      stopped = true;
      publish(0);
      return;
    }
    const data = await res.json().catch(() => null);
    if (!data?.ok) return;
    const chats: Array<{ unreadCount?: number }> = data.chats ?? [];
    publish(chats.reduce((sum, chat) => sum + (chat.unreadCount ?? 0), 0));
  } catch {
    // сеть моргнула — оставляем прежнее число до следующего круга
  } finally {
    inFlight = false;
  }
}

function onVisibility() {
  if (!document.hidden) void load();
}

/** Пока жив хоть один подписчик, счётчик обновляется сам. */
export function subscribeUnread(listener: () => void): () => void {
  listeners.add(listener);
  if (++users === 1 && typeof window !== "undefined") {
    void load();
    timer = window.setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (--users === 0) {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

export function getUnreadSnapshot(): number {
  return total;
}

/** На сервере счётчика нет — рисуем кнопку без значка. */
export function getUnreadServerSnapshot(): number {
  return 0;
}

/** Пересчитать немедленно — например, когда закрыли флайаут. */
export function refreshUnread() {
  void load();
}
