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
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: sitemaps,
  };
}
