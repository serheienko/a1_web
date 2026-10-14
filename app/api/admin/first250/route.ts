// app/api/admin/first250/route.ts -- CSV со списком акции «Перші 250» (только для ADMIN_EMAILS).
import { NextResponse } from "next/server";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { allEntries, totalSeats } from "@/lib/first250/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cell(v: string | number | null): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) return new NextResponse("Not found", { status: 404 });
  const total = totalSeats();
  const rows = await allEntries();
  const lines = [["place", "in_first_" + total, "name", "username", "email", "user_id", "claimed_at"].join(",")];
  for (const r of rows) {
    lines.push([r.place, r.place <= total ? "yes" : "no", r.name, r.username, r.email, r.userId, r.claimedAt].map(cell).join(","));
  }
  return new NextResponse("﻿" + lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="a1-first250-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
