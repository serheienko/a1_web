// app/api/admin/referral/route.ts -- CSV рефералов: кто кого пригласил и в каком статусе (только для ADMIN_EMAILS).
import { NextResponse } from "next/server";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { kvConfigured, kvGetMany } from "@/lib/kv/store";
import { HOLD_HOURS } from "@/lib/referral/ladder";
import type { Invite } from "@/lib/referral/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cell(v: string | number | null): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) return new NextResponse("Not found", { status: 404 });
  const items = kvConfigured() ? await kvGetMany("a1/referral/by/") : [];
  const now = Date.now();
  const lines = [["referrer_id", "friend_id", "friend_name", "code", "status", "counted", "joined_at", "live_at"].join(",")];
  for (const it of items) {
    try {
      const i = JSON.parse(it.body.toString("utf8")) as Invite;
      const counted = now - Date.parse(i.joinedAt) >= HOLD_HOURS * 3600_000 ? "yes" : "no";
      lines.push([i.referrerId, i.friendId, i.name ?? "", i.code, i.status, counted, i.joinedAt, i.liveAt ?? ""].map(cell).join(","));
    } catch {
      /* битая запись -- пропускаем */
    }
  }
  return new NextResponse("﻿" + lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="a1-referral-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
