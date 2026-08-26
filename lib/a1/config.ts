// lib/a1/config.ts
//
// The only file that reads process.env directly for A1 API config.
// Fails fast at import time if anything required is missing — a broken
// deploy should never limp along with an undefined API base URL.
// See PLAN.md §0.4 rule 2 (Phase 0) and HANDOFF.md Step 3.1.

import { z } from "zod";

if (typeof window !== "undefined") {
  // This file talks to server-side secrets. It must never be reachable
  // from a client bundle — see PLAN.md §1 rule 4 / §5 rule 4.
  throw new Error("[lib/a1/config] imported from the browser — this must stay server-only");
}

const envSchema = z.object({
  A1_API_BASE: z.string().url(),
  A1_SERVICE_EMAIL: z.string().email(),
  A1_SERVICE_PASSWORD: z.string().min(1),
});

function loadEnv() {
  const parsed = envSchema.safeParse({
    A1_API_BASE: process.env.A1_API_BASE,
    A1_SERVICE_EMAIL: process.env.A1_SERVICE_EMAIL,
    A1_SERVICE_PASSWORD: process.env.A1_SERVICE_PASSWORD,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`[lib/a1/config] invalid or missing environment variables — ${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();

// ---------------------------------------------------------------------------
// Founder's interim decisions, 2026-08-26 (PLAN.md §0.5). Pending backend
// confirmation. Each is a single named constant so flipping it later is a
// one-line change — do not scatter this logic elsewhere.
// ---------------------------------------------------------------------------

/**
 * Does `location === null` on a post mean the role is remote?
 * Founder's call: yes, for now. OPEN QUESTIONS #3 — confirm before launch,
 * it feeds `jobLocationType: TELECOMMUTE` in the JobPosting JSON-LD.
 */
export const NULL_LOCATION_MEANS_REMOTE = true;

/**
 * Restrict the public feeds to natively-created posts only?
 * Founder's call: off — publish everything, there is no reliable signal
 * yet to tell native from seeded/scraped (OPEN QUESTIONS #1). The gate is
 * wired into mappers.ts via isNativePost() below so switching this to
 * `true` takes effect immediately once #1 is answered.
 */
export const PUBLISH_ONLY_NATIVE = false;

/**
 * Stub. Always returns true until the backend exposes a real native-vs-
 * seeded signal. Do not delete the call site in mappers.ts when you fill
 * this in — just replace the body.
 */
export function isNativePost(_post: unknown): boolean {
  return true;
}
