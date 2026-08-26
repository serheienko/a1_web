// lib/seo/slug.ts
//
// URL slug for a post detail page: "<kebab-title>-<postId>" (PLAN.md §3.1).
// Only the forward direction (build a slug) is needed for Phase 0's
// mapper; parsing a slug back into an id belongs to the Phase 2 detail
// route (app/jobs/[slug]/page.tsx).
//
// Note: this only kebab-cases ASCII. A Cyrillic title collapses to just the
// id (still unique, just not keyword-bearing) — acceptable for now; see
// PLAN.md OPEN QUESTIONS "Languages at launch."

export function slugify(title: string, id: string): string {
  const kebab = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return kebab ? `${kebab}-${id}` : id;
}

const POST_ID_PATTERN = /(po_[a-zA-Z0-9]+)$/;

/**
 * Inverse of slugify(): pull the trailing post id back out of a
 * "<kebab-title>-<postId>" slug (or a bare id). Post ids only ever contain
 * the "po_" prefix plus alphanumerics — no hyphens — so matching the
 * trailing token is unambiguous even when the kebab title itself ends in
 * digits.
 */
export function parseSlugId(slug: string): string | null {
  const match = slug.match(POST_ID_PATTERN);
  return match ? (match[1] ?? null) : null;
}
