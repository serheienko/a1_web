// lib/web-push.ts
//
// Пуш-уведомления в браузере. Александр, 17.09.2026: «мы обсуждали, но
// не сделали уведомления на десктопе, давай сделаем. Посмотри через что
// мы сделали в апке, там вроде что-то с firebase».
//
// В приложении это Firebase Cloud Messaging: FCM выдаёт устройству
// токен, приложение отдаёт токен бэкенду методом initConnection, дальше
// бэкенд шлёт пуши сам. Здесь ровно то же самое, только устройство --
// браузер, а платформа -- "web" (initConnection её принимает, это
// подтверждено схемой API: ios | android | web | unknown).
//
// Три шага, все три обязаны происходить по клику человека:
//   1. Notification.requestPermission() -- браузер спрашивает разрешение.
//      Без жеста пользователя Chrome и Safari просто игнорируют вызов.
//   2. getToken() из firebase/messaging -- подписывает браузер на push
//      и меняет подписку на FCM-токен.
//   3. POST /api/push/register -- отдаём токен бэкенду (initConnection).
//
// Firebase SDK грузится динамическим import() -- только в тот момент,
// когда человек включает уведомления. В обычный бандл сайта он не
// попадает вообще.
//
// Ключи. Публичный конфиг Firebase и VAPID-ключ живут в переменных
// окружения Vercel. Пока они не заданы, pushConfig() возвращает null, и
// переключатель в меню просто не показывается -- ничего не ломается и
// никаких ошибок человек не видит. Ровно шесть штук, проект a1-app-9aaf1
// (тот же, что у приложения):
//
//   NEXT_PUBLIC_FIREBASE_API_KEY             Project settings -> General ->
//   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN           Your apps -> веб-приложение
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID            "A1 Web" -> SDK setup,
//   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID   блок firebaseConfig
//   NEXT_PUBLIC_FIREBASE_APP_ID
//   NEXT_PUBLIC_FIREBASE_VAPID_KEY           Cloud Messaging -> Web Push
//                                            certificates -> Key pair
//
// Все шесть -- публичные: они всё равно уезжают в браузер в открытом
// виде, это не секреты. Секрет у FCM ровно один -- приватный ключ
// сервис-аккаунта на бэкенде, и он здесь не нужен.

const ENABLED_KEY = "a1:push:enabled";
const TOKEN_KEY = "a1:push:token";
const SW_URL = "/push-sw.js";

export type PushState =
  | "unsupported"    // браузер не умеет (или iOS-Safari не в режиме «на экран Домой»)
  | "unconfigured"   // ключи Firebase не заданы -- ничего не показываем
  | "denied"         // человек запретил уведомления в браузере
  | "off"
  | "on";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
};

/**
 * Конфиг Firebase из переменных окружения.
 *
 * Обращения к process.env.NEXT_PUBLIC_* написаны буквально, каждое
 * отдельной строкой: Next подставляет значения на сборке только в такие
 * -- вычисляемое имя (process.env[name]) на клиенте пусто всегда.
 */
export function pushConfig(): FirebaseConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "";
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "";
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

  if (!apiKey || !projectId || !messagingSenderId || !appId || !vapidKey) return null;
  return { apiKey, authDomain, projectId, messagingSenderId, appId, vapidKey };
}

/**
 * Умеет ли этот браузер веб-пуши прямо сейчас.
 *
 * Отдельно про iPhone: Safari умеет веб-пуши только для сайта,
 * добавленного на экран «Домой». В обычной вкладке window.PushManager
 * там просто отсутствует -- эта же проверка ловит и такой случай, без
 * отдельной ветки про iOS.
 */
export function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
  );
}

export function readPushState(): PushState {
  if (!pushSupported()) return "unsupported";
  if (!pushConfig()) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  try {
    return localStorage.getItem(ENABLED_KEY) === "1" ? "on" : "off";
  } catch {
    return "off";
  }
}

function remember(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(ENABLED_KEY, "1");
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ENABLED_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Приватный режим -- переживём, просто не запомним.
  }
}

function rememberedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function messagingHandle(config: FirebaseConfig) {
  const [{ initializeApp, getApps, getApp }, messaging] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);

  if (!(await messaging.isSupported())) return null;

  const app = getApps().length ? getApp() : initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
    projectId: config.projectId,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });

  return { messaging: messaging.getMessaging(app), api: messaging };
}

/** Наш собственный service worker (public/push-sw.js), корневая область. */
async function swRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_URL);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_URL, { scope: "/" });
}

/** Что это за устройство -- для списка сессий в приложении. */
function deviceModel(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : "";
  return os ? `${browser} (${os})` : browser;
}

async function sendTokenToBackend(token: string): Promise<boolean> {
  const { authFetch } = await import("@/lib/auth-fetch");
  const res = await authFetch("/api/push/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      deviceToken: token,
      deviceModel: deviceModel(),
      deviceLanguage: (navigator.language || "en").slice(0, 2).toLowerCase(),
      systemVersion: navigator.platform || "web",
    }),
  });
  return res.ok;
}

async function currentToken(): Promise<string | null> {
  const config = pushConfig();
  if (!config || !pushSupported()) return null;

  const handle = await messagingHandle(config);
  if (!handle) return null;

  const registration = await swRegistration();
  // Браузеру нужен активный воркер -- сразу после register() он ещё
  // installing, и подписка на push просто не состоится.
  await navigator.serviceWorker.ready;

  const token = await handle.api.getToken(handle.messaging, {
    vapidKey: config.vapidKey,
    serviceWorkerRegistration: registration,
  });
  return token || null;
}

export type EnableResult = "on" | "denied" | "failed" | "unsupported";

/** Включить уведомления. Вызывать ТОЛЬКО из обработчика клика. */
export async function enablePush(): Promise<EnableResult> {
  if (!pushSupported() || !pushConfig()) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  try {
    const token = await currentToken();
    if (!token) return "failed";
    const ok = await sendTokenToBackend(token);
    if (!ok) return "failed";
    remember(token);
    return "on";
  } catch (err) {
    console.error("[web-push] enable failed:", err);
    return "failed";
  }
}

/**
 * Выключить уведомления.
 *
 * Отзываем подписку браузера (deleteToken) -- после этого FCM на этот
 * токен уже ничего не доставит, даже если бэкенд попробует. Отдельного
 * метода «забудь устройство» в API нет, и это нормально: мёртвый токен
 * бэкенд отбросит сам при первой же отправке.
 */
export async function disablePush(): Promise<void> {
  remember(null);
  try {
    const config = pushConfig();
    if (!config) return;
    const handle = await messagingHandle(config);
    if (!handle) return;
    await handle.api.deleteToken(handle.messaging);
  } catch (err) {
    console.warn("[web-push] disable: не удалось отозвать токен:", err);
  }
}

let refreshedInThisTab = false;

/**
 * Тихо обновить токен при загрузке страницы.
 *
 * FCM-токен не вечный: браузер может перевыдать подписку сам (чистка
 * данных сайта, переустановка, долгий простой). Если человек уже
 * включал уведомления -- на каждой загрузке спрашиваем актуальный токен
 * и, если он изменился, заново отдаём бэкенду. Ничего не спрашивает и
 * ничего не показывает. Один раз на вкладку.
 */
export async function refreshPushToken(): Promise<void> {
  if (readPushState() !== "on") return;
  if (Notification.permission !== "granted") return;

  if (refreshedInThisTab) return;
  refreshedInThisTab = true;

  try {
    const token = await currentToken();
    if (!token) return;
    // Токен тот же -- бэкенд всё равно должен узнать, что устройство
    // живо: приложение зовёт initConnection на каждом запуске, и здесь
    // то же самое, но один раз на вкладку, а не на каждый переход.
    if (await sendTokenToBackend(token)) remember(token);
    else if (token !== rememberedToken()) remember(null);
  } catch (err) {
    console.warn("[web-push] refresh failed:", err);
  }
}
