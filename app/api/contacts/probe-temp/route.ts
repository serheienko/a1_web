// app/api/contacts/_probe/route.ts
//
// TEMPORARY, 2026-08-31 — deleted again in the same session once
// contacts.removeContact's real method name/body shape is confirmed.
// contacts.removeContact (app/api/contacts/remove/route.ts's guess) came
// back "Unknown method: v1/contacts.removeContact" live. Rather than
// guess-and-redeploy repeatedly (each guess needing its own push +
// Vercel build + wait), this lets the already-deployed app try arbitrary
// callAsVisitor(method, body) calls from a single POST, so every
// candidate name/shape can be tried against the live backend with a
// plain fetch — no redeploy per guess. Signed-in-visitor only (same
// callAsVisitor + NoSessionError handling every other contacts/* route
// uses) since it can only do what the caller's own session is already
// allowed to do.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";

export const runtime = "nodejs";

const ProbeInput = z.object({
  method: z.string().trim().min(1),
  body: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = ProbeInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { method, body } = parsed.data;

  try {
    const { data } = await callAsVisitor<unknown>(method, body ?? {});
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof NoSessionError) {
      return NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    const httpStatus = err instanceof A1ApiError ? err.httpStatus : null;
    return NextResponse.json({ ok: false, httpStatus, detail, raw: err instanceof A1ApiError ? err.body.slice(0, 500) : String(err) });
  }
}
