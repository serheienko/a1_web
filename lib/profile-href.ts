// lib/profile-href.ts
//
// 2026-08-30, live-testing feedback: "Кнопка 'посмотреть профіль' не
// працює" in components/avatar-menu.tsx. Root-caused by static review
// (this sandbox has no network access to the real API to reproduce it
// live), backed by direct evidence rather than a guess: the account
// this was tested on has a username of literally ".." -- visible on
// that exact account's own public profile as "@.." in an earlier
// screenshot from this same feedback batch (clearly leftover test/
// garbage data, like the "Sdfsdf"/"Dsfdf" values scattered through
// every other field on this account). A plain template-string href of
// `/u/${username}` becomes `/u/..`, and BOTH a real `<a href>`
// navigation and Next's own client-side router (which resolves the
// target through the same URL-parsing machinery as `history.pushState`)
// apply the standard URL dot-segment-removal algorithm to that BEFORE
// any routing happens -- "/u/.." normalizes straight to "/", so the
// link silently lands on the home feed instead of erroring or doing
// nothing visible. `encodeURIComponent` alone does not defend against
// this: "." is one of the characters it deliberately leaves unescaped.
//
// profileHref() additionally escapes literal dots (to %2E) so a
// username that is or contains "." / ".." can never be reinterpreted as
// a "current directory"/"parent directory" path segment. Next.js's
// dynamic route parameter decoding (`[username]` in
// app/u/[username]/page.tsx) percent-decodes this transparently, so
// every legitimate username -- the overwhelming majority, which never
// contained a dot in the first place -- round-trips to the exact same
// path it always did; this only changes what happens for the edge case
// that used to silently misroute.
export function profileHref(username: string): string {
  return `/u/${encodeURIComponent(username).replace(/\./g, "%2E")}`;
}
