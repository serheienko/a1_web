// lib/a1/user-flags.ts
//
// USER_FLAG bitmask, documented in the backend's OpenAPI spec (the
// "Users" tag description, same place POST_FLAG lives for "Posts" — see
// lib/a1/post-flags.ts). Confirmed 2026-08-26:
//
//   const USER_FLAG = {
//     NONE: 0,
//     SHOW_PHONE_NUMBER: 1 << 1,
//     SHOW_EMAIL_ADDRESS: 1 << 2,
//     SHOW_DOB: 1 << 3,
//     FAVORED: 1 << 4,
//     IN_CONTACT_LIST: 1 << 5,
//     BLOCKED: 1 << 6,
//     BLOCKED_ME: 1 << 7,
//     PREMIUM: 1 << 8,
//     SERVICE_MODERATOR: 1 << 29,
//     IS_BOT: 1 << 28,
//     DELETED: 1 << 30,
//   };
//
// These are exactly the toggles the app's own UI exposes to a user
// ("show my phone/email/DOB to other users") — per Aleksandr, 2026-08-26.
// A public profile page must honor them the same way the app does: phone,
// email and date of birth are included ONLY when the matching SHOW_* bit
// is set on that user's own `flags`, never unconditionally. This is the
// one and only gate for those three fields — see lib/a1/user-mappers.ts.
//
// FAVORED / IN_CONTACT_LIST / BLOCKED / BLOCKED_ME are relative to the
// *calling* user (our read-only service account has none of these
// relationships with anyone) — meaningless here, deliberately unused.
// PREMIUM/SERVICE_MODERATOR/IS_BOT aren't surfaced on the public profile
// (nothing in PLAN.md's scope calls for a "premium"/"moderator"/"bot"
// badge) but are cheap to keep named here in case that changes.

const SHOW_PHONE_NUMBER = 1 << 1;
const SHOW_EMAIL_ADDRESS = 1 << 2;
const SHOW_DOB = 1 << 3;
const DELETED = 1 << 30;

export function canShowPhone(flags: number): boolean {
  return (flags & SHOW_PHONE_NUMBER) !== 0;
}

export function canShowEmail(flags: number): boolean {
  return (flags & SHOW_EMAIL_ADDRESS) !== 0;
}

export function canShowDob(flags: number): boolean {
  return (flags & SHOW_DOB) !== 0;
}

export function isDeletedUser(flags: number): boolean {
  return (flags & DELETED) !== 0;
}
