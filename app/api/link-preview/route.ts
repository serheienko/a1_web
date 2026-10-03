// app/api/link-preview/route.ts
//
// Превью ссылок в чате (волна 4B, 2026-10-03). Приложение само ходит на
// страницу и читает Open Graph (link_preview_service.dart); в браузере
// так нельзя (CORS), поэтому тот же разбор делает сервер. GET ?url=...
// -> { ok, title, description, siteName, imageUrl, faviconUrl }.
// Защита: только http/https, имя хоста не должно вести во внутреннюю сеть
// (проверяем каждый переход по редиректу), 5 секунд, читаем не больше
// 600 КБ, ответ кэшируется на час, вход нужен (как и во всех /api/chats).
import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "node:dns";
import net from "node:net";
import { readSession } from "@/lib/a1/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Preview = {
  title: string | null;
  description: string | null;
  siteName: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
};

const CACHE = new Map<string, { at: number; data: Preview }>();
const TTL_MS = 60 * 60 * 1000;
const UA = "Mozilla/5.0 (compatible; A1Bot/1.0; +https://jobs.a1appp.com) TelegramBot (like TwitterBot)";

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateIp(mapped[1]);
  return false;
}

async function assertPublicHost(host: string): Promise<void> {
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("private");
    return;
  }
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local") || lower.endsWith(".internal")) {
    throw new Error("private");
  }
  const addrs = await dns.lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) throw new Error("private");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ");
}

function metaContent(html: string, key: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (name !== key) continue;
    const c = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1];
    if (c && c.trim()) return decodeEntities(c.trim());
  }
  return null;
}

function absolutize(u: string | null, base: string): string | null {
  if (!u) return null;
  try {
    const r = new URL(u, base);
    return r.protocol === "http:" || r.protocol === "https:" ? r.toString() : null;
  } catch {
    return null;
  }
}

function faviconOf(html: string, base: string): string | null {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  const pick = (rel: RegExp) => {
    for (const l of links) {
      const r = l.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
      if (rel.test(r)) {
        const href = l.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
        if (href) return absolutize(decodeEntities(href), base);
      }
    }
    return null;
  };
  return pick(/apple-touch-icon/i) ?? pick(/^(shortcut )?icon$/i) ?? absolutize("/favicon.ico", base);
}

async function fetchHtml(startUrl: string): Promise<{ html: string; finalUrl: string } | null> {
  let url = startUrl;
  for (let hop = 0; hop < 4; hop++) {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    await assertPublicHost(u.hostname);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { "user-agent": UA, "accept-language": "uk,en;q=0.8,ru;q=0.6", accept: "text/html,application/xhtml+xml" },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      url = new URL(loc, url).toString();
      continue;
    }
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("html")) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < 600_000) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.length;
    }
    void reader.cancel().catch(() => undefined);
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return { html: buf.toString("utf8"), finalUrl: url };
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
  const raw = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return NextResponse.json({ ok: false, message: "bad_url" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ ok: false, message: "bad_url" }, { status: 400 });
  }
  const key = parsed.toString();
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json({ ok: true, ...hit.data });
  let data: Preview = { title: null, description: null, siteName: null, imageUrl: null, faviconUrl: null };
  try {
    const got = await fetchHtml(key);
    if (got) {
      const { html, finalUrl } = got;
      const title =
        metaContent(html, "og:title") ??
        metaContent(html, "twitter:title") ??
        (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)![1]!.trim()) : null);
      data = {
        title,
        description: metaContent(html, "og:description") ?? metaContent(html, "twitter:description") ?? metaContent(html, "description"),
        siteName: metaContent(html, "og:site_name"),
        imageUrl: absolutize(metaContent(html, "og:image") ?? metaContent(html, "twitter:image"), finalUrl),
        faviconUrl: faviconOf(html, finalUrl),
      };
    }
  } catch {
    /* пустое превью: карточка просто не покажется */
  }
  if (CACHE.size > 500) CACHE.delete(CACHE.keys().next().value as string);
  CACHE.set(key, { at: Date.now(), data });
  return NextResponse.json({ ok: true, ...data });
}
