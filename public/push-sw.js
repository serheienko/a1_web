// public/push-sw.js
//
// Service worker веб-пушей. Александр, 17.09.2026: «мы обсуждали, но не
// сделали уведомления на десктопе, давай сделаем».
//
// Почему здесь НЕТ firebase-скриптов. Обычный рецепт из документации --
// importScripts() двух файлов firebase-*-compat.js с gstatic.com. Мы так
// не делаем: во-первых, это внешний скрипт с чужого домена в самом
// привилегированном месте сайта; во-вторых, версию на gstatic нельзя
// проверить сборкой, и она молча ломается. Push у FCM для веба -- это
// обычный W3C Web Push: браузер отдаёт нам событие 'push' с JSON-телом
// сообщения, и показать уведомление можно руками. Ровно это здесь и
// происходит. Firebase SDK нужен только на странице -- он меняет
// подписку браузера на FCM-токен, который понимает наш бэкенд
// (см. lib/web-push.ts).
//
// Формат тела. FCM кладёт в push-событие объект вида
//   { notification?: {title, body, icon, click_action}, data?: {...} }
// Читаем оба: бэкенд может прислать и «готовое» уведомление, и только
// data (тогда заголовок и текст лежат в data). Если не пришло ничего
// осмысленного -- всё равно показываем короткое уведомление: браузер
// обязывает показать хоть что-то на каждый push, иначе он отзовёт
// разрешение у сайта.

const ICON = "/notification-icon.png";
const FALLBACK_URL = "/chats";

function pick(...values) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const n = payload.notification || {};
  const d = payload.data || {};

  const title = pick(n.title, d.title, "A1");
  const body = pick(n.body, d.body, d.message);
  const url = pick(d.link, d.url, d.click_action, n.click_action, FALLBACK_URL);
  // Один и тот же чат не должен плодить стопку уведомлений.
  const tag = pick(d.chatId, d.chat, d.peerId, n.tag, "a1");

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body || undefined,
      icon: pick(n.icon, d.icon, ICON),
      badge: ICON,
      tag,
      renotify: true,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || FALLBACK_URL;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Уже открытая вкладка сайта -- переиспользуем её, а не плодим новые.
      for (const client of clients) {
        if (client.url && new URL(client.url).origin === self.location.origin) {
          client.focus();
          if ("navigate" in client) client.navigate(target).catch(() => {});
          return;
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
