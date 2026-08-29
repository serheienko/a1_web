// app/api/upload/confirm/route.ts
//
// Phase 7 image upload (PLAN.md §6.1's `upload.confirm`): the second
// half — called once the browser has finished POSTing the file bytes to
// the presigned destination from app/api/upload/create/route.ts.
// Returns the finalized MediaDocument (same shape lib/a1/mappers.ts
// already maps on the read side), which the post-editor form then
// pushes into its own `media[]` array to send back on
// posts.createPost/updatePost.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession } from "@/lib/a1/session";
import { MediaDocumentSchema } from "@/lib/a1/schemas";

export const runtime = "nodejs";

const UploadConfirmInput = z.object({ documentId: z.string().trim().min(1) });

export async function POST(request: NextRequest) {
  const parsed = UploadConfirmInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("upload.confirm", {
      documentId: parsed.data.documentId,
    });
    const media = MediaDocumentSchema.safeParse(data);
    if (!media.success) {
      console.warn("[api/upload/confirm] unexpected media shape", media.error);
      return NextResponse.json({ ok: false, message: "unexpected_media_shape" }, { status: 502 });
    }
    const response = NextResponse.json({ ok: true, media: media.data });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      return NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/upload/confirm] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/upload/confirm] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "upload_confirm_failed", detail }, { status: 502 });
  }
}
