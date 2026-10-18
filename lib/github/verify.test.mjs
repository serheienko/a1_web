// Проверка чистых частей «подтверждённого GitHub»: node --test lib/github/verify.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  githubAuthorizeUrl,
  isWellFormedOAuthState,
  statusFromBackendError,
  GITHUB_REDIRECT_URI,
} from "./verify.ts";
import { verifiedGithubLogin } from "./core.ts";

const links = (...urls) => urls.map((url) => ({ url }));

test("verifiedGithubLogin: плитка только при совпадении", () => {
  assert.equal(verifiedGithubLogin(links("https://github.com/Torvalds"), "torvalds"), "Torvalds");
  assert.equal(verifiedGithubLogin(links("https://github.com/torvalds/linux"), "TORVALDS"), "torvalds");
  // чужая ссылка -- подтверждён другой логин
  assert.equal(verifiedGithubLogin(links("https://github.com/torvalds"), "octocat"), null);
  // не подтверждён
  assert.equal(verifiedGithubLogin(links("https://github.com/torvalds"), null), null);
  assert.equal(verifiedGithubLogin(links("https://github.com/torvalds"), undefined), null);
  assert.equal(verifiedGithubLogin(links("https://github.com/torvalds"), ""), null);
  // ссылки на GitHub нет
  assert.equal(verifiedGithubLogin(links("https://example.com/torvalds"), "torvalds"), null);
  assert.equal(verifiedGithubLogin([], "torvalds"), null);
  // ссылку сменили на другой логин -- подтверждение больше не подходит
  assert.equal(verifiedGithubLogin(links("https://github.com/someone-else"), "torvalds"), null);
  // служебные адреса GitHub не считаются профилем
  assert.equal(verifiedGithubLogin(links("https://github.com/orgs/vercel"), "orgs"), null);
});

test("isWellFormedOAuthState", () => {
  assert.ok(isWellFormedOAuthState("a".repeat(43)));
  assert.ok(isWellFormedOAuthState("A-_".repeat(14) + "a"));
  for (const bad of ["", "a".repeat(42), "a".repeat(44), "a".repeat(42) + "/", "a b".padEnd(43, "a"), null, undefined, 5]) {
    assert.ok(!isWellFormedOAuthState(bad));
  }
});

test("githubAuthorizeUrl: без прав, с нашим redirect_uri и state", () => {
  const u = new URL(githubAuthorizeUrl("cid", "s".repeat(43)));
  assert.equal(u.origin + u.pathname, "https://github.com/login/oauth/authorize");
  assert.equal(u.searchParams.get("client_id"), "cid");
  assert.equal(u.searchParams.get("redirect_uri"), GITHUB_REDIRECT_URI);
  assert.equal(u.searchParams.get("state"), "s".repeat(43));
  assert.equal(u.searchParams.get("scope"), null);
});

test("statusFromBackendError", () => {
  const body = (code) => JSON.stringify({ code, message: "x" });
  assert.equal(statusFromBackendError(409, body("GITHUB_TAKEN")), "taken");
  assert.equal(statusFromBackendError(410, body("GITHUB_STATE_INVALID")), "expired");
  assert.equal(statusFromBackendError(400, body("GITHUB_CODE_INVALID")), "expired");
  assert.equal(statusFromBackendError(429, body("RATE_LIMITED")), "busy");
  assert.equal(statusFromBackendError(429, "not json"), "busy");
  assert.equal(statusFromBackendError(502, body("GITHUB_UPSTREAM")), "error");
  assert.equal(statusFromBackendError(500, "oops"), "error");
});
