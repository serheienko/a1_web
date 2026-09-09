// lib/a1/admin-accounts.ts
//
// 2026-09-09 (Aleksandr: "хочу чтобы админ-страница показывала посты со
// всех технических аккаунтов сразу"). Every scraped/bulk-provisioned
// company gets its OWN A1 account on purpose (see a1-parser's
// core/technical_email.py and the future claim-transfer flow — Andrew's
// claim mechanism hands ONE account to ONE real company later, so
// merging every company into a single shared account would break that).
// That means app/api/posts/mine's `author: "me"` scoping only ever
// shows whichever ONE account is currently signed in in the browser —
// this file is the list of every account the admin surface should
// aggregate across instead. See lib/a1/admin-post-aggregate.ts for the
// actual fetch-and-merge logic that uses it.
//
// TECHNICAL_ACCOUNTS_JSON: a JSON array of { name, email, password } —
// one entry per technical account created so far (bulk_provision.py's
// own provisioned.json, on Aleksandr's machine, is the source of this
// list). Kept in a Vercel env var (server-only, never sent to the
// browser) rather than committed to this PUBLIC repo, since it holds
// real account passwords. Aleksandr updates this by hand today (paste
// the updated JSON after each bulk-provisioning batch, Vercel dashboard
// -> Settings -> Environment Variables) — no code change or redeploy
// request needed to add a company, same pattern as ADMIN_EMAILS
// (lib/admin-access.ts).
//
// Deliberately degrades to an EMPTY list on any parse problem (missing
// var, invalid JSON, wrong shape) rather than throwing — this gets
// imported by the admin routes, which should render "shows nothing"
// rather than 500 the whole admin page if the env var is ever briefly
// malformed mid-paste.

import { z } from "zod";

if (typeof window !== "undefined") {
  // Holds real account passwords server-side only — see the header
  // comment above. Must never be reachable from a client bundle, same
  // rule as lib/a1/config.ts.
  throw new Error("[lib/a1/admin-accounts] imported from the browser — this must stay server-only");
}

const TechnicalAccountSchema = z.object({
  name: z.string().min(1),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type TechnicalAccount = z.infer<typeof TechnicalAccountSchema>;

export function loadTechnicalAccounts(): TechnicalAccount[] {
  const raw = process.env.TECHNICAL_ACCOUNTS_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const result = z.array(TechnicalAccountSchema).safeParse(parsed);
    if (!result.success) {
      console.error("[lib/a1/admin-accounts] TECHNICAL_ACCOUNTS_JSON failed validation:", result.error.message);
      return [];
    }
    return result.data;
  } catch (err) {
    console.error("[lib/a1/admin-accounts] TECHNICAL_ACCOUNTS_JSON is not valid JSON:", err);
    return [];
  }
}

export function findTechnicalAccount(email: string): TechnicalAccount | null {
  const target = email.trim().toLowerCase();
  return loadTechnicalAccounts().find((a) => a.email === target) ?? null;
}
