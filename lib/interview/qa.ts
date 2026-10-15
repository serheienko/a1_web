import type { InterviewContent } from "./types";

const SRC = {
  syllabus: "https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf",
  gVerification: "https://glossary.istqb.org/en_US/term/verification",
  gSmoke: "https://glossary.istqb.org/en_US/term/smoke-testing",
  gConfirmation: "https://glossary.istqb.org/en_US/term/confirmation-testing",
  gSeverity: "https://glossary.istqb.org/en_US/term/severity",
  gBva: "https://glossary.istqb.org/en_US/term/boundary-value-analysis",
  gDecision: "https://glossary.istqb.org/en_US/term/decision-table-testing",
  gChecklist: "https://glossary.istqb.org/en_US/term/checklist-based-testing",
  mdnIdempotent: "https://developer.mozilla.org/en-US/docs/Glossary/Idempotent",
  mdn403: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403",
  mdnPatch: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/PATCH",
  postman: "https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/",
  pgJoins: "https://www.postgresql.org/docs/current/queries-table-expressions.html",
  pgAgg: "https://www.postgresql.org/docs/current/tutorial-agg.html",
  fowlerPyramid: "https://martinfowler.com/articles/practical-test-pyramid.html",
  fowlerFlaky: "https://martinfowler.com/articles/nonDeterminism.html",
  pwActionability: "https://playwright.dev/docs/actionability",
  pwLocators: "https://playwright.dev/docs/locators",
  pwPom: "https://playwright.dev/docs/pom",
  pwCi: "https://playwright.dev/docs/ci",
  gitBranching: "https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging",
  androidConfig: "https://developer.android.com/guide/topics/resources/runtime-changes",
  androidLifecycle: "https://developer.android.com/guide/components/activities/activity-lifecycle",
  k6Types: "https://grafana.com/docs/k6/latest/testing-guides/test-types/",
};

const CODE_DUPLICATES =
  "SELECT email, COUNT(*) AS cnt\nFROM users\nGROUP BY email\nHAVING COUNT(*) > 1;";

const CODE_LEFT_JOIN =
  "-- users without any orders\nSELECT u.id, u.email\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nWHERE o.id IS NULL;";

const CODE_GIT =
  "git switch -c feature/login-tests\ngit add .\ngit commit -m \"Add login tests\"\ngit pull --rebase origin main\ngit push -u origin feature/login-tests";

const CODE_CI =
  "# GitHub Actions step list\n- run: npm ci\n- run: npx playwright install --with-deps\n- run: npx playwright test\n# playwright.config: retries: process.env.CI ? 2 : 0";

