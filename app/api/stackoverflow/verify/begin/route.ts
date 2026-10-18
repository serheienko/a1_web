// app/api/stackoverflow/verify/begin/route.ts -- шаг «begin» подтверждения stackoverflow, см. lib/oauth-verify/routes.ts
import { makeBegin, STACKOVERFLOW } from "@/lib/oauth-verify/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = makeBegin(STACKOVERFLOW);
