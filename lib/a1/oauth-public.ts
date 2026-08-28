// lib/a1/oauth-public.ts
//
// Phase 5b (PLAN.md §6.6/§6.9): OAuth CLIENT IDs only — values that are
// meant to be public and shipped in client-side JS. This is the opposite
// contract of lib/a1/config.ts, which throws if ever imported from the
// browser because it holds real secrets (the service-account
// credentials, §1 rule 4). An OAuth "Web application" client id is not
// a secret by Google's own design — there is no client_secret in the
// ID-token flow this file's consumer (components/google-sign-in-button)
// uses, only this public identifier plus the origin allowlist already
// configured in Google Cloud Console (§6.9). Safe to inline directly
// rather than route through a NEXT_PUBLIC_ env var — it's already
// written down in plain text in PLAN.md §6.9, and an env var would just
// be one more thing to remember to set on Vercel for a non-secret.
//
// GOOGLE_WEB_CLIENT_ID — the Firebase-created "Web application" OAuth
// client, same Google Cloud project as the app's own clients (§6.3's
// same-project requirement), configured with jobs.a1appp.com as an
// authorized JavaScript origin. Andrew confirmed (§6.11) this exact id
// is already accepted by auth.google on the backend.
export const GOOGLE_WEB_CLIENT_ID =
  "954420352634-d2s57so6b7gkk31q5uffl2vtku1vgdeb.apps.googleusercontent.com";
