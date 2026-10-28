// app/api/cv/[username]/route.ts -- PDF-резюме из профиля A1 (28.10.2026).
//
// GET /api/cv/<username>            -> PDF (язык угадываем по тексту профиля)
//     ?ui=<uk|en|...>               -> язык интерфейса, если угадать не вышло
//     ?lang=<uk|en|...>             -> язык принудительно
//     ?inline=1                     -> открыть в браузере, а не скачать
// Профиль публичный (как /u/<username>), поэтому вход не нужен: в PDF только
// то, что и так видно на странице профиля. Приложение берёт тот же адрес.
import { buildCvData } from "@/lib/cv/data";
import { renderCvPdf } from "@/lib/cv/pdf";
import { CV_LANGS, type CvLang } from "@/lib/cv/detect-lang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function asLang(v: string | null): CvLang | null {
  if (!v) return null;
  const norm = v === "pt" || v === "pt-BR" ? "ptBR" : v.slice(0, 2) === "zh" ? "zh" : v;
  return (CV_LANGS as string[]).includes(norm) ? (norm as CvLang) : null;
}

function fileName(name: string): string {
  const ascii = name.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  return `CV-${ascii || "A1"}.pdf`;
}

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const { username: raw } = await ctx.params;
  const username = decodeURIComponent(raw ?? "").trim();
  if (!/^[\w.-]{1,64}$/.test(username)) return new Response("not found", { status: 404 });
  const url = new URL(req.url);
  const forced = asLang(url.searchParams.get("lang"));
  const ui = asLang(url.searchParams.get("ui")) ?? "uk";
  try {
    const r = await buildCvData(username, ui, forced);
    if (r.status === "not_found") return new Response("not found", { status: 404 });
    const pdf = await renderCvPdf(r.data);
    const disposition = url.searchParams.get("inline") === "1" ? "inline" : "attachment";
    const unicodeName = encodeURIComponent(`CV-${r.data.name.replace(/\s+/g, "-")}.pdf`);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `${disposition}; filename="${fileName(r.data.name)}"; filename*=UTF-8''${unicodeName}`,
        "cache-control": "private, max-age=60",
        "x-cv-lang": r.data.lang,
      },
    });
  } catch (err) {
    console.error("[cv] render failed", username, err);
    return new Response("cv render failed", { status: 500 });
  }
}
