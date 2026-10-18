// app/api/dribbble/callback/route.ts -- возврат из dribbble после разрешения (адрес записан в OAuth-приложении
// сервиса: https://jobs.a1appp.com/api/dribbble/callback), см. lib/oauth-verify/routes.ts
import { makeCallback, DRIBBBLE } from "@/lib/oauth-verify/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = makeCallback(DRIBBBLE);
