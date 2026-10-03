// app/api/contacts/edit/route.ts
//
// «Змінити контакт» (волна 4B, 2026-10-03). Бэкенд: contacts.editContact
// {user, firstName?, lastName?, note?} -- если человека нет в контактах,
// сервер добавляет его сам; пустое имя возвращает настоящее имя профиля
// (подтверждено живым запросом и contacts.dart приложения).
//   GET  ?user=usr_...  -> { ok, contact: { firstName, lastName, note } | null }
//   POST { user, firstName, lastName, note } -> { ok, contact }
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContactOut = { firstName: string; lastName: string; note: string };

const Input = z.object({
  user: z.string().trim().min(1).max(100),
  firstName: z.string().trim().max(64),
  lastName: z.string().trim().max(64),
  note: z.string().trim().max(500),
});

function shape(c: unknown): ContactOut | null {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  return {
    firstName: typeof o.firstName === "string" ? o.firstName : "",
    lastName: typeof o.lastName === "string" ? o.lastName : "",
    note: typeof o.note === "string" ? o.note : "",
  };
}

function fail(err: unknown): NextResponse {
  if (err instanceof NoSessionError) {
    const res = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
    clearSession(res);
    return res;
  }
  if (err instanceof A1ApiError) console.error("[api/contacts/edit] failed:", err.httpStatus, err.body.slice(0, 500));
  else console.error("[api/contacts/edit] unexpected error:", err);
  return NextResponse.json({ ok: false, message: "edit_contact_failed" }, { status: 502 });
}

export async function GET(request: NextRequest) {
  const user = request.nextUrl.searchParams.get("user")?.trim();
  if (!user) return NextResponse.json({ ok: false, message: "missing_user" }, { status: 400 });
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("contacts.search", {});
    const list = data && typeof data === "object" ? (data as { contacts?: unknown }).contacts : null;
    const found = Array.isArray(list) ? list.find((c) => (c as { user?: unknown })?.user === user) : null;
    const res = NextResponse.json({ ok: true, contact: shape(found) });
    if (refreshedSession) setSession(res, refreshedSession);
    return res;
  } catch (err) {
    return fail(err);
  }
}

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("contacts.editContact", parsed.data);
    const res = NextResponse.json({ ok: true, contact: shape(data) });
    if (refreshedSession) setSession(res, refreshedSession);
    return res;
  } catch (err) {
    return fail(err);
  }
}
