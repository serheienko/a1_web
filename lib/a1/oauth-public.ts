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

// APPLE_SERVICES_ID — the Services ID (Apple's equivalent of a Web
// OAuth client, §6.10) associated with the app's existing primary App
// ID (com.aone.aoneapp), so the same Apple ID resolves to the same
// stable `sub` on web as in the app. Not a secret either — it's the
// public `client_id`/`aud` value Apple's own JS SDK sends in the clear,
// same non-secret status as GOOGLE_WEB_CLIENT_ID above (there is no
// client_secret in this ID-token flow).
export const APPLE_SERVICES_ID = "com.aone.aoneapp.web";

// APPLE_REDIRECT_URI — must exactly match one of the Services ID's
// registered Return URLs in Apple Developer. PLAN.md §6.16: the
// console currently only has the Firebase generic handler registered
// (built on §6.10's original assumption of using the Firebase Auth
// SDK) — since components/apple-sign-in-button.tsx bypasses Firebase,
// same as the Google button does, Aleksandr needs to add this exact
// URL as an additional Return URL before Apple sign-in will work
// end-to-end. Pointed at the sign-in page itself (not a dedicated
// callback route) — Apple's JS SDK, running in popup mode, completes
// the flow via postMessage back to the opener once the popup reaches
// this URL; no server-side handling of the redirect is needed there.
export const APPLE_REDIRECT_URI = "https://jobs.a1appp.com/sign-in";

