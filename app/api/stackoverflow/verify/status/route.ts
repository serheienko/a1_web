// app/api/stackoverflow/verify/status/route.ts
//
// 18.10.2026: подтверждённый Stack Overflow текущего пользователя -- свежий, без кеша.
// Ответ: { ok, id } (id = null, если не подтверждён).
import { makeStatus } from "@/lib/oauth-verify/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = makeStatus((profile) => ({ id: profile.stackoverflowVerifiedId ?? null }));
