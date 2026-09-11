// app/api/admin/applications/route.ts
//
// 2026-09-11 (Aleksandr: "хочу посмотреть что отклик пришел"). GET-only,
// admin-gated exactly like app/api/admin/all-posts/route.ts — plain 404,
// not 401/403, so an unauthorized visitor doesn't learn this route
// exists. Paginated by ACCOUNT (?offset=&limit=) for the same Vercel
// 60s reason that route documents; see lib/a1/admin-applications.ts for
// the fetch-and-merge itself.
//
// Read-only on purpose: nothing here sends a message, marks a chat read
// or otherwise touches state the company will see when it claims the
// account.

import { NextResponse } from "next/server";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { fetchAccountsApplicationsPage } from "@/lib/a1/admin-applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Smaller than all-posts' own 20: one account here costs up to three
// round trips (chats, messages per chat, users) instead of one.
const DEFAULT_PAGE_SIZE = 40;
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    return NextResponse.json({ ok: false, message: "not_found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("limit")) || DEFAULT_PAGE_SIZE));

  const page = await fetchAccountsApplicationsPage(offset, limit);
  return NextResponse.json({ ok: true, ...page });
}
