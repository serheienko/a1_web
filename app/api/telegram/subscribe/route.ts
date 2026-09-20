export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/telegram/subscribe/route.ts
//
// 2026-09-20. Человек нажал «Отримувати в Telegram» -- эта ручка меняет его
// текущий фильтр на ссылку вида t.me/a1jobs_bot?start=<код>.
//
// Почему через сервер, а не прямо из браузера в бота. У сайта и бота есть общий
// пароль, и он не должен попадать в браузер: иначе любой смог бы штамповать
// подписки от чужого имени. Браузер говорит только «вот мой фильтр», пароль
// добавляется здесь.
//
// Сам фильтр не разбираем и не проверяем: бот его тоже не понимает, он просто
// вернёт его сайту при рассылке. Появится новый фильтр -- ни эта ручка, ни бот
// об этом не узнают и продолжат работать.

import { NextRequest, NextResponse } from "next/server";

const MAX_FILTER_LENGTH = 2000;

export async function POST(request: NextRequest) {
  const botUrl = (process.env.BOT_SERVICE_URL ?? "").replace(/\/$/, "");
  const secret = process.env.BOT_SHARED_SECRET ?? "";

  if (!botUrl || !secret) {
    // Бот ещё не подключён -- честный ответ вместо пятисотки: кнопка на сайте
    // просто скажет «пока недоступно», а не сломается молча.
    return NextResponse.json({ error: "bot_not_configured" }, { status: 503 });
  }

  let filter = "";
  let locale = "uk";
  try {
    const body = (await request.json()) as { filter?: unknown; locale?: unknown };
    filter = typeof body.filter === "string" ? body.filter.slice(0, MAX_FILTER_LENGTH) : "";
    locale = typeof body.locale === "string" ? body.locale : "uk";
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!filter.trim()) {
    return NextResponse.json({ error: "empty_filter" }, { status: 400 });
  }

  try {
    const res = await fetch(`${botUrl}/api/subscribe-link`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-a1-secret": secret },
      body: JSON.stringify({ filter, locale }),
      // Бот на Railway просыпается быстро, но висеть в ожидании мы не будем:
      // человек стоит перед кнопкой.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error("[telegram/subscribe] бот відповів", res.status);
      return NextResponse.json({ error: "bot_unavailable" }, { status: 502 });
    }

    const data = (await res.json()) as { url?: string };
    if (!data.url) return NextResponse.json({ error: "bot_unavailable" }, { status: 502 });

    return NextResponse.json({ url: data.url });
  } catch (err) {
    console.error("[telegram/subscribe] не вдалося звернутися до бота", err);
    return NextResponse.json({ error: "bot_unavailable" }, { status: 502 });
  }
}
