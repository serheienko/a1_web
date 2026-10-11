// Проверка расчётов блока «Ринок на A1» (lib/a1/job-stats.ts) на выдуманной базе.
//   A1_API_BASE=https://example.com A1_API_KEY=x node --experimental-strip-types \
//     --import ./scripts/alias-register.mjs scripts/job-stats.test.ts
//
// Переменные окружения нужны не тесту, а модулю настроек, который
// подтягивается по цепочке импортов; сети здесь нет -- база выдуманная.
import { buildJobStats } from "../lib/a1/job-stats.ts";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) { failed++; console.error(`FAIL  ${name}\n  ожидалось: ${e}\n  получено:  ${a}`); }
  else console.log(`ok    ${name}`);
}

const now = Date.now();
function post(o: Partial<any> & { id: string; title: string }): any {
  return {
    id: o.id, kind: "hiring", title: o.title, contentText: o.contentText ?? "",
    tags: o.tags ?? [], images: [], applyQuestions: [],
    author: o.author ?? { userId: "u1", name: "Acme", username: "acme", avatarUrl: null, isAnonymous: false, unclaimed: false, external: true },
    location: o.location ?? { display: "Lagos, Nigeria", country: "NG", city: "Lagos" },
    isRemote: false, salary: o.salary ?? null,
    publishedAt: new Date(now - (o.ageDays ?? 1) * 86400000),
    sourcePublishedAt: new Date(now - (o.ageDays ?? 1) * 86400000),
    externalUrl: null, links: [],
  };
}

const sal = (min: number, max: number) => ({ min, max, currency: "USD", period: "YEAR" });

// 20 вакансий Data Engineer в Нигерии, 16 с вилкой; 5 той же роли в Польше.
const all: any[] = [];
for (let i = 0; i < 20; i++) {
  all.push(post({
    id: `ng${i}`, title: "Senior Data Engineer",
    contentText: "We need Python, SQL and AWS. Also Kubernetes.",
    salary: i < 16 ? sal(60000 + i * 1000, 80000 + i * 1000) : null,
    ageDays: i < 4 ? 2 : 40,
  }));
}
for (let i = 0; i < 5; i++) {
  all.push(post({ id: `pl${i}`, title: "Data Engineer", contentText: "Python, Spark",
    location: { display: "Warsaw, Poland", country: "PL", city: "Warsaw" },
    author: { userId: "u2", name: "Other", username: "other", avatarUrl: null, isAnonymous: false, unclaimed: false, external: true } }));
}

const target = all[0];
const s = buildJobStats(all, target)!;

check("роль распознана", s.role?.slug, "data");
check("страна", s.cc, "NG");
check("в стране", s.roleHere, 20);
check("в мире", s.roleWorld, 25);
check("свежих за неделю", s.fresh7d, 4);
check("вакансий в стране всего", s.countryTotal, 20);
check("вилка посчитана по стране", s.salary?.scope, "country");
check("вилка: сколько вакансий", s.salary?.n, 16);
check("медиана в разумных границах", (s.salary?.median ?? 0) > 70000 && (s.salary?.median ?? 0) < 90000, true);
check("соседние технологии есть", s.tech.length > 0, true);
check("компания: 20 вакансий", s.company?.count, 20);
check("компания: одна страна", s.company?.countries, 1);

// Мало данных -- блока нет.
const tiny = [post({ id: "x1", title: "Rare Role Nobody Has", contentText: "" })];
check("на пустой базе блока нет", buildJobStats(tiny, tiny[0]), null);

// Вилок мало -- зарплату не показываем.
const noSalary = Array.from({ length: 12 }, (_, i) => post({ id: `n${i}`, title: "QA Engineer", contentText: "Selenium" }));
const q = buildJobStats(noSalary, noSalary[0]);
check("без выборки нет зарплаты", q?.salary ?? null, null);

console.log(failed === 0 ? "\nВсе проверки прошли" : `\nпровалено: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
