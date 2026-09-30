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
  // Пустой список (первый пересчёт после деплоя ещё идёт) в кэш краевого
  // сервера класть нельзя: 30.09 он там застрял на десять минут, и список
  // стран в приложении и на сайте был пустым.
  const cacheControl = options.length > 0 ? "public, s-maxage=600, stale-while-revalidate=3600" : "no-store";
  return NextResponse.json({ ok: true, options }, { headers: { "Cache-Control": cacheControl } });
}
