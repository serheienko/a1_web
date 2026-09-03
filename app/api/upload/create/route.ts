// app/api/upload/create/route.ts
//
// Phase 7 image upload (PLAN.md §6.1's `upload.create`): the first half
// of the direct-to-storage flow. Returns EITHER a presigned-POST
// destination (`{ id, url, fields }` — the client then POSTs the raw
// file bytes straight to `url` with `fields`, never back through our
// server, per PLAN.md's explicit "never through our server") OR a
// MediaUploadUsage object when the account is over its media quota.
//
// 2026-09-02 (Aleksandr, native-app screenshot of a "Daily Uploads"
// screen: "лимит по daily uploads на 1 пользователя 20 мб день, на
// вэбе надо тоже прокинуть... каждый медиа файл подсчитывается и
// лочится потом, если дневной больше 20 мб день. Возьми всю логику с
// моб версии") -- this route USED TO just forward whichever of the two
// shapes came back and let each caller infer "quota exceeded" purely
// from the ABSENCE of `.url` (functionally correct -- an upload attempt
// already failed either way -- but told the visitor nothing about why,
// unlike the native app's own explicit "94 KB / 20 MB, available again
// in 3m" messaging). Now discriminates the two by their own `object`
// tag (MediaUploadUsageSchema/lib/a1/schemas.ts, confirmed against the
// OpenAPI spec) and returns a distinct `quota_exceeded` response
// carrying the real usage figures, so every caller (post-editor.tsx,
// profile-editor.tsx, avatar-edit-button.tsx, app/chats/[chatId]/
// page.tsx) can show something as informative as the native app does
// instead of a generic upload-failed message.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { MediaUploadUsageSchema } from "@/lib/a1/schemas";

export const runtime = "nodejs";

const UploadCreateInput = z.object({
  mimetype: z.string().trim().min(1),
  bytes: z.number().positive(),
  // 2026-09-03 (Aleksandr, live screenshots: every file this app itself
  // uploads shows the generic "Документ"/"FILE" fallback in the chat
  // bubble instead of its real name/icon, e.g. "report.xlsx") -- traced
  // to this route never telling the backend what the file was actually
  // called: `mediaDocumentFileName()` (lib/a1/chat-schemas.ts) reads an
  // `attribute-filename` entry off the CONFIRMED chat-doc shape, but
  // nothing here ever sent one in, so it's always absent on anything
  // uploaded through this app. PLAN.md's own confirmed `upload.create`
  // input shape (§ table, off the OpenAPI spec) is `{ mimetype, bytes,
  // flags?, ttlSeconds?, attributes? }` -- that optional `attributes`
  // is the same array shape read back on the confirmed doc, so this is
  // an input echoed straight through, not a new field being invented.
  fileName: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = UploadCreateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const { fileName, ...rest } = parsed.data;
    const payload = fileName
      ? { ...rest, attributes: [{ object: "attribute-filename", fileName }] }
      : rest;
    const { data, refreshedSession } = await callAsVisitor<unknown>("upload.create", payload);
    const usageParsed = MediaUploadUsageSchema.safeParse(data);
    if (usageParsed.success) {
      const response = NextResponse.json({ ok: false, message: "quota_exceeded", usage: usageParsed.data });
      if (refreshedSession) setSession(response, refreshedSession);
      return response;
    }
    const response = NextResponse.json({ ok: true, result: data });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      // The visitor's session cookie is unusable (never existed, or its
      // refresh token was itself rejected by the backend — see
      // lib/a1/visitor-call.ts's callAsVisitor for when that happens) —
      // clear it so a stale cookie does not keep silently failing every
      // later call instead of sending the visitor back to /sign-in.
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/upload/create] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/upload/create] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "upload_create_failed", detail }, { status: 502 });
  }
}
