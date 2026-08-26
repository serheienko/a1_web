// app/robots.ts
//
// /talents is kept crawlable here on purpose: it's blocked from indexing
// via a `noindex, follow` meta tag (see app/talents/**), not via
// robots.txt. Disallowing it here as well would stop Google from ever
// fetching the page and seeing that meta tag, which is the documented way
// a noindex'd-but-linked page can still end up indexed with no snippet —
// the opposite of what we want. /api/ is blocked outright: nothing under
// it is a page meant for crawlers.

import type { MetadataRoute } from "next";

const SITE_URL = "https://jobs.a1appp.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
