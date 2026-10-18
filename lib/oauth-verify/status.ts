// lib/oauth-verify/status.ts
//
// 18.10.2026: общие чистые части «подтверждённого» Dribbble и Stack Overflow (GitHub живёт в
// lib/github/verify.ts): адреса входа и перевод ошибки бэкенда в статус страницы результата.
// Проверка: node --test lib/oauth-verify/status.test.mjs

export type VerifyStatus = "ok" | "denied" | "expired" | "taken" | "busy" | "error";

/** Ровно те адреса, что записаны в OAuth-приложениях сервисов. */
export const DRIBBBLE_REDIRECT_URI = "https://jobs.a1appp.com/api/dribbble/callback";
export const STACKOVERFLOW_REDIRECT_URI = "https://jobs.a1appp.com/api/stackoverflow/callback";

/** Dribbble: права public -- нужен только свой логин и работы. */
export function dribbbleAuthorizeUrl(clientId: string, state: string): string {
  const u = new URL("https://dribbble.com/oauth/authorize");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", DRIBBBLE_REDIRECT_URI);
  u.searchParams.set("scope", "public");
  u.searchParams.set("state", state);
  return u.toString();
}

/** Stack Exchange: scope пустой -- нужен только user_id. */
export function stackoverflowAuthorizeUrl(clientId: string, state: string): string {
  const u = new URL("https://stackoverflow.com/oauth");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", STACKOVERFLOW_REDIRECT_URI);
  u.searchParams.set("state", state);
  return u.toString();
}

/**
 * Код ошибки бэкенда -> статус страницы. Коды бэкенда устроены как GITHUB_TAKEN /
 * GITHUB_STATE_INVALID / GITHUB_CODE_INVALID, у новых сервисов -- по тому же образцу
 * (DRIBBBLE_*, STACKOVERFLOW_*), поэтому смотрим на окончание. Чужой текст в интерфейс не попадает.
 */
export function statusFromProviderError(httpStatus: number, body: string): VerifyStatus {
  let code: string | null = null;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    code = typeof parsed.code === "string" ? parsed.code : null;
  } catch {
    // тело не разобралось -- ниже сработает httpStatus
  }
  if (code && /_TAKEN$/.test(code)) return "taken";
  if (code && /_(STATE|CODE)_INVALID$/.test(code)) return "expired";
  if (code === "RATE_LIMITED" || httpStatus === 429) return "busy";
  return "error";
}
