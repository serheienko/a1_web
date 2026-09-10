// app/api/admin/all-posts/route.ts
//
// 2026-09-09 (Aleksandr: "хочу чтобы админ-страница показывала посты со
// всех технических аккаунтов сразу"). GET-only, admin-gated the exact
// same way app/admin/posts/page.tsx already is (lib/admin-access.ts's
// email allowlist — checked here too, not just on the page, since this
// route can be hit directly). Aggregates every account listed in
// lib/a1/admin-accounts.ts instead of app/api/posts/mine's single
// signed-in-account scope — see lib/a1/admin-post-aggregate.ts for the
// actual fetch-and-merge logic.

import { NextResponse } from "next/server";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { fetchAllAccountsPosts } from "@/lib/a1/admin-post-aggregate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 2026-09-10: with TECHNICAL_ACCOUNTS_JSON now ~490 entries, a cold
// lambda doing the full fetchAllAccountsPosts() pass (even with the
// concurrency cap in lib/a1/admin-post-aggregate.ts) can run past the
// platform's default function timeout. Raise it explicitly -- 60s is
// within the Hobby plan's own ceiling too, so this is safe regardless
// of which Vercel plan this project is on.
export const maxDuration = 60;

export async function GET() {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    // Same "plain 404, not 401/403" choice app/admin/posts/page.tsx
    // makes — an unauthorized visitor shouldn't learn this route exists
    // at all.
    return NextResponse.json({ ok: false, message: "not_found" }, { status: 404 });
  }

  const posts = await fetchAllAccountsPosts();
  return NextResponse.json({ ok: true, posts });
}
