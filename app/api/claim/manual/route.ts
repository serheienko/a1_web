export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/claim/manual/route.ts
//
// 11.10.2026. Заявка «проверьте нас руками» -- для компаний, которых
// правило проверить не может: оно сверяет домен почты с сайтом, который
// компания сама показала, а сайт в профиле есть примерно у шести из
// десяти (замер того же дня).
//
// Здесь ничего не выдаётся и никому не пишется: заявка просто ложится в
// список на /admin/claims. Выдаёт ссылку человек, проверив компанию.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addClaimRequest } from "@/lib/claims/store";

const Input = z.object({
  postId: z.string().trim().min(1).optional(),
  username: z.string().trim().min(1).max(64).optional(),
  email: z.string().trim().toLowerCase().email(),
  site: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
});

// Столько заявок с адреса в час: заслон от зациклившейся формы, не от злого умысла.
const MAX_PER_HOUR = 5;
const seen = new Map<string, { n: number; since: number }>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  const rec = seen.get(ip);
  if (!rec || now - rec.since > 3_600_000) {
    seen.set(ip, { n: 1, since: now });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_PER_HOUR;
}

export async function POST(request: NextRequest) {
  let input: z.infer<typeof Input>;
  try {
    input = Input.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });
  }
  if (!input.postId && !input.username) {
    return NextResponse.json({ ok: false, reason: "bad_input" }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooMany(ip)) {
    return NextResponse.json({ ok: false, reason: "too_many_attempts" }, { status: 429 });
  }

  const ok = await addClaimRequest({
    target: input.postId ? { kind: "post", postId: input.postId } : { kind: "username", username: input.username! },
    company: input.username ?? "",
    email: input.email,
    site: input.site ?? "",
    note: input.note ?? "",
  });

  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, reason: "unknown" }, { status: 502 });
}
