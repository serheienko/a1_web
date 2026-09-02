// lib/auth-fetch.ts
//
// 2026-09-01: "Смотри странный баг ... захожу, и у меня вот эта история
// с контактами. Хотя визуально я, как будто бы в своём профиле всё
// окей." -- after the access token expires (e.g. overnight idle), the
// /contacts page can render as "signed out" while the account menu and
// profile page right next to it clearly show the visitor as signed in.
//
// Root cause: every authenticated API route funnels through
// lib/a1/visitor-call.ts's callAsVisitor(), which on a 401 redeems the
// visitor's refreshToken for a new session and retries. That refresh
// token is single-use/rotating -- fine for ONE request, but /contacts
// mounts app/contacts/page.tsx's own fetch("/api/contacts/list") at the
// same time components/avatar-menu.tsx (always present in the nav) is
// firing its own fetch("/api/account/whoami"). Both are separate
// Next.js Route Handlers -- separate serverless invocations -- so each
// independently reads the SAME still-stale refreshToken from its own
// request's cookie snapshot (see session.ts's readSession: cookies()
// is fixed to the incoming request, it can't observe a sibling
// request's Set-Cookie). Both race to redeem it; the backend accepts
// only the first, and rejects the second exactly like a genuinely
// revoked token (see visitor-call.ts's own comments -- this exact class
// of bug previously hit posts.createPost and upload.create too). The
// "loser" throws NoSessionError, its route clears the session cookie
// and returns 401, and that page renders as logged-out even though the
// winner's refresh -- and the rest of the UI -- is perfectly fine.
//
// Fix: never let two client-side authenticated fetches be in flight at
// once. Chaining them through this single module-level promise means
// each one fully completes -- including the browser applying any
// Set-Cookie from its response -- before the next one is sent, so a
// later request always carries the freshest rotated refreshToken
// instead of racing an earlier one for the same stale value. Use this
// (instead of the bare `fetch`) for any client-side call to a route
// backed by callAsVisitor -- see that file for the current list.
//
// 2026-09-02 (Aleksandr, screen recording: a chat message's bubble spun
// forever, never delivered and never marked "not sent" either) -- this
// queue had no timeout. app/chats/[chatId]/page.tsx polls load() every
// 3s AND sends through this exact same module-level `chain` (it's
// shared by every authFetch call on the whole site, not per-page -- see
// components/avatar-menu.tsx's own whoami call above), so if a single
// browser-side fetch() ever stalls with no response at all (a dead
// Wi-Fi handoff, the tab getting backgrounded/throttled, sleep/wake --
// none of which the server ever sees, so lib/a1/client.ts's own 10s
// AbortSignal.timeout on the OUTBOUND call to api.a1appp.com can't help
// here) plain fetch() never times out on its own. Every later authFetch
// call -- including the visitor's own message send -- then queues
// behind a promise that will never settle, spinning forever with no
// error to even show a "failed, tap to retry" state for. Wrapping the
// actual fetch() in its own AbortController timeout guarantees `run`
// always eventually settles one way or another, which is what actually
// unblocks the chain for every call queued after it -- not just this
// one. TIMEOUT_MS is well above callAsVisitor's own worst case (initial
// call + one token refresh + one retry, each capped at client.ts's 10s,
// so ~30s end to end) so a real-but-slow request is never aborted
// early.
const TIMEOUT_MS = 35_000;

let chain: Promise<unknown> = Promise.resolve();

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  // No current caller passes its own `signal`, but honor one if it ever
  // does instead of silently dropping it.
  if (init?.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const run = chain.then(() => fetchWithTimeout(input, init));
  // Swallow here so one failed/rejected request doesn't wedge the queue
  // for everything queued after it -- callers still get the real
  // rejection through the `run` promise returned below.
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
