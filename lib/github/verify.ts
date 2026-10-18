// lib/github/verify.ts
//
// 18.10.2026 (Александр): «подтверждённый GitHub». Плитка показывается, только если человек
// доказал, что GitHub-аккаунт из его ссылки принадлежит ему (GitHub OAuth). Обмен кода на
// логин делает бэкенд (account.githubComplete), сайт только перенаправляет туда и обратно.
//
// Здесь -- чистые части без сети: проверка
// OAuth-состояния, адрес входа на GitHub, перевод кода ошибки бэкенда в статус страницы
// результата. Их проверяет lib/github/verify.test.mjs.

/** Публичный id OAuth-приложения GitHub (не секрет). Можно переопределить GITHUB_CLIENT_ID. */
export const GITHUB_CLIENT_ID_DEFAULT = "Ov23liFhAtL1LebO1WE2";
/** Ровно тот адрес, что записан в OAuth-приложении GitHub. */
export const GITHUB_REDIRECT_URI = "https://jobs.a1appp.com/api/github/callback";
/** Кука, которая привязывает возврат из GitHub к браузеру, начавшему вход. */
export const GITHUB_STATE_COOKIE = "a1_gh_state";
export const GITHUB_STATE_MAX_AGE = 600;

const STATE_RE = /^[A-Za-z0-9_-]{43}$/;

export function isWellFormedOAuthState(state: unknown): state is string {
  return typeof state === "string" && STATE_RE.test(state);
}

/** Адрес входа на GitHub. Права не просим: нужен только публичный логин. */
export function githubAuthorizeUrl(clientId: string, state: string): string {
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", GITHUB_REDIRECT_URI);
  u.searchParams.set("state", state);
  u.searchParams.set("allow_signup", "false");
  return u.toString();
}

export type VerifyStatus = "ok" | "denied" | "expired" | "taken" | "busy" | "error";

/** Код ошибки бэкенда -> статус страницы /github-verify. Узкий список: чужой текст в интерфейс не попадёт. */
export function statusFromBackendError(httpStatus: number, body: string): VerifyStatus {
  let code: string | null = null;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    code = typeof parsed.code === "string" ? parsed.code : null;
  } catch {
    // тело не разобралось -- ниже сработает httpStatus
  }
  if (code === "GITHUB_TAKEN") return "taken";
  if (code === "GITHUB_STATE_INVALID" || code === "GITHUB_CODE_INVALID") return "expired";
  if (code === "RATE_LIMITED" || httpStatus === 429) return "busy";
  return "error";
}

export function isVerifyStatus(v: unknown): v is VerifyStatus {
  return v === "ok" || v === "denied" || v === "expired" || v === "taken" || v === "busy" || v === "error";
}
