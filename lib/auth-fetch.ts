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
let chain: Promise<unknown> = Promise.resolve();

export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const run = chain.then(() => fetch(input, init));
  // Swallow here so one failed/rejected request doesn't wedge the queue
  // for everything queued after it -- callers still get the real
  // rejection through the `run` promise returned below.
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
