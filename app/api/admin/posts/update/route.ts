// app/api/admin/posts/update/route.ts
//
// 2026-09-09: admin-only counterpart to app/api/posts/update/route.ts —
// see that file's own header for why posts.updatePost wants the NESTED
// `{ id, input }` shape (confirmed live, does NOT mirror create's
// flattened root). Logs in as the target account instead of using the
// admin's own cookie session (lib/a1/admin-act-as.ts) — the admin panel
// edits posts that belong to OTHER accounts, one per company, see
// lib/a1/admin-accounts.ts. Gated by the same email allowlist as
// /admin/posts itself.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PostInputSchema } from "@/lib/a1/schemas";
import { call, A1ApiError } from "@/lib/a1/client";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { getAdminActAsToken, UnknownAccountError } from "@/lib/a1/admin-act-as";

export const runtime = "nodejs";

const AdminUpdatePostInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  id: z.string().trim().min(1),
  input: PostInputSchema,
});

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    return NextResponse.json({ ok: false, message: "not_found" }, { status: 404 });
  }

  const parsed = AdminUpdatePostInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const accessToken = await getAdminActAsToken(parsed.data.email);
    const data = await call<unknown>(
      "posts.updatePost",
      { id: parsed.data.id, input: parsed.data.input },
      { accessToken },
    );
    if (!parsed.data.input.draft) {
      revalidatePath("/");
      revalidatePath("/talents");
    }
    return NextResponse.json({ ok: true, post: data });
  } catch (err) {
    if (err instanceof UnknownAccountError) {
      return NextResponse.json({ ok: false, message: "unknown_account" }, { status: 404 });
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/admin/posts/update] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/admin/posts/update] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "update_failed", detail }, { status: 502 });
  }
}
