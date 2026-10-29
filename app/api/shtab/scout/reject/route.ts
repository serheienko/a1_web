// app/api/shtab/scout/reject/route.ts
//
// 15.10.2026: отклонить идею Разведчика (lib/a1/scout-store.ts).
//   POST {date, what, reason} -- кнопка «Не підходить» в штабе (админ по сессии) или скрипт с секретом.
//   GET  -- список отклонённых (его забирает konkistador/konk_scout.py, чтобы не предлагать похожее)
//           и идеи последнего отчёта (чтобы отклонить нужную по точному тексту).
// Пускает админа сайта (ADMIN_EMAILS) или того, у кого секрет Редакции (x-news-secret).
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkNewsSecret } from "@/lib/news/agent-auth";
import { readSession } from "@/lib/a1/session";
import { isAdminEmail } from "@/lib/admin-access";
import { loadScoutRejected, loadScoutReports, rejectScoutIdea } from "@/lib/a1/scout-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  what: z.string().min(1).max(400),
  reason: z.string().max(600).default(""),
  status: z.enum(["rejected", "done", "later"]).default("rejected"),
});

async function allowed(req: Request): Promise<boolean> {
  if (checkNewsSecret(req).ok) return true;
  const session = await readSession().catch(() => null);
  return isAdminEmail(session?.email ?? null);
}

export async function GET(req: Request) {
  if (!(await allowed(req))) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const [items, reports] = await Promise.all([loadScoutRejected(), loadScoutReports(1)]);
  const last = reports[0] ? { date: reports[0].date, ideas: reports[0].ideas.map((i) => ({ who: i.who, what: i.what })) } : null;
  return NextResponse.json({ ok: true, items, last });
}

export async function POST(req: Request) {
  if (!(await allowed(req))) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  const res = await rejectScoutIdea(parsed.data);
  const status = res === "ok" ? 200 : res === "not_found" ? 404 : 502;
  return NextResponse.json({ ok: res === "ok", result: res }, { status });
}
