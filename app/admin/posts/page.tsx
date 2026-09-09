// app/admin/posts/page.tsx
//
// 2026-09-09 (Aleksandr): "мне надо страниться со всеми, условно, там
// вакансиями и поиск с коротким описанием. И чтобы мог заходить, да, и
// там, типа, подправлять то, что криво лежит" — a quick admin list of
// every post the signed-in account owns, with search, so fixing a
// glued-together sentence or a stray artifact from scraping doesn't
// mean hunting down that one post's own page and its "•••" menu
// (components/post-owner-menu.tsx) by hand. "И это надо, наверное, как
// бы давать доступ одному, там, какому-то имейлу" — restricted to an
// email allowlist (lib/admin-access.ts), not open to every visitor.
//
// Server component specifically so the email check happens BEFORE any
// admin UI or data ships to the browser — an unauthorized visitor gets
// a plain 404, same as a removed job post (app/jobs/[slug]/page.tsx),
// not a page that renders and then hides itself client-side. Reads
// cookies() via readSession(), so — like app/chats/[chatId]/page.tsx
// and unlike the ISR'd public feed — this route is dynamic by
// necessity; there is no caching concern here since nobody but the
// allowlisted account(s) should ever load it.
//
// Data itself comes from the EXISTING /api/posts/mine (same one
// components/my-posts-panel.tsx already uses) — no new backend
// endpoint. That route is scoped to `author: "me"` on the backend, so
// this page only ever lists posts owned by WHICHEVER account is
// currently signed in in the browser hitting it; it does not aggregate
// across other accounts. Fine for now — every scraped/test vacancy
// currently lives under one shared account (claimcompanies@a1appp.com)
// — but once Aleksandr's multi-account scaling plan is live, an
// allowlisted admin signed in as a DIFFERENT account would only see
// that account's own posts here, not everyone's. Revisit then.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { AdminPostsPanel } from "@/components/admin-posts-panel";

export const dynamic = "force-dynamic";

// Never meant to be crawled or linked from anywhere public — belt and
// suspenders alongside app/robots.ts's own "/admin/" disallow entry.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminPostsPage() {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    notFound();
  }

  return <AdminPostsPanel signedInAs={session!.email} />;
}
