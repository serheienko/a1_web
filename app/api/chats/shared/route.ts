// app/api/chats/shared/route.ts
//
// 2026-09-30 (Александр: «Спільне» -- медіа/посилання/файли/голос одного
// чата, маленькими пачками). Тонкая обёртка над backend `messages.search`:
// фильтр по типу содержимого (битовая маска MESSAGE_CONTENT_FLAG) делает
// сервер, так что браузер получает только нужный тип и только одну пачку
// (`limit`), а следующую -- по курсору `next`. Новые сообщения сверху.
import { NextRequest, NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { extractMessages, peerForRouteParam } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Совпадает с MESSAGE_CONTENT_FLAG на бэкенде (packages/constants).
const KIND_FLAG: Record<string, number> = {
  photos: 1 << 2,
  files: 1 << 1,
  voices: 1 << 4,
  links: 1 << 13,
  calculations: 1 << 14,
};

const PAGE_SIZE = 30;

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get("chat")?.trim();
  const kind = request.nextUrl.searchParams.get("kind")?.trim() ?? "";
  const next = request.nextUrl.searchParams.get("next")?.trim() || undefined;
  // Без `chat` -- поиск по всем чатам сразу (пилюли под «Пошук» в списке).
  const flag = KIND_FLAG[kind];
  if (!flag) {
    return NextResponse.json({ ok: false, message: "bad_kind" }, { status: 400 });
  }

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.search", {
      ...(chatId ? { peerTo: peerForRouteParam(chatId) } : {}),
      filterContent: flag,
      limit: PAGE_SIZE,
      ...(next ? { next } : {}),
    });
    // extractMessages sorts oldest-first; this list is newest-first.
    const messages = extractMessages(data).reverse();
    const pagination = (data as { pagination?: { next?: string | null; hasMore?: boolean } } | null)
      ?.pagination;
    const cursor = pagination?.next ?? null;
    const response = NextResponse.json({
      ok: true,
      messages,
      next: cursor,
      hasMore: Boolean(pagination?.hasMore && cursor),
    });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/chats/shared] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/shared] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "fetch_failed", detail }, { status: 502 });
  }
}
