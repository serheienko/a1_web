// app/api/chats/stickers/recent/route.ts
//
// Block 1 -- thin proxy for chat-server's messages.getRecentStickers
// ({} -> { stickers, dates }), backs the panel's "recently used" row
// (the clock-icon tab in the reference screenshots, STICKERS_AND_
// REACTIONS_PLAN.md). No input, GET like the sibling sets route.
import { NextRequest, NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { GetRecentStickersOutputSchema } from "@/lib/a1/media-panel-schemas";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.getRecentStickers", {});
    const parsed = GetRecentStickersOutputSchema.safeParse(data);
    const response = NextResponse.json({
      ok: true,
      stickers: parsed.success ? parsed.data.stickers : [],
    });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    if (err instanceof A1ApiError) {
      console.error("[api/chats/stickers/recent] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/stickers/recent] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "stickers_recent_failed" }, { status: 502 });
  }
}
