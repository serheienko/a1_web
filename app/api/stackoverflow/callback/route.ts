// app/api/stackoverflow/callback/route.ts -- возврат из stackoverflow после разрешения (адрес записан в OAuth-приложении
// сервиса: https://jobs.a1appp.com/api/stackoverflow/callback), см. lib/oauth-verify/routes.ts
import { makeCallback, STACKOVERFLOW } from "@/lib/oauth-verify/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = makeCallback(STACKOVERFLOW);
