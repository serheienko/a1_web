// lib/a1/scout-store.ts
//
// 14.10.2026 (Александр: агент-разведчик по конкурентам). Раз в неделю Разведчик
// (konkistador/konk_scout.py) присылает отчёт: 3-5 идей «что сделали конкуренты / зачем
// это A1 / как сделать у нас». Храним в общем хранилище сайта (lib/kv/store.ts): одна запись
// на отчёт, a1/scout/<дата>.json. Штаб показывает последний отчёт и несколько прошлых
// (components/shtab-scout.tsx).

if (typeof window !== "undefined") {
  throw new Error("[lib/a1/scout-store] imported from the browser — this must stay server-only");
}

import { kvConfigured, kvGetMany, kvPutJson } from "@/lib/kv/store";

const PREFIX = "a1/scout/";

export type ScoutIdea = {
  who: string;
  what: string;
  why: string;
  how: string;
  effort: "легко" | "средне" | "сложно";
  url: string;
  source: string;
};

export type ScoutReport = {
  date: string;
  generatedAt: string;
  ideas: ScoutIdea[];
  market: string;
  scanned: { apps: number; feeds: number; hn: number; items: number };
  errors: string[];
};

export async function saveScoutReport(r: ScoutReport): Promise<boolean> {
  if (!kvConfigured()) return false;
  try {
    await kvPutJson(`${PREFIX}${r.date}.json`, r);
    return true;
  } catch {
    return false;
  }
}

/** Последние отчёты, новые сверху. Хранилище молчит -- пустой список. */
export async function loadScoutReports(limit = 4): Promise<ScoutReport[]> {
  if (!kvConfigured()) return [];
  try {
    const rows = (await kvGetMany(PREFIX)).filter((r) => r.path.endsWith(".json"));
    rows.sort((a, b) => b.path.localeCompare(a.path));
    const out: ScoutReport[] = [];
    for (const r of rows.slice(0, limit)) {
      try {
        const j = JSON.parse(r.body.toString("utf8")) as ScoutReport;
        if (j && typeof j.date === "string" && Array.isArray(j.ideas)) out.push(j);
      } catch {
        /* битая запись -- пропускаем */
      }
    }
    return out;
  } catch {
    return [];
  }
}
