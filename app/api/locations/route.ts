export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/locations/route.ts
//
// Aleksandr, 2026-08-28: backs the location search in the mobile/desktop
// filter popovers (components/filters-form.tsx). That file is a
// "use client" component and, per PLAN.md §5 rule 4, can't import
// lib/a1/* directly (that's server-only, auth-token-bearing code) — so
// it debounces keystrokes and calls this route instead, same pattern as
// components/load-more.tsx calling app/api/feed/route.ts.
//
// Trims the backend's WorldLocation shape down to just {id, label} —
// the only two fields the picker UI actually needs (an id to send back
// to posts.search's own `location` field, and a human-readable label to
// show/round-trip in the URL) — so a shape mismatch or field rename on
// the backend side stays contained to lib/a1/locations.ts.

import { NextRequest, NextResponse } from "next/server";
import { searchLocations } from "@/lib/a1/locations";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";

  try {
    const locations = await searchLocations(q);
    const results = locations.map((loc) => ({
      id: loc._id,
      label: [loc.displayName, loc.country].filter(Boolean).join(", ") || loc.displayName || loc.city,
      // 2026-08-29 (PLAN.md §6.32): posts.createPost rejects a
      // country-level location outright ("You cannot set country as
      // location for a post.") -- components/filters-form.tsx's feed
      // filter still wants every result (filtering by a whole country is
      // fine there), but components/post-editor.tsx needs to exclude
      // these before a visitor can even pick one. WorldLocationSchema's
      // own `city` field (catches to "" when the backend result IS a
      // bare country) is the only signal available -- exposed here as
      // one extra boolean rather than the raw city string, so this
      // route's existing narrow {id, label} contract barely grows.
      hasCity: loc.city !== "",
    }));
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[app/api/locations] searchLocations failed", err);
    return NextResponse.json({ results: [] });
  }
}
