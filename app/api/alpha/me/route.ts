// GET /api/alpha/me -- is the visitor an Alpha member, and what Alpha
// remembers about them (09.10.2026: members get Alpha right in the search
// box instead of the separate "Try Alpha" button).
import { NextRequest, NextResponse } from "next/server";
import { alphaEnabled, hasPremium, isSignedIn } from "@/lib/alpha/guard";
import { alphaUserId, loadPortrait } from "@/lib/alpha/portrait-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const none = NextResponse.json({ member: false, portrait: null }, { headers: { "cache-control": "no-store" } });
  if (!alphaEnabled() || !isSignedIn(req)) return none;
  const member = await hasPremium(req);
  if (!member) return none;
  const id = await alphaUserId(req);
  const saved = id ? await loadPortrait(id) : null;
  return NextResponse.json({ member, portrait: saved?.portrait ?? null }, { headers: { "cache-control": "no-store" } });
}
