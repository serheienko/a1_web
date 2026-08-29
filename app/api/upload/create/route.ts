// app/api/upload/create/route.ts
//
// Phase 7 image upload (PLAN.md §6.1's `upload.create`): the first half
// of the direct-to-storage flow. Returns EITHER a presigned-POST
// destination (`{ id, url, fields }` — the client then POSTs the raw
// file bytes straight to `url` with `fields`, never back through our
// server, per PLAN.md's explicit "never through our server") OR a
// MediaUploadUsage object when the account is over its media quota —
// this route doesn't need to tell those two apart, it just forwards
// whichever one the backend returned and lets the post-editor's upload
// code branch on the presence of `url`.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const UploadCreateInput = z.object({
  mimetype: z.string().trim().min(1),
  bytes: z.number().positive(),
});

export async function POST(request: NextRequest) {
  const parsed = UploadCreateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("upload.create", parsed.data);
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
