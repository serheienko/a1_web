// app/api/dribbble/verify/begin/route.ts -- шаг «begin» подтверждения dribbble, см. lib/oauth-verify/routes.ts
import { makeBegin, DRIBBBLE } from "@/lib/oauth-verify/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = makeBegin(DRIBBBLE);
