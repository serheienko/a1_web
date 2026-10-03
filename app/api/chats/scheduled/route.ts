// app/api/chats/scheduled/route.ts
//
// Отложенные сообщения (волна 4B, 2026-10-03). Бэкенд: messages.scheduleMessage
// {peerTo, scheduleAt (секунды), entities, flags?, replyTo?}, getScheduledMessages
// {peerTo} -> [{id, scheduleAt, flags, entities, replyTo}], deleteScheduledMessages
// {peerTo, ids}, sendScheduledMessagesNow {peerTo, ids} (подтверждено живыми запросами).
//   GET  ?chat=<routeParam>            -> { ok, items: [{id, at, flags, text}] }
//   POST { chatId, op: "create", text, at, flags?, replyTo? }
//   POST { chatId, op: "delete" | "sendNow", ids: string[] }
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam } from "@/lib/a1/chat-schemas";
import { addFenceLanguages } from "@/lib/chat-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ScheduledItem = { id: string; at: number; flags: number; text: string };

const Input = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("create"),
    chatId: z.string().trim().min(1),
    text: z.string().trim().min(1).max(4000),
    at: z.number().int().positive(),
    flags: z.number().int().min(0).optional(),
    replyTo: z.object({ messageId: z.union([z.string(), z.number()]), userId: z.string().trim().min(1) }).optional(),
  }),
  z.object({ op: z.literal("delete"), chatId: z.string().trim().min(1), ids: z.array(z.string().trim().min(1)).min(1).max(50) }),
  z.object({ op: z.literal("sendNow"), chatId: z.string().trim().min(1), ids: z.array(z.string().trim().min(1)).min(1).max(50) }),
]);

function fail(err: unknown, tag: string): NextResponse {
  if (err instanceof NoSessionError) {
    const res = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    clearSession(res);
    return res;
  }
  if (err instanceof A1ApiError) console.error(`[api/chats/scheduled ${tag}] failed:`, err.httpStatus, err.body.slice(0, 500));
  else console.error(`[api/chats/scheduled ${tag}] unexpected error:`, err);
  return NextResponse.json({ ok: false, message: "scheduled_failed" }, { status: 502 });
}

function toItem(m: unknown): ScheduledItem | null {
  if (!m || typeof m !== "object") return null;
  const o = m as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  const ents = Array.isArray(o.entities) ? (o.entities as Array<Record<string, unknown>>) : [];
  const text = ents.map((e) => (typeof e.text === "string" ? e.text : "")).join("");
  return { id: o.id, at: typeof o.scheduleAt === "number" ? o.scheduleAt : 0, flags: typeof o.flags === "number" ? o.flags : 0, text };
}

export async function GET(request: NextRequest) {
  const chat = request.nextUrl.searchParams.get("chat")?.trim();
  if (!chat) return NextResponse.json({ ok: false, message: "missing_chat" }, { status: 400 });
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.getScheduledMessages", { peerTo: peerForRouteParam(chat) });
    const items = (Array.isArray(data) ? data : []).map(toItem).filter((x): x is ScheduledItem => !!x);
    items.sort((a, b) => a.at - b.at);
    const res = NextResponse.json({ ok: true, items });
    if (refreshedSession) setSession(res, refreshedSession);
    return res;
  } catch (err) {
    return fail(err, "list");
  }
}

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  const i = parsed.data;
  try {
    const peerTo = peerForRouteParam(i.chatId);
    let method: string;
    let body: Record<string, unknown>;
    if (i.op === "create") {
      method = "messages.scheduleMessage";
      body = { peerTo, scheduleAt: i.at, entities: [{ object: "entity-text", text: addFenceLanguages(i.text) }] };
      const f = (i.flags ?? 0) & 4;
      if (f) body.flags = f;
      if (i.replyTo) body.replyTo = { message: Number(i.replyTo.messageId), object: "peer-user", user: i.replyTo.userId };
    } else {
      method = i.op === "delete" ? "messages.deleteScheduledMessages" : "messages.sendScheduledMessagesNow";
      body = { peerTo, ids: i.ids };
    }
    const { data, refreshedSession } = await callAsVisitor<unknown>(method, body);
    const res = NextResponse.json({ ok: true, item: i.op === "create" ? toItem(data) : null });
    if (refreshedSession) setSession(res, refreshedSession);
    return res;
  } catch (err) {
    return fail(err, i.op);
  }
}
