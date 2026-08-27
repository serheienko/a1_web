// middleware.ts
//
// Aleksandr, 2026-08-27: "если это будет отображение в Украине, то нам
// надо любой переключатель на русский вообще убрать, потому что... у нас
// в стране война, и война с Россией... в Украине должен показываться
// украинский домен, на украинском языке, и даже не должна быть эта
// кнопка переключения на русский" — visitors geolocated to Ukraine
// should see Ukrainian only, with the UA/RU switch not just defaulted
// away but not offered as an option at all. This is a real, current
// wartime sensitivity, not a cosmetic preference — treated accordingly.
//
// Scoped precisely, 2026-08-28: "это только касается русского языка в
// гео Украине... все остальные языки... должны показываться как
// переключатель" — this is a RUSSIAN-specific carve-out, not a general
// "no language switching in Ukraine" rule. English, Spanish, and
// whatever else lands in the ~8-language rollout he's sending later all
// stay fully selectable for Ukraine-geo visitors; only "ru" gets
// dropped from their list. Nothing here needs to change for that later
// — this middleware only ever stamps the visitor's country, it doesn't
// know about languages at all; the actual exclusion logic lives in
// app/layout.tsx's LANG_INIT_SCRIPT and wherever the future language
// list gets rendered.
//
// This only stamps a plain (non-httpOnly) cookie with the visitor's
// country, read from Vercel's edge geolocation header — it does NOT
// touch cookies()/headers() inside any page or make any page dynamically
// rendered. components/lang-toggle.tsx and the anti-flash script in
// app/layout.tsx read this cookie client-side (document.cookie) to hide
// the switch and force Ukrainian before first paint — see the `geo-ua:`
// custom-variant in app/globals.css. Keeping the geo-detection here, in
// middleware, and the actual UI decision in a client-read cookie is
// deliberate: it's what keeps the ISR'd feed pages (app/page.tsx,
// app/talents/page.tsx) on their normal revalidate schedule instead of
// being forced into per-request dynamic rendering.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  // x-vercel-ip-country is set automatically by Vercel's edge network on
  // every request in production — no extra package/API call needed. Not
  // present in local dev (no geo data there), which just means the geo
  // cookie ends up empty and every behavior below falls back to normal
  // (switch shown, default Ukrainian, nothing forced) — a safe default.
  const country = request.headers.get("x-vercel-ip-country") ?? "";
  response.cookies.set("a1_geo", country, {
    path: "/",
    maxAge: 60 * 60 * 24, // re-checked daily — travel/VPN shouldn't stick a stale country for long
    sameSite: "lax",
    secure: true,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/|favicon.ico|brand/).*)"],
};
