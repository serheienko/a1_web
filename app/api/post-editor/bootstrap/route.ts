// app/api/post-editor/bootstrap/route.ts
//
// One-shot data load for the post-editor dialog: categories (shared
// across both post types, dataset.postCategories), currencies (salary
// field), and the tag lists for both kinds (dataset.postTags — Jobs
// borrows Talents' list today, see lib/a1/datasets.ts's own comment on
// why). All four are public/no-auth dataset.* calls (PLAN.md §0.1), so
// this route needs no session at all — it's fetched the moment the
// dialog opens, same "reads stay open" principle PLAN.md §6 leads with,
// even though only a signed-in visitor ever gets far enough to open the
// dialog in the first place (components/create-post-fab.tsx's own
// signed-out branch never reaches this).
//
// force-dynamic, not ISR: not a page, and the four fetches themselves
// are memoized within one request via React's cache() (lib/a1/
// datasets.ts) — no reason to add a second, route-level cache layer on
// top of small, cheap, rarely-changing lookups.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { fetchCategories, fetchCurrencies, fetchTagsForKind } from "@/lib/a1/datasets";

export async function GET() {
  try {
    const [categories, currencies, hiringTags, seekingTags] = await Promise.all([
      fetchCategories(),
      fetchCurrencies(),
      fetchTagsForKind("hiring"),
      fetchTagsForKind("seeking"),
    ]);
    return NextResponse.json({ ok: true, categories, currencies, hiringTags, seekingTags });
  } catch (err) {
    console.error("[api/post-editor/bootstrap] failed:", err);
    return NextResponse.json(
      { ok: true, categories: [], currencies: [], hiringTags: [], seekingTags: [] },
      { status: 200 },
    );
  }
}
