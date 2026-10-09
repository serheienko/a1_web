// lib/news/agent-auth.ts -- проверка секрета агента «Редакція A1» (заголовок x-news-secret, env NEWS_SECRET).
import { timingSafeEqual } from "node:crypto";

export type AuthResult = { ok: true } | { ok: false; status: 401 | 503 };

export function checkNewsSecret(req: Request): AuthResult {
  const expected = (process.env.NEWS_SECRET ?? "").trim();
  if (!expected) return { ok: false, status: 503 };
  const given = (req.headers.get("x-news-secret") ?? "").trim();
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (!given || a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, status: 401 };
  return { ok: true };
}
