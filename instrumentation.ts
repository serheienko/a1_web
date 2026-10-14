// instrumentation.ts -- виконується один раз, коли сервер сайту стартує.
//
// 02.10.2026 (карта A1, регіони). Після кожного деплою кеші порожні: перший,
// хто відкривав карту Європи, чекав до хвилини, поки сервер обійде всі
// вакансії. Тепер сервер сам «прогріває» дані карти за ~20 с після старту
// (один запит до себе; route.ts при цьому прогріває й решту регіонів).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const port = process.env.PORT || "3000";
  setTimeout(() => {
    fetch(`http://127.0.0.1:${port}/game-map/data?region=ua`).catch(() => {});
  }, 20_000);

  // 14.10.2026 (Александр: «нажимаю на статистику -- пауза, будто баг»). Первый, кто открывал /stats после
  // деплоя, ждал ~38 с: сервер обходил все вакансии. Прогреваем страницу сами, после карты.
  setTimeout(() => {
    fetch(`http://127.0.0.1:${port}/stats`).catch(() => {});
  }, 45_000);

  // 11.10.2026. IndexNow: раз на годину повідомляємо пошуковикам про нові й
  // змінені вакансії (див. app/api/indexnow/route.ts).
  const secret = process.env.A1_REVALIDATE_SECRET;
  if (secret) {
    const ping = () =>
      fetch(`http://127.0.0.1:${port}/api/indexnow?mode=new`, { headers: { "x-revalidate-secret": secret } }).catch(() => {});
    setTimeout(ping, 10 * 60_000);
    setInterval(ping, 60 * 60_000).unref?.();
  }

  // 14.10.2026: переезд хранилища с Vercel Blob на базу Railway. Пока на сервере есть BLOB_READ_WRITE_TOKEN,
  // раз в полчаса докопировываем из Blob то, что там новее (парсер DOU, пока не обновлён, пишет туда
  // аккаунты компаний). Убрали токен -- перенос выключается сам.
  // Импорт строго внутри проверки NEXT_RUNTIME === "nodejs": так сборщик не тащит базу в edge-сборку.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.BLOB_READ_WRITE_TOKEN && process.env.KV_DATABASE_URL) {
    const { syncFromBlob } = await import("./lib/kv/from-blob");
    setInterval(() => void syncFromBlob().catch(() => {}), 30 * 60_000).unref?.();
  }
}
