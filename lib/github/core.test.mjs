// Проверка чистых частей плитки GitHub: node --test lib/github/core.test.mjs
// (Node 22.18+ сам понимает TypeScript без типов-перечислений -- core.ts такой.)
import test from "node:test";
import assert from "node:assert/strict";
import {
  extractGithubLogin,
  findGithubLogin,
  isValidGithubLogin,
  parseContributionsHtml,
  bucketLanguages,
  groupDaysIntoWeeks,
  isGithubSummaryTooEmpty,
  githubYears,
  resolveGithubYear,
  githubYearRange,
} from "./core.ts";

test("extractGithubLogin", () => {
  assert.equal(extractGithubLogin("https://github.com/torvalds"), "torvalds");
  assert.equal(extractGithubLogin("https://github.com/torvalds/linux"), "torvalds");
  assert.equal(extractGithubLogin("http://www.github.com/Some-User/"), "Some-User");
  assert.equal(extractGithubLogin("github.com/octocat?tab=repositories"), "octocat");
  assert.equal(extractGithubLogin("  https://github.com/@octocat  "), "octocat");
  assert.equal(extractGithubLogin("https://github.com/orgs/vercel"), null);
  assert.equal(extractGithubLogin("https://github.com/sponsors/x"), null);
  assert.equal(extractGithubLogin("https://github.com/features/actions"), null);
  assert.equal(extractGithubLogin("https://github.com/topics/react"), null);
  assert.equal(extractGithubLogin("https://github.com/marketplace"), null);
  assert.equal(extractGithubLogin("https://github.com/settings/profile"), null);
  assert.equal(extractGithubLogin("https://github.com/apps/foo"), null);
  assert.equal(extractGithubLogin("https://github.com/collections/x"), null);
  assert.equal(extractGithubLogin("https://github.com/"), null);
  assert.equal(extractGithubLogin("https://gist.github.com/torvalds"), null);
  assert.equal(extractGithubLogin("https://notgithub.com/torvalds"), null);
  assert.equal(extractGithubLogin("https://github.com.evil.io/torvalds"), null);
  assert.equal(extractGithubLogin("https://github.com/bad--name"), null);
  assert.equal(extractGithubLogin("https://github.com/-bad"), null);
  assert.equal(extractGithubLogin("javascript:alert(1)"), null);
  assert.equal(extractGithubLogin(""), null);
  assert.equal(extractGithubLogin(null), null);
  assert.equal(findGithubLogin([{ url: "https://t.me/x" }, { url: "https://github.com/a1/repo" }]), "a1");
});

test("isValidGithubLogin", () => {
  assert.ok(isValidGithubLogin("a"));
  assert.ok(isValidGithubLogin("a-b-c"));
  assert.ok(isValidGithubLogin("x".repeat(39)));
  assert.ok(!isValidGithubLogin("x".repeat(40)));
  assert.ok(!isValidGithubLogin("a-"));
  assert.ok(!isValidGithubLogin("a_b"));
  assert.ok(!isValidGithubLogin("../etc"));
});

const td = (i, date, level) =>
  `<td tabindex="0" data-ix="${i}" aria-selected="false" style="width: 10px" data-date="${date}" id="contribution-day-component-${i}" data-level="${level}" role="gridcell" class="ContributionCalendar-day"></td>`;
const tip = (i, text) =>
  `<tool-tip style="pointer-events: none;" id="tooltip-${i}" for="contribution-day-component-${i}" popover="manual" class="sr-only position-absolute">${text}</tool-tip>`;

test("parseContributionsHtml: real-like markup", () => {
  // Строки таблицы -- по дням недели, поэтому даты идут вперемешку.
  const html = `
    <h2 id="js-contribution-activity-description" class="f4 text-normal mb-2">
      1,234
      contributions
        in the last year
    </h2>
    <table><tbody>
    <tr>${td(0, "2026-10-04", 1)}${td(1, "2026-10-11", 4)}</tr>
    <tr>${td(2, "2026-10-05", 0)}${td(3, "2026-10-12", 2)}</tr>
    <tr>${td(4, "2026-10-10", 3)}</tr>
    </tbody></table>
    ${tip(0, "1 contribution on October 4th.")}
    ${tip(1, "1,024 contributions on October 11th.")}
    ${tip(2, "No contributions on October 5th.")}
    ${tip(3, "5 contributions on October 12th.")}
    ${tip(4, "7 contributions on October 10th.")}`;
  const r = parseContributionsHtml(html);
  assert.equal(r.totalContributions, 1234);
  assert.equal(r.weeks.length, 2);
  assert.deepEqual(r.weeks[0].days.map((d) => [d.date, d.count, d.level]), [
    ["2026-10-04", 1, 1],
    ["2026-10-05", 0, 0],
    ["2026-10-10", 7, 3],
  ]);
  assert.deepEqual(r.weeks[1].days.map((d) => [d.date, d.count, d.level]), [
    ["2026-10-11", 1024, 4],
    ["2026-10-12", 5, 2],
  ]);
});

