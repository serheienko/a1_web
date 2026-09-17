// app/api/report/route.ts
//
// Александр, 17.09.2026: «Жалоба на пост или пользователя — ни кнопки,
// ни строки меню, ни эндпоинта. Давай сделаем, у нас сейчас реализовано
// как то хитро, через бот вроде, надо посмотреть как».
//
// Посмотрел. «Хитро через бот» -- это админская часть (A1 Keeper), а со
// стороны клиента всё обычно: в API есть posts.report (пост) и
// account.reportPeer (человек/чат/канал), оба отвечают true/false.
//
// Причина жалобы. Приложение всегда шлёт report-reason-spam и текст,
// который человек напечатал, никуда не отправляет
// (lib/core/rest_repository/concrete/a1_posts.dart reportPost +
// styled_send_custom_report_modal_item.dart -- окно с полем есть, а в
// запрос поле не попадает). Здесь текст не теряем: если человек что-то
// написал -- уходит report-reason-other с этим текстом (у него `text`
// обязательный), если нет -- тот же report-reason-spam, что и в апке.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";

export const runtime = "nodejs";

const Input = z.object({
  kind: z.enum(["post", "user"]),
  id: z.string().trim().min(1),
  text: z.string().trim().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { kind, id, text } = parsed.data;

  const reason = text
    ? { object: "report-reason-other", text }
    : { object: "report-reason-spam" };

  const [method, payload] =
    kind === "post"
      ? (["posts.report", { id, reason }] as const)
      : (["account.reportPeer", { peer: { object: "peer-user", user: id }, reason }] as const);

  try {
    const { data, refreshedSession } = await callAsVisitor<unknown>(method, payload);

    // Как у реакций и блокировки: `false` -- это отказ, а не успех.
    if (data === false) {
      return NextResponse.json({ ok: false, message: "rejected" }, { status: 409 });
    }

    const response = NextResponse.json({ ok: true });
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
      console.error("[api/report] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/report] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "report_failed", detail }, { status: 502 });
  }
}
