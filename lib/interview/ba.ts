import type { InterviewContent } from "./types";

const SRC = {
  babok: "https://www.iiba.org/career-resources/a-business-analysis-professionals-foundation-for-success/babok/",
  gNonFunctional: "https://glossary.istqb.org/en_US/term/non-functional-requirement",
  gTraceability: "https://glossary.istqb.org/en_US/term/traceability",
  gUat: "https://glossary.istqb.org/en_US/term/user-acceptance-testing",
  atlUserStories: "https://www.atlassian.com/agile/project-management/user-stories",
  atlEpics: "https://www.atlassian.com/agile/project-management/epics",
  scrumGuide: "https://scrumguides.org/scrum-guide.html",
  gherkin: "https://cucumber.io/docs/gherkin/reference/",
  fowlerUseCase: "https://martinfowler.com/bliki/UseCase.html",
  omgUml: "https://www.omg.org/spec/UML/About-UML",
  omgBpmn: "https://www.omg.org/spec/BPMN/2.0.2/About-BPMN",
  pgJoins: "https://www.postgresql.org/docs/current/queries-table-expressions.html",
  pgAgg: "https://www.postgresql.org/docs/current/tutorial-agg.html",
  pgConstraints: "https://www.postgresql.org/docs/current/ddl-constraints.html",
  pgIndexes: "https://www.postgresql.org/docs/current/indexes-intro.html",
  mdnMethods: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods",
  mdnStatus: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status",
  oasLearn: "https://learn.openapis.org/",
  postman: "https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/",
  moscow: "https://www.agilebusiness.org/dsdm-project-framework/moscow-prioritisation.html",
  atlRaci: "https://www.atlassian.com/work-management/project-management/raci-chart",
  atlScope: "https://www.atlassian.com/work-management/project-management/project-scope",
  atlRefinement: "https://www.atlassian.com/agile/scrum/backlog-refinement",
  atlRisk: "https://www.atlassian.com/work-management/project-management/project-risk-management",
  atlPrd: "https://www.atlassian.com/agile/product-management/requirements",
};

const CODE_GHERKIN =
  "Scenario: Login with a wrong password\n  Given a registered user on the login page\n  When they enter a wrong password\n  Then an error message is shown\n  And the user stays logged out";

const CODE_LEFT_JOIN =
  "-- customers without any orders\nSELECT c.id, c.email\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.id IS NULL;";

const CODE_HAVING =
  "SELECT customer_id, COUNT(*) AS orders_cnt\nFROM orders\nWHERE created_at >= DATE '2026-01-01'\nGROUP BY customer_id\nHAVING COUNT(*) > 5;";

const CODE_FK =
  "CREATE TABLE orders (\n  id          bigint PRIMARY KEY,\n  customer_id bigint NOT NULL\n              REFERENCES customers (id),\n  status      text NOT NULL\n);";

const CODE_INDEX =
  "CREATE INDEX orders_customer_idx\n  ON orders (customer_id);";

const CODE_OPENAPI =
  "paths:\n  /orders/{id}:\n    get:\n      summary: Get an order\n      responses:\n        '200': { description: OK }\n        '404': { description: Order not found }";

const CODE_HTTP =
  "POST /orders HTTP/1.1\nContent-Type: application/json\n\n{ \"customerId\": 42, \"items\": [{ \"sku\": \"A-1\", \"qty\": 2 }] }\n\nHTTP/1.1 201 Created";

