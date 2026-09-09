// lib/a1/admin-act-as.ts
//
// 2026-09-09: shared by every app/api/admin/posts/* write route
// (create/update/delete) — each one edits a post that belongs to some
// OTHER account than whoever's signed in in the admin's own browser
// (see lib/a1/admin-accounts.ts's header for why one account per
// company exists at all). "Acting as" that account just means logging
// in with its own stored email/password (auth.email, the same public
// endpoint app/api/auth/sign-in uses) to get a short-lived Bearer token
// for this one request — never touches the admin's own session cookie.

import { call } from "./client";
import { findTechnicalAccount } from "./admin-accounts";

export class UnknownAccountError extends Error {
  constructor(email: string) {
    super(`[lib/a1/admin-act-as] no technical account on file for ${email}`);
    this.name = "UnknownAccountError";
  }
}

type LoginOutput = { accessToken: string };

export async function getAdminActAsToken(email: string): Promise<string> {
  const account = findTechnicalAccount(email);
  if (!account) throw new UnknownAccountError(email);
  const login = await call<LoginOutput>(
    "auth.email",
    { email: account.email, password: account.password },
    { skipAuth: true },
  );
  return login.accessToken;
}