export const QA_INTERVIEW: InterviewContent = {
  uk: {
    title: "Питання на співбесіді QA: 26 питань з відповідями",
    description:
      "Питання на співбесіді QA-інженера з відповідями: основи тестування, тест-дизайн, API, SQL, автоматизація з Playwright, CI/CD, мобільне тестування, навантаження.",
    h1: "Питання на співбесіді QA з відповідями",
    lead:
      "Ми відібрали питання за тим, що роботодавці справді вимагають в актуальних QA-вакансіях: API, автоматизація, ручне та регресійне тестування, SQL, CI/CD. Кожна відповідь звірена з офіційним джерелом — силабусом і глосарієм ISTQB, MDN, документацією PostgreSQL, Playwright, Git, Android і k6.",
    categories: [
      {
        id: "fundamentals",
        title: "Основи тестування",
        items: [
          {
            id: "verification-vs-validation",
            q: "Чим верифікація відрізняється від валідації?",
            wants: "Чи розуміє кандидат, що тестування перевіряє не лише відповідність вимогам, а й те, чи продукт вирішує задачу користувача.",
            answer:
              "Верифікація — перевірка, що продукт відповідає специфікації: «чи правильно ми робимо продукт». Валідація — перевірка, що продукт відповідає потребам користувачів і стейкхолдерів: «чи той продукт ми робимо». Можна ідеально реалізувати вимогу, яку користувач не розуміє, — верифікація пройде, валідація ні. Тому, крім перевірки за вимогами, важливі приймальне тестування, демо і зворотний зв'язок від користувачів.",
            source: { title: "ISTQB Glossary — verification", url: SRC.gVerification },
          },
          {
            id: "test-levels-types",
            q: "Які є рівні тестування і чим вони відрізняються від типів тестування?",
            wants: "Перевіряють базову теорію ISTQB і вміння не плутати «де тестуємо» з «що саме перевіряємо».",
            answer:
              "Рівні тестування за ISTQB: компонентне (модульне, unit), інтеграційне тестування компонентів, системне, системне інтеграційне та приймальне. Рівень відповідає на питання, який об'єкт тестуємо і на якому етапі. Тип тестування — це те, яку характеристику перевіряємо: функціональне, нефункціональне (продуктивність, безпека, зручність), тестування чорної та білої скриньки. Будь-який тип можна застосувати на будь-якому рівні: наприклад, продуктивність можна міряти і для окремого сервісу, і для всієї системи.",
            source: { title: "ISTQB CTFL Syllabus v4.0.1, розділ 2.2", url: SRC.syllabus },
          },
          {
            id: "smoke-sanity-regression",
            q: "Чим відрізняються smoke, sanity і регресійне тестування?",
            wants: "Чи вміє кандидат обирати обсяг перевірок під ситуацію, а не ганяти повний регрес на кожен білд.",
            answer:
              "Smoke-тестування — швидка перевірка критичних функцій нового білда, щоб вирішити, чи готовий він до подальшого тестування (запуск, логін, ключовий сценарій). Sanity — вузька цільова перевірка конкретної зміни або фіксу і того, що поруч із нею; у глосарії ISTQB окремого терміна немає, це практичний термін. Регресійне тестування — ширша перевірка незмінених частин системи, щоб переконатися, що зміни нічого не зламали. Smoke і регресію найчастіше автоматизують першими, бо вони повторюються на кожному релізі.",
            source: { title: "ISTQB Glossary — smoke testing", url: SRC.gSmoke },
          },
          {
            id: "retest-vs-regression",
            q: "Чим ретест відрізняється від регресійного тестування?",
            wants: "Класичне питання на розуміння, що саме перевіряється після фіксу бага.",
            answer:
              "Ретест (confirmation testing) перевіряє, що конкретний виправлений дефект більше не відтворюється: проходимо ті самі кроки з баг-репорту. Регресійне тестування перевіряє, що виправлення або нова функція не зламали те, що раніше працювало. Після фіксу зазвичай потрібні обидва: спершу ретест, потім регрес у зоні впливу зміни. Ретест майже завжди ручний і точковий, регрес — хороший кандидат для автоматизації.",
            source: { title: "ISTQB Glossary — confirmation testing", url: SRC.gConfirmation },
          },
          {
            id: "severity-vs-priority",
            q: "Чим severity відрізняється від priority? Наведіть приклади.",
            wants: "Чи розуміє кандидат, що серйозність бага і черговість його виправлення — різні речі і їх визначають різні люди.",
            answer:
              "Severity (серйозність) — ступінь впливу дефекту на систему чи користувача; її зазвичай ставить QA. Priority (пріоритет) — наскільки терміново треба виправити; його визначає продукт або тімлід з урахуванням бізнесу. Помилка в назві компанії на головній сторінці — низька серйозність, але високий пріоритет. Падіння звіту, який адміністратор запускає раз на рік, — висока серйозність, але пріоритет може бути нижчим.",
            source: { title: "ISTQB Glossary — severity", url: SRC.gSeverity },
          },
        ],
      },
      {
        id: "test-design",
        title: "Тест-дизайн і документація",
        items: [
          {
            id: "equivalence-boundary",
            q: "Як застосувати класи еквівалентності та граничні значення до поля «вік від 18 до 60»?",
            wants: "Чи вміє кандидат скоротити кількість тестів без втрати покриття, а не перебирати значення навмання.",
            answer:
              "Класи еквівалентності: менше 18 (невалідний), 18–60 (валідний), більше 60 (невалідний), плюс нечислові та порожні значення. З кожного класу достатньо одного представника, бо система має обробляти їх однаково. Граничні значення беремо на межах класів, де розробники найчастіше помиляються: при двозначному аналізі це 17, 18, 60, 61, при тризначному — ще 19 і 59. Окремо варто перевірити 0, від'ємні й дробові числа та дуже довгий ввід.",
            source: { title: "ISTQB Glossary — boundary value analysis", url: SRC.gBva },
          },
          {
            id: "decision-table",
            q: "Що таке таблиця рішень і коли вона корисна?",
            wants: "Перевіряють, чи кандидат вміє системно покривати бізнес-логіку з кількома умовами.",
            answer:
              "Таблиця рішень описує, яку дію виконує система для кожної комбінації умов. Наприклад, знижка залежить від трьох умов: користувач зареєстрований, є промокод, сума замовлення понад 1000 — це 2³ = 8 правил, і для кожного фіксуємо очікуваний результат. Техніка корисна, коли логіку легко пропустити в тексті вимог: вона одразу показує пропущені або суперечливі комбінації. Неможливі комбінації з таблиці прибирають, а схожі правила можна об'єднати.",
            source: { title: "ISTQB Glossary — decision table testing", url: SRC.gDecision },
          },
          {
            id: "test-case-vs-checklist",
            q: "Чим тест-кейс відрізняється від чек-листа і коли що використовувати?",
            wants: "Чи розуміє кандидат ціну документації і вміє обирати рівень деталізації під проєкт.",
            answer:
              "Тест-кейс містить ідентифікатор, передумови, кроки, тестові дані та очікуваний результат, тож його однаково виконає будь-хто з команди. Чек-лист — перелік того, що треба перевірити, без детальних кроків; він швидше пишеться і легше підтримується, але сильніше залежить від досвіду тестувальника. Тест-кейси доречні для критичних сценаріїв, регресу, регульованих доменів і як основа для автотестів. Чек-листи зручні для smoke, дослідницького тестування і швидко змінюваних фіч.",
            source: { title: "ISTQB Glossary — checklist-based testing", url: SRC.gChecklist },
          },
          {
            id: "good-bug-report",
            q: "Що має бути в хорошому баг-репорті?",
            wants: "Чи напише кандидат баг-репорт, який розробник зможе відтворити без додаткових питань.",
            answer:
              "Короткий і конкретний заголовок (що, де, за якої умови), оточення (версія білда, ОС, браузер або пристрій), передумови і точні кроки відтворення. Далі — очікуваний і фактичний результат, severity і priority, вкладення: скриншот, відео, логи, HAR-файл або запит і відповідь API. Один баг — один репорт; варто вказати, чи відтворюється стабільно, і дати посилання на тест-кейс або вимогу. Після фіксу баг проходить ретест і лише тоді закривається.",
            source: { title: "ISTQB CTFL Syllabus v4.0.1, розділ 5.5", url: SRC.syllabus },
            tech: "Jira",
          },
        ],
      },
      {
        id: "api",
        title: "Тестування API",
        items: [
          {
            id: "http-idempotency",
            q: "Які HTTP-методи безпечні, а які ідемпотентні?",
            wants: "Перевіряють розуміння HTTP, без якого неможливо осмислено тестувати REST API і повторні запити.",
            answer:
              "Безпечні методи не змінюють стан сервера: GET, HEAD, OPTIONS, TRACE. Ідемпотентні — ті, повторний виклик яких дає той самий стан сервера, що й один: усі безпечні плюс PUT і DELETE. POST не ідемпотентний: два однакові запити можуть створити два замовлення. PATCH за стандартом теж не гарантує ідемпотентності. Для тестувальника це означає перевіряти повторні запити, подвійні кліки й ретраї клієнта саме для POST.",
            source: { title: "MDN — Idempotent", url: SRC.mdnIdempotent },
            tech: "REST",
          },
          {
            id: "401-vs-403",
            q: "Чим відрізняються коди 401 і 403?",
            wants: "Чи розрізняє кандидат автентифікацію та авторизацію і чи перевіряє права доступу в API.",
            answer:
              "401 Unauthorized означає, що клієнт не автентифікований: токена немає, він недійсний або прострочений; відповідь має містити заголовок WWW-Authenticate. 403 Forbidden означає, що сервер зрозумів, хто це, але доступ заборонено — повторний вхід не допоможе. Наприклад, звичайний користувач викликає адмінський ендпоінт і отримує 403. Іноді замість 403 навмисно повертають 404, щоб не розкривати існування ресурсу; це варто уточнити у вимогах.",
            source: { title: "MDN — 403 Forbidden", url: SRC.mdn403 },
            tech: "REST",
          },
          {
            id: "put-vs-patch",
            q: "Чим PUT відрізняється від PATCH?",
            wants: "Чи розуміє кандидат семантику методів і які негативні сценарії з цього випливають.",
            answer:
              "PUT замінює ресурс повністю тим представленням, яке передали в тілі запиту, і він ідемпотентний. PATCH застосовує часткову зміну: оновлюються лише передані поля. Звідси перевірки: що відбувається з полями, які не передали в PUT (обнуляються чи ні — за контрактом), чи не зачіпає PATCH інші поля, як обробляються невалідні та зайві поля. Також перевіряємо коди відповіді: 200 або 204 при успіху, 400 або 422 при невалідних даних, 404 для неіснуючого ресурсу.",
            source: { title: "MDN — PATCH", url: SRC.mdnPatch },
            tech: "REST",
          },
          {
            id: "api-what-to-check",
            q: "Що ви перевіряєте, коли тестуєте ендпоінт у Postman або за Swagger?",
            wants: "Чи має кандидат системний підхід до API-тестів, а не лише перевірку «повернулося 200».",
            answer:
              "Беру контракт зі Swagger/OpenAPI і перевіряю: код статусу, структуру і типи полів відповіді, обов'язкові поля, заголовки (Content-Type, кешування). Далі негативні сценарії: невалідні та граничні значення, відсутні поля, неправильні типи, запити без токена і з чужим токеном (401/403). Перевіряю побічні ефекти: після POST ресурс справді з'являється в GET або в базі. У Postman оформлюю це як тести в скриптах колекції, щоб їх можна було запускати в CI через Newman.",
            code:
              "pm.test(\"status is 201\", () => pm.response.to.have.status(201));\npm.test(\"has id\", () => {\n  const body = pm.response.json();\n  pm.expect(body.id).to.be.a(\"number\");\n});",
            source: { title: "Postman Learning Center — Write test scripts", url: SRC.postman },
            tech: "REST",
          },
        ],
      },
      {
        id: "sql",
        title: "SQL",
        items: [
          {
            id: "sql-joins",
            q: "Які бувають типи JOIN і чим відрізняються INNER і LEFT JOIN?",
            wants: "Чи зможе кандидат самостійно перевірити дані в базі після дії в інтерфейсі або API.",
            answer:
              "INNER JOIN повертає лише рядки, для яких є збіг в обох таблицях. LEFT JOIN повертає всі рядки лівої таблиці, а там, де збігу немає, колонки правої таблиці заповнюються NULL; RIGHT JOIN — дзеркально. FULL JOIN повертає всі рядки з обох таблиць, CROSS JOIN — усі можливі комбінації. Для QA LEFT JOIN з умовою IS NULL — зручний спосіб знайти «осиротілі» або пропущені записи.",
            code: CODE_LEFT_JOIN,
            source: { title: "PostgreSQL docs — Table Expressions (joined tables)", url: SRC.pgJoins },
            tech: "SQL",
          },
          {
            id: "where-vs-having",
            q: "Чим WHERE відрізняється від HAVING?",
            wants: "Перевіряють розуміння порядку виконання запиту і агрегатних функцій.",
            answer:
              "WHERE фільтрує рядки до групування, тому в ньому не можна використовувати агрегатні функції. HAVING фільтрує вже сформовані групи після GROUP BY, і саме в ньому пишуть умови на кшталт COUNT(*) > 1 або SUM(amount) > 1000. Якщо умову можна поставити в WHERE, краще так і зробити: менше рядків потрапить у групування. Типовий запит: WHERE відбирає замовлення за період, GROUP BY групує за користувачем, HAVING залишає тих, хто має понад 5 замовлень.",
            source: { title: "PostgreSQL docs — Aggregate Functions", url: SRC.pgAgg },
            tech: "SQL",
          },
          {
            id: "find-duplicates",
            q: "Як знайти дублікати в таблиці?",
            wants: "Практичне завдання: кандидат має написати запит з GROUP BY і HAVING без підказок.",
            answer:
              "Групуємо за полем, яке має бути унікальним, і залишаємо групи, де більше одного рядка. Так можна перевірити, що система не створює двох користувачів з одним email після подвійного кліку на «Зареєструватися». Щоб побачити самі рядки-дублікати, результат можна приєднати назад до таблиці або використати віконну функцію COUNT(*) OVER (PARTITION BY email).",
            code: CODE_DUPLICATES,
            source: { title: "PostgreSQL docs — Aggregate Functions", url: SRC.pgAgg },
            tech: "SQL",
          },
        ],
      },
      {
        id: "automation",
        title: "Автоматизація тестування",
        items: [
          {
            id: "test-pyramid",
            q: "Що таке піраміда тестування?",
            wants: "Чи розуміє кандидат, як розподіляти автотести за рівнями, щоб набір був швидким і стабільним.",
            answer:
              "Піраміда тестування — модель, за якою внизу найбільше швидких і дешевих модульних тестів, посередині — менше інтеграційних і API-тестів, а нагорі — небагато наскрізних UI-тестів. Чим вище рівень, тим тести повільніші, дорожчі в підтримці і частіше нестабільні. Тому перевірку логіки варто опускати якомога нижче, а UI-тестами покривати лише ключові користувацькі сценарії. Протилежна ситуація, коли майже все перевіряється через UI, — «ріжок морозива», антипатерн.",
            source: { title: "Martin Fowler — The Practical Test Pyramid", url: SRC.fowlerPyramid },
          },
          {
            id: "what-to-automate-first",
            q: "Що варто автоматизувати в першу чергу, а що ні?",
            wants: "Чи бачить кандидат автоматизацію як інвестицію з окупністю, а не як «автоматизувати все».",
            answer:
              "Насамперед — стабільні сценарії, які повторюються на кожному релізі: smoke і регрес критичних шляхів (логін, оплата, реєстрація), API-тести, перевірки з великою кількістю наборів даних. Не варто автоматизувати функціональність, що часто змінюється, одноразові перевірки, юзабіліті та дослідницьке тестування. Автотести мають вартість написання й підтримки, тож оцінюємо, скільки разів тест буде запущено і скільки ручного часу він заощадить.",
            source: { title: "ISTQB CTFL Syllabus v4.0.1, розділ 6.2", url: SRC.syllabus },
          },
          {
            id: "flaky-tests",
            q: "Що таке flaky-тести і як з ними боротися?",
            wants: "Чи має кандидат реальний досвід підтримки автотестів і чи шукає першопричину, а не просто вмикає ретраї.",
            answer:
              "Flaky-тест — нестабільний тест, що на тому самому коді то проходить, то падає. Типові причини: неправильне очікування асинхронних подій (sleep замість очікування стану), залежність тестів один від одного і спільні тестові дані, нестабільні зовнішні сервіси, час і часові пояси. Нестабільний тест варто ізолювати в карантин, щоб він не знецінював увесь прогін, а потім виправити причину. Ретраї допомагають діагностиці, але не повинні маскувати проблему.",
            source: { title: "Martin Fowler — Eradicating Non-Determinism in Tests", url: SRC.fowlerFlaky },
          },
          {
            id: "playwright-waiting-locators",
            q: "Як Playwright чекає на елементи і які локатори краще використовувати?",
            wants: "Перевіряють практичне знання Playwright: чому не потрібні явні sleep і як писати стійкі локатори.",
            answer:
              "Перед дією Playwright автоматично перевіряє actionability: елемент видимий, стабільний (не анімується), отримує події (нічим не перекритий) і доступний (enabled); для fill — ще й редагований. Веб-перевірки на кшталт expect(locator).toBeVisible() самі повторюються, доки умова не виконається або не мине таймаут. Тому waitForTimeout майже ніколи не потрібен. Документація радить пріоритезувати локатори, видимі користувачу: getByRole, getByLabel, getByText, або getByTestId як явний контракт; CSS і XPath ламаються при зміні верстки.",
            code:
              "await page.getByRole(\"button\", { name: \"Увійти\" }).click();\nawait expect(page.getByText(\"Вітаємо\")).toBeVisible();",
            source: { title: "Playwright docs — Auto-waiting (Actionability)", url: SRC.pwActionability },
            tech: "Playwright",
          },
          {
            id: "page-object",
            q: "Що таке Page Object і навіщо він потрібен?",
            wants: "Чи вміє кандидат структурувати код автотестів так, щоб його можна було підтримувати.",
            answer:
              "Page Object — патерн, у якому локатори та дії конкретної сторінки або компонента винесені в окремий клас, а тести викликають його методи на кшталт loginPage.login(email, password). Коли змінюється верстка, правимо один клас, а не десятки тестів. Тести стають читабельнішими і ближчими до бізнес-сценаріїв. Перевірки (assertions) зазвичай залишають у тестах, а не в Page Object, щоб клас не знав, що саме перевіряється.",
            code:
              "class LoginPage {\n  constructor(page) { this.page = page; }\n  async login(email, password) {\n    await this.page.getByLabel(\"Email\").fill(email);\n    await this.page.getByLabel(\"Пароль\").fill(password);\n    await this.page.getByRole(\"button\", { name: \"Увійти\" }).click();\n  }\n}",
            source: { title: "Playwright docs — Page object models", url: SRC.pwPom },
            tech: "Playwright",
          },
        ],
      },
      {
        id: "ci-git",
        title: "CI/CD і Git",
        items: [
          {
            id: "tests-in-pipeline",
            q: "Як запускати автотести в CI/CD-пайплайні?",
            wants: "Чи розуміє кандидат, що автотести мають цінність лише тоді, коли запускаються автоматично на кожну зміну.",
            answer:
              "Тести запускаються автоматично на кожен pull request або коміт у main: пайплайн встановлює залежності, браузери, піднімає оточення і запускає набір. Швидкі тести (unit, API, smoke) — на кожен PR, повний регрес — за розкладом або перед релізом. У CI корисно вмикати ретраї й trace на першому ретраї, зберігати звіт, скриншоти і відео як артефакти. Документація Playwright рекомендує в CI ставити workers: 1 для стабільності або ділити набір на шарди.",
            code: CODE_CI,
            source: { title: "Playwright docs — Continuous Integration", url: SRC.pwCi },
            tech: "CI/CD",
          },
          {
            id: "git-basic-flow",
            q: "Опишіть базовий процес роботи з Git у команді.",
            wants: "Чи зможе кандидат самостійно працювати з репозиторієм автотестів без допомоги розробників.",
            answer:
              "Від актуальної main створюю окрему гілку під задачу, роблю невеликі коміти зі зрозумілими повідомленнями. Перед відправкою підтягую свіжі зміни з main (merge або rebase) і розв'язую конфлікти локально. Пушу гілку і відкриваю pull request, де проходять CI-перевірки та код-рев'ю; після схвалення гілку зливають у main. Напряму в main зазвичай не пушать, а гілку після злиття видаляють.",
            code: CODE_GIT,
            source: { title: "Pro Git — Basic Branching and Merging", url: SRC.gitBranching },
            tech: "Git",
          },
        ],
      },
      {
        id: "mobile-performance",
        title: "Мобільне тестування і продуктивність",
        items: [
          {
            id: "mobile-specific-checks",
            q: "Що треба перевіряти в мобільному застосунку, чого немає у вебі?",
            wants: "Чи знає кандидат специфіку мобільних платформ, а не переносить веб-чекліст один в один.",
            answer:
              "Переривання: дзвінок, push, SMS, перехід в інший застосунок і повернення. Зміни конфігурації: поворот екрана, зміна мови, теми, розміру шрифту — на Android вони за замовчуванням перестворюють Activity, і дані на екрані можуть зникнути. Мережа: офлайн, повільний інтернет, перемикання Wi-Fi/мобільна мережа. Також дозволи (відмова в доступі до камери чи геолокації), різні версії ОС і розміри екранів, оновлення з попередньої версії застосунку, deep links і поведінка при низькому заряді чи нестачі пам'яті.",
            source: { title: "Android Developers — Handle configuration changes", url: SRC.androidConfig },
          },
          {
            id: "mobile-background-process-death",
            q: "Як перевірити поведінку застосунку після згортання і повернення?",
            wants: "Чи знає кандидат, що система може вбити процес у фоні, і чи вміє це відтворити.",
            answer:
              "Коли застосунок у фоні, Android може завершити його процес, щоб звільнити пам'ять; після повернення Activity створюється заново, і стан має відновитися зі збереженого. Перевіряю, що введені дані у формі, позиція скролу, відкритий екран і авторизація не губляться. Відтворити це можна опцією розробника «Don't keep activities» або обмеженням фонових процесів. Окремо перевіряю довгу паузу у фоні: чи коректно оновлюється прострочений токен.",
            source: { title: "Android Developers — The activity lifecycle", url: SRC.androidLifecycle },
          },
          {
            id: "load-stress-spike",
            q: "Чим навантажувальне тестування відрізняється від стрес-тестування і spike-тесту?",
            wants: "Чи розуміє кандидат цілі різних видів тестування продуктивності і які метрики дивитися.",
            answer:
              "Навантажувальне тестування перевіряє поведінку системи під очікуваним навантаженням — типовим і піковим. Стрес-тестування виходить за межі очікуваного, щоб знайти точку відмови і подивитися, як система деградує та відновлюється. Spike-тест — різкий короткий сплеск навантаження, наприклад старт розпродажу; soak-тест — тривале навантаження годинами, щоб знайти витоки пам'яті. Дивимося на час відповіді за перцентилями (p95, p99), пропускну здатність і частку помилок.",
            source: { title: "Grafana k6 docs — Load test types", url: SRC.k6Types },
          },
        ],
      },
    ],
  },
  en: {
    title: "QA Interview Questions: 26 Questions with Answers",
    description:
      "QA engineer interview questions with answers: testing fundamentals, test design, API and SQL, Playwright automation, CI/CD, mobile and performance testing.",
    h1: "QA interview questions and answers",
    lead:
      "We picked these questions based on what employers actually require in live QA job postings: API testing, automation, manual and regression testing, SQL and CI/CD. Every answer is checked against an official source — the ISTQB syllabus and glossary, MDN, and the PostgreSQL, Playwright, Git, Android and k6 docs.",
    categories: [
      {
        id: "fundamentals",
        title: "Testing fundamentals",
        items: [
          {
            id: "verification-vs-validation",
            q: "What is the difference between verification and validation?",
            wants: "Whether the candidate understands that testing checks not only conformance to requirements but also whether the product solves the user's problem.",
            answer:
              "Verification confirms that the product meets its specification: \"are we building the product right?\" Validation confirms that it meets the needs of users and stakeholders: \"are we building the right product?\" You can implement a requirement perfectly that users still can't make sense of — verification passes, validation fails. That's why acceptance testing, demos and user feedback matter alongside requirement-based testing.",
            source: { title: "ISTQB Glossary — verification", url: SRC.gVerification },
          },
          {
            id: "test-levels-types",
            q: "What are the test levels, and how do they differ from test types?",
            wants: "Basic ISTQB theory and the ability to separate \"where we test\" from \"what we check\".",
            answer:
              "ISTQB defines five test levels: component (unit) testing, component integration testing, system testing, system integration testing and acceptance testing. A level tells you which test object you're testing and at what stage. A test type tells you which quality characteristic you're checking: functional, non-functional (performance, security, usability), black-box or white-box. Any type can be applied at any level — performance, for example, can be measured for a single service or for the whole system.",
            source: { title: "ISTQB CTFL Syllabus v4.0.1, section 2.2", url: SRC.syllabus },
          },
          {
            id: "smoke-sanity-regression",
            q: "What is the difference between smoke, sanity and regression testing?",
            wants: "Whether the candidate can size the test effort to the situation instead of running a full regression on every build.",
            answer:
              "Smoke testing is a quick check of critical functions on a new build to decide whether it's ready for further testing (it starts, you can log in, the core flow works). Sanity testing is a narrow, targeted check of a specific change or fix and its immediate surroundings; ISTQB has no separate glossary term for it — it's an industry term. Regression testing is a broader check of unchanged areas to make sure the changes didn't break anything. Smoke and regression suites are usually the first to be automated because they run on every release.",
            source: { title: "ISTQB Glossary — smoke testing", url: SRC.gSmoke },
          },
          {
            id: "retest-vs-regression",
            q: "What is the difference between retesting and regression testing?",
            wants: "A classic check of whether the candidate knows what exactly gets tested after a bug fix.",
            answer:
              "Retesting (confirmation testing) checks that a specific fixed defect no longer reproduces — you repeat the steps from the bug report. Regression testing checks that the fix or a new feature didn't break anything that used to work. After a fix you usually need both: first the retest, then regression around the affected area. Retesting is almost always manual and targeted; regression is a strong candidate for automation.",
            source: { title: "ISTQB Glossary — confirmation testing", url: SRC.gConfirmation },
          },
          {
            id: "severity-vs-priority",
            q: "What is the difference between severity and priority? Give examples.",
            wants: "Whether the candidate understands that how bad a bug is and when it gets fixed are separate decisions, often made by different people.",
            answer:
              "Severity is the degree of impact a defect has on the system or the user; QA usually sets it. Priority is how urgently it needs fixing; the product owner or team lead decides, taking business needs into account. A typo in the company name on the home page is low severity but high priority. A crash in a report an admin runs once a year is high severity but may get a lower priority.",
            source: { title: "ISTQB Glossary — severity", url: SRC.gSeverity },
          },
        ],
      },
      {
        id: "test-design",
        title: "Test design and documentation",
        items: [
          {
            id: "equivalence-boundary",
            q: "How would you apply equivalence partitioning and boundary values to an \"age 18 to 60\" field?",
            wants: "Whether the candidate can cut the number of tests without losing coverage instead of picking values at random.",
            answer:
              "Partitions: below 18 (invalid), 18–60 (valid), above 60 (invalid), plus non-numeric and empty input. One representative per partition is enough, since the system should treat them all the same way. Boundary values sit at the edges of partitions, where developers make mistakes most often: with 2-value BVA that's 17, 18, 60 and 61; with 3-value BVA you add 19 and 59. It's also worth checking 0, negative and decimal numbers, and very long input.",
            source: { title: "ISTQB Glossary — boundary value analysis", url: SRC.gBva },
          },
          {
            id: "decision-table",
            q: "What is a decision table and when is it useful?",
            wants: "Whether the candidate can systematically cover business logic that depends on several conditions.",
            answer:
              "A decision table lists which action the system takes for each combination of conditions. Say a discount depends on three conditions — the user is registered, has a promo code, and the order is over 1000 — that's 2³ = 8 rules, each with its expected result. The technique pays off when logic is easy to miss in written requirements: it immediately exposes missing or contradictory combinations. Impossible combinations are removed, and rules with the same outcome can be merged.",
            source: { title: "ISTQB Glossary — decision table testing", url: SRC.gDecision },
          },
          {
            id: "test-case-vs-checklist",
            q: "What is the difference between a test case and a checklist, and when do you use each?",
            wants: "Whether the candidate understands the cost of documentation and can choose the right level of detail for a project.",
            answer:
              "A test case has an ID, preconditions, steps, test data and an expected result, so anyone on the team will execute it the same way. A checklist is a list of things to verify without detailed steps; it's faster to write and easier to maintain, but relies more on the tester's experience. Test cases fit critical flows, regression suites, regulated domains and serve as a basis for automation. Checklists work well for smoke tests, exploratory testing and features that change often.",
            source: { title: "ISTQB Glossary — checklist-based testing", url: SRC.gChecklist },
          },
          {
            id: "good-bug-report",
            q: "What makes a good bug report?",
            wants: "Whether the candidate writes bug reports a developer can reproduce without coming back with questions.",
            answer:
              "A short, specific title (what, where, under which condition), the environment (build version, OS, browser or device), preconditions and exact steps to reproduce. Then the expected and actual results, severity and priority, and attachments: a screenshot, video, logs, a HAR file or the API request and response. One bug per report; note whether it reproduces consistently and link the test case or requirement. Once fixed, the bug is retested and only then closed.",
            source: { title: "ISTQB CTFL Syllabus v4.0.1, section 5.5", url: SRC.syllabus },
            tech: "Jira",
          },
        ],
      },
      {
        id: "api",
        title: "API testing",
        items: [
          {
            id: "http-idempotency",
            q: "Which HTTP methods are safe and which are idempotent?",
            wants: "Understanding of HTTP, without which you can't meaningfully test a REST API or repeated requests.",
            answer:
              "Safe methods don't change server state: GET, HEAD, OPTIONS, TRACE. Idempotent methods leave the server in the same state whether called once or many times: all the safe ones plus PUT and DELETE. POST is not idempotent — two identical requests can create two orders. PATCH isn't guaranteed to be idempotent either. For a tester, this means checking repeated requests, double clicks and client retries, especially for POST.",
            source: { title: "MDN — Idempotent", url: SRC.mdnIdempotent },
            tech: "REST",
          },
          {
            id: "401-vs-403",
            q: "What is the difference between 401 and 403 status codes?",
            wants: "Whether the candidate distinguishes authentication from authorization and actually tests access rights in an API.",
            answer:
              "401 Unauthorized means the client isn't authenticated: the token is missing, invalid or expired, and the response should include a WWW-Authenticate header. 403 Forbidden means the server knows who you are but refuses access — logging in again won't help. For example, a regular user calls an admin endpoint and gets 403. Some APIs deliberately return 404 instead of 403 to hide that a resource exists; check what the requirements say.",
            source: { title: "MDN — 403 Forbidden", url: SRC.mdn403 },
            tech: "REST",
          },
          {
            id: "put-vs-patch",
            q: "What is the difference between PUT and PATCH?",
            wants: "Whether the candidate understands method semantics and the negative scenarios that follow from them.",
            answer:
              "PUT replaces the entire resource with the representation sent in the request body, and it's idempotent. PATCH applies a partial modification: only the fields you send are updated. That drives the checks: what happens to fields omitted from a PUT (reset or kept, per the contract), whether PATCH leaves other fields untouched, and how invalid or unknown fields are handled. Also check status codes: 200 or 204 on success, 400 or 422 for invalid data, 404 for a non-existent resource.",
            source: { title: "MDN — PATCH", url: SRC.mdnPatch },
            tech: "REST",
          },
          {
            id: "api-what-to-check",
            q: "What do you check when testing an endpoint in Postman or against Swagger?",
            wants: "Whether the candidate has a systematic approach to API tests rather than just checking for a 200.",
            answer:
              "I take the contract from Swagger/OpenAPI and check the status code, the structure and types of response fields, required fields and headers (Content-Type, caching). Then negative cases: invalid and boundary values, missing fields, wrong types, requests with no token and with another user's token (401/403). I also check side effects: after a POST, the resource really shows up in a GET or in the database. In Postman I write these as collection test scripts so they can run in CI via Newman.",
            code:
              "pm.test(\"status is 201\", () => pm.response.to.have.status(201));\npm.test(\"has id\", () => {\n  const body = pm.response.json();\n  pm.expect(body.id).to.be.a(\"number\");\n});",
            source: { title: "Postman Learning Center — Write test scripts", url: SRC.postman },
            tech: "REST",
          },
        ],
      },
      {
        id: "sql",
        title: "SQL",
        items: [
          {
            id: "sql-joins",
            q: "What types of JOIN are there, and how do INNER and LEFT JOIN differ?",
            wants: "Whether the candidate can verify data in the database on their own after an action in the UI or API.",
            answer:
              "INNER JOIN returns only rows that have a match in both tables. LEFT JOIN returns every row from the left table, filling the right table's columns with NULL where there's no match; RIGHT JOIN is the mirror image. FULL JOIN returns all rows from both tables, and CROSS JOIN returns every possible combination. For QA, a LEFT JOIN with an IS NULL condition is a handy way to find orphaned or missing records.",
            code: CODE_LEFT_JOIN,
            source: { title: "PostgreSQL docs — Table Expressions (joined tables)", url: SRC.pgJoins },
            tech: "SQL",
          },
          {
            id: "where-vs-having",
            q: "What is the difference between WHERE and HAVING?",
            wants: "Understanding of query evaluation order and aggregate functions.",
            answer:
              "WHERE filters rows before grouping, so you can't use aggregate functions in it. HAVING filters groups after GROUP BY, which is where conditions like COUNT(*) > 1 or SUM(amount) > 1000 go. If a condition can go in WHERE, put it there — fewer rows reach the grouping step. A typical query: WHERE picks orders for a period, GROUP BY groups them by user, HAVING keeps users with more than 5 orders.",
            source: { title: "PostgreSQL docs — Aggregate Functions", url: SRC.pgAgg },
            tech: "SQL",
          },
          {
            id: "find-duplicates",
            q: "How do you find duplicates in a table?",
            wants: "A hands-on task: the candidate should write a GROUP BY / HAVING query without hints.",
            answer:
              "Group by the column that should be unique and keep groups with more than one row. This is how you verify the system doesn't create two users with the same email after a double click on \"Sign up\". To see the duplicate rows themselves, join the result back to the table or use the window function COUNT(*) OVER (PARTITION BY email).",
            code: CODE_DUPLICATES,
            source: { title: "PostgreSQL docs — Aggregate Functions", url: SRC.pgAgg },
            tech: "SQL",
          },
        ],
      },
      {
        id: "automation",
        title: "Test automation",
        items: [
          {
            id: "test-pyramid",
            q: "What is the test pyramid?",
            wants: "Whether the candidate knows how to distribute automated tests across levels so the suite stays fast and stable.",
            answer:
              "The test pyramid is a model with lots of fast, cheap unit tests at the bottom, fewer integration and API tests in the middle, and a small number of end-to-end UI tests at the top. The higher you go, the slower, more expensive to maintain and more flaky the tests become. So logic should be tested as low in the pyramid as possible, with UI tests covering only key user journeys. The opposite — checking almost everything through the UI — is the \"ice-cream cone\" anti-pattern.",
            source: { title: "Martin Fowler — The Practical Test Pyramid", url: SRC.fowlerPyramid },
          },
          {
            id: "what-to-automate-first",
            q: "What should you automate first, and what shouldn't you automate?",
            wants: "Whether the candidate sees automation as an investment that has to pay off, not as \"automate everything\".",
            answer:
              "Start with stable scenarios that repeat every release: smoke tests and regression of critical paths (login, checkout, sign-up), API tests, and checks with many data sets. Don't automate features that change often, one-off checks, usability or exploratory testing. Automated tests cost time to write and maintain, so estimate how many times a test will run and how much manual effort it will save.",
            source: { title: "ISTQB CTFL Syllabus v4.0.1, section 6.2", url: SRC.syllabus },
          },
          {
            id: "flaky-tests",
            q: "What are flaky tests and how do you deal with them?",
            wants: "Whether the candidate has real experience maintaining automated tests and looks for the root cause instead of just turning on retries.",
            answer:
              "A flaky test passes and fails on the same code. Typical causes: waiting for async events the wrong way (sleep instead of waiting for a state), tests depending on each other or sharing test data, unstable external services, and time or time zones. Move a flaky test into quarantine so it doesn't devalue the whole run, then fix the cause. Retries help with diagnosis but shouldn't hide the problem.",
            source: { title: "Martin Fowler — Eradicating Non-Determinism in Tests", url: SRC.fowlerFlaky },
          },
          {
            id: "playwright-waiting-locators",
            q: "How does Playwright wait for elements, and which locators should you prefer?",
            wants: "Practical Playwright knowledge: why explicit sleeps aren't needed and how to write resilient locators.",
            answer:
              "Before an action, Playwright automatically runs actionability checks: the element is visible, stable (not animating), receives events (not covered by anything) and enabled; for fill it must also be editable. Web-first assertions like expect(locator).toBeVisible() retry until the condition is met or the timeout expires. So you almost never need waitForTimeout. The docs recommend prioritizing user-facing locators — getByRole, getByLabel, getByText — or getByTestId as an explicit contract; CSS and XPath break when the markup changes.",
            code:
              "await page.getByRole(\"button\", { name: \"Sign in\" }).click();\nawait expect(page.getByText(\"Welcome\")).toBeVisible();",
            source: { title: "Playwright docs — Auto-waiting (Actionability)", url: SRC.pwActionability },
            tech: "Playwright",
          },
          {
            id: "page-object",
            q: "What is the Page Object pattern and why use it?",
            wants: "Whether the candidate can structure test code so it stays maintainable.",
            answer:
              "Page Object is a pattern where the locators and actions of a page or component live in a separate class, and tests call its methods, like loginPage.login(email, password). When the markup changes, you update one class instead of dozens of tests. Tests also become more readable and closer to business scenarios. Assertions usually stay in the tests rather than in the page object, so the class doesn't need to know what's being verified.",
            code:
              "class LoginPage {\n  constructor(page) { this.page = page; }\n  async login(email, password) {\n    await this.page.getByLabel(\"Email\").fill(email);\n    await this.page.getByLabel(\"Password\").fill(password);\n    await this.page.getByRole(\"button\", { name: \"Sign in\" }).click();\n  }\n}",
            source: { title: "Playwright docs — Page object models", url: SRC.pwPom },
            tech: "Playwright",
          },
        ],
      },
      {
        id: "ci-git",
        title: "CI/CD and Git",
        items: [
          {
            id: "tests-in-pipeline",
            q: "How do you run automated tests in a CI/CD pipeline?",
            wants: "Whether the candidate understands that automated tests only pay off when they run automatically on every change.",
            answer:
              "Tests run automatically on every pull request or commit to main: the pipeline installs dependencies and browsers, spins up the environment and runs the suite. Fast tests (unit, API, smoke) run on every PR; the full regression runs on a schedule or before a release. In CI it's useful to enable retries and capture a trace on the first retry, and to keep the report, screenshots and videos as artifacts. The Playwright docs recommend workers: 1 in CI for stability, or sharding the suite instead.",
            code: CODE_CI,
            source: { title: "Playwright docs — Continuous Integration", url: SRC.pwCi },
            tech: "CI/CD",
          },
          {
            id: "git-basic-flow",
            q: "Describe a basic Git workflow in a team.",
            wants: "Whether the candidate can work with the test automation repo without needing help from developers.",
            answer:
              "I create a separate branch for the task from an up-to-date main and make small commits with clear messages. Before pushing, I pull in the latest changes from main (merge or rebase) and resolve conflicts locally. Then I push the branch and open a pull request, where CI checks and code review happen; once approved, the branch is merged into main. People usually don't push directly to main, and the branch is deleted after merging.",
            code: CODE_GIT,
            source: { title: "Pro Git — Basic Branching and Merging", url: SRC.gitBranching },
            tech: "Git",
          },
        ],
      },
      {
        id: "mobile-performance",
        title: "Mobile and performance testing",
        items: [
          {
            id: "mobile-specific-checks",
            q: "What do you need to test in a mobile app that you don't have on the web?",
            wants: "Whether the candidate knows mobile platform specifics instead of reusing a web checklist as is.",
            answer:
              "Interruptions: an incoming call, a push notification, an SMS, switching to another app and back. Configuration changes: screen rotation, language, theme or font size — on Android these recreate the Activity by default, and on-screen data can be lost. Network: offline, slow connections, switching between Wi-Fi and mobile data. Also permissions (denying camera or location access), different OS versions and screen sizes, upgrading from the previous app version, deep links, and behavior on low battery or low memory.",
            source: { title: "Android Developers — Handle configuration changes", url: SRC.androidConfig },
          },
          {
            id: "mobile-background-process-death",
            q: "How do you test what happens when the app is sent to the background and reopened?",
            wants: "Whether the candidate knows the OS can kill a background process, and how to reproduce it.",
            answer:
              "While the app is in the background, Android may kill its process to free memory; when the user returns, the Activity is recreated and state must be restored from what was saved. I check that form input, scroll position, the current screen and the login session aren't lost. You can reproduce this with the \"Don't keep activities\" developer option or by limiting background processes. I also test a long pause in the background: does an expired token get refreshed correctly?",
            source: { title: "Android Developers — The activity lifecycle", url: SRC.androidLifecycle },
          },
          {
            id: "load-stress-spike",
            q: "How do load, stress and spike testing differ?",
            wants: "Whether the candidate understands the goals of different performance tests and which metrics to watch.",
            answer:
              "Load testing checks how the system behaves under expected load — typical and peak. Stress testing goes beyond the expected load to find the breaking point and see how the system degrades and recovers. A spike test is a sudden, short surge, like the start of a sale; a soak test applies sustained load for hours to catch memory leaks. The key metrics are response-time percentiles (p95, p99), throughput and error rate.",
            source: { title: "Grafana k6 docs — Load test types", url: SRC.k6Types },
          },
        ],
      },
    ],
  },
};
