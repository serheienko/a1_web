// app/api/upload/usage/route.ts
//
// 2026-09-02 (Aleksandr, native-app screenshot of a "Daily Uploads"
// screen -- "94 KB / 20 MB", a progress bar broken down by media type,
// "Available again in 3m": "лимит по daily uploads на 1 пользователя
// 20 мб день, на вэбе надо тоже прокинуть... каждый медиа файл
// подсчитывается и лочится потом, если дневной больше 20 мб день.
// Возьми всю логику с моб версии") -- wraps chat-server's own
// `upload.getUsage` (confirmed via the OpenAPI spec: no input at all,
// returns Resource.MediaUploadUsage directly) for an ON-DEMAND check,
// independent of actually attempting an upload. app/api/upload/create/
// route.ts's own quota_exceeded response carries the same
// MediaUploadUsage shape reactively (the moment an upload gets
// rejected) -- this route is for anything that wants to know the
// current usage proactively (e.g. showing a running total before the
// visitor even picks a file), not built into any page yet.
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { MediaUploadUsageSchema } from "@/lib/a1/schemas";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("upload.getUsage", {});
    const parsed = MediaUploadUsageSchema.safeParse(data);
    if (!parsed.success) {
      console.warn("[api/upload/usage] unexpected usage shape", parsed.error);
      return NextResponse.json({ ok: false, message: "unexpected_usage_shape" }, { status: 502 });
    }
    const response = NextResponse.json({ ok: true, usage: parsed.data });
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
      console.error("[api/upload/usage] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/upload/usage] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "usage_failed", detail }, { status: 502 });
  }
}
