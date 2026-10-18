// app/api/stackoverflow/verify/start/route.ts -- шаг «start» подтверждения stackoverflow, см. lib/oauth-verify/routes.ts
import { makeStart, STACKOVERFLOW } from "@/lib/oauth-verify/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = makeStart(STACKOVERFLOW);
