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
// the updated value after each bulk-provisioning batch, Vercel dashboard
// -> Settings -> Environment Variables) — no code change or redeploy
// request needed to add a company, same pattern as ADMIN_EMAILS
// (lib/admin-access.ts). The value may be the plain JSON array or, past
// a couple of hundred accounts, its gzip+base64 form — see
// decodeAccountsEnv below for why and how.
//
// Deliberately degrades to an EMPTY list on any parse problem (missing
// var, invalid JSON, wrong shape) rather than throwing — this gets
// imported by the admin routes, which should render "shows nothing"
// rather than 500 the whole admin page if the env var is ever briefly
// malformed mid-paste.

import { gunzipSync } from "node:zlib";

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

// 2026-09-13 (Aleksandr: "код не вставляется, он слишком большой походу").
// At 525 accounts the plain JSON is ~62 KB, which the Vercel dashboard's
// value field will not take, and Vercel caps the TOTAL size of a
// deployment's env vars at 64 KB anyway — so this one variable was about
// to exhaust the whole budget on its own. gzip + base64 brings the same
// 525 accounts down to ~19 KB.
//
// The variable therefore accepts EITHER form and sniffs which one it
// got: a value that starts with "[" after trimming is plain JSON (what
// was there before, and what a hand-written 3-account list still looks
// like), anything else is treated as base64-encoded gzip. Nothing has to
// be migrated in a particular order, and a half-pasted value fails the
// same way it always did — empty list, one line in the log.
//
// Produced by "Claude outputs"/pack_accounts.py on Aleksandr's machine.
function decodeAccountsEnv(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) return trimmed;
  // Whitespace is stripped because a value pasted out of a text editor
  // can carry line breaks; base64 itself never contains any.
  return gunzipSync(Buffer.from(trimmed.replace(/\s+/g, ""), "base64")).toString("utf8");
}

export function loadTechnicalAccounts(): TechnicalAccount[] {
  const raw = process.env.TECHNICAL_ACCOUNTS_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeAccountsEnv(raw));
    const result = z.array(TechnicalAccountSchema).safeParse(parsed);
    if (!result.success) {
      console.error("[lib/a1/admin-accounts] TECHNICAL_ACCOUNTS_JSON failed validation:", result.error.message);
      return [];
    }
    return result.data;
  } catch (err) {
    // Covers both shapes: bad JSON, and a base64/gzip value that did not
    // decode (truncated paste).
    console.error("[lib/a1/admin-accounts] TECHNICAL_ACCOUNTS_JSON could not be read:", err);
    return [];
  }
}

// 2026-09-13: диагностика для /api/admin/companies?diag=1. Возвращает ТОЛЬКО
// безличные признаки значения переменной (есть ли она, длина, первые
// несколько символов, текст ошибки) -- ни одного пароля и ни одного куска
// расшифрованного списка. Нужна была, потому что при пустом списке снаружи
// не отличить "переменная не сохранилась" от "сохранилась, но не
// расшифровывается", а логи Vercel за этим смотреть дольше.
export function describeAccountsEnv(): Record<string, unknown> {
  const raw = process.env.TECHNICAL_ACCOUNTS_JSON;
  if (!raw) return { present: false };
  const trimmed = raw.trim();
  const info: Record<string, unknown> = {
    present: true,
    rawLength: raw.length,
    trimmedLength: trimmed.length,
    head: trimmed.slice(0, 8),
    tail: trimmed.slice(-4),
    looksLikeJson: trimmed.startsWith("["),
    hasWhitespaceInside: /\s/.test(trimmed),
  };
  try {
    const decoded = decodeAccountsEnv(raw);
    info.decodedLength = decoded.length;
    info.decodedHead = decoded.slice(0, 12);
    const parsed = JSON.parse(decoded);
    info.parsedIsArray = Array.isArray(parsed);
    info.parsedCount = Array.isArray(parsed) ? parsed.length : null;
    const result = z.array(TechnicalAccountSchema).safeParse(parsed);
    info.schemaOk = result.success;
    if (!result.success) info.schemaError = result.error.message.slice(0, 300);
  } catch (err) {
    info.error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }
  return info;
}

export function findTechnicalAccount(email: string): TechnicalAccount | null {
  const target = email.trim().toLowerCase();
  return loadTechnicalAccounts().find((a) => a.email === target) ?? null;
}
