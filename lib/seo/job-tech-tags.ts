// lib/seo/job-tech-tags.ts
//
// 2026-09-18. Зачем это вообще существует.
//
// В Search Console по нашему сайту: 499 страниц проиндексировано, 1849
// «обнаружена, но не проиндексирована» и 118 «просканирована, но НЕ
// проиндексирована». Последняя строка -- это приговор содержимому:
// Google пришёл, прочитал и решил не брать. Ровно то, что он делает с
// копией чужого текста, а наши вакансии перенесены с DOU слово в слово.
//
// Лечится не разметкой (она уже стоит, см. lib/seo/jsonld.ts), а
// собственным содержимым, которого на источнике нет. Здесь -- первая
// его часть: технологии, вытащенные из текста вакансии. Это и человеку
// польза (видно стек, не читая простыню), и странице -- свои слова,
// которых нет в исходнике, и заодно попадание в запросы вида
// «python вакансии».
//
// Почему словарь, а не модель. Список технологий меняется медленно,
// работает мгновенно, ничего не стоит и не врёт. Модель на 3000
// страниц -- это деньги, задержка сборки и риск выдумать стек, которого
// в вакансии нет.

/**
 * Каноническое имя -> как оно может быть написано в тексте.
 *
 * Правила: пишем варианты в нижнем регистре; сравнение идёт по ГРАНИЦАМ
 * СЛОВА, поэтому «Go» не поймает «going», а «C#» -- «C». Варианты с
 * точками и плюсами экранируются при сборке регулярного выражения.
 */
const TECH: Record<string, string[]> = {
  JavaScript: ["javascript", "js"],
  TypeScript: ["typescript", "ts"],
  React: ["react", "react.js", "reactjs"],
  "React Native": ["react native", "react-native"],
  "Next.js": ["next.js", "nextjs"],
  Angular: ["angular"],
  "Vue.js": ["vue", "vue.js", "vuejs"],
  "Node.js": ["node.js", "nodejs", "node"],
  Python: ["python"],
  Django: ["django"],
  FastAPI: ["fastapi"],
  Java: ["java"],
  Spring: ["spring", "spring boot"],
  Kotlin: ["kotlin"],
  Swift: ["swift"],
  "Objective-C": ["objective-c", "objective c"],
  Flutter: ["flutter"],
  Dart: ["dart"],
  PHP: ["php"],
  Laravel: ["laravel"],
  Symfony: ["symfony"],
  Ruby: ["ruby"],
  Rails: ["rails", "ruby on rails"],
  Go: ["golang", "go"],
  Rust: ["rust"],
  "C#": ["c#", "csharp"],
  ".NET": [".net", "dotnet", "asp.net"],
  "C++": ["c++", "cpp"],
  Scala: ["scala"],
  Elixir: ["elixir"],
  SQL: ["sql"],
  PostgreSQL: ["postgresql", "postgres"],
  MySQL: ["mysql"],
  MongoDB: ["mongodb", "mongo"],
  Redis: ["redis"],
  Elasticsearch: ["elasticsearch", "elastic search"],
  Kafka: ["kafka"],
  RabbitMQ: ["rabbitmq"],
  GraphQL: ["graphql"],
  REST: ["rest api", "restful"],
  AWS: ["aws", "amazon web services"],
  GCP: ["gcp", "google cloud"],
  Azure: ["azure"],
  Docker: ["docker"],
  Kubernetes: ["kubernetes", "k8s"],
  Terraform: ["terraform"],
  Ansible: ["ansible"],
  Linux: ["linux"],
  "CI/CD": ["ci/cd", "cicd"],
  Git: ["git"],
  Jenkins: ["jenkins"],
  Figma: ["figma"],
  Unity: ["unity"],
  "Unreal Engine": ["unreal engine", "unreal"],
  Salesforce: ["salesforce"],
  SAP: ["sap"],
  "1C": ["1c", "1с"],
  Jira: ["jira"],
  Selenium: ["selenium"],
  Cypress: ["cypress"],
  Playwright: ["playwright"],
  Appium: ["appium"],
  "Machine Learning": ["machine learning", "ml", "машинне навчання", "машинное обучение"],
  "Data Science": ["data science"],
  PyTorch: ["pytorch"],
  TensorFlow: ["tensorflow"],
  Pandas: ["pandas"],
  Spark: ["spark", "apache spark"],
  Airflow: ["airflow"],
  Tableau: ["tableau"],
  "Power BI": ["power bi", "powerbi"],
  Excel: ["excel"],
  SEO: ["seo"],
  PPC: ["ppc"],
  "Google Ads": ["google ads", "google adwords"],
  "Meta Ads": ["facebook ads", "meta ads"],
  Photoshop: ["photoshop"],
  Illustrator: ["illustrator"],
  Blender: ["blender"],
};

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Границы слова вручную, а не \b.
 *
 * \b в JavaScript считает границей любое место между «буквой» и
 * «небуквой», а буквами для него являются только латиница, цифры и «_».
 * В украинском и русском тексте это ломается, и «Go» находится внутри
 * «Google», а «ML» -- внутри «HTML». Поэтому слева и справа мы требуем
 * либо край строки, либо символ, который не может быть частью названия:
 * пробел, запятая, скобка, слэш, дефис и прочая пунктуация.
 */
const BOUNDARY = "[^a-zа-яіїєґ0-9+#._-]";

function matcherFor(variant: string): RegExp {
  const body = escapeForRegex(variant);
  return new RegExp(`(^|${BOUNDARY})${body}($|${BOUNDARY})`, "iu");
}

// Регулярные выражения собираются один раз на процесс, а не на каждую
// страницу: словарь статичен, а страниц тысячи.
const MATCHERS: Array<{ name: string; patterns: RegExp[] }> = Object.entries(TECH).map(
  ([name, variants]) => ({ name, patterns: variants.map(matcherFor) }),
);

/** Сколько ярлыков показываем максимум -- дальше это уже не помощь, а шум. */
const MAX_TAGS = 12;

/**
 * Технологии, упомянутые в заголовке и тексте вакансии.
 *
 * Порядок -- как в словаре (языки, потом фреймворки, базы, облака), а не
 * как в тексте: так одинаковые вакансии выглядят одинаково.
 */
export function extractTechTags(title: string, content: string): string[] {
  const haystack = `${title}\n${content}`;
  if (!haystack.trim()) return [];

  const found: string[] = [];
  for (const { name, patterns } of MATCHERS) {
    if (patterns.some((pattern) => pattern.test(haystack))) {
      found.push(name);
      if (found.length >= MAX_TAGS) break;
    }
  }
  return found;
}
