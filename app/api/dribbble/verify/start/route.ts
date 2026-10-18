// app/api/dribbble/verify/start/route.ts -- шаг «start» подтверждения dribbble, см. lib/oauth-verify/routes.ts
import { makeStart, DRIBBBLE } from "@/lib/oauth-verify/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = makeStart(DRIBBBLE);
