// app/api/chats/stickers/sets/route.ts
//
// Block 1 (stickers/GIF/emoji panel, Aleksandr 2026-09-06 go-ahead) --
// thin proxy for chat-server's messages.getAllStickers ({} -> { sets }),
// same shape as every other callAsVisitor route in this app. No input
// to validate (the method takes none), so this is a GET, not a POST,
// unlike the reaction routes.
import { NextRequest, NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { GetAllStickersOutputSchema } from "@/lib/a1/media-panel-schemas";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.getAllStickers", {});
    const parsed = GetAllStickersOutputSchema.safeParse(data);
    const response = NextResponse.json({ ok: true, sets: parsed.success ? parsed.data.sets : [] });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    if (err instanceof A1ApiError) {
      console.error("[api/chats/stickers/sets] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/stickers/sets] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "stickers_sets_failed" }, { status: 502 });
  }
}
