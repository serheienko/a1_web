// lib/referral/store.ts
//
// 17.10.2026 (Александр). Хранение рефералов в общем хранилище сайта (lib/kv/store.ts, как «Перші 250»).
// Одна запись на факт, поэтому два одновременных действия не затирают друг друга:
//   a1/referral/user/<userId>.json    -- код человека  { code }
//   a1/referral/code/<CODE>.json      -- код -> человек { userId }
//   a1/referral/invite/<friendId>.json -- друг -> кто пригласил (первый пригласивший побеждает)

if (typeof window !== "undefined") {
  throw new Error("[lib/referral/store] imported from the browser — server-only");
}

import { randomInt } from "node:crypto";
import { kvConfigured, kvGetJson, kvGetMany, kvPutJson } from "@/lib/kv/store";
import { HOLD_HOURS, type Counts, type FriendStatus } from "./ladder";

const P_USER = "a1/referral/user/";
const P_CODE = "a1/referral/code/";
const P_INVITE = "a1/referral/invite/";

// Без похожих символов (0/O, 1/I/L), чтобы код можно было продиктовать.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LEN = 7;

export type Invite = {
  v: 1;
  friendId: string;
  referrerId: string;
  code: string;
  joinedAt: string;
  status: FriendStatus;
  liveAt?: string;
  /** имя друга для списка «Запрошені» (только имя, без почты) */
  name?: string;
};

function safe(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function normalizeCode(raw: string): string | null {
  const c = String(raw ?? "").trim().toUpperCase();
  return c.length === CODE_LEN && [...c].every((ch) => ALPHABET.includes(ch)) ? c : null;
}

function makeCode(): string {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/** Код человека; при первом обращении создаётся и закрепляется навсегда. */
export async function ensureCode(userId: string): Promise<string> {
  if (!kvConfigured()) throw new Error("no KV_DATABASE_URL");
  const mine = await kvGetJson<{ code: string }>(`${P_USER}${safe(userId)}.json`);
  if (mine?.code) return mine.code;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeCode();
    const taken = await kvPutJson(`${P_CODE}${code}.json`, { userId }, { overwrite: false });
    if (taken === "exists") continue;
    const set = await kvPutJson(`${P_USER}${safe(userId)}.json`, { code, createdAt: new Date().toISOString() }, { overwrite: false });
    if (set === "ok") return code;
    // параллельный запрос успел раньше -- берём его код
    const again = await kvGetJson<{ code: string }>(`${P_USER}${safe(userId)}.json`);
    if (again?.code) return again.code;
  }
  throw new Error("referral_code_failed");
}

export async function ownerOfCode(code: string): Promise<string | null> {
  const c = normalizeCode(code);
  if (!c || !kvConfigured()) return null;
  return (await kvGetJson<{ userId: string }>(`${P_CODE}${c}.json`))?.userId ?? null;
}

export type ClaimResult = "ok" | "already" | "self" | "bad_code";

/** Друг вошёл по ссылке. Первый пригласивший остаётся навсегда. */
export async function claimInvite(friendId: string, rawCode: string, name?: string): Promise<ClaimResult> {
  const code = normalizeCode(rawCode);
  if (!code) return "bad_code";
  const referrerId = await ownerOfCode(code);
  if (!referrerId) return "bad_code";
  if (referrerId === friendId) return "self";
  const inv: Invite = {
    v: 1,
    friendId,
    referrerId,
    code,
    joinedAt: new Date().toISOString(),
    status: "joined",
    ...(name ? { name: name.slice(0, 60) } : {}),
  };
  const r = await kvPutJson(`${P_INVITE}${safe(friendId)}.json`, inv, { overwrite: false });
  return r === "ok" ? "ok" : "already";
}

export async function inviteOf(friendId: string): Promise<Invite | null> {
  if (!kvConfigured()) return null;
  return kvGetJson<Invite>(`${P_INVITE}${safe(friendId)}.json`);
}

/** Друг заполнил профиль -- помечаем «живым» (один раз). */
export async function markLive(friendId: string): Promise<void> {
  const inv = await inviteOf(friendId);
  if (!inv || inv.status === "live") return;
  await kvPutJson(`${P_INVITE}${safe(friendId)}.json`, { ...inv, status: "live", liveAt: new Date().toISOString() }, { overwrite: true });
}

export type InviteRow = { name: string; status: FriendStatus; counted: boolean; joinedAt: string };

/** Все приглашённые человеком (один запрос к базе; при росте заменить на индекс по referrerId). */
export async function invitesBy(referrerId: string): Promise<Invite[]> {
  if (!kvConfigured()) return [];
  const items = await kvGetMany(P_INVITE);
  const out: Invite[] = [];
  for (const it of items) {
    try {
      const inv = JSON.parse(it.body.toString("utf8")) as Invite;
      if (inv?.v === 1 && inv.referrerId === referrerId) out.push(inv);
    } catch {
      /* битая запись -- пропускаем */
    }
  }
  return out.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

export function isCounted(inv: Invite, now = Date.now()): boolean {
  return now - Date.parse(inv.joinedAt) >= HOLD_HOURS * 3600_000;
}

export function countsOf(list: Invite[], now = Date.now()): Counts {
  let counted = 0;
  let live = 0;
  let pending = 0;
  for (const inv of list) {
    if (!isCounted(inv, now)) {
      pending++;
      continue;
    }
    counted++;
    if (inv.status === "live") live++;
  }
  return { counted, live, pending };
}

export function rowsOf(list: Invite[], now = Date.now()): InviteRow[] {
  return list.map((inv) => ({
    name: inv.name || "Новий друг",
    status: inv.status,
    counted: isCounted(inv, now),
    joinedAt: inv.joinedAt,
  }));
}
