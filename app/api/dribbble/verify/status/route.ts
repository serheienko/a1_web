// app/api/dribbble/verify/status/route.ts
//
// 18.10.2026: подтверждённый Dribbble текущего пользователя -- свежий, без кеша (страница профиля
// кешируется на 10 минут, а сразу после подтверждения/«Оновити» человек должен увидеть результат).
// Ответ: { ok, login, snapshot } (login/snapshot = null, если не подтверждён).
import { makeStatus } from "@/lib/oauth-verify/routes";
import { sanitizeDribbbleSnapshot } from "@/lib/dribbble/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = makeStatus((profile) => ({
  login: profile.dribbbleVerified?.login ?? null,
  snapshot: sanitizeDribbbleSnapshot(profile.dribbbleVerified?.snapshot),
}));
