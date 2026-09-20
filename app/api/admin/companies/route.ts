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
import { describeAccountsEnv, loadAllTechnicalAccounts } from "@/lib/a1/admin-accounts";
import { describeCloudAccounts } from "@/lib/a1/cloud-accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    return NextResponse.json({ ok: false, message: "not_found" }, { status: 404 });
  }
  // ?diag=1 -- почему список пуст (см. describeAccountsEnv: только признаки
  // значения, без самих аккаунтов). За админской проверкой выше.
  if (new URL(request.url).searchParams.get("diag") === "1") {
    return NextResponse.json({
      ok: true,
      diag: describeAccountsEnv(),
      // 2026-09-20: и про облачный список тоже -- только счётчик и
      // «настроено ли», без почт и паролей.
      cloud: await describeCloudAccounts(),
    });
  }
  const companies = (await loadAllTechnicalAccounts()).map((a) => ({ name: a.name, email: a.email }));
  return NextResponse.json({ ok: true, companies });
}
