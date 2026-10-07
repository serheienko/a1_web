import { NextRequest, NextResponse } from "next/server";
import { alphaTurn } from "@/lib/alpha/brain";
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
  return NextResponse.json(alphaTurn({ ...body, asked: Array.isArray(body.asked) ? body.asked : [] }));
}
