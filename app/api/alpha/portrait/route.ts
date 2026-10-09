// GET/PUT /api/alpha/portrait -- what Alpha remembers about the person
// (shared by the site and the app). PUT {portrait: null} forgets it.
import { NextRequest, NextResponse } from "next/server";
import { alphaEnabled, isSignedIn } from "@/lib/alpha/guard";
import { alphaUserId, loadPortrait, portraitStorage, savePortrait } from "@/lib/alpha/portrait-store";
import { EMPTY_PORTRAIT } from "@/lib/alpha/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function who(req: NextRequest): Promise<{ error: NextResponse; id?: undefined } | { error?: undefined; id: string }> {
  if (!alphaEnabled()) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  if (!isSignedIn(req)) return { error: NextResponse.json({ error: "not_signed_in" }, { status: 401 }) };
  const id = await alphaUserId(req);
  if (!id) return { error: NextResponse.json({ error: "not_signed_in" }, { status: 401 }) };
  return { id };
}

export async function GET(req: NextRequest) {
  const w = await who(req);
  if (w.error || !w.id) return w.error ?? NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  const saved = await loadPortrait(w.id);
  return NextResponse.json(
    { portrait: saved?.portrait ?? null, updatedAt: saved?.updatedAt ?? null, storage: portraitStorage() },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: NextRequest) {
  const w = await who(req);
  if (w.error || !w.id) return w.error ?? NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  let body: { portrait?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const saved = await savePortrait(w.id, body.portrait == null ? EMPTY_PORTRAIT : (body.portrait as typeof EMPTY_PORTRAIT));
  return NextResponse.json({ portrait: saved.portrait, updatedAt: saved.updatedAt });
}
