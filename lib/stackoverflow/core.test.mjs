// Проверка чистых частей плитки Stack Overflow: node --test lib/stackoverflow/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  extractStackoverflowId,
  findStackoverflowId,
  verifiedStackoverflowId,
  isValidStackoverflowId,
  decodeEntities,
  mapStackoverflowUser,
  mapStackoverflowTags,
  mapStackoverflowBestAnswer,
  tagBarPercent,
  isStackoverflowSummaryHidden,
} from "./core.ts";

const links = (...urls) => urls.map((url) => ({ url }));

test("extractStackoverflowId", () => {
  assert.equal(extractStackoverflowId("https://stackoverflow.com/users/22656/jon-skeet"), 22656);
  assert.equal(extractStackoverflowId("https://www.stackoverflow.com/users/22656"), 22656);
  assert.equal(extractStackoverflowId("stackoverflow.com/users/22656/"), 22656);
  assert.equal(extractStackoverflowId("https://stackexchange.com/users/11683/jon"), 11683);
  assert.equal(extractStackoverflowId("https://stackoverflow.com/users/22656/x?tab=answers"), 22656);
  assert.equal(extractStackoverflowId("https://stackoverflow.com/users/abc"), null);
  assert.equal(extractStackoverflowId("https://stackoverflow.com/users/0"), null);
  assert.equal(extractStackoverflowId("https://stackoverflow.com/users/-5"), null);
  assert.equal(extractStackoverflowId("https://stackoverflow.com/users/99999999999"), null);
  assert.equal(extractStackoverflowId("https://stackoverflow.com/questions/1/x"), null);
  assert.equal(extractStackoverflowId("https://stackoverflow.com/users"), null);
  assert.equal(extractStackoverflowId("https://stackoverflow.com.evil.io/users/1"), null);
  assert.equal(extractStackoverflowId("https://serverfault.com/users/1"), null);
  assert.equal(extractStackoverflowId("javascript:alert(1)"), null);
  assert.equal(extractStackoverflowId(""), null);
  assert.equal(extractStackoverflowId(null), null);
  assert.equal(findStackoverflowId(links("https://t.me/x", "https://stackoverflow.com/users/5/a")), 5);
  assert.ok(isValidStackoverflowId("123"));
  assert.ok(!isValidStackoverflowId("012"));
});

test("verifiedStackoverflowId: плитка только при совпадении", () => {
  assert.equal(verifiedStackoverflowId(links("https://stackoverflow.com/users/5/a"), 5), 5);
  assert.equal(verifiedStackoverflowId(links("https://stackoverflow.com/users/5/a"), 6), null);
  assert.equal(verifiedStackoverflowId(links("https://stackoverflow.com/users/5/a"), null), null);
  assert.equal(verifiedStackoverflowId(links("https://example.com/users/5"), 5), null);
  assert.equal(verifiedStackoverflowId([], 5), null);
});

test("decodeEntities", () => {
  assert.equal(decodeEntities("How to use &lt;div&gt; &amp; &quot;span&quot;?"), 'How to use <div> & "span"?');
  assert.equal(decodeEntities("It&#39;s &#x41;"), "It's A");
  assert.equal(decodeEntities("&unknown; &#0;"), "&unknown; ");
});

test("mapStackoverflowUser", () => {
  const u = mapStackoverflowUser({
    user_id: 22656, display_name: "Ivan &amp; K.", link: "https://stackoverflow.com/users/22656/ivan",
    profile_image: "https://i.sstatic.net/abc.png", reputation: 12480,
    badge_counts: { gold: 4, silver: 38, bronze: 71 }, answer_count: 312, accept_rate: 83.4,
  });
  assert.equal(u.displayName, "Ivan & K.");
  assert.deepEqual(u.badges, { gold: 4, silver: 38, bronze: 71 });
  assert.equal(u.reputation, 12480);
  assert.equal(u.acceptRate, 83);
  assert.equal(u.avatarUrl, "https://i.sstatic.net/abc.png");
  assert.ok(!isStackoverflowSummaryHidden(u));

  const bare = mapStackoverflowUser({ user_id: 7, link: "http://evil.io/x", profile_image: "https://evil.io/a.png", reputation: 0 });
  assert.equal(bare.htmlUrl, "https://stackoverflow.com/users/7");
  assert.equal(bare.avatarUrl, null);
  assert.equal(bare.acceptRate, null);
  assert.equal(bare.displayName, "user7");
  assert.ok(isStackoverflowSummaryHidden(bare));
  assert.equal(mapStackoverflowUser(null), null);
  assert.equal(mapStackoverflowUser({}), null);
});

test("mapStackoverflowTags / tagBarPercent", () => {
  const t = mapStackoverflowTags([
    { tag_name: "dart", answer_score: 3940, answer_count: 200 },
    { tag_name: "flutter", answer_score: 6120, answer_count: 300 },
    { tag_name: "<script>", answer_score: 99999, answer_count: 1 },
    { tag_name: "a", answer_score: 1 }, { tag_name: "b", answer_score: 2 }, { tag_name: "c", answer_score: 3 },
  ]);
  assert.deepEqual(t.map((x) => x.name), ["flutter", "dart", "c", "b"]);
  assert.equal(tagBarPercent(6120, 6120), 100);
  assert.equal(tagBarPercent(3060, 6120), 50);
  assert.equal(tagBarPercent(1, 6120), 6);
  assert.equal(tagBarPercent(0, 6120), 0);
  assert.deepEqual(mapStackoverflowTags(null), []);
});

test("mapStackoverflowBestAnswer", () => {
  const b = mapStackoverflowBestAnswer({ answer_id: 11, question_id: 5, score: 842 }, { title: "Infinite scroll &amp; ListView?", question_id: 5 });
  assert.deepEqual(b, { title: "Infinite scroll & ListView?", url: "https://stackoverflow.com/a/11", score: 842 });
  assert.equal(mapStackoverflowBestAnswer({ question_id: 5, score: 1 }, { title: "T" }).url, "https://stackoverflow.com/q/5");
  assert.equal(mapStackoverflowBestAnswer({ question_id: 5 }, { title: " " }), null);
  assert.equal(mapStackoverflowBestAnswer(null, { title: "T" }), null);
});
