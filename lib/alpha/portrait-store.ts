// lib/alpha/portrait-store.ts -- Alpha remembers the person (09.10.2026).
//
// The portrait (role, stack, format, money...) is saved per A1 account, so
// the site and the app share it and Alpha does not ask the same questions
// again. Stored encrypted in Vercel Blob (same raw REST as
// lib/a1/cloud-accounts.ts); when the env is missing it lives in memory
// only (lost on restart -- fine for the test copy).
import type { NextRequest } from "next/server";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { SESSION_COOKIE } from "@/lib/a1/session-constants";
import { call } from "@/lib/a1/client";
import { appToken } from "@/lib/alpha/guard";
import { EMPTY_PORTRAIT, type AlphaPortrait } from "@/lib/alpha/types";

const BLOB_API = "https://vercel.com/api/blob";
const MAGIC = "A1P1";

export type StoredPortrait = { portrait: AlphaPortrait; updatedAt: number };

const mem = new Map<string, StoredPortrait>();
const idCache = new Map<string, { at: number; id: string | null }>();

function env() {
  const token = (process.env.BLOB_READ_WRITE_TOKEN ?? "").trim();
  const secret = (process.env.A1_ACCOUNTS_SECRET ?? "").trim();
  return token && secret ? { token, secret } : null;
}

function storeIdFrom(token: string): string {
  const parts = token.split("_");
  const raw = parts.length > 3 ? (parts[3] ?? "") : "";
  return raw.startsWith("store_") ? raw.slice("store_".length) : raw;
}

function keyOf(secret: string) {
  return createHash("sha256").update("alpha-portrait:" + secret, "utf8").digest();
}

function pathOf(userId: string) {
  return `alpha/portraits/${createHash("sha256").update(userId).digest("hex").slice(0, 40)}.enc`;
}

/** Who is asking: the site session cookie or the app's token. */
export async function alphaUserId(req: NextRequest): Promise<string | null> {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (raw) {
    try {
      const s = JSON.parse(raw) as { userId?: string; email?: string };
      if (s.userId) return s.userId;
      if (s.email) return "email:" + s.email.toLowerCase();
    } catch {
      /* fall through to the app token */
    }
  }
  const token = appToken(req);
  if (!token) return null;
  const hit = idCache.get(token);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.id;
  let id: string | null = null;
  try {
    const me = await call<{ id?: string; _id?: string; userId?: string }>(
      "users.getMe",
      {},
      { accessToken: token, timeoutMs: 6000 },
    );
    id = me?.id ?? me?._id ?? me?.userId ?? null;
  } catch {
    id = null;
  }
  idCache.set(token, { at: Date.now(), id });
  if (idCache.size > 500) idCache.delete(idCache.keys().next().value as string);
  return id;
}

/** Only the known fields, trimmed -- never trust what the client sends. */
export function cleanPortrait(p: unknown): AlphaPortrait {
  const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
  const strs = (v: unknown, n: number) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 80)).slice(0, n) : [];
  const pick = <T extends string>(v: unknown, ok: readonly T[]): T | null =>
    typeof v === "string" && (ok as readonly string[]).includes(v) ? (v as T) : null;
  return {
    ...EMPTY_PORTRAIT,
    role: pick(o.role, ["seeking", "hiring"] as const),
    stack: strs(o.stack, 12),
    roleText: typeof o.roleText === "string" ? o.roleText.slice(0, 80) : null,
    level: pick(o.level, ["junior", "middle", "senior", "lead"] as const),
    format: pick(o.format, ["remote", "office", "hybrid", "any"] as const),
    money: typeof o.money === "number" && o.money > 0 && o.money < 1e6 ? Math.round(o.money) : null,
    dealbreakers: strs(o.dealbreakers, 12),
    wishes: strs(o.wishes, 12),
    notes: strs(o.notes, 20),
  };
}

function encrypt(json: string, secret: string): Buffer {
  const nonce = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", keyOf(secret), nonce);
  const body = Buffer.concat([c.update(json, "utf8"), c.final()]);
  return Buffer.concat([Buffer.from(MAGIC), nonce, body, c.getAuthTag()]);
}

function decrypt(buf: Buffer, secret: string): string | null {
  if (buf.length < MAGIC.length + 28 || buf.subarray(0, 4).toString() !== MAGIC) return null;
  try {
    const nonce = buf.subarray(4, 16);
    const rest = buf.subarray(16);
    const d = createDecipheriv("aes-256-gcm", keyOf(secret), nonce);
    d.setAuthTag(rest.subarray(rest.length - 16));
    return Buffer.concat([d.update(rest.subarray(0, rest.length - 16)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export async function loadPortrait(userId: string): Promise<StoredPortrait | null> {
  const cached = mem.get(userId);
  if (cached) return cached;
  const e = env();
  if (!e) return null;
  try {
    const url = `https://${storeIdFrom(e.token).toLowerCase()}.public.blob.vercel-storage.com/${pathOf(userId)}?t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = decrypt(Buffer.from(await res.arrayBuffer()), e.secret);
    if (!json) return null;
    const data = JSON.parse(json) as StoredPortrait;
    const out = { portrait: cleanPortrait(data.portrait), updatedAt: Number(data.updatedAt) || 0 };
    mem.set(userId, out);
    return out;
  } catch {
    return null;
  }
}

export async function savePortrait(userId: string, portrait: AlphaPortrait): Promise<StoredPortrait> {
  const out = { portrait: cleanPortrait(portrait), updatedAt: Date.now() };
  mem.set(userId, out);
  if (mem.size > 2000) mem.delete(mem.keys().next().value as string);
  const e = env();
  if (e) {
    try {
      const qs = new URLSearchParams({ pathname: pathOf(userId) });
      const res = await fetch(`${BLOB_API}/?${qs}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${e.token}`,
          "x-api-version": "12",
          "x-vercel-blob-store-id": storeIdFrom(e.token),
          "x-add-random-suffix": "0",
          "x-allow-overwrite": "1",
          "x-cache-control-max-age": "60",
          "x-content-type": "application/octet-stream",
        },
        body: new Uint8Array(encrypt(JSON.stringify(out), e.secret)),
      });
      if (!res.ok) console.warn("[alpha/portrait] blob save", res.status);
    } catch (err) {
      console.warn("[alpha/portrait] blob save failed", err instanceof Error ? err.message : err);
    }
  }
  return out;
}

export function portraitStorage(): "blob" | "memory" {
  return env() ? "blob" : "memory";
}
