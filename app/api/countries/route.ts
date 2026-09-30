// app/api/countries/route.ts
//
// 30.09.2026: список стран с числом вакансий для селектора в шапке
// (components/nav-country.tsx). Считает тот же lib/a1/country-counts.ts,
// что и лента, -- часовой кеш в памяти процесса, один пересчёт на всех.

import { NextResponse } from "next/server";
import { fetchCountryOptions } from "@/lib/a1/country-counts";

export const runtime = "nodejs";

export async function GET() {
  const options = await fetchCountryOptions();
  return NextResponse.json(
    { ok: true, options },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } },
  );
}
