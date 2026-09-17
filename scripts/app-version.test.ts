// Прогон сравнения версий и решения «что показывать».
//   node --experimental-strip-types scripts/app-version.test.ts
import { compareVersions, updateVerdict } from "../lib/app-version.ts";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failed += 1;
    console.error(`FAIL  ${name}\n  ожидалось: ${e}\n  получено:  ${a}`);
  } else {
    console.log(`ok    ${name}`);
  }
}

check("равные", compareVersions("1.2.3", "1.2.3"), 0);
check("старше по минорной", compareVersions("1.2.0", "1.3.0"), -1);
check("новее по мажорной", compareVersions("2.0.0", "1.9.9"), 1);
check("разной длины", compareVersions("1.2", "1.2.0"), 0);
check("номер сборки не считается", compareVersions("2.0.1+42", "2.0.1"), 0);
check("бета не считается", compareVersions("2.0.1-beta", "2.0.1"), 0);
check("двузначные части", compareVersions("1.10.0", "1.9.0"), 1);

const rule = { minimum: "1.4.0", recommended: "2.0.1", note: "", storeUrl: "" };
check("ниже минимальной -- блок", updateVerdict("1.3.9", rule), "blocked");
check("ровно минимальная -- полоска", updateVerdict("1.4.0", rule), "recommended");
check("между -- полоска", updateVerdict("1.9.0", rule), "recommended");
check("ровно рекомендованная -- тихо", updateVerdict("2.0.1", rule), "ok");
check("новее рекомендованной -- тихо", updateVerdict("2.1.0", rule), "ok");
check("сборка новее -- тихо", updateVerdict("2.0.1+99", rule), "ok");

console.log(failed === 0 ? "\nВсе проверки прошли." : `\nПровалено проверок: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
