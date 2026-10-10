// lib/seo/indexnow.ts -- IndexNow (11.10.2026).
//
// IndexNow -- це "дзвінок" пошуковикам: «з'явилась/змінилась сторінка, зайдіть».
// Його розуміють Bing (а через нього DuckDuckGo, Ecosia, Yahoo та інші), Naver,
// Seznam, Yep. Google IndexNow НЕ підтримує -- для Google працює sitemap.
//
// Ключ публічний за задумом протоколу: той самий рядок лежить файлом
// public/<ключ>.txt, за ним пошуковик перевіряє, що сайт наш. Це не секрет.
export const INDEXNOW_KEY = "695a4fe8d814bde7257b0007c90929c7";
export const INDEXNOW_HOST = "jobs.a1appp.com";
const ENDPOINT = "https://www.bing.com/indexnow";
const BATCH = 9_000; // ліміт протоколу -- 10 000 адрес за запит

/** Що вже відправляли в цьому процесі, щоб не слати одне й те саме двічі. */
const sent = new Set<string>();

export async function submitUrls(urls: string[]): Promise<{ sent: number; skipped: number; failed: number }> {
  const fresh = [...new Set(urls)].filter((u) => u.startsWith(`https://${INDEXNOW_HOST}/`) || u === `https://${INDEXNOW_HOST}`).filter((u) => !sent.has(u));
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < fresh.length; i += BATCH) {
    const part = fresh.slice(i, i + BATCH);
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: INDEXNOW_HOST,
          key: INDEXNOW_KEY,
          keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
          urlList: part,
        }),
      });
      // 200 і 202 -- прийнято (202: ключ ще перевіряється).
      if (r.status === 200 || r.status === 202) {
        part.forEach((u) => sent.add(u));
        ok += part.length;
      } else {
        failed += part.length;
        console.warn("[indexnow] відповідь", r.status);
      }
    } catch (e) {
      failed += part.length;
      console.warn("[indexnow] помилка запиту", e);
    }
  }
  return { sent: ok, skipped: urls.length - fresh.length, failed };
}
