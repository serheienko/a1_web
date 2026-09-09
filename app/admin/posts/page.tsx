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
// 2026-09-09, same day, round 2 (Aleksandr: "хочу чтобы админ-страница
// показывала посты со всех технических аккаунтов сразу... сейчас на
// сервисном акке показывает только одну вакансию"): confirmed live,
// exactly the risk this comment used to flag below — every scraped/
// bulk-provisioned company has its OWN account (see lib/a1/admin-
// accounts.ts), so the original /api/posts/mine-based version only ever
// showed whichever ONE account was signed in in this browser. Data now
// comes from app/api/admin/all-posts (lib/a1/admin-post-aggregate.ts),
// which logs into every account on file and merges their posts — see
// components/admin-posts-panel.tsx's own header for the rest of the
// story. This page component itself is unchanged: it only gates access
// (the allowlist check below) and hands off to the panel.
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
