// app/api/claim/request/route.ts
//
// 2026-09-19 (Александр: «надо придумать механику, как компания сама
// подаст заявку, чтобы её забрать»). Публичный вход в клейм.
//
// До сегодня ссылку на передачу выдавал Александр руками из админки
// (app/api/admin/claim-link). Здесь то же самое, но решение принимает
// правило, а не человек: lib/a1/company-claim.ts сверяет введённый
// адрес с тем, что компания уже опубликовала о себе.
//
// Ссылка наружу НЕ ВЫХОДИТ. Она минтится, тут же тратится на
// claimVerifyEmail и остаётся внутри этого запроса — наружу уезжает
// только «код отправлен». Иначе мы бы отдавали ключ от аккаунта тому,
// кто ещё ничего не подтвердил: код из письма он введёт потом, а
// ссылка живёт четырнадцать дней.
//
// Дальше человек попадает на обычный второй шаг (app/api/claim/confirm)
// — он уже написан и ничего не знает про то, откуда взялся otp.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { call, A1ApiError } from "@/lib/a1/client";
import { fetchPostById } from "@/lib/a1/posts";
import { fetchUserRawByUsername } from "@/lib/a1/users";
import { findTechnicalAccountByCompanyName } from "@/lib/a1/admin-accounts";
import { companyDomains, publishedContacts, decideClaim, maskEmail } from "@/lib/a1/company-claim";
import { reasonFromError } from "@/lib/a1/claim-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Input = z.object({
  postId: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
});

type ClaimStartResponse = { key: string; code: string; expiresInSeconds: number };
type ClaimVerifyEmailResponse = { key: string; codeLength: number; expiresAt: number };
type LoginOutput = { accessToken: string };

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

export async function POST(request: NextRequest) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });
  }
  const { postId, email } = parsed.data;

  if (tooManyAttempts(postId)) {
    return NextResponse.json({ ok: false, reason: "too_many_attempts" }, { status: 429 });
  }

  const post = await fetchPostById(postId);
  if (!post) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  if (!post.author.unclaimed) {
    // Профиль уже у компании — забирать нечего, и кнопки на странице
    // в этот момент тоже быть не должно.
    return NextResponse.json({ ok: false, reason: "already_claimed" }, { status: 409 });
  }

  // Ссылки на свои ресурсы есть и в вакансии, и в профиле компании.
  // Профиль тянем только ради них, поэтому его отсутствие — не ошибка.
  const profile = post.author.username ? await fetchUserRawByUsername(post.author.username) : null;
  const profileWithLinks = profile && "links" in profile ? profile : null;

  const domains = companyDomains({
    postLinks: post.links,
    profileLinks: profileWithLinks?.links ?? [],
    profileCompanies: profileWithLinks?.companies ?? [],
  });
  const contacts = publishedContacts(post.contentText);
  const verdict = decideClaim({ email, domains, contacts });

  if (!verdict.allowed) {
    // 200, а не ошибка: человек ничего не сделал неправильно, просто
    // этих двух способов ему не хватило. Экран по этим подсказкам
    // объяснит, что от него нужно.
    return NextResponse.json({
      ok: false,
      reason: "needs_other_proof",
      domains: verdict.domains,
      maskedContacts: contacts.map(maskEmail),
    });
  }

  const account = findTechnicalAccountByCompanyName(post.author.name);
  if (!account) {
    console.warn("[api/claim/request] нет технического аккаунта для компании:", post.author.name);
    return NextResponse.json({ ok: false, reason: "manual_review" }, { status: 409 });
  }

  try {
    const login = await call<LoginOutput>(
      "auth.email",
      { email: account.email, password: account.password },
      { skipAuth: true },
    );

    // Сверка, что залогинились именно под автором этой вакансии.
    // Аккаунт ищется по НАЗВАНИЮ компании, а название — строка из
    // объявления: два разных аккаунта с похожим именем теоретически
    // возможны. Цена ошибки — отданный чужой профиль, поэтому лишний
    // запрос здесь оправдан.
    const me = await call<{ _id?: unknown }>("users.getMe", {}, { accessToken: login.accessToken });
    if (typeof me._id !== "string" || me._id !== post.author.userId) {
      console.warn("[api/claim/request] аккаунт не совпал с автором поста:", post.author.name);
      return NextResponse.json({ ok: false, reason: "manual_review" }, { status: 409 });
    }

    const claim = await call<ClaimStartResponse>("auth.claimStart", {}, { accessToken: login.accessToken });

    const otp = await call<ClaimVerifyEmailResponse>(
      "auth.claimVerifyEmail",
      { claim: { key: claim.key, code: claim.code }, email },
      { skipAuth: true },
    );

    return NextResponse.json({ ok: true, via: verdict.via, otpKey: otp.key, codeLength: otp.codeLength });
  } catch (err) {
    const reason = reasonFromError(err);
    if (err instanceof A1ApiError) {
      console.error("[api/claim/request] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/claim/request] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, reason }, { status: reason === "unknown" ? 500 : 409 });
  }
}
