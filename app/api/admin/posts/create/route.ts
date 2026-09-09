// app/api/admin/posts/create/route.ts
//
// 2026-09-09: admin-only counterpart to app/api/posts/create/route.ts.
// The normal route always publishes as whoever's cookie-session is
// signed in (callAsVisitor) — no use for the admin panel, which
// publishes on behalf of OTHER accounts (one per company, see
// lib/a1/admin-accounts.ts). Logs in as the target account instead
// (lib/a1/admin-act-as.ts), then calls posts.createPost with that
// short-lived token. Gated by the same email allowlist as /admin/posts
// itself — this must never be reachable by a non-admin visitor.
//
// Same "PostInput spread at the ROOT, no `{input}` wrapper" shape as
// the normal create route — see that file's own comment for why
// (confirmed live 2026-08-29: additionalProperties is false at the
// root, a wrapper 400s).

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PostInputSchema } from "@/lib/a1/schemas";
import { call, A1ApiError } from "@/lib/a1/client";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { getAdminActAsToken, UnknownAccountError } from "@/lib/a1/admin-act-as";

export const runtime = "nodejs";

const AdminCreatePostInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  input: PostInputSchema,
});

export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!isAdminEmail(session?.email ?? null)) {
    return NextResponse.json({ ok: false, message: "not_found" }, { status: 404 });
  }

  const parsed = AdminCreatePostInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }

  try {
    const accessToken = await getAdminActAsToken(parsed.data.email);
    const data = await call<unknown>("posts.createPost", parsed.data.input, { accessToken });
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
      console.error("[api/admin/posts/create] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/admin/posts/create] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "create_failed", detail }, { status: 502 });
  }
}
