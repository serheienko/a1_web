// app/robots.ts
//
// /talents is kept crawlable here on purpose: it's blocked from indexing
// via a `noindex, follow` meta tag (see app/talents/**), not via
// robots.txt. Disallowing it here as well would stop Google from ever
// fetching the page and seeing that meta tag, which is the documented way
// a noindex'd-but-linked page can still end up indexed with no snippet —
// the opposite of what we want. /api/ is blocked outright: nothing under
// it is a page meant for crawlers.
//
// The `sitemap` field lists every chunk explicitly (/sitemap/0.xml,
// /sitemap/1.xml, ...) rather than one index URL — confirmed live that
// app/sitemap.ts's generateSitemaps() convention does NOT serve an index
// at /sitemap.xml (that path 404s); each chunk is its own file at
// /sitemap/<id>.xml, even when there's only one. Walking the same post
// list as app/sitemap.ts to get the real chunk count rather than
// hardcoding "1" and risking it going stale once volume grows.

import type { MetadataRoute } from "next";
import { fetchAllSitemapJobPosts, SITEMAP_CHUNK_SIZE } from "@/lib/a1/sitemap-posts";

const SITE_URL = "https://jobs.a1appp.com";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const posts = await fetchAllSitemapJobPosts();
  const chunkCount = Math.max(1, Math.ceil(posts.length / SITEMAP_CHUNK_SIZE));
  const sitemaps = Array.from({ length: chunkCount }, (_, id) => `${SITE_URL}/sitemap/${id}.xml`);

  return {
    rules: [
      {
        userAgent: "*",
        // 01.10.2026: /api/media/ открыт для обхода -- там лежат логотипы
        // компаний из разметки JobPosting (hiringOrganization.logo). Более
        // длинное правило Allow побеждает общий Disallow: /api/.
        allow: ["/", "/api/media/"],
        // 2026-09-09: /admin/posts (app/admin/posts/page.tsx) is a private,
        // email-allowlisted internal tool, not a page meant for crawlers —
        // same reasoning as /api/ right above, not the /talents noindex-
        // but-crawlable carve-out this file's own header comment explains.
        //
        // 07.10.2026 (Александр: «проверь, что можно улучшить по
        // индексации»). Статистика сканирования в Search Console: 65 %
        // запросов Googlebot уходило на служебные ответы Next.js
        // (?_rsc=..., данные для перехода между страницами), а на сами
        // страницы -- лишь 13 %. При этом 25 тыс. вакансий робот «нашёл,
        // но не обошёл». Закрываем эти ответы, чтобы обход шёл на страницы.
        disallow: ["/api/", "/admin/", "/*?_rsc=", "/*&_rsc="],
      },
      // 08.10.2026 (Александр: «где-то написать, что у нас нельзя брать»).
      // Сборщики контента для обучения ИИ и массового копирования закрыты
      // целиком. Поисковые роботы (Googlebot, Bingbot) остаются в правиле
      // "*" выше -- от них приходит трафик. Это просьба, а не замок: её
      // соблюдают добросовестные роботы. Основание для жалоб -- /terms.
      {
        userAgent: [
          "GPTBot",
          "CCBot",
          "ClaudeBot",
          "anthropic-ai",
          "Google-Extended",
          "Applebot-Extended",
          "Bytespider",
          "meta-externalagent",
          "cohere-ai",
          "Omgilibot",
          "ImagesiftBot",
          "PetalBot",
        ],
        disallow: "/",
      },
    ],
    sitemap: sitemaps,
  };
}
