// lib/a1/claim-errors.ts
//
// 2026-09-11: shared by both claim routes. It lives here rather than being
// exported from one of them because Next type-checks route files and only
// tolerates the HTTP-verb exports.

import { A1ApiError } from "@/lib/a1/client";

export type ClaimFailureReason = "link_invalid" | "already_claimed" | "email_taken" | "wrong_code" | "unknown";

/**
 * Our backend answers with an AppError carrying a stable `code`. Kept as a
 * narrow whitelist so a new backend code can never leak raw text into the UI —
 * anything unrecognised becomes "unknown" and the form shows its own copy.
 */
export function reasonFromError(err: unknown): ClaimFailureReason {
  if (!(err instanceof A1ApiError)) return "unknown";
  try {
    const parsed = JSON.parse(err.body) as Record<string, unknown>;
    const code = typeof parsed.code === "string" ? parsed.code : null;
    if (code === "CLAIM_LINK_INVALID") return "link_invalid";
    if (code === "ACCOUNT_ALREADY_CLAIMED") return "already_claimed";
    if (code === "UNIQUE_CONSTRAINT_VIOLATION") return "email_taken";
  } catch {
    // fall through to the generic reason below
  }
  return "unknown";
}