test("parseContributionsHtml: defensive", () => {
  assert.deepEqual(parseContributionsHtml(""), { totalContributions: null, weeks: [] });
  assert.deepEqual(parseContributionsHtml("<html>rate limited</html>"), { totalContributions: null, weeks: [] });
  // Нет подсказок и заголовка -- уровни остаются, сумма считается по дням.
  const r = parseContributionsHtml(`${td(0, "2026-10-11", 2)}${td(1, "2026-10-12", 0)}${td(2, "bad", 3)}`);
  assert.equal(r.weeks.length, 1);
  assert.equal(r.weeks[0].days.length, 2);
  assert.equal(r.totalContributions, 2);
});

test("groupDaysIntoWeeks keeps at most 54 weeks, Sunday-first", () => {
  const days = [];
  const start = Date.UTC(2025, 0, 5); // воскресенье
  for (let i = 0; i < 60 * 7; i++) {
    const d = new Date(start + i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, count: 0, level: 0 });
  }
  const w = groupDaysIntoWeeks(days);
  assert.equal(w.length, 54);
  for (const wk of w) assert.equal(new Date(wk.days[0].date + "T00:00:00Z").getUTCDay(), 0);
});

test("bucketLanguages: top 3 + other, sums to 100", () => {
  const r = bucketLanguages([
    { name: "TypeScript", size: 500, color: "#3178c6" },
    { name: "Python", size: 300 },
    { name: "Go", size: 100, color: null },
    { name: "Rust", size: 60 },
    { name: "C", size: 40 },
    { name: "TypeScript", size: 0 },
  ]);
  assert.deepEqual(r.map((l) => [l.name, l.percent]), [["TypeScript", 50], ["Python", 30], ["Go", 10], ["other", 10]]);
  assert.equal(r[1].color, "#3572a5"); // цвет из таблицы, если не пришёл
  assert.equal(r.reduce((s, l) => s + l.percent, 0), 100);

  const thirds = bucketLanguages([{ name: "A", size: 1 }, { name: "B", size: 1 }, { name: "C", size: 1 }]);
  assert.equal(thirds.reduce((s, l) => s + l.percent, 0), 100);
  assert.ok(!thirds.some((l) => l.name === "other"));

  const tiny = bucketLanguages([{ name: "A", size: 100000 }, { name: "B", size: 1 }]);
  assert.deepEqual(tiny.map((l) => [l.name, l.percent]), [["A", 100]]);
  assert.deepEqual(bucketLanguages([]), []);
  for (const l of r) assert.match(l.color, /^#[0-9a-f]{6}$/);
});

test("isGithubSummaryTooEmpty", () => {
  assert.ok(isGithubSummaryTooEmpty({ totalContributions: 4, topRepos: [] }));
  assert.ok(!isGithubSummaryTooEmpty({ totalContributions: 5, topRepos: [] }));
  assert.ok(!isGithubSummaryTooEmpty({ totalContributions: 0, topRepos: [{}] }));
});

test("githubYears: current first, down to creation year", () => {
  assert.deepEqual(githubYears(2023, 2026), [2026, 2025, 2024, 2023]);
  assert.deepEqual(githubYears(2026, 2026), [2026]);
  assert.deepEqual(githubYears(2030, 2026), [2026]); // кривая дата создания
});

test("resolveGithubYear", () => {
  assert.equal(resolveGithubYear(null, 2023, 2026), 2026);
  assert.equal(resolveGithubYear("", 2023, 2026), 2026);
  assert.equal(resolveGithubYear("2024", 2023, 2026), 2024);
  assert.equal(resolveGithubYear("2023", 2023, 2026), 2023);
  assert.equal(resolveGithubYear("2022", 2023, 2026), null);
  assert.equal(resolveGithubYear("2027", 2023, 2026), null);
  assert.equal(resolveGithubYear("abc", 2023, 2026), null);
  assert.equal(resolveGithubYear("2024.5", 2023, 2026), null);
  assert.equal(resolveGithubYear("20245", 2023, 2026), null);
});

test("githubYearRange", () => {
  const now = new Date("2026-10-18T12:34:56.789Z");
  assert.deepEqual(githubYearRange(2025, now), {
    from: "2025-01-01T00:00:00Z", to: "2025-12-31T23:59:59Z", fromDate: "2025-01-01", toDate: "2025-12-31", isCurrent: false,
  });
  const cur = githubYearRange(2026, now);
  assert.equal(cur.to, "2026-10-18T12:34:56Z");
  assert.equal(cur.toDate, "2026-10-18");
  assert.ok(cur.isCurrent);
});

test("parseContributionsHtml: total with explicit year", () => {
  const html = `<h2>321 contributions in 2025</h2>${td(0, "2025-01-05", 1)}${tip(0, "1 contribution on January 5th.")}`;
  assert.equal(parseContributionsHtml(html).totalContributions, 321);
});
