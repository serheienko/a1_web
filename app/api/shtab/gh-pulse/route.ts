// app/api/shtab/gh-pulse/route.ts
//
// 15.10.2026 (Александр: «что такое кеш Workable и почему он не подключён»). Пульс от задачи на GitHub
// (konkistador/.github/workflows/harvest-workable.yml). Вместо общего секрета -- подписанный GitHub
// «пропуск» (lib/a1/github-oidc.ts): пускаем только задачу harvest-workable из репозитория
// serheienko/konkistador, и только для агента «harvest».
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyGithubToken } from "@/lib/a1/github-oidc";
import { savePulse } from "@/lib/a1/shtab-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GH_PULSE_AUDIENCE = "a1-shtab";
const REPO = "serheienko/konkistador";
const WORKFLOW = `${REPO}/.github/workflows/harvest-workable.yml@`;

const Body = z.object({
  status: z.enum(["working", "ok", "error"]),
  note: z.string().max(300).optional(),
  published: z.number().int().min(0).max(10_000_000).nullable().optional(),
  errors: z.number().int().min(0).max(1_000_000).nullable().optional(),
});

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 });

  let claims;
  try {
    claims = await verifyGithubToken(token, GH_PULSE_AUDIENCE);
  } catch (e) {
    console.error("[api/shtab/gh-pulse] github keys:", String(e).slice(0, 200));
    return NextResponse.json({ ok: false, error: "keys unavailable" }, { status: 503 });
  }
  if (!claims || claims.repository !== REPO || !(claims.workflow_ref ?? "").startsWith(WORKFLOW)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 });
  }

  const raw = await req.text();
  if (raw.length > 4000) return NextResponse.json({ ok: false, error: "too large" }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });

  const saved = await savePulse({ agent: "harvest", ...parsed.data });
  return NextResponse.json({ ok: saved }, { status: saved ? 200 : 502 });
}
