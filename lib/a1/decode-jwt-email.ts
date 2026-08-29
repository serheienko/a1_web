// lib/a1/decode-jwt-email.ts
//
// Phase 5b (PLAN.md §6.13/§6.16): shared by both OAuth sign-in routes
// (app/api/auth/google, app/api/auth/apple). Neither auth.google's nor
// auth.appleId's response carries an email field (PLAN.md §6.1 — both
// are "same shape as auth.email": userId/expiresAt/accessToken/
// refreshToken only), so the display cookie's email is read straight
// out of the same ID-token JWT already being forwarded to the backend.
// This is a best-effort, DISPLAY-ONLY read — it does not verify the
// token's signature; auth.google/auth.appleId are the one place that
// actually validates it. Split out of app/api/auth/google/route.ts
// (which had this inline first) once app/api/auth/apple/route.ts needed
// the exact same logic — both Google's and Apple's ID tokens carry a
// standard OIDC `email` claim when the `email` scope was requested,
// which both sign-in buttons do.

export function decodeEmailFromJwt(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const claims = JSON.parse(json) as Record<string, unknown>;
    return typeof claims.email === "string" ? claims.email : null;
  } catch {
    return null;
  }
}
