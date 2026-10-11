export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/admin/claims/route.ts
//
// 11.10.2026. Список заявок для /admin/claims и две кнопки над ними:
// «выдать ссылку» и «отклонить».
//
// Ссылку минтит бэкенд (auth.claimLink) по секрету CLAIM_GRANT_SECRET --
// сайт не знает паролей мировых аккаунтов компаний, и выдумывать их здесь
// нечем. Без секрета кнопка честно отвечает, что путь не настроен.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { call, A1ApiError } from "@/lib/a1/client";
import { loadClaims, setClaimStatus } from "@/lib/claims/store";

const notFound = () => NextResponse.json({ ok: false, message: "not_found" }, { status: 404 });

export async function GET() {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) return notFound();
  const rows = await loadClaims();
  if (!rows) return NextResponse.json({ ok: false, message: "storage" }, { status: 502 });
  return NextResponse.json({
    ok: true,
    // Новые сверху, разобранные ниже.
    rows: [...rows].reverse(),
    grantReady: !!(process.env.CLAIM_GRANT_SECRET ?? "").trim(),
  });
}

const Action = z.object({
  id: z.string().trim().min(1),
  action: z.enum(["grant", "reject"]),
});

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) return notFound();

  let input: z.infer<typeof Action>;
  try {
    input = Action.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "bad_input" }, { status: 400 });
  }

  const rows = await loadClaims();
  const row = rows?.find((r) => r.id === input.id);
  if (!row) return notFound();

  if (input.action === "reject") {
    const saved = await setClaimStatus(row.id, "rejected");
    return saved
      ? NextResponse.json({ ok: true, row: saved })
      : NextResponse.json({ ok: false, message: "storage" }, { status: 502 });
  }

  const grant = (process.env.CLAIM_GRANT_SECRET ?? "").trim();
  if (!grant) {
    return NextResponse.json({ ok: false, message: "grant_not_configured" }, { status: 503 });
  }

  let link: string;
  try {
    const data = await call<{ key: string; code: string }>("auth.claimLink", {
      ...(row.target.kind === "post" ? { postId: row.target.postId } : { username: row.target.username }),
      grant,
    });
    if (!data?.key || !data?.code) throw new Error("bad_response");
    link = `https://jobs.a1appp.com/claim/${encodeURIComponent(data.key)}/${encodeURIComponent(data.code)}`;
  } catch (err) {
    const detail = err instanceof A1ApiError ? err.detail : null;
    console.error("[api/admin/claims] claimLink failed:", detail ?? err);
    return NextResponse.json({ ok: false, message: "claim_link_failed", detail }, { status: 502 });
  }

  const saved = await setClaimStatus(row.id, "granted", link);
  // Ссылка уже выдана бэкендом: даже если список не записался, отдаём её --
  // потерять её здесь значит выдать компании вторую.
  return NextResponse.json({ ok: true, link, row: saved ?? { ...row, status: "granted", link } });
}
