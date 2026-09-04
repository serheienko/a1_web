// app/api/chats/save-draft/route.ts
//
// 2026-09-05 (Aleksandr, live bug report: the compose box now seeds
// from the chat's own saved draft on open (PLAN.md 6.147), but this
// web client never wrote a draft back -- "когда я вручную стираю
// инпут и нажимяю стрелку назад и ухожу в чат-лист надпись 'драфт'
// по-прежнему остается, и само сообщение в инпуте потом тоже. То есть
// надо сделать, чтобы оно дружило с актуальным инпутом и понимало,
// что я удалил"). The chat LIST's own "Чернетка" text and this page's
// seeded compose box both only ever READ chat.draft (app/api/chats/
// list's own draftText) -- nothing in this repo ever called the write
// side, so whatever draft the mobile app (or an earlier web session)
// last saved just sat there forever, no matter what this tab's own
// input box did.
//
// Endpoint confirmed off the mobile app's own source (~/mnt/a1_app/
// aone_private, not guessed): lib/core/constants/api_constants.dart's
// `chatSaveDraft` = `.../v1/messages.saveDraft`, called from
// lib/features/chat/data/services/draft_service.dart's own
// `_saveDraftToApi` with exactly the payload shape below --
// `peerTo`/`flags`/`message` (message REQUIRED even when clearing --
// that file's own comment: "API requires `message` for saveDraft,
// even when clearing or entity-only drafts"), `entities`/`replyTo`
// only when actually present. Clearing a draft is this SAME call with
// `message: ""` and no entities, not a separate endpoint (mobile's
// own `clearDraft()` posts exactly that) -- so this route accepts an
// empty string on purpose, it isn't a validation gap.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const SaveDraftInput = z.object({
  chatId: z.string().trim().min(1),
  // Empty string is the CLEAR case (see header) -- not `.min(1)`.
  message: z.string().max(4000),
});

export async function POST(request: NextRequest) {
  const parsed = SaveDraftInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, message } = parsed.data;

  try {
    const payload = {
      peerTo: peerForRouteParam(chatId),
      flags: 0,
      message,
    };
    const { refreshedSession } = await callAsVisitor<unknown>("messages.saveDraft", payload);
    const response = NextResponse.json({ ok: true });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/chats/save-draft] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/save-draft] unexpected error:", err);
    }
    // 2026-09-05: best-effort by design (same stance as this route's
    // caller, app/chats/[chatId]/page.tsx's debounced draft-sync
    // effect) -- a failed draft save is never worth surfacing to the
    // person as an error, it just means the NEXT successful save (or
    // this same chat's list-row draftText from before) wins instead.
    return NextResponse.json({ ok: false, message: "save_draft_failed", detail }, { status: 502 });
  }
}
