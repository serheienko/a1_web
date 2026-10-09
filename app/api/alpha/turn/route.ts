import { NextRequest, NextResponse } from "next/server";
import { alphaTurn, rebase } from "@/lib/alpha/brain";
import { alphaUserId, loadPortrait } from "@/lib/alpha/portrait-store";
import { aiEnabled, alphaTurnAI } from "@/lib/alpha/ai";
import { alphaEnabled, isSignedIn } from "@/lib/alpha/guard";
import type { AlphaTurnRequest } from "@/lib/alpha/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!alphaEnabled()) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isSignedIn(req)) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  let body: AlphaTurnRequest;
  try {
    body = (await req.json()) as AlphaTurnRequest;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body?.message !== "string" || body.message.length > 2000) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  // 09.10.2026: first message of a member's search -> start from what Alpha
  // already knows about the person (asked only what's missing or changed).
  let remembered = false;
  let changed = false;
  if ((body as { useSaved?: boolean }).useSaved && !body.portrait && !body.answering) {
    const id = await alphaUserId(req);
    const saved = id ? await loadPortrait(id) : null;
    if (saved && saved.portrait.stack.length) {
      const r = rebase(saved.portrait, body.message);
      body.portrait = r.portrait;
      remembered = true;
      changed = r.changed;
    }
  }
  const clean: AlphaTurnRequest = {
    ...body,
    asked: Array.isArray(body.asked) ? body.asked : [],
    history: Array.isArray(body.history) ? body.history.filter((h) => h && typeof h.text === "string").slice(-40) : [],
  };
  // AI brain when the key is set; any failure -> the rule-based one.
  if (aiEnabled()) {
    try {
      return NextResponse.json({ ...(await alphaTurnAI(clean)), remembered, changed });
    } catch (e) {
      console.error("[alpha] ai turn failed, falling back to rules:", e);
    }
  }
  return NextResponse.json({ ...alphaTurn(clean), remembered, changed });
}
