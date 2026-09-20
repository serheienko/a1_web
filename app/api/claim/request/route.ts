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
import { fetchPostsByAuthor } from "@/lib/a1/feed";
import { fetchUserRawByUsername } from "@/lib/a1/users";
import { findTechnicalAccountByCompanyNameAsync } from "@/lib/a1/admin-accounts";
import { companyDomains, publishedContacts, decideClaim, maskEmail } from "@/lib/a1/company-claim";
import { reasonFromError } from "@/lib/a1/claim-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 2026-09-19 (Александр: «добавь такой же блок в профили компаний»).
// Вход теперь двойной: со страницы вакансии приходит её id, со страницы
// компании — юзернейм. Дальше обе ветки сходятся в одно и то же: чей
// это профиль, какие у компании домены и какие адреса она напечатала в
// своих объявлениях.
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
  const { email } = parsed.data;
  const subject = "postId" in parsed.data ? parsed.data.postId : parsed.data.username;

  if (tooManyAttempts(subject)) {
    return NextResponse.json({ ok: false, reason: "too_many_attempts" }, { status: 429 });
  }

  // Что бы ни пришло, нам нужны три вещи: чей это профиль (имя и id для
  // сверки), его ссылки и тексты его объявлений.
  let companyName: string;
  let companyUserId: string | null;
  let username: string | null;
  let posts: Awaited<ReturnType<typeof fetchPostsByAuthor>>;

  if ("postId" in parsed.data) {
    const post = await fetchPostById(parsed.data.postId);
    if (!post) {
      return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    }
    if (!post.author.unclaimed) {
      // Профиль уже у компании — забирать нечего, и кнопки на странице
      // в этот момент тоже быть не должно.
      return NextResponse.json({ ok: false, reason: "already_claimed" }, { status: 409 });
    }
    companyName = post.author.name;
    companyUserId = post.author.userId;
    username = post.author.username;
    posts = [post];
  } else {
    const found = await fetchUserRawByUsername(parsed.data.username);
    if (!found || found.object !== "user") {
      return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    }
    if (!found.unclaimed) {
      return NextResponse.json({ ok: false, reason: "already_claimed" }, { status: 409 });
    }
    // Ровно та же склейка, что в lib/a1/user-mappers.ts::mapUserProfile —
    // по этой строке потом ищется технический аккаунт, и разойтись с
    // тем, что показано на странице, она не должна.
    companyName = [found.firstName, found.lastName].filter(Boolean).join(" ").trim();
    companyUserId = found._id;
    username = parsed.data.username;
    // Со страницы компании объявления под рукой нет, а опубликованные в
    // них адреса — половина правила. Двенадцати последних достаточно:
    // контакт компания печатает во всех своих вакансиях одинаково.
    posts = await fetchPostsByAuthor(found._id, 12);
  }

  // Ссылки на свои ресурсы есть и в вакансии, и в профиле компании.
  // Профиль тянем только ради них, поэтому его отсутствие — не ошибка.
  const profile = username ? await fetchUserRawByUsername(username) : null;
  const profileWithLinks = profile && "links" in profile ? profile : null;

  const domains = companyDomains({
    postLinks: posts.flatMap((p) => p.links),
    profileLinks: profileWithLinks?.links ?? [],
    profileCompanies: profileWithLinks?.companies ?? [],
  });
  const contacts = publishedContacts(posts.map((p) => p.contentText).join("\n"));
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

  const account = await findTechnicalAccountByCompanyNameAsync(companyName);
  if (!account) {
    console.warn("[api/claim/request] нет технического аккаунта для компании:", companyName);
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
    if (typeof me._id !== "string" || me._id !== companyUserId) {
      console.warn("[api/claim/request] аккаунт не совпал с профилем компании:", companyName);
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
