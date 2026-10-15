import type { InterviewContent } from "./types";

export const FRONTEND_INTERVIEW: InterviewContent = {
  uk: {
    title: "Питання на співбесіді Frontend: 26 питань з відповідями",
    description:
      "Питання на співбесіді frontend з відповідями: JavaScript, TypeScript, React, Next.js, CSS, Core Web Vitals, CORS. Як пройти співбесіду фронтенд розробника.",
    h1: "Питання на співбесіді Frontend розробника",
    lead:
      "Ми відібрали теми за тим, що роботодавці реально вимагають у живих frontend-вакансіях: React, TypeScript, продуктивність, JavaScript, CSS і HTML. Кожну відповідь звірено з офіційною документацією, посилання на джерело є під кожним питанням.",
    categories: [
      {
        id: "javascript",
        title: "JavaScript",
        items: [
          {
            id: "event-loop",
            q: "Як працює event loop? Чим мікротаски відрізняються від макротасок?",
            wants: "Чи розумієте ви порядок виконання асинхронного коду і чому Promise-колбек спрацює раніше за setTimeout(fn, 0).",
            answer:
              "JavaScript виконує код в одному потоці: event loop бере одну задачу (макротаску) з черги — скрипт, колбек setTimeout, обробник події — і виконує її до кінця. Після кожної задачі, коли стек викликів порожній, повністю вичерпується черга мікротасок: колбеки then/catch/finally, await-продовження, queueMicrotask, MutationObserver. Лише після цього браузер може зробити рендер і взяти наступну макротаску. Тому мікротаски завжди виконуються раніше за таймери, а нескінченне додавання мікротасок блокує рендер.",
            code: "console.log(1);\nsetTimeout(() => console.log(4), 0);\nPromise.resolve().then(() => console.log(3));\nconsole.log(2);\n// 1, 2, 3, 4",
            source: { title: "MDN: Using microtasks in JavaScript with queueMicrotask()", url: "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide" },
            tech: "JavaScript",
          },
          {
            id: "closures",
            q: "Що таке замикання (closure) і де воно застосовується на практиці?",
            wants: "Чи розумієте ви лексичне оточення і можете навести реальний приклад, а не лише визначення.",
            answer:
              "Замикання — це функція разом із лексичним оточенням, у якому її створено: вона має доступ до змінних зовнішньої функції навіть після того, як та завершилась. На практиці це приватний стан (лічильники, модулі), фабрики функцій, обробники подій і колбеки, що «пам'ятають» значення. У React кожен рендер створює нові замикання, тому «застарілі» значення state в ефектах і таймерах — це саме наслідок замикань.",
            code: "function makeCounter() {\n  let count = 0;\n  return () => ++count;\n}\nconst next = makeCounter();\nnext(); // 1\nnext(); // 2",
            source: { title: "MDN: Closures", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures" },
            tech: "JavaScript",
          },
          {
            id: "equality",
            q: "Чим відрізняються == і ===?",
            wants: "Чи знаєте ви про неявне приведення типів і чому в коді використовують строге порівняння.",
            answer:
              "=== (строга рівність) порівнює без приведення типів: різні типи — одразу false. == (нестрога рівність) перед порівнянням приводить типи, тому 0 == \"\" і \"1\" == 1 дають true. Особливі випадки: NaN не дорівнює нічому, навіть собі, а null == undefined — true. На практиці пишуть ===, а == іноді свідомо використовують лише для перевірки x == null (null або undefined); для NaN є Number.isNaN або Object.is.",
            code: "0 == \"\";          // true\n0 === \"\";         // false\nnull == undefined; // true\nNaN === NaN;       // false\nObject.is(NaN, NaN); // true",
            source: { title: "MDN: Equality comparisons and sameness", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness" },
            tech: "JavaScript",
          },
          {
            id: "var-let-const",
            q: "Чим відрізняються var, let і const? Що таке TDZ?",
            wants: "Чи розумієте ви область видимості, hoisting і temporal dead zone, а не лише «const не можна змінювати».",
            answer:
              "var має функціональну область видимості, піднімається (hoisting) з ініціалізацією undefined і дозволяє повторне оголошення. let і const мають блочну область видимості й теж піднімаються, але до рядка оголошення перебувають у temporal dead zone (TDZ): звернення до них кидає ReferenceError. const забороняє перепризначення змінної, але не робить об'єкт незмінним — його властивості можна міняти. Класичний приклад різниці — цикл із setTimeout: з let кожна ітерація отримує свою змінну.",
            code: "console.log(a); // undefined\nvar a = 1;\nconsole.log(b); // ReferenceError (TDZ)\nlet b = 2;\nconst obj = { x: 1 };\nobj.x = 2; // ок, перепризначення obj — помилка",
            source: { title: "MDN: let", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let" },
            tech: "JavaScript",
          },
          {
            id: "this",
            q: "Як визначається значення this?",
            wants: "Чи знаєте ви, що this залежить від способу виклику, і чим стрілкові функції відрізняються від звичайних.",
            answer:
              "У звичайній функції this визначається в момент виклику: для obj.method() це obj, для простого виклику fn() — undefined у strict mode (або globalThis без нього), для new — новий об'єкт. call, apply і bind задають this явно. Стрілкові функції не мають власного this і беруть його з зовнішньої області, тому їх зручно використовувати в колбеках. Типова помилка — передати метод як колбек (setTimeout(obj.method)) і втратити контекст.",
            code: "const user = {\n  name: \"Ann\",\n  hi() { return this.name; },\n};\nuser.hi();          // \"Ann\"\nconst f = user.hi;\nf();                // undefined / TypeError\nf.bind(user)();     // \"Ann\"",
            source: { title: "MDN: this", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this" },
            tech: "JavaScript",
          },
          {
            id: "promise-combinators",
            q: "Чим відрізняються Promise.all, Promise.allSettled і Promise.race?",
            wants: "Чи вмієте ви обрати правильний комбінатор для паралельних запитів і обробити часткові помилки.",
            answer:
              "Promise.all чекає на виконання всіх промісів і повертає масив результатів, але відхиляється одразу при першій помилці. Promise.allSettled ніколи не відхиляється: чекає завершення всіх і повертає об'єкти { status, value | reason } — зручно, коли потрібні результати навіть при частині помилок. Promise.race завершується так само, як перший завершений проміс (успіх або помилка), — наприклад, для таймауту запиту. Є ще Promise.any, який чекає на перший успішний результат.",
            code: "const results = await Promise.allSettled([\n  fetch(\"/api/user\"),\n  fetch(\"/api/orders\"),\n]);\nresults.filter(r => r.status === \"rejected\");",
            source: { title: "MDN: Promise", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise" },
            tech: "JavaScript",
          },
          {
            id: "debounce-throttle",
            q: "Чим відрізняються debounce і throttle? Коли що використовувати?",
            wants: "Чи вмієте ви обмежувати частоту дорогих обробників і обирати техніку під задачу.",
            answer:
              "Debounce відкладає виклик, доки події не припиняться на заданий час: функція спрацює один раз після паузи — типовий кейс — пошук під час введення тексту. Throttle гарантує, що функція викликається не частіше, ніж раз на заданий інтервал, навіть якщо події йдуть безперервно, — підходить для scroll, resize, mousemove. Обидві техніки побудовані на таймері і замиканні.",
            code: "function debounce(fn, ms) {\n  let id;\n  return (...args) => {\n    clearTimeout(id);\n    id = setTimeout(() => fn(...args), ms);\n  };\n}",
            source: { title: "MDN Glossary: Debounce", url: "https://developer.mozilla.org/en-US/docs/Glossary/Debounce" },
            tech: "JavaScript",
          },
        ],
      },
      {
        id: "typescript",
        title: "TypeScript",
        items: [
          {
            id: "interface-vs-type",
            q: "Чим відрізняються interface і type?",
            wants: "Чи знаєте ви реальні відмінності (declaration merging, union-типи), а не лише «це одне й те саме».",
            answer:
              "Обидва описують форму об'єкта і в більшості випадків взаємозамінні. interface можна розширювати через extends і доповнювати повторним оголошенням (declaration merging) — так розширюють типи бібліотек. type — це псевдонім для будь-якого типу: union, tuple, примітивів, mapped і conditional типів, а комбінують його через &. Офіційна документація радить за замовчуванням interface для об'єктів, а type — коли потрібні можливості, яких interface не має.",
            code: "interface User { id: number }\ninterface User { name: string } // merging\n\ntype Status = \"idle\" | \"loading\" | \"error\";\ntype Admin = User & { role: \"admin\" };",
            source: { title: "TypeScript Handbook: Everyday Types", url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html" },
            tech: "TypeScript",
          },
          {
            id: "unknown-vs-any",
            q: "Чим unknown відрізняється від any? Що таке narrowing?",
            wants: "Чи пишете ви типобезпечний код для даних ззовні (API, JSON) і вмієте звужувати тип.",
            answer:
              "any вимикає перевірку типів: з таким значенням можна робити що завгодно, і помилки вилізуть у рантаймі. unknown теж приймає будь-яке значення, але не дозволяє ним користуватися, доки ви не звузите тип. Narrowing — це звуження типу перевірками, які розуміє компілятор: typeof, instanceof, in, порівняння, discriminated unions і власні type guards (value is T). Для відповідей API та catch(e) правильний вибір — unknown плюс перевірка.",
            code: "function len(x: unknown) {\n  if (typeof x === \"string\") return x.length;\n  if (Array.isArray(x)) return x.length;\n  return 0;\n}",
            source: { title: "TypeScript Handbook: Narrowing", url: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html" },
            tech: "TypeScript",
          },
          {
            id: "generics",
            q: "Що таке generics і навіщо обмеження extends?",
            wants: "Чи вмієте ви писати перевикористовувані типізовані функції і компоненти без втрати типу.",
            answer:
              "Generics — це параметри типу: функція або тип працює з різними типами і зберігає зв'язок між входом і виходом, замість того щоб повертати any. Обмеження extends вимагає, щоб тип мав певну форму, наприклад властивість length або ключ об'єкта. Часто TypeScript сам виводить параметр типу з аргументів, тому явно його писати не треба. Типові приклади — useState<T>, хелпери для API-відповідей, типізовані списки.",
            code: "function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key];\n}\ngetProp({ id: 1, name: \"A\" }, \"name\"); // string",
            source: { title: "TypeScript Handbook: Generics", url: "https://www.typescriptlang.org/docs/handbook/2/generics.html" },
            tech: "TypeScript",
          },
          {
            id: "utility-types",
            q: "Які utility types ви використовуєте? Що роблять Partial, Pick і Omit?",
            wants: "Чи вмієте ви виводити нові типи з існуючих, а не дублювати описи.",
            answer:
              "Utility types — вбудовані generic-типи для трансформації інших типів. Partial<T> робить усі поля необов'язковими (зручно для патч-запитів і форм), Required<T> — навпаки. Pick<T, K> залишає лише вказані ключі, Omit<T, K> — прибирає їх. Також часто використовують Record<K, V> для словників, Readonly<T>, ReturnType і Awaited. Це дозволяє мати одне джерело правди для моделі.",
            code: "type User = { id: number; name: string; email: string };\ntype UserPatch = Partial<Omit<User, \"id\">>;\ntype UserPreview = Pick<User, \"id\" | \"name\">;",
            source: { title: "TypeScript Handbook: Utility Types", url: "https://www.typescriptlang.org/docs/handbook/utility-types.html" },
            tech: "TypeScript",
          },
        ],
      },
      {
        id: "react",
        title: "React",
        items: [
          {
            id: "reconciliation-keys",
            q: "Як React оновлює DOM і навіщо потрібні key у списках?",
            wants: "Чи розумієте ви reconciliation і чому index як key може ламати стан елементів.",
            answer:
              "Після зміни стану React заново рендерить компонент, порівнює нове дерево з попереднім (reconciliation) і застосовує до DOM лише різницю. Якщо на тій самій позиції той самий тип елемента, стан зберігається; інший тип — піддерево створюється з нуля. key допомагає React зіставити елементи списку між рендерами, тому він має бути стабільним і унікальним серед сусідів, наприклад id з бази. Index як key ламається при вставці, видаленні чи сортуванні: стан інпутів «переїжджає» на інші рядки. Зміна key також використовується, щоб примусово скинути стан компонента.",
            source: { title: "React: Rendering Lists", url: "https://react.dev/learn/rendering-lists" },
            tech: "React",
          },
          {
            id: "useeffect",
            q: "Як працює useEffect: масив залежностей і функція очищення?",
            wants: "Чи знаєте ви, коли ефект перезапускається, навіщо cleanup і коли ефект взагалі не потрібен.",
            answer:
              "useEffect синхронізує компонент із зовнішньою системою: підписки, таймери, мережа, сторонні віджети. Ефект виконується після рендеру; без масиву — після кожного рендеру, з [] — після монтування, з залежностями — коли якась із них змінилась (порівняння через Object.is). Функція, яку повертає ефект, — cleanup: React викликає її перед наступним запуском ефекту і при розмонтуванні, щоб відписатися чи скасувати запит. У Strict Mode в розробці ефект навмисно запускається двічі, щоб виявити відсутній cleanup. Обчислення з props і state ефект не потребують — їх роблять прямо під час рендеру.",
            code: "useEffect(() => {\n  const controller = new AbortController();\n  fetch(`/api/users/${id}`, { signal: controller.signal });\n  return () => controller.abort();\n}, [id]);",
            source: { title: "React: useEffect", url: "https://react.dev/reference/react/useEffect" },
            tech: "React",
          },
          {
            id: "usememo-usecallback",
            q: "Коли useMemo, useCallback і memo справді допомагають? Як уникати зайвих ре-рендерів?",
            wants: "Чи розумієте ви мемоізацію як оптимізацію, а не «обгортаю все про всяк випадок».",
            answer:
              "useMemo кешує результат обчислення, useCallback — саму функцію між рендерами, memo пропускає ре-рендер компонента, якщо його props не змінились. Вони мають сенс, коли обчислення справді дороге або коли значення передається в memo-компонент чи в залежності ефекту — інакше нове посилання на кожному рендері зводить мемоізацію нанівець. Без вимірювань у React Profiler обгортати все не варто. Часто ефективніше спростити структуру: опустити стан нижче, до компонента, якому він потрібен, або передати JSX через children.",
            code: "const visible = useMemo(\n  () => filterTodos(todos, tab),\n  [todos, tab]\n);\nconst onSelect = useCallback((id) => setSelected(id), []);\n<List items={visible} onSelect={onSelect} /> // List = memo(...)",
            source: { title: "React: useMemo", url: "https://react.dev/reference/react/useMemo" },
            tech: "React",
          },
          {
            id: "controlled-uncontrolled",
            q: "Чим контрольовані компоненти відрізняються від неконтрольованих?",
            wants: "Чи вмієте ви працювати з формами і розумієте, хто є джерелом правди для значення поля.",
            answer:
              "У контрольованому інпуті значення зберігається в state React: передаєте value і onChange, і кожне введення проходить через state — зручно для валідації, масок і залежних полів. У неконтрольованому джерелом правди є DOM: задаєте лише defaultValue і читаєте значення через ref або FormData при сабміті. Не можна перемикати інпут між режимами під час життя компонента — React попередить, якщо value стане undefined. Бібліотеки на кшталт React Hook Form спираються на неконтрольовані поля заради продуктивності.",
            code: "const [email, setEmail] = useState(\"\");\n<input value={email} onChange={e => setEmail(e.target.value)} />\n\n<input name=\"city\" defaultValue=\"Kyiv\" /> // uncontrolled",
            source: { title: "React: <input>", url: "https://react.dev/reference/react-dom/components/input" },
            tech: "React",
          },
          {
            id: "state-management",
            q: "Як ви організовуєте стан: lifting state up, Context, Redux/Zustand і server state (TanStack Query)?",
            wants: "Чи вмієте ви обрати мінімально достатній інструмент і відрізняєте клієнтський стан від даних з сервера.",
            answer:
              "Почати варто з локального стану і підняття його до найближчого спільного батька, якщо він потрібен кільком компонентам. Context прибирає prop drilling для рідко змінюваних даних (тема, мова, поточний користувач), але всі споживачі ре-рендеряться при зміні значення. Для складного клієнтського стану, що часто змінюється, беруть Redux Toolkit або Zustand із підпискою на окремі частини стану через селектори. Дані з сервера — це окремий вид стану: їх кешують, інвалідують і перезапитують, тому для них краще TanStack Query, а не ручне копіювання в Redux.",
            code: "const { data, isPending, error } = useQuery({\n  queryKey: [\"vacancies\", filters],\n  queryFn: () => fetchVacancies(filters),\n});",
            source: { title: "TanStack Query: Overview", url: "https://tanstack.com/query/latest/docs/framework/react/overview" },
            tech: "React",
          },
        ],
      },
      {
        id: "nextjs-rendering",
        title: "Next.js і рендеринг",
        items: [
          {
            id: "csr-ssr-ssg",
            q: "Чим відрізняються CSR, SSR, SSG і ISR? Коли що обрати?",
            wants: "Чи розумієте ви, де і коли генерується HTML, і як це впливає на SEO, швидкість і актуальність даних.",
            answer:
              "CSR: сервер віддає майже порожній HTML, контент рендериться в браузері після завантаження JS — підходить для кабінетів за логіном, але гірше для SEO та LCP. SSR: HTML генерується на сервері на кожен запит — свіжі й персоналізовані дані ціною часу відповіді сервера. SSG: сторінки генеруються під час білду і віддаються з CDN — найшвидше, для контенту, що рідко змінюється. ISR — це SSG з фоновою перегенерацією сторінки через заданий час або за запитом (revalidate), коли дані змінюються, але не на кожен запит.",
            code: "// app/jobs/[id]/page.tsx\nexport const revalidate = 3600; // ISR: оновлення раз на годину",
            source: { title: "Next.js: Incremental Static Regeneration (ISR)", url: "https://nextjs.org/docs/app/guides/incremental-static-regeneration" },
            tech: "Next.js",
          },
          {
            id: "server-components",
            q: "Що таке Server Components і чим вони відрізняються від Client Components?",
            wants: "Чи розумієте ви модель App Router і межу \"use client\".",
            answer:
              "Server Components рендеряться на сервері, можуть напряму читати дані (база, файли, секрети) і не додають свого коду в JS-бандл клієнта. Вони не можуть використовувати state, ефекти, обробники подій і браузерні API. Client Components позначаються директивою \"use client\" — вона визначає межу: файл і все, що він імпортує, потрапляє в клієнтський бандл і гідрується. У Next.js App Router компоненти за замовчуванням серверні, а клієнтськими роблять лише інтерактивні «листки» дерева.",
            code: "\"use client\";\nimport { useState } from \"react\";\nexport function LikeButton() {\n  const [liked, setLiked] = useState(false);\n  return <button onClick={() => setLiked(!liked)}>♥</button>;\n}",
            source: { title: "Next.js: Server and Client Components", url: "https://nextjs.org/docs/app/getting-started/server-and-client-components" },
            tech: "Next.js",
          },
        ],
      },
      {
        id: "html-css",
        title: "HTML і CSS",
        items: [
          {
            id: "box-model",
            q: "Що таке box model і що змінює box-sizing: border-box?",
            wants: "Чи розумієте ви, як рахується розмір елемента, і чому border-box ставлять у ресет.",
            answer:
              "Кожен елемент — це прямокутник із content, padding, border і margin. За замовчуванням box-sizing: content-box, і width задає лише ширину контенту, тож padding і border додаються зверху: width: 200px + padding 20px дає 240px. З border-box width включає padding і border, тому розміри передбачувані і легше верстати сітки у відсотках. Margin в обох випадках не входить у розмір, а вертикальні margin сусідніх блоків можуть схлопуватися.",
            code: "*, *::before, *::after {\n  box-sizing: border-box;\n}",
            source: { title: "MDN: box-sizing", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/box-sizing" },
          },
          {
            id: "specificity",
            q: "Як працює специфічність CSS-селекторів?",
            wants: "Чи вмієте ви пояснити, чому стиль «не застосовується», і уникаєте війни через !important.",
            answer:
              "Специфічність рахується трьома колонками: ID, потім класи/атрибути/псевдокласи, потім типи елементів і псевдоелементи; порівнюються зліва направо, тож один ID сильніший за будь-яку кількість класів. При рівній специфічності перемагає правило, оголошене пізніше. Inline-стилі сильніші за селектори, а !important перекриває звичайні оголошення, тому його краще уникати. :where() має нульову специфічність, а :is() і :not() беруть специфічність найсильнішого аргументу. Каскадні шари (@layer) дозволяють керувати пріоритетом без підвищення специфічності.",
            code: "#nav a        /* 1-0-1 */\n.menu .link   /* 0-2-0 */\n:where(.card) /* 0-0-0 */",
            source: { title: "MDN: Specificity", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Specificity" },
          },
          {
            id: "flex-grid-responsive",
            q: "Flexbox чи Grid? Як ви верстаєте адаптивно (mobile-first)?",
            wants: "Чи обираєте ви інструмент під задачу і вмієте будувати адаптивний layout без купи брейкпоінтів.",
            answer:
              "Flexbox — одновимірний layout: розподіл елементів у рядку або колонці, вирівнювання, навбари, кнопки, картки в ряд. Grid — двовимірний: рядки і колонки одночасно, макет сторінки, галереї, коли потрібне вирівнювання по обох осях. Mobile-first означає, що базові стилі пишуться для вузького екрана, а media queries з min-width додають складність для ширших. Багато адаптивності можна отримати без брейкпоінтів: repeat(auto-fit, minmax(...)), flex-wrap, clamp() для розмірів, а також не забути meta viewport.",
            code: ".grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));\n  gap: 16px;\n}\n@media (min-width: 768px) { .sidebar { display: block; } }",
            source: { title: "MDN: Responsive design", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design" },
          },
          {
            id: "semantic-a11y",
            q: "Навіщо семантичний HTML і як ви забезпечуєте доступність (accessibility)?",
            wants: "Чи знаєте ви базові практики a11y і розумієте, що нативні елементи кращі за div з ARIA.",
            answer:
              "Семантичні теги (header, nav, main, article, button, label) передають сенс браузеру, скрінрідерам і пошуковикам і дають поведінку «з коробки»: button фокусується і натискається з клавіатури, а div з onClick — ні. Основи доступності: alt для зображень, label для полів форм, логічна ієрархія заголовків, видимий фокус, робота з клавіатури і достатній контраст. ARIA доповнює семантику лише там, де HTML не вистачає (наприклад, кастомні таби чи комбобокс), — головне правило: «No ARIA is better than bad ARIA».",
            code: "<!-- погано -->\n<div class=\"btn\" onclick=\"save()\">Зберегти</div>\n<!-- добре -->\n<button type=\"button\" onclick=\"save()\">Зберегти</button>",
            source: { title: "W3C WAI-ARIA APG: Read Me First", url: "https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/" },
          },
        ],
      },
      {
        id: "performance",
        title: "Продуктивність",
        items: [
          {
            id: "core-web-vitals",
            q: "Що таке Core Web Vitals (LCP, INP, CLS) і як їх покращити?",
            wants: "Чи знаєте ви метрики, їхні порогові значення і конкретні способи вплинути на кожну.",
            answer:
              "LCP (Largest Contentful Paint) — коли відрендерився найбільший елемент екрана, добре — до 2,5 с; покращують оптимізацією головного зображення (preload, fetchpriority, сучасні формати), швидким TTFB і меншою кількістю блокуючих ресурсів. INP (Interaction to Next Paint) — затримка реакції на взаємодії, добре — до 200 мс; покращують розбиттям довгих задач і зменшенням JS на головному потоці. CLS (Cumulative Layout Shift) — стрибки верстки, добре — до 0,1; лікується заданими розмірами для зображень і реклами та резервуванням місця під динамічний контент. Оцінюють за 75-м перцентилем реальних користувачів (field data), а не лише за Lighthouse.",
            source: { title: "web.dev: Web Vitals", url: "https://web.dev/articles/vitals" },
          },
          {
            id: "code-splitting",
            q: "Що таке code splitting і lazy loading? Як їх зробити в React?",
            wants: "Чи вмієте ви зменшити початковий бандл і розумієте, що саме варто вантажити ліниво.",
            answer:
              "Code splitting розбиває бандл на частини, щоб користувач завантажував лише код потрібної сторінки або фічі; бандлер (Vite, Webpack) створює окремий chunk для кожного динамічного import(). У React для цього є lazy разом із Suspense, який показує fallback, поки компонент вантажиться. Ліниво варто вантажити роути, модалки, важкі редактори і графіки, а не дрібні компоненти першого екрана. Для зображень є нативний loading=\"lazy\", але не для LCP-зображення.",
            code: "const Chart = lazy(() => import(\"./Chart\"));\n\n<Suspense fallback={<Spinner />}>\n  <Chart data={data} />\n</Suspense>",
            source: { title: "React: lazy", url: "https://react.dev/reference/react/lazy" },
            tech: "React",
          },
        ],
      },
      {
        id: "browser-network",
        title: "Браузер і мережа",
        items: [
          {
            id: "cors",
            q: "Що таке CORS і чому запит працює в Postman, але падає в браузері?",
            wants: "Чи розумієте ви, що CORS — механізм браузера, який налаштовується на сервері, і що таке preflight.",
            answer:
              "Браузер за same-origin policy не дає JS читати відповіді з іншого origin (протокол + домен + порт). CORS — механізм, яким сервер дозволяє це заголовками, насамперед Access-Control-Allow-Origin. Для «непростих» запитів (наприклад, з Content-Type: application/json, PUT/DELETE або власними заголовками) браузер спершу надсилає preflight-запит OPTIONS і перевіряє Access-Control-Allow-Methods/Headers. Postman і бекенд не є браузером і цих обмежень не мають, тому виправляється це на сервері або через проксі, а не на фронтенді. Для запитів із cookies потрібні credentials: \"include\" і Access-Control-Allow-Credentials без «*» в origin.",
            source: { title: "MDN: Cross-Origin Resource Sharing (CORS)", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS" },
          },
          {
            id: "http-caching",
            q: "Як працює HTTP-кешування? Що таке Cache-Control і ETag?",
            wants: "Чи вмієте ви налаштувати кешування статики так, щоб і швидко, і без «застарілого» коду після деплою.",
            answer:
              "Cache-Control керує кешуванням: max-age — скільки секунд відповідь свіжа, no-cache — можна зберігати, але перед використанням треба перевірити на сервері, no-store — не кешувати взагалі. Після закінчення свіжості браузер робить умовний запит з If-None-Match (за ETag) або If-Modified-Since, і сервер відповідає 304 Not Modified без тіла, якщо нічого не змінилось. Типова схема: файли з хешем в імені (app.3f9a.js) — max-age=31536000, immutable, а HTML — no-cache, щоб після деплою одразу підтягувалися нові бандли.",
            code: "# статика з хешем в імені\nCache-Control: public, max-age=31536000, immutable\n# index.html\nCache-Control: no-cache",
            source: { title: "MDN: HTTP caching", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching" },
          },
        ],
      },
    ],
  },
  en: {
    title: "Frontend Interview Questions: 26 Questions with Answers",
    description:
      "Frontend interview questions with answers: JavaScript, TypeScript, React, Next.js, CSS, Core Web Vitals and CORS. What interviewers check and how to answer.",
    h1: "Frontend Developer Interview Questions",
    lead:
      "We picked the topics based on what employers actually require in live frontend job openings: React, TypeScript, performance, JavaScript, CSS and HTML. Every answer has been checked against official documentation, with a source link under each question.",
    categories: [
      {
        id: "javascript",
        title: "JavaScript",
        items: [
          {
            id: "event-loop",
            q: "How does the event loop work? What is the difference between microtasks and macrotasks?",
            wants: "Whether you understand the execution order of async code and why a Promise callback runs before setTimeout(fn, 0).",
            answer:
              "JavaScript runs code on a single thread: the event loop takes one task (macrotask) from the queue, such as a script, a setTimeout callback or an event handler, and runs it to completion. After each task, once the call stack is empty, the microtask queue is drained completely: then/catch/finally callbacks, await continuations, queueMicrotask and MutationObserver. Only after that can the browser render and pick the next macrotask. That is why microtasks always run before timers, and endlessly queuing microtasks blocks rendering.",
            code: "console.log(1);\nsetTimeout(() => console.log(4), 0);\nPromise.resolve().then(() => console.log(3));\nconsole.log(2);\n// 1, 2, 3, 4",
            source: { title: "MDN: Using microtasks in JavaScript with queueMicrotask()", url: "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide" },
            tech: "JavaScript",
          },
          {
            id: "closures",
            q: "What is a closure and where is it used in practice?",
            wants: "Whether you understand lexical environments and can give a real example, not just a definition.",
            answer:
              "A closure is a function bundled with the lexical environment it was created in: it keeps access to the outer function's variables even after that function has returned. In practice it powers private state (counters, modules), function factories, event handlers and callbacks that \"remember\" values. In React every render creates new closures, so stale state values inside effects and timers are exactly a closure effect.",
            code: "function makeCounter() {\n  let count = 0;\n  return () => ++count;\n}\nconst next = makeCounter();\nnext(); // 1\nnext(); // 2",
            source: { title: "MDN: Closures", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures" },
            tech: "JavaScript",
          },
          {
            id: "equality",
            q: "What is the difference between == and ===?",
            wants: "Whether you know about implicit type coercion and why code uses strict comparison.",
            answer:
              "=== (strict equality) compares without type conversion: different types are immediately false. == (loose equality) coerces types before comparing, so 0 == \"\" and \"1\" == 1 are both true. Special cases: NaN is not equal to anything, not even itself, and null == undefined is true. In practice you write ===, and == is sometimes used deliberately only for x == null (null or undefined); for NaN use Number.isNaN or Object.is.",
            code: "0 == \"\";          // true\n0 === \"\";         // false\nnull == undefined; // true\nNaN === NaN;       // false\nObject.is(NaN, NaN); // true",
            source: { title: "MDN: Equality comparisons and sameness", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness" },
            tech: "JavaScript",
          },
          {
            id: "var-let-const",
            q: "What is the difference between var, let and const? What is the TDZ?",
            wants: "Whether you understand scope, hoisting and the temporal dead zone, not just \"const can't change\".",
            answer:
              "var is function-scoped, hoisted and initialized with undefined, and can be redeclared. let and const are block-scoped and also hoisted, but until the declaration line they are in the temporal dead zone (TDZ): accessing them throws a ReferenceError. const prevents reassigning the variable but does not make an object immutable, so its properties can still change. The classic illustration is a loop with setTimeout: with let each iteration gets its own binding.",
            code: "console.log(a); // undefined\nvar a = 1;\nconsole.log(b); // ReferenceError (TDZ)\nlet b = 2;\nconst obj = { x: 1 };\nobj.x = 2; // ok, reassigning obj is an error",
            source: { title: "MDN: let", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let" },
            tech: "JavaScript",
          },
          {
            id: "this",
            q: "How is the value of this determined?",
            wants: "Whether you know that this depends on how a function is called and how arrow functions differ from regular ones.",
            answer:
              "In a regular function, this is determined at call time: for obj.method() it is obj, for a plain call fn() it is undefined in strict mode (or globalThis without it), and with new it is the new object. call, apply and bind set this explicitly. Arrow functions have no this of their own and take it from the enclosing scope, which makes them convenient for callbacks. A typical bug is passing a method as a callback (setTimeout(obj.method)) and losing the context.",
            code: "const user = {\n  name: \"Ann\",\n  hi() { return this.name; },\n};\nuser.hi();          // \"Ann\"\nconst f = user.hi;\nf();                // undefined / TypeError\nf.bind(user)();     // \"Ann\"",
            source: { title: "MDN: this", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this" },
            tech: "JavaScript",
          },
          {
            id: "promise-combinators",
            q: "What is the difference between Promise.all, Promise.allSettled and Promise.race?",
            wants: "Whether you can pick the right combinator for parallel requests and handle partial failures.",
            answer:
              "Promise.all waits for all promises to fulfill and returns an array of results, but rejects as soon as the first one rejects. Promise.allSettled never rejects: it waits for all of them to settle and returns { status, value | reason } objects, which is useful when you need results even if some fail. Promise.race settles the same way as the first promise to settle (fulfilled or rejected), for example to implement a request timeout. There is also Promise.any, which waits for the first successful result.",
            code: "const results = await Promise.allSettled([\n  fetch(\"/api/user\"),\n  fetch(\"/api/orders\"),\n]);\nresults.filter(r => r.status === \"rejected\");",
            source: { title: "MDN: Promise", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise" },
            tech: "JavaScript",
          },
          {
            id: "debounce-throttle",
            q: "What is the difference between debounce and throttle? When do you use each?",
            wants: "Whether you can limit how often expensive handlers run and choose the right technique for the job.",
            answer:
              "Debounce delays a call until events stop for a given time: the function fires once after the pause, the typical case being search-as-you-type. Throttle guarantees the function runs at most once per interval, even if events keep coming, which suits scroll, resize and mousemove. Both techniques are built on a timer and a closure.",
            code: "function debounce(fn, ms) {\n  let id;\n  return (...args) => {\n    clearTimeout(id);\n    id = setTimeout(() => fn(...args), ms);\n  };\n}",
            source: { title: "MDN Glossary: Debounce", url: "https://developer.mozilla.org/en-US/docs/Glossary/Debounce" },
            tech: "JavaScript",
          },
        ],
      },
      {
        id: "typescript",
        title: "TypeScript",
        items: [
          {
            id: "interface-vs-type",
            q: "What is the difference between interface and type?",
            wants: "Whether you know the real differences (declaration merging, union types), not just \"they're the same\".",
            answer:
              "Both describe the shape of an object and are interchangeable in most cases. An interface can be extended with extends and augmented by declaring it again (declaration merging), which is how library types are extended. A type is an alias for any type: unions, tuples, primitives, mapped and conditional types, and it is combined with &. The official docs suggest using interface by default for objects and type when you need features an interface doesn't have.",
            code: "interface User { id: number }\ninterface User { name: string } // merging\n\ntype Status = \"idle\" | \"loading\" | \"error\";\ntype Admin = User & { role: \"admin\" };",
            source: { title: "TypeScript Handbook: Everyday Types", url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html" },
            tech: "TypeScript",
          },
          {
            id: "unknown-vs-any",
            q: "How is unknown different from any? What is narrowing?",
            wants: "Whether you write type-safe code for external data (APIs, JSON) and know how to narrow types.",
            answer:
              "any turns off type checking: you can do anything with the value, and mistakes surface at runtime. unknown also accepts any value, but won't let you use it until you narrow the type. Narrowing is refining a type with checks the compiler understands: typeof, instanceof, in, equality checks, discriminated unions and custom type guards (value is T). For API responses and catch(e), the right choice is unknown plus a check.",
            code: "function len(x: unknown) {\n  if (typeof x === \"string\") return x.length;\n  if (Array.isArray(x)) return x.length;\n  return 0;\n}",
            source: { title: "TypeScript Handbook: Narrowing", url: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html" },
            tech: "TypeScript",
          },
          {
            id: "generics",
            q: "What are generics and why use extends constraints?",
            wants: "Whether you can write reusable typed functions and components without losing type information.",
            answer:
              "Generics are type parameters: a function or type works with different types and keeps the relationship between input and output instead of returning any. An extends constraint requires the type to have a certain shape, such as a length property or a key of an object. TypeScript often infers the type parameter from the arguments, so you rarely need to write it explicitly. Typical examples are useState<T>, API response helpers and typed lists.",
            code: "function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key];\n}\ngetProp({ id: 1, name: \"A\" }, \"name\"); // string",
            source: { title: "TypeScript Handbook: Generics", url: "https://www.typescriptlang.org/docs/handbook/2/generics.html" },
            tech: "TypeScript",
          },
          {
            id: "utility-types",
            q: "Which utility types do you use? What do Partial, Pick and Omit do?",
            wants: "Whether you derive new types from existing ones instead of duplicating definitions.",
            answer:
              "Utility types are built-in generic types that transform other types. Partial<T> makes all properties optional (handy for patch requests and forms), and Required<T> does the opposite. Pick<T, K> keeps only the listed keys, while Omit<T, K> removes them. Record<K, V> for dictionaries, Readonly<T>, ReturnType and Awaited are also common. This keeps a single source of truth for your model.",
            code: "type User = { id: number; name: string; email: string };\ntype UserPatch = Partial<Omit<User, \"id\">>;\ntype UserPreview = Pick<User, \"id\" | \"name\">;",
            source: { title: "TypeScript Handbook: Utility Types", url: "https://www.typescriptlang.org/docs/handbook/utility-types.html" },
            tech: "TypeScript",
          },
        ],
      },
      {
        id: "react",
        title: "React",
        items: [
          {
            id: "reconciliation-keys",
            q: "How does React update the DOM, and why do lists need keys?",
            wants: "Whether you understand reconciliation and why using the index as a key can break item state.",
            answer:
              "When state changes, React re-renders the component, compares the new tree with the previous one (reconciliation) and applies only the difference to the DOM. If the same element type sits in the same position, its state is preserved; a different type means the subtree is recreated from scratch. A key helps React match list items between renders, so it must be stable and unique among siblings, such as a database id. Using the index as a key breaks on insert, delete or sort: input state \"moves\" to other rows. Changing a key is also a way to deliberately reset a component's state.",
            source: { title: "React: Rendering Lists", url: "https://react.dev/learn/rendering-lists" },
            tech: "React",
          },
          {
            id: "useeffect",
            q: "How does useEffect work: the dependency array and the cleanup function?",
            wants: "Whether you know when an effect re-runs, why cleanup matters and when you don't need an effect at all.",
            answer:
              "useEffect synchronizes a component with an external system: subscriptions, timers, network, third-party widgets. The effect runs after render; with no array it runs after every render, with [] after mount, and with dependencies whenever one of them changes (compared with Object.is). The function returned from the effect is the cleanup: React calls it before the next run and on unmount, to unsubscribe or cancel a request. In development Strict Mode, React intentionally runs effects twice to surface missing cleanup. Values derived from props and state don't need an effect; compute them during render.",
            code: "useEffect(() => {\n  const controller = new AbortController();\n  fetch(`/api/users/${id}`, { signal: controller.signal });\n  return () => controller.abort();\n}, [id]);",
            source: { title: "React: useEffect", url: "https://react.dev/reference/react/useEffect" },
            tech: "React",
          },
          {
            id: "usememo-usecallback",
            q: "When do useMemo, useCallback and memo actually help? How do you avoid unnecessary re-renders?",
            wants: "Whether you see memoization as an optimization, not \"I wrap everything just in case\".",
            answer:
              "useMemo caches a computed value, useCallback caches the function itself between renders, and memo skips re-rendering a component when its props haven't changed. They make sense when a computation is genuinely expensive or when the value is passed to a memo component or used as an effect dependency; otherwise a new reference on every render defeats memoization anyway. Wrapping everything without measuring in the React Profiler is not worth it. Often a better fix is restructuring: move state down to the component that needs it, or pass JSX via children.",
            code: "const visible = useMemo(\n  () => filterTodos(todos, tab),\n  [todos, tab]\n);\nconst onSelect = useCallback((id) => setSelected(id), []);\n<List items={visible} onSelect={onSelect} /> // List = memo(...)",
            source: { title: "React: useMemo", url: "https://react.dev/reference/react/useMemo" },
            tech: "React",
          },
          {
            id: "controlled-uncontrolled",
            q: "What is the difference between controlled and uncontrolled components?",
            wants: "Whether you can work with forms and understand what the source of truth for a field's value is.",
            answer:
              "In a controlled input the value lives in React state: you pass value and onChange, and every keystroke goes through state, which is handy for validation, masks and dependent fields. In an uncontrolled input the DOM is the source of truth: you set only defaultValue and read the value via a ref or FormData on submit. An input must not switch between the two modes during its lifetime; React warns if value becomes undefined. Libraries like React Hook Form rely on uncontrolled fields for performance.",
            code: "const [email, setEmail] = useState(\"\");\n<input value={email} onChange={e => setEmail(e.target.value)} />\n\n<input name=\"city\" defaultValue=\"Kyiv\" /> // uncontrolled",
            source: { title: "React: <input>", url: "https://react.dev/reference/react-dom/components/input" },
            tech: "React",
          },
          {
            id: "state-management",
            q: "How do you organize state: lifting state up, Context, Redux/Zustand and server state (TanStack Query)?",
            wants: "Whether you choose the minimal sufficient tool and tell client state apart from server data.",
            answer:
              "Start with local state and lift it to the closest common parent when several components need it. Context removes prop drilling for rarely changing data (theme, language, current user), but every consumer re-renders when the value changes. For complex, frequently changing client state, use Redux Toolkit or Zustand, subscribing to slices of state through selectors. Server data is a separate kind of state: it has to be cached, invalidated and refetched, so TanStack Query fits it better than manually copying it into Redux.",
            code: "const { data, isPending, error } = useQuery({\n  queryKey: [\"vacancies\", filters],\n  queryFn: () => fetchVacancies(filters),\n});",
            source: { title: "TanStack Query: Overview", url: "https://tanstack.com/query/latest/docs/framework/react/overview" },
            tech: "React",
          },
        ],
      },
      {
        id: "nextjs-rendering",
        title: "Next.js and rendering",
        items: [
          {
            id: "csr-ssr-ssg",
            q: "What is the difference between CSR, SSR, SSG and ISR? When do you choose each?",
            wants: "Whether you understand where and when HTML is generated and how that affects SEO, speed and data freshness.",
            answer:
              "CSR: the server returns almost empty HTML and content renders in the browser after the JS loads; fine for logged-in dashboards, but worse for SEO and LCP. SSR: HTML is generated on the server for every request, giving fresh and personalized data at the cost of server response time. SSG: pages are generated at build time and served from a CDN; the fastest option, for content that rarely changes. ISR is SSG with background regeneration after a set time or on demand (revalidate), for data that changes, but not on every request.",
            code: "// app/jobs/[id]/page.tsx\nexport const revalidate = 3600; // ISR: regenerate hourly",
            source: { title: "Next.js: Incremental Static Regeneration (ISR)", url: "https://nextjs.org/docs/app/guides/incremental-static-regeneration" },
            tech: "Next.js",
          },
          {
            id: "server-components",
            q: "What are Server Components and how do they differ from Client Components?",
            wants: "Whether you understand the App Router model and the \"use client\" boundary.",
            answer:
              "Server Components render on the server, can read data directly (database, files, secrets) and add none of their code to the client JS bundle. They cannot use state, effects, event handlers or browser APIs. Client Components are marked with the \"use client\" directive, which defines a boundary: the file and everything it imports goes into the client bundle and is hydrated. In the Next.js App Router components are server components by default, and only the interactive \"leaves\" of the tree are made client components.",
            code: "\"use client\";\nimport { useState } from \"react\";\nexport function LikeButton() {\n  const [liked, setLiked] = useState(false);\n  return <button onClick={() => setLiked(!liked)}>♥</button>;\n}",
            source: { title: "Next.js: Server and Client Components", url: "https://nextjs.org/docs/app/getting-started/server-and-client-components" },
            tech: "Next.js",
          },
        ],
      },
      {
        id: "html-css",
        title: "HTML and CSS",
        items: [
          {
            id: "box-model",
            q: "What is the box model and what does box-sizing: border-box change?",
            wants: "Whether you understand how element size is calculated and why border-box goes into the reset.",
            answer:
              "Every element is a rectangle made of content, padding, border and margin. By default box-sizing is content-box, so width sets only the content width and padding and border are added on top: width: 200px plus 20px padding gives 240px. With border-box, width includes padding and border, so sizes are predictable and percentage-based layouts are easier. Margin is never part of the size, and vertical margins of adjacent blocks can collapse.",
            code: "*, *::before, *::after {\n  box-sizing: border-box;\n}",
            source: { title: "MDN: box-sizing", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/box-sizing" },
          },
          {
            id: "specificity",
            q: "How does CSS selector specificity work?",
            wants: "Whether you can explain why a style \"doesn't apply\" and avoid !important wars.",
            answer:
              "Specificity is calculated in three columns: IDs, then classes/attributes/pseudo-classes, then element types and pseudo-elements; they are compared left to right, so one ID beats any number of classes. With equal specificity, the rule declared later wins. Inline styles beat selectors, and !important overrides normal declarations, so it is best avoided. :where() has zero specificity, while :is() and :not() take the specificity of their most specific argument. Cascade layers (@layer) let you control priority without raising specificity.",
            code: "#nav a        /* 1-0-1 */\n.menu .link   /* 0-2-0 */\n:where(.card) /* 0-0-0 */",
            source: { title: "MDN: Specificity", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Specificity" },
          },
          {
            id: "flex-grid-responsive",
            q: "Flexbox or Grid? How do you build responsive layouts (mobile-first)?",
            wants: "Whether you pick the tool for the task and can build an adaptive layout without piles of breakpoints.",
            answer:
              "Flexbox is one-dimensional layout: distributing items in a row or column and aligning them, for navbars, buttons, cards in a row. Grid is two-dimensional: rows and columns at once, for page layouts, galleries and anything that needs alignment on both axes. Mobile-first means base styles target narrow screens, and min-width media queries add complexity for wider ones. Much of the responsiveness can come without breakpoints: repeat(auto-fit, minmax(...)), flex-wrap, clamp() for sizes, plus the viewport meta tag.",
            code: ".grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));\n  gap: 16px;\n}\n@media (min-width: 768px) { .sidebar { display: block; } }",
            source: { title: "MDN: Responsive design", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design" },
          },
          {
            id: "semantic-a11y",
            q: "Why use semantic HTML, and how do you ensure accessibility?",
            wants: "Whether you know basic a11y practices and understand that native elements beat a div with ARIA.",
            answer:
              "Semantic tags (header, nav, main, article, button, label) convey meaning to browsers, screen readers and search engines and give you behavior out of the box: a button is focusable and keyboard-operable, a div with onClick is not. Accessibility basics: alt text for images, labels for form fields, a logical heading hierarchy, visible focus, keyboard support and sufficient contrast. ARIA supplements semantics only where HTML falls short (for example custom tabs or a combobox); the main rule is \"No ARIA is better than bad ARIA\".",
            code: "<!-- bad -->\n<div class=\"btn\" onclick=\"save()\">Save</div>\n<!-- good -->\n<button type=\"button\" onclick=\"save()\">Save</button>",
            source: { title: "W3C WAI-ARIA APG: Read Me First", url: "https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/" },
          },
        ],
      },
      {
        id: "performance",
        title: "Performance",
        items: [
          {
            id: "core-web-vitals",
            q: "What are Core Web Vitals (LCP, INP, CLS) and how do you improve them?",
            wants: "Whether you know the metrics, their thresholds and concrete ways to move each one.",
            answer:
              "LCP (Largest Contentful Paint) is when the largest element on screen renders; good is 2.5 s or less, improved by optimizing the hero image (preload, fetchpriority, modern formats), a fast TTFB and fewer render-blocking resources. INP (Interaction to Next Paint) is the latency of responding to interactions; good is 200 ms or less, improved by breaking up long tasks and reducing JS on the main thread. CLS (Cumulative Layout Shift) measures layout jumps; good is 0.1 or less, fixed by setting dimensions for images and ads and reserving space for dynamic content. They are assessed at the 75th percentile of real users (field data), not only in Lighthouse.",
            source: { title: "web.dev: Web Vitals", url: "https://web.dev/articles/vitals" },
          },
          {
            id: "code-splitting",
            q: "What are code splitting and lazy loading? How do you do them in React?",
            wants: "Whether you can shrink the initial bundle and know what is worth loading lazily.",
            answer:
              "Code splitting breaks the bundle into chunks so the user downloads only the code for the current page or feature; the bundler (Vite, Webpack) creates a separate chunk for each dynamic import(). In React this is done with lazy together with Suspense, which shows a fallback while the component loads. Routes, modals, heavy editors and charts are good candidates for lazy loading, not small above-the-fold components. Images have native loading=\"lazy\", but not for the LCP image.",
            code: "const Chart = lazy(() => import(\"./Chart\"));\n\n<Suspense fallback={<Spinner />}>\n  <Chart data={data} />\n</Suspense>",
            source: { title: "React: lazy", url: "https://react.dev/reference/react/lazy" },
            tech: "React",
          },
        ],
      },
      {
        id: "browser-network",
        title: "Browser and network",
        items: [
          {
            id: "cors",
            q: "What is CORS, and why does a request work in Postman but fail in the browser?",
            wants: "Whether you understand that CORS is a browser mechanism configured on the server, and what a preflight is.",
            answer:
              "Under the same-origin policy, the browser doesn't let JS read responses from another origin (scheme + domain + port). CORS is the mechanism by which a server allows it via headers, primarily Access-Control-Allow-Origin. For non-simple requests (for example with Content-Type: application/json, PUT/DELETE or custom headers) the browser first sends an OPTIONS preflight and checks Access-Control-Allow-Methods/Headers. Postman and backends are not browsers and have no such restriction, so the fix belongs on the server or in a proxy, not in frontend code. Requests with cookies need credentials: \"include\" and Access-Control-Allow-Credentials, with no \"*\" as the origin.",
            source: { title: "MDN: Cross-Origin Resource Sharing (CORS)", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS" },
          },
          {
            id: "http-caching",
            q: "How does HTTP caching work? What are Cache-Control and ETag?",
            wants: "Whether you can configure static asset caching that is both fast and free of stale code after a deploy.",
            answer:
              "Cache-Control drives caching: max-age is how many seconds a response stays fresh, no-cache means it may be stored but must be revalidated with the server before use, and no-store means don't cache at all. Once a response is stale, the browser sends a conditional request with If-None-Match (using the ETag) or If-Modified-Since, and the server replies 304 Not Modified with no body if nothing changed. A typical setup: hashed file names (app.3f9a.js) get max-age=31536000, immutable, while HTML gets no-cache so new bundles are picked up right after a deploy.",
            code: "# hashed static assets\nCache-Control: public, max-age=31536000, immutable\n# index.html\nCache-Control: no-cache",
            source: { title: "MDN: HTTP caching", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching" },
          },
        ],
      },
    ],
  },
};
