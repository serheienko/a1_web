// app/api/users/blocked/route.ts
//
// Кого этот человек заблокировал. Александр, 18.09.2026: «где будет
// разблокировка? Сейчас заблокировать можно, а разблокировать негде».
//
// Метод users.getBlocked принимает пустое тело и отдаёт массив
// user-preview (проверено по openapi.json). Зовём от имени вошедшего --
// список у каждого свой.
//
// Наружу отдаём только то, что нужно списку: id, имя, ник и фото. Это то
// же правило, что и везде в этом репозитории -- ответ бэкенда в браузер
// не попадает (PLAN.md §5).
import { NextResponse } from "next/server";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

type RawBlocked = {
  _id?: unknown;
  fullName?: unknown;
  username?: unknown;
  photo?: unknown;
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function GET() {
  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>("users.getBlocked", {});

    const users = (Array.isArray(data) ? data : [])
      .map((item) => {
        const raw = (item ?? {}) as RawBlocked;
        return {
          id: str(raw._id),
          name: str(raw.fullName),
          username: str(raw.username),
          photoUrl: str(raw.photo) || null,
        };
      })
      .filter((user) => user.id);

    const response = NextResponse.json({ ok: true, users });
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
      console.error("[api/users/blocked] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/users/blocked] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "blocked_failed", detail }, { status: 502 });
  }
}
