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

import { kvConfigured, kvGetJson, kvGetMany, kvPutJson } from "@/lib/kv/store";

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
  /** 25.10.2026: SEO-разведка (konk_seo_scout.py) -- отдельный блок того же отчёта. */
  seo?: ScoutIdea[];
  seoInfo?: { sites: number; ok: number; near: number; trend: string };
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

// 15.10.2026 (Александр про идею «ИИ пишет сопроводительное письмо»: «не вижу смысла… это из штаба
// сразу убирай»). Отклонённые идеи: из окна «Разведчик» пропадают, а сам Разведчик получает их
// список (GET /api/shtab/scout/reject) и больше похожего не предлагает. Отчёты не трогаем --
// отклонённые просто прячем при показе. Лежит вне a1/scout/, чтобы не смешиваться с отчётами.
const REJECTED_PATH = "a1/scout-rejected.json";

// 16.10.2026: у записи есть статус -- "rejected" («Не подходит») или "done" («Сделано»). Старые записи
// без статуса считаются отклонёнными. reason -- комментарий Александра (почему / как сделали).
export type ScoutRejected = { date: string; who: string; what: string; reason: string; at: string; status?: "rejected" | "done" };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export async function loadScoutRejected(): Promise<ScoutRejected[]> {
  if (!kvConfigured()) return [];
  try {
    const j = await kvGetJson<{ items?: ScoutRejected[] }>(REJECTED_PATH);
    return Array.isArray(j?.items) ? j.items : [];
  } catch {
    return [];
  }
}

export function isRejected(idea: Pick<ScoutIdea, "what">, rejected: ScoutRejected[]): boolean {
  const w = norm(idea.what);
  return rejected.some((r) => norm(r.what) === w);
}

/** Отклонить идею из отчёта за date. Причина уходит Разведчику. */
export async function rejectScoutIdea(input: { date: string; what: string; reason: string; status?: "rejected" | "done" }): Promise<"ok" | "not_found" | "error"> {
  if (!kvConfigured()) return "error";
  try {
    const report = (await loadScoutReports(12)).find((r) => r.date === input.date);
    const idea = [...(report?.ideas ?? []), ...(report?.seo ?? [])].find((i) => norm(i.what) === norm(input.what));
    if (!idea) return "not_found";
    const list = await loadScoutRejected();
    // 21.10.2026 (Александр: «мы же это сделали -- отметь в зелёное»): идею, которая уже лежит
    // в списке, можно переотметить -- например «не подходит» -> «сделано», с новым комментарием.
    const prev = list.find((r) => norm(r.what) === norm(idea.what));
    if (prev) {
      prev.status = input.status ?? prev.status ?? "rejected";
      if (input.reason.trim()) prev.reason = input.reason.trim();
      prev.at = new Date().toISOString();
    } else {
      list.push({ date: input.date, who: idea.who, what: idea.what, reason: input.reason.trim(), at: new Date().toISOString(), status: input.status ?? "rejected" });
    }
    await kvPutJson(REJECTED_PATH, { items: list.slice(-100) });
    return "ok";
  } catch {
    return "error";
  }
}
