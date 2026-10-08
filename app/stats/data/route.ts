// app/stats/data/route.ts -- те же цифры, что на /stats, в JSON: страница
// спрашивает их раз в минуту и плавно меняет числа (08.10.2026).
// Считаются из общего кэша вакансий (обход раз в час), поэтому запрос лёгкий.
import { gzipSync } from "node:zlib";
import { insights } from "@/lib/a1/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let last: { at: string; json: string; gz: Buffer } | null = null;

export async function GET(req: Request) {
  const d = await insights();
  if (!last || last.at !== d.updatedAt) {
    const json = JSON.stringify(d);
    last = { at: d.updatedAt, json, gz: gzipSync(json) };
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=30",
    Vary: "Accept-Encoding",
    "X-Robots-Tag": "noindex",
  };
  if (/\bgzip\b/.test(req.headers.get("accept-encoding") || "")) {
    headers["Content-Encoding"] = "gzip";
    return new Response(new Uint8Array(last.gz), { headers });
  }
  return new Response(last.json, { headers });
}
