// app/sitemap.ts
//
// Next.js's built-in sitemap convention (generateSitemaps() + a default
// sitemap({id}) function) instead of a hand-rolled XML route — this is
// the framework-native way to chunk a large sitemap and it's what Next
// itself validates the shape of, rather than us guessing at the XML.
//
// Jobs only (PLAN.md §3.4): expired/deleted posts are excluded by
// fetchAllSitemapJobPosts() itself. Talents is deliberately never
// included here — the whole /talents tree is noindex (still-open privacy
// question in PLAN.md's OPEN QUESTIONS), and a noindex URL has no
// business in a sitemap regardless of how big or small the industry norm
// for sitemap coverage is elsewhere.

import type { MetadataRoute } from "next";
import { fetchAllSitemapJobPosts } from "@/lib/a1/sitemap-posts";

const SITE_URL = "https://jobs.a1appp.com";
const CHUNK_SIZE = 45_000; // PLAN.md §3.1 — sitemaps.org's own 50k/file cap, with headroom

export const revalidate = 3600;

export async function generateSitemaps() {
  const posts = await fetchAllSitemapJobPosts();
  const chunkCount = Math.max(1, Math.ceil(posts.length / CHUNK_SIZE));
  return Array.from({ length: chunkCount }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const posts = await fetchAllSitemapJobPosts();
  const start = id * CHUNK_SIZE;
  const chunk = posts.slice(start, start + CHUNK_SIZE);

  const entries: MetadataRoute.Sitemap = [];

  // Static pages ride along in the first chunk rather than getting a
  // whole separate sitemap file for two URLs.
  if (id === 0) {
    entries.push({ url: SITE_URL });
    entries.push({ url: `${SITE_URL}/jobs` });
  }

  for (const post of chunk) {
    entries.push({
      url: `${SITE_URL}/jobs/${post.slug}`,
      lastModified: post.updatedAt ?? post.publishedAt,
    });
  }

  return entries;
}
