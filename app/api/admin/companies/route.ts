// app/api/admin/companies/route.ts
//
// 2026-09-11 (Aleksandr: "хочу увидеть функционал передачи акка в
// админке"). The list /admin/companies renders: every technical account
// on file, name + email only. No network calls at all — this reads
// TECHNICAL_ACCOUNTS_JSON straight out of the server env
// (lib/a1/admin-accounts.ts), so it answers instantly even at ~500
// accounts, unlike the posts/applications aggregates next to it.
//
// The passwords in that env var are deliberately NOT part of the
// response shape: the browser never needs them (app/api/admin/claim-link
// does the signing-in server-side), and this repo is public.

import { NextResponse } from "next/server";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { loadTechnicalAccounts } from "@/lib/a1/admin-accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    return NextResponse.json({ ok: false, message: "not_found" }, { status: 404 });
  }
  const companies = loadTechnicalAccounts().map((a) => ({ name: a.name, email: a.email }));
  return NextResponse.json({ ok: true, companies });
}
