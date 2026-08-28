// lib/a1/session-constants.ts
//
// Just the two cookie names, with NO other imports. Split out of
// lib/a1/session.ts after a real build failure (2026-08-28, Vercel:
// "You're importing a component that needs next/headers... only works
// in a Server Component"): components/account-menu.tsx only ever needed
// the plain DISPLAY_COOKIE string, but importing it from session.ts
// pulled that whole module — including its `import { cookies } from
// "next/headers"` — into the client bundle, which Next.js correctly
// refuses to build. Server code (lib/a1/session.ts, the app/api/auth/*
// routes) and client code (components/account-menu.tsx) both import the
// names from here instead; only lib/a1/session.ts still touches
// next/headers.
export const SESSION_COOKIE = "a1_session";
export const DISPLAY_COOKIE = "a1_user";
