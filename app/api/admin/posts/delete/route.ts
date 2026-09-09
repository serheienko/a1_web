// app/api/admin/posts/delete/route.ts
//
// 2026-09-09: admin-only counterpart to app/api/posts/delete/route.ts —
// same reasoning as app/api/admin/posts/update/route.ts's header. Logs
// in as the target account (lib/a1/admin-act-as.ts) instead of using
// the admin's own cookie session, since the post being deleted belongs
// to a different account. Gated by the same email allowlist as
// /admin/posts itself.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { call, A1ApiError } from "@/lib/a1/client";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { getAdminActAsToken, UnknownAccountError } from "@/lib/a1/admin-act-as";

export const runtime = "nodejs";

const AdminDeletePostInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  id: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    return NextResponse.json({ ok: false, message: "not_found" }, { status: 404 });
  }

  const parsed = AdminDeletePostInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const accessToken = await getAdminActAsToken(parsed.data.email);
    await call<unknown>("posts.deletePost", { id: parsed.data.id }, { accessToken });
    // Same reasoning as app/api/posts/delete/route.ts's own
    // revalidatePath calls — a deleted post should stop showing on the
    // feed right away rather than sitting in the ISR cache.
    revalidatePath("/");
    revalidatePath("/talents");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnknownAccountError) {
      return NextResponse.json({ ok: false, message: "unknown_account" }, { status: 404 });
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/admin/posts/delete] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/admin/posts/delete] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "delete_failed", detail }, { status: 502 });
  }
}
