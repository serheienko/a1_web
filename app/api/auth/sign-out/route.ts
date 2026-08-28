// app/api/auth/sign-out/route.ts
//
// Phase 5a: clears both session cookies (lib/a1/session.ts). No backend
// call — PLAN.md §6.1's ground truth doesn't document a token-revocation
// endpoint, and there's nothing in this codebase's list of 121 known
// methods to invent one against (PLAN.md §5 rule 1). Forgetting the
// cookie is enough for a visitor-facing "sign out" at this phase; revisit
// if a real revoke endpoint turns up later.

import { NextResponse } from "next/server";
import { clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSession(response);
  return response;
}
