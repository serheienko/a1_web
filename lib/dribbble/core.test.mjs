// Проверка чистых частей плитки Dribbble: node --test lib/dribbble/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  extractDribbbleLogin,
  findDribbbleLogin,
  verifiedDribbbleLogin,
  sanitizeDribbbleSnapshot,
  isDribbbleSnapshotShowable,
  dribbbleUrlOrNull,
} from "./core.ts";

const links = (...urls) => urls.map((url) => ({ url }));

test("extractDribbbleLogin", () => {
  assert.equal(extractDribbbleLogin("https://dribbble.com/anna-designs"), "anna-designs");
  assert.equal(extractDribbbleLogin("https://www.dribbble.com/Anna_D/"), "Anna_D");
  assert.equal(extractDribbbleLogin("dribbble.com/anna?tab=likes"), "anna");
  assert.equal(extractDribbbleLogin("https://dribbble.com/@anna"), "anna");
  for (const r of ["shots", "designers", "jobs", "tags", "search", "stories", "pro", "hiring", "courses", "learn", "session", "signup", "account", "following", "notifications", "SHOTS"]) {
    assert.equal(extractDribbbleLogin(`https://dribbble.com/${r}`), null, r);
  }
  assert.equal(extractDribbbleLogin("https://dribbble.com/shots/123-title"), null);
  assert.equal(extractDribbbleLogin("https://dribbble.com/"), null);
  assert.equal(extractDribbbleLogin("https://notdribbble.com/anna"), null);
  assert.equal(extractDribbbleLogin("https://dribbble.com.evil.io/anna"), null);
  assert.equal(extractDribbbleLogin("https://cdn.dribbble.com/anna"), null);
  assert.equal(extractDribbbleLogin("javascript:alert(1)"), null);
  assert.equal(extractDribbbleLogin("https://dribbble.com/bad name"), null);
  assert.equal(extractDribbbleLogin(""), null);
  assert.equal(extractDribbbleLogin(null), null);
  assert.equal(findDribbbleLogin(links("https://t.me/x", "https://dribbble.com/anna")), "anna");
});

test("verifiedDribbbleLogin: плитка только при совпадении", () => {
  assert.equal(verifiedDribbbleLogin(links("https://dribbble.com/Anna"), "anna"), "Anna");
  assert.equal(verifiedDribbbleLogin(links("https://dribbble.com/anna"), "bob"), null);
  assert.equal(verifiedDribbbleLogin(links("https://dribbble.com/anna"), null), null);
  assert.equal(verifiedDribbbleLogin(links("https://dribbble.com/anna"), ""), null);
  assert.equal(verifiedDribbbleLogin(links("https://example.com/anna"), "anna"), null);
  assert.equal(verifiedDribbbleLogin([], "anna"), null);
});

const good = {
  login: "anna",
  name: "Anna",
  avatarUrl: "https://cdn.dribbble.com/users/1/avatar.png",
  htmlUrl: "https://dribbble.com/anna",
  followers: 2100,
  shotsCount: 48,
  shots: [{ id: 1, title: "Bank app", imageUrl: "https://cdn.dribbble.com/s/1.png", htmlUrl: "https://dribbble.com/shots/1" }],
  fetchedAt: "2026-10-18T10:00:00.000Z",
};

test("sanitizeDribbbleSnapshot: нормальный снимок", () => {
  const s = sanitizeDribbbleSnapshot(good);
  assert.equal(s.login, "anna");
  assert.equal(s.shots.length, 1);
  assert.equal(s.shots[0].id, "1");
  assert.equal(s.followers, 2100);
  assert.equal(s.shotsCount, 48);
  assert.ok(isDribbbleSnapshotShowable(s));
});

test("sanitizeDribbbleSnapshot: чужие хосты и http отбрасываются, максимум 12", () => {
  const shots = Array.from({ length: 20 }, (_, i) => ({ id: i, title: "t".repeat(500), imageUrl: "https://cdn.dribbble.com/s.png", htmlUrl: "https://dribbble.com/shots/" + i }));
  shots.splice(1, 0, { id: 99, title: "x", imageUrl: "https://evil.io/a.png", htmlUrl: "https://dribbble.com/shots/99" });
  shots.splice(2, 0, { id: 98, title: "x", imageUrl: "http://cdn.dribbble.com/a.png", htmlUrl: "https://dribbble.com/shots/98" });
  shots.splice(3, 0, { id: 97, title: "x", imageUrl: "https://cdn.dribbble.com/a.png", htmlUrl: "javascript:alert(1)" });
  const s = sanitizeDribbbleSnapshot({ ...good, avatarUrl: "https://evil.io/me.png", shots, followers: -5, shotsCount: "many" });
  assert.equal(s.shots.length, 12);
  assert.ok(!s.shots.some((x) => ["99", "98", "97"].includes(x.id)));
  assert.ok(s.shots.every((x) => x.title.length <= 120));
  assert.equal(s.avatarUrl, null);
  assert.equal(s.followers, 0);
  assert.equal(s.shotsCount, 12);
});

test("sanitizeDribbbleSnapshot: мусор", () => {
  assert.equal(sanitizeDribbbleSnapshot(null), null);
  assert.equal(sanitizeDribbbleSnapshot("x"), null);
  assert.equal(sanitizeDribbbleSnapshot({}), null);
  assert.equal(sanitizeDribbbleSnapshot({ ...good, htmlUrl: "https://evil.io/anna" }), null);
  assert.equal(sanitizeDribbbleSnapshot({ ...good, login: "" }), null);
  const empty = sanitizeDribbbleSnapshot({ ...good, shots: [] });
  assert.ok(!isDribbbleSnapshotShowable(empty));
  assert.ok(!isDribbbleSnapshotShowable(null));
  assert.equal(dribbbleUrlOrNull("https://notdribbble.com/x"), null);
});
