// lib/admin-access.ts
//
// 2026-09-09 (Aleksandr: "давай делать страницу которую смогут увидеть
// только определенные акки" — a master-editor page for quickly fixing
// scraped/glued vacancy text, but visible only to specific accounts,
// not every signed-in visitor). There is no "role" field anywhere on a
// user/session (see lib/a1/session.ts — SessionState is just
// userId/email/tokens), so this is a plain email allowlist read from an
// env var rather than anything backend-driven — Aleksandr can add or
// remove an account's access himself in Vercel's env vars, without a
// code change or redeploy request to Claude each time.
//
// ADMIN_EMAILS: comma-separated list of the exact emails allowed onto
// /admin/posts, e.g. "claimcompanies@a1appp.com,alex@example.com".
// Deliberately fails CLOSED: unset or empty means nobody has access
// (not "everybody") — see app/admin/posts/page.tsx, the only caller.
// Comparison is case-insensitive (emails are stored lowercase at
// sign-in throughout this codebase, but this doesn't assume that).
export function isAdminEmail(email: string | null): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allowed = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