export const BA_INTERVIEW: InterviewContent = {
  uk: {
    title: "Питання на співбесіді Business Analyst — 26 питань",
    description:
      "Питання на співбесіді Business Analyst і System Analyst з відповідями: вимоги, user stories, BPMN і UML, SQL, REST API, MoSCoW, Scrum, документація, UAT.",
    h1: "Питання на співбесіді Business Analyst / System Analyst",
    lead:
      "Питання відібрані за тим, що роботодавці вимагають у живих вакансіях бізнес- і системних аналітиків: збір вимог, user stories, BPMN і UML, SQL, REST API, пріоритизація, Agile та документація. Кожна відповідь звірена з авторитетним джерелом — IIBA, Scrum Guide, специфікаціями OMG і OpenAPI, документацією PostgreSQL і MDN; посилання під кожним питанням.",
    categories: [
      {
        id: "fundamentals",
        title: "Роль аналітика та вимоги",
        items: [
          {
            id: "ba-vs-sa",
            q: "Чим Business Analyst відрізняється від System Analyst?",
            wants: "Чи розумієте ви, що BA працює від бізнес-потреби, а SA — від того, як це реалізувати в системі, і де ці ролі перетинаються.",
            answer: "BABOK Guide від IIBA описує бізнес-аналіз як практику, що допомагає організації змінюватися, визначаючи потреби й пропонуючи рішення, які створюють цінність для стейкхолдерів. Business Analyst зазвичай ближчий до бізнесу: з’ясовує проблему, цілі, процеси та формулює бізнес-вимоги. System Analyst ближчий до розробки: деталізує функціональні вимоги, інтеграції, моделі даних і контракти API. У багатьох компаніях це одна роль під різними назвами, тому на співбесіді варто уточнити, що саме очікують у цій вакансії.",
            source: { title: "IIBA — BABOK Guide", url: SRC.babok },
          },
          {
            id: "elicitation-techniques",
            q: "Якими техніками збору вимог (elicitation) ви користуєтесь?",
            wants: "Чи знаєте ви кілька технік і вмієте обирати під ситуацію, а не лише «поспілкуватися із замовником».",
            answer: "Найпоширеніші техніки: інтерв’ю зі стейкхолдерами, воркшопи, спостереження за роботою користувачів, аналіз наявних документів і систем, опитування, прототипування та мозковий штурм. Інтерв’ю добре для глибини й контексту, воркшопи — щоб швидко узгодити позиції кількох груп, прототип — щоб уточнити вимоги до інтерфейсу. Вибір залежить від кількості стейкхолдерів, наявності документації та рівня невизначеності. Зібране варто підтверджувати з учасниками письмово, щоб не залишилося різних трактувань.",
            source: { title: "IIBA — BABOK Guide", url: SRC.babok },
          },
          {
            id: "functional-vs-nonfunctional",
            q: "Чим функціональні вимоги відрізняються від нефункціональних? Наведіть приклади.",
            wants: "Чи не забуваєте ви про нефункціональні вимоги, які часто й ламають проєкти.",
            answer: "Функціональні вимоги описують, що система робить: «користувач може скинути пароль через email». Нефункціональні описують, як вона це робить, тобто атрибути якості: продуктивність, безпека, надійність, зручність, сумісність. Приклад: «сторінка списку замовлень відкривається до 2 секунд при 1000 одночасних користувачів». Нефункціональні вимоги слід формулювати вимірювано, інакше їх неможливо перевірити.",
            source: { title: "ISTQB Glossary — non-functional requirement", url: SRC.gNonFunctional },
          },
          {
            id: "traceability",
            q: "Що таке трасованість вимог (traceability) і навіщо вона потрібна?",
            wants: "Чи розумієте ви, що вимога має бути пов’язана з бізнес-ціллю, дизайном, кодом і тестами.",
            answer: "Трасованість — це можливість простежити зв’язки вимоги в обидва боки: від бізнес-потреби до рішення і тестів та назад. Зазвичай її ведуть матрицею або зв’язками задач у Jira. Вона дає змогу оцінити вплив зміни (які екрани, API і тести зачепить), показати покриття вимог тестами й не втратити вимогу під час розробки. Також вона допомагає прибрати «сирітські» функції, які не відповідають жодній потребі бізнесу.",
            source: { title: "ISTQB Glossary — traceability", url: SRC.gTraceability },
          },
        ],
      },
      {
        id: "stories-criteria",
        title: "User stories та критерії приймання",
        items: [
          {
            id: "user-story",
            q: "Що таке user story і як її правильно писати?",
            wants: "Чи розумієте ви, що story — це короткий опис цінності для користувача та привід для обговорення, а не міні-ТЗ.",
            answer: "User story — неформальний короткий опис функції з погляду користувача. Типовий шаблон: «Як <роль>, я хочу <дія>, щоб <цінність>». Atlassian підкреслює, що story включає опис, обговорення, яке уточнює деталі, та критерії приймання, що визначають, коли історія виконана. Хороша історія мала, незалежна й перевірювана; велика розбивається на менші. Деталі не вписують у назву, а уточнюють на refinement.",
            source: { title: "Atlassian — User stories", url: SRC.atlUserStories },
          },
          {
            id: "epic-story-task",
            q: "Чим відрізняються epic, user story і task?",
            wants: "Чи вмієте ви декомпозувати вимоги та розумієте ієрархію роботи в беклозі.",
            answer: "Epic — велика робота, яку можна розбити на кілька історій, зазвичай вона займає більше одного спринту і вирішує одну велику ціль. User story — менший шматок цінності для користувача, який команда може завершити за спринт. Task (або sub-task) — технічний крок усередині історії, наприклад «додати поле в БД». Такий поділ дає зв’язок від стратегічної цілі до конкретної роботи й допомагає звітувати прогрес на кожному рівні.",
            source: { title: "Atlassian — Epics", url: SRC.atlEpics },
          },
          {
            id: "acceptance-criteria-vs-dod",
            q: "Чим acceptance criteria відрізняються від Definition of Done?",
            wants: "Чи розрізняєте ви умови приймання конкретної історії і спільний стандарт якості всієї команди.",
            answer: "Acceptance criteria (критерії приймання) — умови, за яких саме ця історія вважається виконаною з погляду замовника; вони унікальні для кожної історії. За Scrum Guide, Definition of Done — формальний опис стану Increment, коли він відповідає мірам якості, потрібним для продукту, і він спільний для всієї команди (код пройшов рев’ю, тести зелені, документацію оновлено). Історія готова, коли виконані і її критерії приймання, і DoD. Критерії пишуться до розробки, а не після неї.",
            source: { title: "The Scrum Guide (2020)", url: SRC.scrumGuide },
          },
          {
            id: "gherkin",
            q: "Що таке Given-When-Then (Gherkin) і коли його застосовувати?",
            wants: "Чи вмієте ви записувати критерії у вигляді однозначних перевірюваних сценаріїв.",
            answer: "Gherkin — формат запису сценаріїв ключовими словами Given (початковий стан), When (дія), Then (очікуваний результат), з And і But для додаткових кроків. Такі сценарії читаються бізнесом і водночас використовуються як приклади для тестувальників та автотестів (BDD, Cucumber). Формат корисний, коли в правилі багато умов і виняткових випадків: кожен випадок стає окремим сценарієм. Для простих історій достатньо маркованого списку критеріїв.",
            code: CODE_GHERKIN,
            source: { title: "Cucumber — Gherkin reference", url: SRC.gherkin },
          },
        ],
      },
      {
        id: "modeling",
        title: "Моделювання: use case, UML, BPMN",
        items: [
          {
            id: "use-case",
            q: "Що таке use case і з чого він складається?",
            wants: "Чи вмієте ви описати взаємодію актора із системою, включно з альтернативними та винятковими сценаріями.",
            answer: "За Мартіном Фаулером, use case — техніка організації та збору вимог, популяризована Іваром Якобсоном. Use case описує, як актор (користувач або зовнішня система) досягає мети через взаємодію із системою. Типова структура: назва, актор, передумови, основний сценарій, альтернативні сценарії та винятки, постумови. Основний (успішний) сценарій описують першим, а потім відгалуження для помилок. На відміну від user story, use case докладніший і краще підходить для складної логіки та інтеграцій.",
            source: { title: "Martin Fowler — Use Case", url: SRC.fowlerUseCase },
          },
          {
            id: "uml-diagrams",
            q: "Які UML-діаграми має знати аналітик і для чого вони?",
            wants: "Чи вмієте ви обрати діаграму під задачу, а не малювати всі підряд.",
            answer: "UML (Unified Modeling Language) — стандарт OMG для візуального моделювання систем. Аналітик найчастіше використовує: use case diagram (хто що робить із системою), activity diagram (потік дій і розгалуження), sequence diagram (обмін повідомленнями між компонентами в часі), class diagram (сутності та зв’язки) і state machine diagram (життєвий цикл об’єкта, наприклад статуси замовлення). Діаграма має відповідати на конкретне питання аудиторії; зайві деталі роблять її нечитабельною.",
            source: { title: "OMG — Unified Modeling Language (UML)", url: SRC.omgUml },
          },
          {
            id: "bpmn",
            q: "Що таке BPMN і які основні елементи нотації?",
            wants: "Чи вмієте ви моделювати бізнес-процеси AS-IS і TO-BE та читати чужі діаграми.",
            answer: "BPMN (Business Process Model and Notation) — стандарт OMG, нотація процесів, зрозуміла і бізнесу, і розробникам. Основні елементи: події (початок, проміжні, завершення), дії (task, subprocess), шлюзи (gateway: ексклюзивний, паралельний), потоки керування та пули/доріжки (pool, lane) для учасників. Спочатку моделюють поточний процес (AS-IS), знаходять вузькі місця, потім описують цільовий (TO-BE). Діаграма має мати одну подію початку і зрозумілі завершення.",
            source: { title: "OMG — Business Process Model and Notation (BPMN) 2.0.2", url: SRC.omgBpmn },
          },
        ],
      },
      {
        id: "sql",
        title: "SQL та дані",
        items: [
          {
            id: "sql-joins",
            q: "Які бувають типи JOIN і чим INNER відрізняється від LEFT?",
            wants: "Чи зможете ви самостійно перевірити та проаналізувати дані, а не чекати на розробника.",
            answer: "INNER JOIN повертає лише рядки, для яких є збіг в обох таблицях. LEFT JOIN повертає всі рядки лівої таблиці, а там, де збігу немає, колонки правої заповнюються NULL; RIGHT JOIN — дзеркально. FULL JOIN повертає всі рядки обох таблиць, CROSS JOIN — усі комбінації. LEFT JOIN з умовою IS NULL — зручний спосіб знайти записи без пов’язаних даних, наприклад клієнтів без замовлень.",
            code: CODE_LEFT_JOIN,
            source: { title: "PostgreSQL docs — Table Expressions (joined tables)", url: SRC.pgJoins },
            tech: "SQL",
          },
          {
            id: "group-by-having",
            q: "Для чого GROUP BY і чим WHERE відрізняється від HAVING?",
            wants: "Чи вмієте ви рахувати метрики для звітів і розумієте порядок виконання запиту.",
            answer: "GROUP BY об’єднує рядки в групи, до яких застосовують агрегатні функції: COUNT, SUM, AVG, MIN, MAX. WHERE фільтрує рядки до групування, тому агрегатів у ньому бути не може. HAVING фільтрує вже готові групи, наприклад COUNT(*) > 5. Якщо умову можна поставити в WHERE, так краще: у групування потрапить менше рядків.",
            code: CODE_HAVING,
            source: { title: "PostgreSQL docs — Aggregate Functions", url: SRC.pgAgg },
            tech: "SQL",
          },
          {
            id: "keys-constraints",
            q: "Що таке первинний і зовнішній ключ? Які ще є обмеження?",
            wants: "Чи розумієте ви модель даних, яку описуєте у вимогах, і цілісність зв’язків між сутностями.",
            answer: "Первинний ключ (PRIMARY KEY) унікально ідентифікує рядок таблиці і не може бути NULL. Зовнішній ключ (FOREIGN KEY) гарантує, що значення в одній таблиці відповідає існуючому рядку іншої, тобто підтримує посилальну цілісність. Інші обмеження: NOT NULL, UNIQUE і CHECK (довільна умова на значення). Ці правила аналітик фіксує у вимогах: наприклад, чи може замовлення існувати без клієнта.",
            code: CODE_FK,
            source: { title: "PostgreSQL docs — Constraints", url: SRC.pgConstraints },
            tech: "SQL",
          },
          {
            id: "sql-index",
            q: "Що таке індекс в базі даних і коли він потрібен?",
            wants: "Чи розумієте ви, чому запит може бути повільним, і можете аргументовано обговорити це з розробниками.",
            answer: "Індекс — додаткова структура, що дозволяє базі швидше знаходити рядки за значенням колонки без повного перегляду таблиці. Він прискорює пошук, фільтрацію й з’єднання, але займає місце і трохи уповільнює вставку та оновлення, бо його теж потрібно підтримувати. Індекси мають сенс на колонках, за якими часто шукають або з’єднують таблиці, наприклад зовнішніх ключах. Для аналітика головне — вміти назвати такі поля у вимогах до пошуку й звітів.",
            code: CODE_INDEX,
            source: { title: "PostgreSQL docs — Indexes: Introduction", url: SRC.pgIndexes },
            tech: "SQL",
          },
        ],
      },
      {
        id: "api",
        title: "REST API та інтеграції",
        items: [
          {
            id: "http-methods",
            q: "Які HTTP-методи використовують у REST і що таке ідемпотентність?",
            wants: "Чи вмієте ви проєктувати й описувати API-контракти та розумієте семантику методів.",
            answer: "GET читає ресурс, POST створює або запускає дію, PUT повністю замінює ресурс, PATCH змінює його частково, DELETE видаляє. GET, PUT і DELETE ідемпотентні: повторення того самого запиту дає той самий стан сервера. POST зазвичай не ідемпотентний, тому повторне надсилання може створити дублікат. Це треба враховувати, наприклад, для платежів, де додають ідемпотентний ключ у вимогах.",
            code: CODE_HTTP,
            source: { title: "MDN — HTTP request methods", url: SRC.mdnMethods },
            tech: "REST",
          },
          {
            id: "status-codes",
            q: "Які HTTP-статуси ви очікуєте в API і чим 401 відрізняється від 403?",
            wants: "Чи вмієте ви описати у специфікації не лише успішну відповідь, а й помилки.",
            answer: "Статуси групуються за класами: 2xx — успіх (200 OK, 201 Created), 3xx — переспрямування, 4xx — помилка клієнта, 5xx — помилка сервера. 400 означає некоректний запит, 404 — ресурс не знайдено, 409 — конфлікт стану. 401 Unauthorized означає, що клієнт не автентифікований (немає чинних облікових даних), а 403 Forbidden — що сервер його розпізнав, але доступу не надає. У специфікації для кожного методу описують усі очікувані відповіді та формат помилок.",
            source: { title: "MDN — HTTP response status codes", url: SRC.mdnStatus },
            tech: "REST",
          },
          {
            id: "openapi-swagger",
            q: "Що таке OpenAPI (Swagger) і навіщо він аналітику?",
            wants: "Чи вмієте ви описувати контракт API у стандартному форматі, а не текстом у Word.",
            answer: "OpenAPI Specification — стандарт машинозчитуваного опису HTTP API у форматі YAML або JSON: ендпоінти, методи, параметри, тіла запитів і відповідей, коди помилок. Swagger — набір інструментів навколо цієї специфікації (редактор, Swagger UI для документації). Опис служить єдиним контрактом для фронтенду, бекенду й тестувальників, з нього генерують документацію, моки та клієнти. Аналітик, який уміє писати OpenAPI, скорочує кількість непорозумінь на інтеграціях.",
            code: CODE_OPENAPI,
            source: { title: "OpenAPI Initiative — Learn OpenAPI", url: SRC.oasLearn },
            tech: "REST",
          },
          {
            id: "postman",
            q: "Як ви використовуєте Postman в роботі аналітика?",
            wants: "Чи вмієте ви самостійно перевірити API та відтворити проблему без розробника.",
            answer: "У Postman аналітик надсилає запити до API, перевіряє відповіді, статуси й структуру JSON та групує запити в колекції. До запиту можна додати скрипти, що автоматично перевіряють відповідь, наприклад статус і поля. Це допомагає перевірити специфікацію до готового інтерфейсу, відтворити дефект і підготувати приклади запитів для документації. Змінні середовищ дозволяють перемикатися між dev, stage та prod, не переписуючи запити.",
            source: { title: "Postman Docs — Test scripts", url: SRC.postman },
          },
        ],
      },
      {
        id: "prioritisation-stakeholders",
        title: "Пріоритизація та стейкхолдери",
        items: [
          {
            id: "moscow",
            q: "Як працює пріоритизація за MoSCoW?",
            wants: "Чи вмієте ви допомогти бізнесу обрати головне, а не погодитися, що «все критично».",
            answer: "MoSCoW ділить вимоги на чотири категорії: Must have (мінімум, без якого немає сенсу випускати продукт), Should have (важливо, але є обхідний шлях), Could have (бажано, якщо вистачить часу) і Won’t have this time (свідомо не робимо в цьому релізі). Остання категорія важлива: вона фіксує межі скоупу й не дає відкладеним вимогам повернутися неформально. Обмеження щодо Must (наприклад, частка бюджету) допомагають не перевантажити реліз.",
            source: { title: "Agile Business Consortium — MoSCoW prioritisation", url: SRC.moscow },
          },
          {
            id: "stakeholders-raci",
            q: "Як ви працюєте зі стейкхолдерами і що таке матриця RACI?",
            wants: "Чи вмієте ви визначати зацікавлені сторони, узгоджувати очікування й розподіляти відповідальність.",
            answer: "Спочатку складають перелік стейкхолдерів і визначають, хто на що впливає та кого це зачіпає, а потім вирішують, як часто і в якому форматі з ними спілкуватися. RACI — матриця розподілу відповідальності: Responsible (виконує), Accountable (відповідає за результат і ухвалює рішення), Consulted (консультує), Informed (отримує інформацію). Правило: для кожної задачі рівно один Accountable. Конфлікти вимог виносять на спільну зустріч, а рішення фіксують письмово.",
            source: { title: "Atlassian — RACI chart", url: SRC.atlRaci },
          },
          {
            id: "scope-risks",
            q: "Як ви визначаєте межі проєкту (scope) і керуєте ризиками?",
            wants: "Чи фіксуєте ви, що входить і не входить у скоуп, та чи думаєте про ризики наперед.",
            answer: "Scope statement описує цілі, результати (deliverables) та межі проєкту, а також що в нього не входить; його погоджують зі спонсором і використовують як опору для рішень про зміни. Ризик — невизначена подія, що може вплинути на терміни, бюджет чи якість. Для ризиків ведуть реєстр: опис, ймовірність, вплив, відповідальний і план реагування. Нові запити поза скоупом проходять через оцінку впливу, а не додаються мовчки.",
            source: { title: "Atlassian — Project scope", url: SRC.atlScope },
          },
        ],
      },
      {
        id: "agile-docs-uat",
        title: "Agile, документація та приймання",
        items: [
          {
            id: "scrum-ba",
            q: "Яка роль бізнес-аналітика в Scrum, якщо такої ролі немає?",
            wants: "Чи знаєте ви реальний Scrum Guide і вмієте пояснити, як аналітик вписується в команду.",
            answer: "У Scrum Guide 2020 три accountabilities: Product Owner, Scrum Master і Developers; окремої ролі аналітика немає. Аналітик входить до складу команди як Developer (бо створює частину Increment) або допомагає Product Owner. Його типові внески: підготовка й уточнення Product Backlog, написання історій і критеріїв приймання, моделі й API-контракти, участь у Sprint Planning та Review. Відповідальність за Product Backlog залишається в Product Owner.",
            source: { title: "The Scrum Guide (2020)", url: SRC.scrumGuide },
          },
          {
            id: "backlog-refinement",
            q: "Що таке backlog refinement і яка в ньому роль аналітика?",
            wants: "Чи вмієте ви готувати історії так, щоб вони були зрозумілі команді до початку спринту.",
            answer: "Backlog refinement (grooming) — постійний процес, у якому команда уточнює елементи беклогу: додає деталі, критерії приймання, оцінки, розбиває великі історії. Мета — щоб до Sprint Planning були історії, зрозумілі й готові до взяття в роботу. Аналітик готує матеріали (макети, схеми, питання до бізнесу), збирає відповіді стейкхолдерів і ставить команді уточнювальні питання. Задача, яку команда не розуміє, повертається на уточнення, а не потрапляє в спринт.",
            source: { title: "Atlassian — Backlog refinement", url: SRC.atlRefinement },
          },
          {
            id: "documents-brd-srs",
            q: "Які документи з вимогами ви пишете: BRD, SRS, PRD?",
            wants: "Чи розумієте ви різні рівні документації та вмієте писати стільки, скільки потрібно команді.",
            answer: "BRD (Business Requirements Document) описує бізнес-потребу, цілі, межі та очікуваний результат для замовника. SRS (Software Requirements Specification) деталізує функціональні та нефункціональні вимоги до системи для розробників і тестувальників. PRD (Product Requirements Document) — продуктовий варіант: призначення, цільові користувачі, функції, критерії успіху в одному джерелі правди для команди. Обсяг залежить від методології й ризиків: у Agile вимоги частіше живуть в історіях, схемах і Confluence, а повний документ пишуть лише там, де він потрібен контрактом чи регулятором.",
            source: { title: "Atlassian — Product requirements document (PRD)", url: SRC.atlPrd },
          },
          {
            id: "uat",
            q: "Що таке UAT і яка роль аналітика в приймальному тестуванні?",
            wants: "Чи вмієте ви довести продукт до прийняття бізнесом, а не лише передати його в тестування.",
            answer: "User Acceptance Testing — приймальне тестування, яке виконують користувачі або представники бізнесу, щоб підтвердити, що система придатна до використання та відповідає їхнім потребам. Аналітик допомагає готувати UAT-сценарії з критеріїв приймання, підбирати тестові дані, пояснювати очікувану поведінку й збирати зауваження. Знайдені розбіжності розділяють на дефекти, неточності у вимогах і нові побажання (change request). Результат UAT фіксується письмово як підстава для релізу.",
            source: { title: "ISTQB Glossary — user acceptance testing", url: SRC.gUat },
          },
        ],
      },
    ],
  },
  en: {
    title: "Business Analyst Interview Questions: 26 Answers",
    description:
      "Business and System Analyst interview questions with answers: requirements, user stories, BPMN and UML, SQL, REST API, MoSCoW, Scrum, documentation, UAT.",
    h1: "Business Analyst / System Analyst interview questions",
    lead:
      "We picked these questions based on what employers actually require in live business and system analyst job postings: requirements gathering, user stories, BPMN and UML, SQL, REST APIs, prioritisation, Agile and documentation. Every answer is checked against an authoritative source — IIBA, the Scrum Guide, the OMG and OpenAPI specifications, and the PostgreSQL and MDN docs — linked under each question.",
    categories: [
      {
        id: "fundamentals",
        title: "The analyst role and requirements",
        items: [
          {
            id: "ba-vs-sa",
            q: "How does a Business Analyst differ from a System Analyst?",
            wants: "Whether you understand that a BA starts from the business need and an SA from how it is implemented in the system, and where the two overlap.",
            answer: "IIBA's BABOK Guide describes business analysis as the practice of enabling change in an organisation by defining needs and recommending solutions that deliver value to stakeholders. A Business Analyst is usually closer to the business: clarifies the problem, goals and processes and states business requirements. A System Analyst is closer to engineering: details functional requirements, integrations, data models and API contracts. In many companies it is one role under different titles, so ask what a specific vacancy actually expects.",
            source: { title: "IIBA — BABOK Guide", url: SRC.babok },
          },
          {
            id: "elicitation-techniques",
            q: "Which requirements elicitation techniques do you use?",
            wants: "Whether you know several techniques and can choose by situation rather than just \"talk to the client\".",
            answer: "The most common techniques are stakeholder interviews, workshops, observing users at work, document and system analysis, surveys, prototyping and brainstorming. Interviews give depth and context, workshops align several groups quickly, and a prototype clarifies interface requirements. The choice depends on the number of stakeholders, available documentation and the level of uncertainty. Confirm what you gathered with participants in writing so nobody leaves with a different interpretation.",
            source: { title: "IIBA — BABOK Guide", url: SRC.babok },
          },
          {
            id: "functional-vs-nonfunctional",
            q: "How do functional requirements differ from non-functional ones? Give examples.",
            wants: "Whether you remember non-functional requirements, which are often what breaks projects.",
            answer: "Functional requirements describe what the system does: \"a user can reset their password by email\". Non-functional requirements describe how well it does it, meaning quality attributes such as performance, security, reliability, usability and compatibility. Example: \"the order list page opens within 2 seconds with 1,000 concurrent users\". Non-functional requirements must be measurable, otherwise they cannot be verified.",
            source: { title: "ISTQB Glossary — non-functional requirement", url: SRC.gNonFunctional },
          },
          {
            id: "traceability",
            q: "What is requirements traceability and why does it matter?",
            wants: "Whether you understand a requirement must be linked to a business goal, design, code and tests.",
            answer: "Traceability is the ability to follow a requirement's links in both directions: from a business need through the solution to tests, and back. It is usually kept in a matrix or through linked issues in Jira. It lets you assess the impact of a change (which screens, APIs and tests it touches), show test coverage of requirements and avoid losing a requirement during development. It also exposes orphan features that match no business need.",
            source: { title: "ISTQB Glossary — traceability", url: SRC.gTraceability },
          },
        ],
      },
      {
        id: "stories-criteria",
        title: "User stories and acceptance criteria",
        items: [
          {
            id: "user-story",
            q: "What is a user story and how do you write a good one?",
            wants: "Whether you understand a story is a short statement of user value and a prompt for conversation, not a mini spec.",
            answer: "A user story is an informal, short description of a feature from the user's perspective. The usual template is \"As a <role>, I want <action> so that <value>\". Atlassian notes that a story includes a description, a conversation that clarifies details, and acceptance criteria that define when the story is complete. A good story is small, independent and testable; a large one is split into smaller ones. Details do not go into the title; they are clarified during refinement.",
            source: { title: "Atlassian — User stories", url: SRC.atlUserStories },
          },
          {
            id: "epic-story-task",
            q: "What is the difference between an epic, a user story and a task?",
            wants: "Whether you can decompose requirements and understand the backlog hierarchy.",
            answer: "An epic is a large body of work that can be broken into several stories; it usually spans more than one sprint and serves one big goal. A user story is a smaller piece of user value that a team can finish within a sprint. A task (or sub-task) is a technical step inside a story, for example \"add a field to the database\". This split links strategic goals to concrete work and lets you report progress at each level.",
            source: { title: "Atlassian — Epics", url: SRC.atlEpics },
          },
          {
            id: "acceptance-criteria-vs-dod",
            q: "How do acceptance criteria differ from the Definition of Done?",
            wants: "Whether you separate the conditions for one story from the quality standard shared by the whole team.",
            answer: "Acceptance criteria are the conditions under which this particular story counts as done from the customer's view; they are unique per story. Per the Scrum Guide, the Definition of Done is a formal description of the state of the Increment when it meets the quality measures required for the product, and it is shared by the whole team (code reviewed, tests green, documentation updated). A story is done when both its acceptance criteria and the DoD are met. Criteria are written before development, not after.",
            source: { title: "The Scrum Guide (2020)", url: SRC.scrumGuide },
          },
          {
            id: "gherkin",
            q: "What is Given-When-Then (Gherkin) and when do you use it?",
            wants: "Whether you can write criteria as unambiguous, verifiable scenarios.",
            answer: "Gherkin is a scenario format using the keywords Given (initial state), When (action) and Then (expected result), with And and But for extra steps. The scenarios are readable by the business and double as examples for testers and automated tests (BDD, Cucumber). The format helps when a rule has many conditions and edge cases: each case becomes its own scenario. For simple stories a bulleted list of criteria is enough.",
            code: CODE_GHERKIN,
            source: { title: "Cucumber — Gherkin reference", url: SRC.gherkin },
          },
        ],
      },
      {
        id: "modeling",
        title: "Modelling: use cases, UML, BPMN",
        items: [
          {
            id: "use-case",
            q: "What is a use case and what does it consist of?",
            wants: "Whether you can describe an actor's interaction with the system, including alternative and exception flows.",
            answer: "According to Martin Fowler, a use case is a technique for organising and eliciting requirements, popularised by Ivar Jacobson. It describes how an actor (a user or an external system) reaches a goal by interacting with the system. A typical structure is a title, actor, preconditions, main scenario, alternative flows and exceptions, and postconditions. The main (successful) scenario is written first, then the branches for failures. Unlike a user story, a use case is more detailed and suits complex logic and integrations.",
            source: { title: "Martin Fowler — Use Case", url: SRC.fowlerUseCase },
          },
          {
            id: "uml-diagrams",
            q: "Which UML diagrams should an analyst know and what are they for?",
            wants: "Whether you choose a diagram for the task instead of drawing all of them.",
            answer: "UML (Unified Modeling Language) is the OMG standard for visual modelling of systems. Analysts most often use the use case diagram (who does what with the system), activity diagram (flow of actions and branching), sequence diagram (messages between components over time), class diagram (entities and relationships) and state machine diagram (an object's lifecycle, such as order statuses). A diagram should answer a specific question for its audience; extra detail makes it unreadable.",
            source: { title: "OMG — Unified Modeling Language (UML)", url: SRC.omgUml },
          },
          {
            id: "bpmn",
            q: "What is BPMN and what are its main elements?",
            wants: "Whether you can model AS-IS and TO-BE business processes and read other people's diagrams.",
            answer: "BPMN (Business Process Model and Notation) is an OMG standard notation for processes that both business people and developers can read. Its main elements are events (start, intermediate, end), activities (task, subprocess), gateways (exclusive, parallel), sequence flows, and pools and lanes for participants. You first model the current process (AS-IS), find bottlenecks, then describe the target one (TO-BE). A diagram should have a clear start event and clear end events.",
            source: { title: "OMG — Business Process Model and Notation (BPMN) 2.0.2", url: SRC.omgBpmn },
          },
        ],
      },
      {
        id: "sql",
        title: "SQL and data",
        items: [
          {
            id: "sql-joins",
            q: "What types of JOIN exist and how does INNER differ from LEFT?",
            wants: "Whether you can check and analyse data yourself instead of waiting for a developer.",
            answer: "INNER JOIN returns only rows that match in both tables. LEFT JOIN returns all rows of the left table, and where there is no match the right table's columns are NULL; RIGHT JOIN is the mirror image. FULL JOIN returns all rows from both tables, and CROSS JOIN returns every combination. LEFT JOIN with an IS NULL condition is a handy way to find records with no related data, such as customers without orders.",
            code: CODE_LEFT_JOIN,
            source: { title: "PostgreSQL docs — Table Expressions (joined tables)", url: SRC.pgJoins },
            tech: "SQL",
          },
          {
            id: "group-by-having",
            q: "What is GROUP BY for and how does WHERE differ from HAVING?",
            wants: "Whether you can compute report metrics and understand query execution order.",
            answer: "GROUP BY combines rows into groups to which aggregate functions are applied: COUNT, SUM, AVG, MIN, MAX. WHERE filters rows before grouping, so it cannot contain aggregates. HAVING filters the finished groups, for example COUNT(*) > 5. If a condition can go in WHERE, put it there: fewer rows reach the grouping step.",
            code: CODE_HAVING,
            source: { title: "PostgreSQL docs — Aggregate Functions", url: SRC.pgAgg },
            tech: "SQL",
          },
          {
            id: "keys-constraints",
            q: "What are primary and foreign keys? What other constraints exist?",
            wants: "Whether you understand the data model you describe in requirements and the integrity of relationships between entities.",
            answer: "A primary key (PRIMARY KEY) uniquely identifies a table row and cannot be NULL. A foreign key (FOREIGN KEY) guarantees that a value in one table matches an existing row in another, which maintains referential integrity. Other constraints are NOT NULL, UNIQUE and CHECK (an arbitrary condition on values). An analyst captures these rules in requirements, for example whether an order may exist without a customer.",
            code: CODE_FK,
            source: { title: "PostgreSQL docs — Constraints", url: SRC.pgConstraints },
            tech: "SQL",
          },
          {
            id: "sql-index",
            q: "What is a database index and when is it needed?",
            wants: "Whether you understand why a query can be slow and can discuss it with developers in an informed way.",
            answer: "An index is an extra structure that lets the database find rows by a column value faster than scanning the whole table. It speeds up search, filtering and joins, but takes space and slightly slows inserts and updates because it also has to be maintained. Indexes make sense on columns that are often searched or joined on, such as foreign keys. For an analyst the key skill is naming such fields in requirements for search and reports.",
            code: CODE_INDEX,
            source: { title: "PostgreSQL docs — Indexes: Introduction", url: SRC.pgIndexes },
            tech: "SQL",
          },
        ],
      },
      {
        id: "api",
        title: "REST API and integrations",
        items: [
          {
            id: "http-methods",
            q: "Which HTTP methods are used in REST and what is idempotency?",
            wants: "Whether you can design and describe API contracts and understand method semantics.",
            answer: "GET reads a resource, POST creates one or triggers an action, PUT replaces a resource entirely, PATCH changes it partially, and DELETE removes it. GET, PUT and DELETE are idempotent: repeating the same request leaves the server in the same state. POST is generally not idempotent, so resending it may create a duplicate. This matters, for example, for payments, where requirements add an idempotency key.",
            code: CODE_HTTP,
            source: { title: "MDN — HTTP request methods", url: SRC.mdnMethods },
            tech: "REST",
          },
          {
            id: "status-codes",
            q: "Which HTTP statuses do you expect from an API and how does 401 differ from 403?",
            wants: "Whether you describe errors in the spec, not just the successful response.",
            answer: "Statuses are grouped by class: 2xx success (200 OK, 201 Created), 3xx redirection, 4xx client error, 5xx server error. 400 means a malformed request, 404 a missing resource, 409 a state conflict. 401 Unauthorized means the client is not authenticated (no valid credentials), whereas 403 Forbidden means the server recognises the client but refuses access. In a spec you describe every expected response per method and the error format.",
            source: { title: "MDN — HTTP response status codes", url: SRC.mdnStatus },
            tech: "REST",
          },
          {
            id: "openapi-swagger",
            q: "What is OpenAPI (Swagger) and why does an analyst need it?",
            wants: "Whether you can describe an API contract in a standard format instead of prose in Word.",
            answer: "The OpenAPI Specification is a standard, machine-readable description of HTTP APIs in YAML or JSON: endpoints, methods, parameters, request and response bodies, error codes. Swagger is a set of tools around it (an editor, Swagger UI for documentation). The description serves as a single contract for frontend, backend and testers, and documentation, mocks and clients can be generated from it. An analyst who can write OpenAPI cuts misunderstandings on integrations.",
            code: CODE_OPENAPI,
            source: { title: "OpenAPI Initiative — Learn OpenAPI", url: SRC.oasLearn },
            tech: "REST",
          },
          {
            id: "postman",
            q: "How do you use Postman as an analyst?",
            wants: "Whether you can check an API yourself and reproduce a problem without a developer.",
            answer: "In Postman an analyst sends requests to an API, checks responses, statuses and JSON structure, and groups requests into collections. Scripts can be attached to a request to verify the response automatically, for example the status and fields. This helps verify a spec before the UI exists, reproduce a defect and prepare example requests for documentation. Environment variables let you switch between dev, stage and prod without rewriting requests.",
            source: { title: "Postman Docs — Test scripts", url: SRC.postman },
          },
        ],
      },
      {
        id: "prioritisation-stakeholders",
        title: "Prioritisation and stakeholders",
        items: [
          {
            id: "moscow",
            q: "How does MoSCoW prioritisation work?",
            wants: "Whether you can help the business pick the essentials instead of agreeing that \"everything is critical\".",
            answer: "MoSCoW splits requirements into four categories: Must have (the minimum without which releasing makes no sense), Should have (important, but there is a workaround), Could have (desirable if time allows) and Won't have this time (knowingly not done in this release). The last category matters: it records the scope boundary and stops deferred requirements from creeping back informally. Limiting Musts (for example, to a share of the budget) keeps a release from being overloaded.",
            source: { title: "Agile Business Consortium — MoSCoW prioritisation", url: SRC.moscow },
          },
          {
            id: "stakeholders-raci",
            q: "How do you work with stakeholders and what is a RACI matrix?",
            wants: "Whether you can identify stakeholders, align expectations and assign responsibility.",
            answer: "First you list the stakeholders and determine who influences what and whom it affects, then decide how often and in which format to communicate with each. RACI is a responsibility assignment matrix: Responsible (does the work), Accountable (owns the result and decides), Consulted (gives input) and Informed (kept up to date). The rule is exactly one Accountable per task. Conflicting requirements go to a joint meeting, and the decision is recorded in writing.",
            source: { title: "Atlassian — RACI chart", url: SRC.atlRaci },
          },
          {
            id: "scope-risks",
            q: "How do you define project scope and manage risks?",
            wants: "Whether you record what is in and out of scope and think about risks upfront.",
            answer: "A scope statement describes the goals, deliverables and boundaries of a project, including what is not part of it; it is agreed with the sponsor and used as an anchor for change decisions. A risk is an uncertain event that can affect schedule, budget or quality. Risks are tracked in a register: description, probability, impact, owner and response plan. New requests outside scope go through impact assessment instead of being added silently.",
            source: { title: "Atlassian — Project scope", url: SRC.atlScope },
          },
        ],
      },
      {
        id: "agile-docs-uat",
        title: "Agile, documentation and acceptance",
        items: [
          {
            id: "scrum-ba",
            q: "What is a business analyst's role in Scrum when no such role exists?",
            wants: "Whether you know the real Scrum Guide and can explain how an analyst fits into the team.",
            answer: "The 2020 Scrum Guide has three accountabilities: Product Owner, Scrum Master and Developers; there is no separate analyst role. An analyst is part of the team as a Developer (since they create part of the Increment) or supports the Product Owner. Typical contributions are preparing and refining the Product Backlog, writing stories and acceptance criteria, models and API contracts, and taking part in Sprint Planning and Review. Accountability for the Product Backlog stays with the Product Owner.",
            source: { title: "The Scrum Guide (2020)", url: SRC.scrumGuide },
          },
          {
            id: "backlog-refinement",
            q: "What is backlog refinement and what is the analyst's part in it?",
            wants: "Whether you can prepare stories so the team understands them before the sprint starts.",
            answer: "Backlog refinement (grooming) is an ongoing process in which the team clarifies backlog items: adds details and acceptance criteria, estimates them and splits large stories. The goal is to have stories that are understood and ready to pull by Sprint Planning. The analyst prepares materials (mockups, diagrams, questions for the business), gathers stakeholder answers and asks the team clarifying questions. A task the team does not understand goes back for clarification instead of entering the sprint.",
            source: { title: "Atlassian — Backlog refinement", url: SRC.atlRefinement },
          },
          {
            id: "documents-brd-srs",
            q: "Which requirements documents do you write: BRD, SRS, PRD?",
            wants: "Whether you understand the levels of documentation and write as much as the team needs.",
            answer: "A BRD (Business Requirements Document) describes the business need, goals, boundaries and expected outcome for the customer. An SRS (Software Requirements Specification) details functional and non-functional requirements for developers and testers. A PRD (Product Requirements Document) is the product-side variant: purpose, target users, features and success criteria as a single source of truth for the team. The volume depends on methodology and risk: in Agile, requirements more often live in stories, diagrams and Confluence, and a full document is written only where a contract or regulator demands it.",
            source: { title: "Atlassian — Product requirements document (PRD)", url: SRC.atlPrd },
          },
          {
            id: "uat",
            q: "What is UAT and what is the analyst's role in acceptance testing?",
            wants: "Whether you can get a product accepted by the business, not just handed to testing.",
            answer: "User Acceptance Testing is acceptance testing performed by users or business representatives to confirm that the system is fit for use and meets their needs. The analyst helps prepare UAT scenarios from the acceptance criteria, select test data, explain expected behaviour and collect feedback. Discrepancies found are sorted into defects, inaccuracies in requirements and new wishes (change requests). The UAT result is recorded in writing as the basis for release.",
            source: { title: "ISTQB Glossary — user acceptance testing", url: SRC.gUat },
          },
        ],
      },
    ],
  },
};
