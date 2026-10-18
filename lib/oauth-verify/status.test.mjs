// Проверка общих частей «подтверждённого» Dribbble/Stack Overflow: node --test lib/oauth-verify/status.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  dribbbleAuthorizeUrl,
  stackoverflowAuthorizeUrl,
  statusFromProviderError,
  DRIBBBLE_REDIRECT_URI,
  STACKOVERFLOW_REDIRECT_URI,
} from "./status.ts";

test("authorize urls", () => {
  const d = new URL(dribbbleAuthorizeUrl("cid", "S".repeat(43)));
  assert.equal(d.origin + d.pathname, "https://dribbble.com/oauth/authorize");
  assert.equal(d.searchParams.get("client_id"), "cid");
  assert.equal(d.searchParams.get("scope"), "public");
  assert.equal(d.searchParams.get("redirect_uri"), DRIBBBLE_REDIRECT_URI);
  assert.equal(d.searchParams.get("state"), "S".repeat(43));
  const s = new URL(stackoverflowAuthorizeUrl("cid", "S".repeat(43)));
  assert.equal(s.origin + s.pathname, "https://stackoverflow.com/oauth");
  assert.equal(s.searchParams.get("redirect_uri"), STACKOVERFLOW_REDIRECT_URI);
  assert.equal(s.searchParams.get("scope"), null);
});

test("statusFromProviderError", () => {
  const body = (code) => JSON.stringify({ code });
  assert.equal(statusFromProviderError(409, body("DRIBBBLE_TAKEN")), "taken");
  assert.equal(statusFromProviderError(409, body("STACKOVERFLOW_TAKEN")), "taken");
  assert.equal(statusFromProviderError(400, body("DRIBBBLE_STATE_INVALID")), "expired");
  assert.equal(statusFromProviderError(400, body("STACKOVERFLOW_CODE_INVALID")), "expired");
  assert.equal(statusFromProviderError(429, body("RATE_LIMITED")), "busy");
  assert.equal(statusFromProviderError(429, "not json"), "busy");
  assert.equal(statusFromProviderError(500, "<html>"), "error");
  assert.equal(statusFromProviderError(500, body("WHATEVER")), "error");
});
