import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Third-party cover art for the profile's Favorites tiles (see
    // lib/covers.ts) — next/image needs each remote host allow-listed,
    // and this is also what gives us automatic resizing/recompression
    // so cover files stay small.
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "media.rawg.io" },
    ],
  },

  // 2026-09-15: /jobs -> / настоящим 308, а не страницей-редиректом.
  //
  // app/jobs/page.tsx делает permanentRedirect с 2026-08-26, но страница
  // статическая, и Next в этом случае отдаёт не код 308, а обычный
  // ответ 200 с <meta http-equiv="refresh"> внутри (проверено живьём:
  // fetch с redirect:"manual" возвращает 200, 31 КБ html и мета-строку).
  // Для Google это «мягкий» редирект: он его выполнит, но в обходе
  // останется лишняя пустая страница с заголовком «A1 Web» и без
  // канонического адреса.
  //
  // Редиректы из конфига выполняются ДО роутинга, поэтому теперь
  // /jobs отвечает настоящим 308 и до страницы дело не доходит.
  // Саму app/jobs/page.tsx оставляем как запасной вариант: если эта
  // секция когда-нибудь уедет, старые ссылки продолжат работать.
  // Точное совпадение, так что /jobs/<вакансия> не задевается.
  // 2026-09-15. Файл apple-app-site-association лежит БЕЗ расширения --
  // так требует Apple, -- и Next без расширения не знает, что это JSON, и
  // отдаёт его как двоичный файл. iOS такой ответ игнорирует, и связь
  // домена с приложением просто не устанавливается. Поэтому тип задаём
  // руками. Второй файл, assetlinks.json (это Android), в подсказке не
  // нуждается: по расширению всё определяется само.
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },

  async redirects() {
    return [{ source: "/jobs", destination: "/", permanent: true }];
  },
};

export default nextConfig;
