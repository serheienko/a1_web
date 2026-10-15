// lib/a1/github-oidc.ts
//
// 15.10.2026. Проверка «пропуска» GitHub Actions (OIDC-токен). Задача на GitHub просит у самого GitHub
// подписанную отметку «я -- такая-то задача такого-то репозитория» и шлёт её сайту; сайт проверяет подпись
// открытым ключом GitHub. Общий секрет при этом не нужен -- его не надо заводить в настройках GitHub.
// Используется для пульса «Кеш Workable» (app/api/shtab/gh-pulse).

import { createPublicKey, verify as verifySig, type JsonWebKey } from "node:crypto";

export const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";
const JWKS_URL = `${GITHUB_ISSUER}/.well-known/jwks`;

export type GithubClaims = {
  iss: string;
  aud: string | string[];
  exp: number;
  iat?: number;
  nbf?: number;
  repository: string;
  workflow_ref?: string;
  ref?: string;
  run_id?: string;
};

type Jwk = JsonWebKey & { kid?: string };

let cache: { at: number; keys: Jwk[] } | null = null;

async function githubKeys(): Promise<Jwk[]> {
  if (cache && Date.now() - cache.at < 3600_000) return cache.keys;
  const res = await fetch(JWKS_URL, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`jwks ${res.status}`);
  const data = (await res.json()) as { keys?: Jwk[] };
  cache = { at: Date.now(), keys: data.keys ?? [] };
  return cache.keys;
}

function b64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Проверяет токен и возвращает его содержимое или null. `keys` -- только для проверки на своей машине.
 * Требования: подпись RS256 ключом GitHub, издатель GitHub, нужная «аудитория», срок не истёк.
 */
export async function verifyGithubToken(
  token: string,
  audience: string,
  keys?: Jwk[],
  now: number = Date.now(),
): Promise<GithubClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts as [string, string, string];
  let header: { alg?: string; kid?: string };
  let claims: GithubClaims;
  try {
    header = JSON.parse(b64url(h).toString("utf8"));
    claims = JSON.parse(b64url(p).toString("utf8"));
  } catch {
    return null;
  }
  if (header.alg !== "RS256") return null;
  const all = keys ?? (await githubKeys());
  const jwk = all.find((k) => k.kid === header.kid);
  if (!jwk) return null;
  let ok = false;
  try {
    const key = createPublicKey({ key: jwk, format: "jwk" });
    ok = verifySig("RSA-SHA256", Buffer.from(`${h}.${p}`), key, b64url(sig));
  } catch {
    return null;
  }
  if (!ok) return null;
  const sec = Math.floor(now / 1000);
  const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== GITHUB_ISSUER || !auds.includes(audience)) return null;
  if (typeof claims.exp !== "number" || claims.exp < sec - 30) return null;
  if (typeof claims.nbf === "number" && claims.nbf > sec + 60) return null;
  return claims;
}
