// app/api/claim/request/route.ts
//
// 2026-09-19 (Александр: «надо придумать механику, как компания сама
// подаст заявку, чтобы её забрать»). Публичный вход в клейм.
//
// 2026-09-20. Раньше правило жило прямо здесь: роут сам читал вакансию,
// сам сверял домены и опубликованные адреса, сам логинился техническим
// аккаунтом и минтил ссылку. Потом клейм понадобился и в приложении — а
// вторая копия правил на Dart рано или поздно разошлась бы с этой. Для
// клейма разошедшиеся правила это дыра в безопасности, а не косметика,
// поэтому правило переехало в бэкенд (auth.claimRequest), и сайт с
// приложением зовут теперь один и тот же метод.
//
// Что осталось здесь: перевод ответа бэкенда в тот вид, который уже
// понимает форма (components/claim-form.tsx), и заслон от перебора.
// Технический аккаунт, логин под ним и сверка с автором вакансии больше
// не нужны: бэкенду незачем притворяться компанией, он и так знает, чей
// это профиль.
//
// Ссылка наружу НЕ ВЫХОДИТ — её минтит и тут же тратит бэкенд, внутри
// одного запроса. Наружу уезжает только «код отправлен».
//
// Дальше человек попадает на обычный второй шаг (app/api/claim/confirm)
// — он уже написан и ничего не знает про то, откуда взялся otp.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { call, A1ApiError } from "@/lib/a1/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Вход двойной: со страницы вакансии приходит её id, со страницы
// компании — юзернейм. Дальше обе ветки сходятся в бэкенде.
const Input = z.union([
  z.object({
    postId: z.string().trim().min(1),
    email: z.string().trim().toLowerCase().email(),
  }),
  z.object({
    username: z.string().trim().min(1),
    email: z.string().trim().toLowerCase().email(),
  }),
]);

/** Ответ auth.claimRequest. Отказ — это НЕ ошибка, он приходит с кодом 200. */
type ClaimRequestResponse =
  | { allowed: true; via: "domain" | "published-contact"; key: string; codeLength: number; expiresAt: number }
  | { allowed: false; reason: "needs_other_proof"; domains: string[]; maskedContacts: string[] };

// Столько попыток на одну вакансию за час. Память одного инстанса, не
// общий счётчик: на Vercel инстансов несколько, так что это заслон от
// перебора вручную, а не от распределённой атаки. Настоящий заслон —
// сам бэкенд: код из письма проверяет он.
const MAX_ATTEMPTS_PER_POST = 6;
const WINDOW_MS = 60 * 60 * 1000;
const attempts = new Map<string, { count: number; since: number }>();

function tooManyAttempts(postId: string): boolean {
  const now = Date.now();
  const seen = attempts.get(postId);
  if (!seen || now - seen.since > WINDOW_MS) {
    attempts.set(postId, { count: 1, since: now });
    return false;
  }
  seen.count += 1;
  return seen.count > MAX_ATTEMPTS_PER_POST;
}

/**
 * Код ошибки бэкенда → слово, которое понимает форма. Узкий белый
 * список: новый код на бэкенде не должен утечь текстом в интерфейс.
 */
function reasonFromClaimError(err: unknown): { reason: string; status: number } {
  if (!(err instanceof A1ApiError)) return { reason: "unknown", status: 500 };

  let code: string | null = null;
  try {
    const parsed = JSON.parse(err.body) as Record<string, unknown>;
    code = typeof parsed.code === "string" ? parsed.code : null;
  } catch {
    // тело не разобралось — ниже отработает httpStatus
  }

  if (code === "ACCOUNT_ALREADY_CLAIMED") return { reason: "already_claimed", status: 409 };
  if (code === "INVALID_INPUT") return { reason: "invalid_input", status: 400 };
  if (err.httpStatus === 404) return { reason: "not_found", status: 404 };
  if (err.httpStatus === 429) return { reason: "too_many_attempts", status: 429 };

  return { reason: "unknown", status: 500 };
}

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });
  }
  const { email } = parsed.data;
  const subject = "postId" in parsed.data ? parsed.data.postId : parsed.data.username;

  if (tooManyAttempts(subject)) {
    return NextResponse.json({ ok: false, reason: "too_many_attempts" }, { status: 429 });
  }

  try {
    const result = await call<ClaimRequestResponse>(
      "auth.claimRequest",
      "postId" in parsed.data ? { postId: parsed.data.postId, email } : { username: parsed.data.username, email },
      { skipAuth: true },
    );

    if (!result.allowed) {
      // 200, а не ошибка: человек ничего не сделал неправильно, просто
      // этих двух способов ему не хватило. Экран по этим подсказкам
      // объяснит, что от него нужно.
      return NextResponse.json({
        ok: false,
        reason: "needs_other_proof",
        domains: result.domains,
        maskedContacts: result.maskedContacts,
      });
    }

    return NextResponse.json({
      ok: true,
      via: result.via,
      otpKey: result.key,
      codeLength: result.codeLength,
    });
  } catch (err) {
    const { reason, status } = reasonFromClaimError(err);
    if (err instanceof A1ApiError) {
      console.error("[api/claim/request] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/claim/request] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, reason }, { status });
  }
}
