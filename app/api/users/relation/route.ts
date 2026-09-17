// app/api/users/relation/route.ts
//
// Александр, 17.09.2026: «Вимкнути звук (mute) — там же, то же самое.
// Давай сделаем, бекенд есть. Это обычный mute уведомлений.»
//
// Отношение смотрящего к чужому профилю: заблокирован ли этот человек и
// заглушены ли уведомления от него. Одна ручка на оба признака, потому
// что «•••» на профиле спрашивает их вместе, один раз при открытии.
//
// Откуда признаки:
//   blocked -- users.getBlocked (без входных данных, отдаёт массив
//              UserPreview; ищем в нём этот _id);
//   muted   -- users.getUsers({ids:[id]}) -> user.notifySettings.
//              Отдельного метода «прочитать notifySettings по peer» в
//              API нет (проверено по openapi.json: есть только
//              account.updateNotifySettings и resetNotifySettings), а
//              Resource.User это поле обязательно содержит.
//
// Контракт запроса/ответа -- как у app/api/contacts/add/route.ts.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import type { SessionState } from "@/lib/a1/session";

export const runtime = "nodejs";

const Input = z.object({ userId: z.string().trim().min(1) });

/** Нас интересует только _id: остальное в UserPreview для этой задачи лишнее. */
const BlockedListSchema = z.array(z.object({ _id: z.string() }).passthrough());

/**
 * muteUntil -- время в СЕКУНДАХ (общее правило этого API), может быть
 * null. Заглушено, если стоит silent или срок молчания ещё не вышел.
 */
const NotifySettingsSchema = z.object({
  silent: z.boolean().optional(),
  muteUntil: z.number().nullable().optional(),
});

const UsersListSchema = z.array(
  z.object({ _id: z.string(), notifySettings: NotifySettingsSchema.optional() }).passthrough(),
);

export function isMuted(settings: { silent?: boolean; muteUntil?: number | null } | undefined): boolean {
  if (!settings) return false;
  if (settings.silent === true) return true;
  const until = settings.muteUntil;
  if (typeof until !== "number") return false;
  return until * 1000 > Date.now();
}

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { userId } = parsed.data;

  try {
    // ПОСЛЕДОВАТЕЛЬНО, не Promise.all. Два callAsVisitor в один момент
    // времени дерутся за один и тот же одноразовый refresh-токен: если
    // access-токен успел протухнуть, оба идут его обменивать, бэкенд
    // принимает только первый, второй получает NoSessionError -- и вся
    // ручка отвечает 401. Ровно эта гонка описана в lib/auth-fetch.ts
    // (из-за неё там очередь на клиенте) и ровно она ломала «Вимкнути
    // звук» и «Заблокувати»: состояние не приходило, и строки меню
    // оставались неактивными.
    const blockedCall = await callAsVisitor<unknown>("users.getBlocked", {});
    const usersCall = await callAsVisitor<unknown>("users.getUsers", { ids: [userId] });

    const blockedParsed = BlockedListSchema.safeParse(blockedCall.data);
    const blocked = blockedParsed.success
      ? blockedParsed.data.some((entry) => entry._id === userId)
      : false;

    const usersParsed = UsersListSchema.safeParse(usersCall.data);
    const muted = usersParsed.success ? isMuted(usersParsed.data[0]?.notifySettings) : false;

    const response = NextResponse.json({ ok: true, blocked, muted });
    // Обновлённая сессия может прийти от любого из двух вызовов -- берём
    // ту, что есть, иначе следующий запрос пойдёт со старым токеном.
    const refreshed: SessionState | null =
      blockedCall.refreshedSession ?? usersCall.refreshedSession;
    if (refreshed) setSession(response, refreshed);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/users/relation] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/users/relation] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "relation_failed", detail }, { status: 502 });
  }
}
