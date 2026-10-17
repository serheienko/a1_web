// lib/referral/store.ts
//
// 17.10.2026 (Александр). Хранение рефералов в общем хранилище сайта (lib/kv/store.ts, как «Перші 250»).
// Одна запись на факт, поэтому два одновременных действия не затирают друг друга:
//   a1/referral/user/<userId>.json    -- код человека  { code }
//   a1/referral/code/<CODE>.json      -- код -> человек { userId }
//   a1/referral/of/<friendId>.json    -- друг -> кто пригласил (первый пригласивший побеждает)
//   a1/referral/by/<referrerId>/<friendId>.json -- запись о друге у пригласившего (список без перебора всех)

if (typeof window !== "undefined") {
  throw new Error("[lib/referral/store] imported from the browser — server-only");
}

import { randomInt } from "node:crypto";
import { kvConfigured, kvGetJson, kvGetMany, kvPutJson } from "@/lib/kv/store";
import { HOLD_HOURS, type Counts, type FriendStatus } from "./ladder";

const P_USER = "a1/referral/user/";
const P_CODE = "a1/referral/code/";
const P_OF = "a1/referral/of/";
const P_BY = "a1/referral/by/";

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

export type ClaimResult = "ok" | "already" | "self" | "bad_code" | "mutual" | "limit";

/** Не больше стольких новых друзей в сутки на одного человека -- дальше это уже не «друзья». */
export const DAILY_INVITE_CAP = 30;

function byPath(referrerId: string, friendId: string): string {
  return `${P_BY}${safe(referrerId)}/${safe(friendId)}.json`;
}

/** Друг вошёл по ссылке. Первый пригласивший остаётся навсегда. */
export async function claimInvite(friendId: string, rawCode: string, name?: string): Promise<ClaimResult> {
  const code = normalizeCode(rawCode);
  if (!code) return "bad_code";
  const referrerId = await ownerOfCode(code);
  if (!referrerId) return "bad_code";
  if (referrerId === friendId) return "self";
  // Взаимные приглашения (A позвал B, B зовёт A) -- классическая накрутка.
  if ((await inviteOf(referrerId))?.referrerId === friendId) return "mutual";
  // Суточный потолок на одного пригласившего.
  const recent = (await invitesBy(referrerId)).filter((i) => Date.now() - Date.parse(i.joinedAt) < 24 * 3600_000).length;
  if (recent >= DAILY_INVITE_CAP) return "limit";
  const inv: Invite = {
    v: 1,
    friendId,
    referrerId,
    code,
    joinedAt: new Date().toISOString(),
    status: "joined",
    ...(name ? { name: name.slice(0, 60) } : {}),
  };
  // Победитель определяется записью «друг -> пригласивший» (не перезаписывается).
  const won = await kvPutJson(`${P_OF}${safe(friendId)}.json`, { referrerId }, { overwrite: false });
  if (won !== "ok") return "already";
  await kvPutJson(byPath(referrerId, friendId), inv, { overwrite: true });
  return "ok";
}

export async function inviteOf(friendId: string): Promise<Invite | null> {
  if (!kvConfigured()) return null;
  const of = await kvGetJson<{ referrerId: string }>(`${P_OF}${safe(friendId)}.json`);
  if (!of?.referrerId) return null;
  return kvGetJson<Invite>(byPath(of.referrerId, friendId));
}

/** Друг заполнил профиль -- помечаем «живым» (один раз). */
export async function markLive(friendId: string): Promise<void> {
  const inv = await inviteOf(friendId);
  if (!inv || inv.status === "live") return;
  await kvPutJson(byPath(inv.referrerId, friendId), { ...inv, status: "live", liveAt: new Date().toISOString() }, { overwrite: true });
}

export type InviteRow = { name: string; status: FriendStatus; counted: boolean; joinedAt: string };

/** Все приглашённые человеком: один запрос по его префиксу. */
export async function invitesBy(referrerId: string): Promise<Invite[]> {
  if (!kvConfigured()) return [];
  const items = await kvGetMany(`${P_BY}${safe(referrerId)}/`);
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
