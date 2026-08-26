# HANDOFF — step-by-step runbook for the implementing agent (Sonnet)

You are taking over implementation of **A1 Web**. Read `PLAN.md` in full first — it is the specification.
This file is the *order of operations*: what to do, in what sequence, and how to know each step worked.

The founder is **not a developer**. Never hand him a command without saying exactly where to type it and what he should see afterwards. Never ask him to debug.

---

## Before you write a single line

Confirm these four facts. If any is missing, stop and ask him — do not improvise.

| # | Thing | Value | Status |
|---|---|---|---|
| 1 | Service account | `web@a1appp.com` + password | ✅ provided (password goes in env vars only — never in a file, never in a commit) |
| 2 | GitHub repo | `github.com/serheienko/a1_web` | ✅ exists, currently empty |
| 3 | GitHub push token | fine-grained PAT, repo `a1_web`, Contents: read+write | ⬜ **ask him for this — you cannot push without it** |
| 4 | Vercel project | linked to that repo | ⬜ set up together in step 4 below |

Environment limits are in `PLAN.md` §0.4. The short version: **you cannot install packages anywhere. Vercel is your build machine and your type-checker. `git push` is how you compile.**

---

## Step 1 — Clone and lay the foundation

```
git clone https://github.com/serheienko/a1_web
cd a1_web
```

Commit, in this order, in one commit called `phase-0: project skeleton`:

1. `PLAN.md` and `HANDOFF.md` at the repo root (copy them in — they are the project's memory).
2. `.gitignore` — must include `.env*`, `node_modules`, `.next`, `.vercel`.
3. `package.json` — `next`, `react`, `react-dom`, `zod`, `typescript`, `@types/*`, `tailwindcss`. Ranges are fine; Vercel resolves them.
4. `tsconfig.json` with `"strict": true`, `"noUncheckedIndexedAccess": true`.
5. `next.config.ts`, `app/layout.tsx`, `app/page.tsx` — a placeholder page that says nothing more than "A1 Web".

**Do not add the API client yet.** This commit exists to prove the pipeline works before any logic depends on it.

**Done when:** the repo has one commit and it pushes successfully.

---

## Step 2 — Prove the pipeline before writing logic

Push step 1. Then, together with the founder, connect Vercel (step 4 in his checklist below). Wait for a green build and a live URL showing "A1 Web".

This is the single most important checkpoint in the whole project. Until a trivial page builds and deploys, every later failure is ambiguous — you will not know whether the bug is in your code, in the config, or in the deployment. Do not skip ahead because the placeholder feels pointless.

**Done when:** a Vercel URL loads the placeholder page.

---

## Step 3 — Phase 0 proper: the API client

Build `lib/a1/` exactly as specified in `PLAN.md` §2.3–2.4, in this order:

1. `config.ts` — Zod-parsed env (`A1_API_BASE`, `A1_SERVICE_EMAIL`, `A1_SERVICE_PASSWORD`), plus the two assumption flags from §0.5. Throw at boot if anything is missing.
2. `auth.ts` — the `Authorizer` interface and `ServiceAccountAuthorizer`: log in via `auth.email`, keep `accessToken` + `refreshToken` in a module-level singleton, refresh via `auth.refreshToken` before `expiresAt` and on any 401 (retry the original call exactly once).
3. `client.ts` — one function, `call<T>(method, body)`. Every request is `POST {base}/v1/{method}` with the bearer header. Unwrap the `{ms, status, data}` envelope. 10-second timeout. Structured errors. **This is the only file in the repo allowed to call `fetch` against api.a1appp.com.**
4. `schemas.ts` — Zod schemas per §0.3. `Post` is a discriminated union on `object`; accept only `post-job-employing` and `post-job-seeking`, drop the four legacy types.
5. `types/web-post.ts` + `mappers.ts` — our own `WebPost` type and the explicit allow-list mapper. Nothing outside the allow-list may ever reach the browser.
6. `app/api/debug/route.ts` — temporary, secret-protected: calls `posts.search { limit: 5 }` and returns the five mapped titles. **Delete this route at the end of Phase 1.**

Add env vars in the Vercel dashboard (Settings → Environment Variables), not in a file.

**Done when:** the debug route on the live URL returns five real vacancy titles from the app.

Then report to the founder: the deployment URL, the build status, and the five titles. Phase 0 is complete.

---

## Step 4 — What the founder does, and when

Give him these one at a time, not all at once. He should never have more than one open task.

| When | What he does | Where |
|---|---|---|
| Now | Create a fine-grained GitHub token for `a1_web` (Contents: read+write) and paste it to you | github.com → Settings → Developer settings → Personal access tokens |
| After step 1 | Sign up at vercel.com **with the GitHub button**, then Add New → Project → import `a1_web` → Deploy | vercel.com |
| After step 3 code is written | Add the three env vars in the Vercel project settings | Vercel → Project → Settings → Environment Variables |
| Phase 4, much later | Point `jobs.a1appp.com` at Vercel with one CNAME record | his domain panel |

Walk him through each in the browser if he asks — he has said he wants to go through hosting manually, together.

---

## Step 5 — After Phase 0

Continue with `PLAN.md` phases 1 → 4, one branch and one deploy per phase. Do not start a phase before the previous one is green on Vercel and the founder has seen it.

Before Phase 2, chase the backend answers listed in `PLAN.md` OPEN QUESTIONS — especially `flags`, since a hidden or reported post could otherwise appear on a public, indexed page.

---

## Rules that override your defaults

1. **The password and the token never enter a file, a commit, a log line, or a response body.** Only Vercel's environment variables.
2. **You cannot build locally.** Do not claim a phase is done based on reading your own code. Green Vercel build or it is not done.
3. **Read Vercel and GitHub through the founder's browser** rather than asking him to copy-paste logs.
4. **One bad post never breaks a page.** Zod parse failure → log the post id, skip that item, keep rendering.
5. **Timestamps are unix seconds.** Convert through one helper.
6. **Two post types only** — Jobs (`post-job-employing`) and Talents (`post-job-seeking`). Talents pages ship `noindex`; `JobPosting` structured data goes on Jobs pages only.
7. **When the spec is ambiguous, do not guess** — add the question to OPEN QUESTIONS and ask him.
