// app/api/admin/cloud-accounts/route.ts
//
// 14.10.2026: сюда парсер (a1-dou-runner/accounts_store.py) присылает зашифрованный файл аккаунтов
// компаний (раньше клал его в Vercel Blob). Файл и так зашифрован (AES-256-GCM, ключ A1_ACCOUNTS_SECRET);
// подпись запроса -- HMAC-SHA256 тела тем же секретом, сам секрет по сети не ходит.
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { CLOUD_ACCOUNT_PATHS, saveCloudAccountsFile } from "@/lib/a1/cloud-accounts";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const secret = (process.env.A1_ACCOUNTS_SECRET ?? "").trim();
  if (!secret) return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });

  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!CLOUD_ACCOUNT_PATHS.includes(path)) return NextResponse.json({ ok: false, error: "bad path" }, { status: 400 });

  const body = Buffer.from(await req.arrayBuffer());
  if (!body.length || body.length > MAX_BYTES) return NextResponse.json({ ok: false, error: "bad size" }, { status: 413 });

  const given = Buffer.from((req.headers.get("x-a1-signature") ?? "").trim(), "utf8");
  const want = Buffer.from(createHmac("sha256", secret).update(path + "\n").update(body).digest("hex"), "utf8");
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 });
  }

  try {
    const ok = await saveCloudAccountsFile(path, body);
    return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "storage" }, { status: 502 });
  }
}
