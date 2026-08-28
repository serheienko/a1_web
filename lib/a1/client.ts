// lib/a1/client.ts
//
// The only file in this repo that calls fetch() against api.a1appp.com
// (PLAN.md §5 rule 3). Every other module — including lib/a1/auth.ts, for
// the two unauthenticated auth.* endpoints — goes through call() below.

import { env } from "./config";
import { authorizer } from "./auth";

const TIMEOUT_MS = 10_000;

export class A1ApiError extends Error {
  readonly method: string;
  readonly httpStatus: number;
  readonly body: string;

  constructor(method: string, httpStatus: number, body: string) {
    super(`[lib/a1/client] ${method} failed (http ${httpStatus}): ${body.slice(0, 500)}`);
    this.name = "A1ApiError";
    this.method = method;
    this.httpStatus = httpStatus;
    this.body = body;
  }

  /**
   * Best-effort extraction of a human-readable message from the error
   * body. PLAN.md §0's ground-truth table is explicit that 400/401/500
   * are "declared with no schema" — there is no confirmed error shape to
   * type against, so this only ever returns a string when the body
   * happens to parse as JSON with a plain string `message` or `error`
   * field, and null otherwise. Callers (Stage 2's auth routes) must
   * always have their own localized fallback for the null case — this is
   * a debugging aid, not something to trust for user-facing i18n.
   */
  get detail(): string | null {
    try {
      const parsed = JSON.parse(this.body) as Record<string, unknown>;
      const candidate = parsed.message ?? parsed.error;
      return typeof candidate === "string" ? candidate : null;
    } catch {
      return null;
    }
  }
}

type Envelope<T> = { ms: number; status: number; data: T };

async function doFetch(
  method: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<Response> {
  return fetch(`${env.A1_API_BASE}/v1/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
}

async function unwrap<T>(method: string, res: Response): Promise<T> {
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new A1ApiError(method, res.status, text);
  }

  const envelope = json as Partial<Envelope<T>>;
  if (!res.ok || envelope.status !== 200 || envelope.data === undefined) {
    throw new A1ApiError(method, res.status, text);
  }
  return envelope.data;
}

/**
 * Call one A1 API method: `POST {A1_API_BASE}/v1/{method}`.
 * Unwraps the `{ ms, status, data }` envelope and returns `data` as T.
 *
 * By default attaches the service-account bearer token and, on a 401,
 * invalidates it and retries exactly once with a fresh one. Pass
 * `skipAuth: true` for the handful of public endpoints (auth.email,
 * auth.refreshToken, dataset.*) — lib/a1/auth.ts uses this to avoid calling
 * itself while logging in.
 */
export async function call<T>(
  method: string,
  body: unknown = {},
  opts: { skipAuth?: boolean } = {},
): Promise<T> {
  const headers = opts.skipAuth ? {} : await authorizer.headers();
  let res = await doFetch(method, body, headers);

  if (!opts.skipAuth && res.status === 401) {
    authorizer.invalidate();
    const retryHeaders = await authorizer.headers();
    res = await doFetch(method, body, retryHeaders);
  }

  return unwrap<T>(method, res);
}
