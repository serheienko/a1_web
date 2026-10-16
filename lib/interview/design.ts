import type { InterviewContent } from "./types";

const SRC = {
  nnInterviews: { title: "NN/G: User Interviews 101", url: "https://www.nngroup.com/articles/user-interviews/" },
  nnFiveUsers: { title: "NN/G: Why You Only Need to Test with 5 Users", url: "https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/" },
  nnPersonasJtbd: { title: "NN/G: Personas vs. Jobs-to-Be-Done", url: "https://www.nngroup.com/articles/personas-jobs-be-done/" },
  nnCheatSheet: { title: "NN/G: UX Research Cheat Sheet", url: "https://www.nngroup.com/articles/ux-research-cheat-sheet/" },
  nnCardSorting: { title: "NN/G: Card Sorting: Definition", url: "https://www.nngroup.com/articles/card-sorting-definition/" },
  nnIaNav: { title: "NN/G: Information Architecture vs. Navigation", url: "https://www.nngroup.com/articles/ia-vs-navigation/" },
  nnProgressive: { title: "NN/G: Progressive Disclosure", url: "https://www.nngroup.com/articles/progressive-disclosure/" },
  nnDesignSystems: { title: "NN/G: Design Systems 101", url: "https://www.nngroup.com/articles/design-systems-101/" },
  m3Tokens: { title: "Material Design 3: Design tokens", url: "https://m3.material.io/foundations/design-tokens/overview" },
  figmaVariables: { title: "Figma Help: Guide to variables in Figma", url: "https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma" },
  mdnDark: { title: "MDN: prefers-color-scheme", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme" },
  wcagContrast: { title: "W3C WAI: Understanding SC 1.4.3 Contrast (Minimum)", url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" },
  wcagColor: { title: "W3C WAI: Understanding SC 1.4.1 Use of Color", url: "https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html" },
  wcagTarget: { title: "W3C WAI: Understanding SC 2.5.8 Target Size (Minimum)", url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html" },
  wcagFocus: { title: "W3C WAI: Understanding SC 2.4.7 Focus Visible", url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html" },
  figmaAutoLayout: { title: "Figma Help: Explore auto layout properties", url: "https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties" },
  figmaComponents: { title: "Figma Help: Guide to components in Figma", url: "https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma" },
  higTypography: { title: "Apple HIG: Typography", url: "https://developer.apple.com/design/human-interface-guidelines/typography" },
  hicks: { title: "Laws of UX: Hick's Law", url: "https://lawsofux.com/hicks-law/" },
  higTabBars: { title: "Apple HIG: Tab bars", url: "https://developer.apple.com/design/human-interface-guidelines/tab-bars" },
  fitts: { title: "Laws of UX: Fitts's Law", url: "https://lawsofux.com/fittss-law/" },
  jakob: { title: "Laws of UX: Jakob's Law", url: "https://lawsofux.com/jakobs-law/" },
  nnSuccess: { title: "NN/G: Success Rate: The Simplest Usability Metric", url: "https://www.nngroup.com/articles/success-rate-the-simplest-usability-metric/" },
  figmaDevMode: { title: "Figma Help: Guide to Dev Mode", url: "https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode" },
  nnCritiques: { title: "NN/G: Design Critiques: Encourage a Positive Culture", url: "https://www.nngroup.com/articles/design-critiques/" },
  nnDesignThinking: { title: "NN/G: Design Thinking 101", url: "https://www.nngroup.com/articles/design-thinking/" },
};

export const DESIGN_INTERVIEW: InterviewContent = {
  uk: {
    title: "Питання на співбесіді UI/UX дизайнера: 26 питань",
    description:
      "Питання на співбесіді UI/UX дизайнера з відповідями: UX-дослідження, дизайн-системи, доступність WCAG, Figma, мобільні патерни, метрики та портфоліо.",
    h1: "Питання на співбесіді UI/UX дизайнера",
    lead:
      "Ми відібрали теми за тим, що роботодавці реально вимагають у вакансіях дизайнерів: UX-дослідження, дизайн-системи, доступність, Figma, мобільні патерни та співпраця з розробниками. Відповіді звірено з NN/g, W3C, Material Design, Apple HIG і документацією Figma.",
    categories: [
      {
        id: "ux-research",
        title: "UX-дослідження",
        items: [
          {
            id: "user-interviews",
            q: "Як ви проводите інтерв'ю з користувачами? Яких помилок уникаєте?",
            wants: "Чи вмієте ви ставити відкриті питання про реальну поведінку, а не підводити користувача до потрібної відповіді.",
            answer:
              "Починаю з цілі дослідження і гайда з відкритими питаннями, які просять розповісти про конкретний минулий досвід («розкажіть про останній раз, коли ви…»), а не про гіпотетичне майбутнє. Не веду до відповіді, не продаю ідею і не перебиваю, а паузи й уточнення («чому?») використовую для глибини. Типові помилки: навідні питання, питання «чи ви б користувались», розмова про рішення замість проблеми. Інтерв'ю дає якісні інсайти про мотивацію, але не відповідає на питання «скільки людей».",
            source: SRC.nnInterviews,
          },
          {
            id: "five-users",
            q: "Скільки користувачів потрібно для юзабіліті-тесту? Чому не обов'язково багато?",
            wants: "Чи розумієте ви різницю між якісним і кількісним тестуванням та вмієте обґрунтувати розмір вибірки.",
            answer:
              "Для якісного юзабіліті-тесту, мета якого знайти проблеми, а не виміряти їх частку, NN/g радить близько 5 учасників на раунд: кожен наступний користувач дедалі частіше повторює вже знайдені проблеми. Ефективніше зробити кілька малих раундів із виправленнями між ними, ніж один великий. Якщо у продукту різні групи користувачів, беруть по кілька людей з кожної групи. Для кількісних метрик (час, частка успіху) вибірка потрібна значно більша.",
            source: SRC.nnFiveUsers,
          },
          {
            id: "personas-jtbd",
            q: "Чим персони відрізняються від Jobs-to-Be-Done? Що використовувати?",
            wants: "Чи знаєте ви обидва підходи і розумієте, що вони доповнюють, а не замінюють один одного.",
            answer:
              "Персона описує типового користувача: його контекст, цілі, поведінку й болі. Jobs-to-Be-Done фокусується на задачі, яку людина «наймає» продукт виконати, незалежно від того, хто вона. Персони допомагають співчувати людям і узгоджувати команду, JTBD — бачити мотивацію та конкуренцію на рівні задач. На практиці їх часто поєднують: персона дає обличчя, а JTBD — причину використання. Обидва підходи мають спиратися на дані дослідження, а не на припущення.",
            source: SRC.nnPersonasJtbd,
          },
          {
            id: "research-methods",
            q: "Як ви обираєте метод UX-дослідження: якісне чи кількісне, що люди кажуть чи що роблять?",
            wants: "Чи розумієте ви, що метод залежить від питання і стадії проєкту, а не від звички.",
            answer:
              "Метод обираю за питанням і етапом. Якісні методи (інтерв'ю, спостереження, юзабіліті-тести) відповідають на «чому» й «як», кількісні (опитування, аналітика, A/B-тести) — на «скільки». Окремо розрізняю поведінкові дані («що люди роблять») і самозвітні («що кажуть»): вони можуть розходитись, тому їх краще поєднувати. На ранніх етапах більше досліджень для розуміння проблеми, пізніше — тести рішень і вимірювання.",
            source: SRC.nnCheatSheet,
          },
        ],
      },
      {
        id: "ia",
        title: "Інформаційна архітектура",
        items: [
          {
            id: "card-sorting",
            q: "Що таке card sorting і коли його проводять?",
            wants: "Чи вмієте ви будувати структуру контенту на основі ментальної моделі користувачів.",
            answer:
              "Card sorting — метод, коли учасники групують картки з пунктами контенту та за потреби називають групи. Так дізнаються, як користувачі уявляють собі структуру, і використовують це для меню та категорій. У відкритому сортуванні учасники самі придумують назви груп, у закритому — розкладають картки по готових категоріях. Метод використовують на етапі проєктування або редизайну навігації; перевірити результат потім можна tree-тестом.",
            source: SRC.nnCardSorting,
          },
          {
            id: "ia-vs-nav",
            q: "Чим інформаційна архітектура відрізняється від навігації?",
            wants: "Чи розрізняєте ви структуру контенту і інтерфейсні елементи, які її показують.",
            answer:
              "Інформаційна архітектура — це організація та позначення контенту: як він згрупований, названий і пов'язаний. Навігація — це інтерфейсні елементи (меню, вкладки, хлібні крихти), що допомагають користувачу рухатися цією структурою. Хороша навігація не врятує погану архітектуру, а добра архітектура може мати кілька видів навігації. Тому спочатку проєктують структуру і назви, а вже потім візуальні патерни меню.",
            source: SRC.nnIaNav,
          },
          {
            id: "progressive-disclosure",
            q: "Що таке progressive disclosure? Наведіть приклад.",
            wants: "Чи вмієте ви зменшувати складність інтерфейсу, не ховаючи від користувача важливе.",
            answer:
              "Progressive disclosure — це підхід, коли спочатку показують лише найважливіше та найчастіше потрібне, а розширені або рідкісні опції відкриваються на вимогу. Приклади: розширені фільтри за кнопкою, багатокроковий онбординг, «Показати більше», розкривні секції в налаштуваннях. Він знижує когнітивне навантаження для новачків і лишає потужність для досвідчених. Ризик — сховати те, що потрібно багатьом, тому рівні варто визначати за даними про використання.",
            source: SRC.nnProgressive,
          },
        ],
      },
      {
        id: "design-systems",
        title: "Дизайн-системи та токени",
        items: [
          {
            id: "what-is-ds",
            q: "Що таке дизайн-система і навіщо вона потрібна продуктовій команді?",
            wants: "Чи розумієте ви, що дизайн-система — це не лише Figma-бібліотека, а спільна мова дизайну й розробки.",
            answer:
              "Дизайн-система — це набір повторно використовуваних компонентів, стандартів і правил, за якими команда будує продукт, разом із документацією та рекомендаціями щодо використання. Вона дає консистентність, пришвидшує роботу й зменшує дублювання між дизайнерами та розробниками. Важливо, що система існує і в дизайні, і в коді та має відповідальних за підтримку. Без цього бібліотека швидко розходиться з реальним продуктом.",
            source: SRC.nnDesignSystems,
          },
          {
            id: "design-tokens",
            q: "Що таке design tokens і чому їх використовують замість прямих значень?",
            wants: "Чи вмієте ви відокремлювати рішення («колір дії») від значення («#0B57D0») і розумієте користь для тем.",
            answer:
              "Design token — іменована одиниця рішення дизайну: колір, відступ, радіус, типографіка. Замість значення #0B57D0 у макеті використовують токен на кшталт color-primary, і його значення змінюється в одному місці. Це дає узгодженість між Figma та кодом, легко підтримує теми (світла/темна) і бренди. У Material Design токени мають рівні: референсні (сирі значення), системні (ролі) та компонентні.",
            code: ":root {\n  --color-primary: #0b57d0;\n  --space-4: 16px;\n  --radius-md: 12px;\n}\n.button { background: var(--color-primary); padding: var(--space-4); }",
            source: SRC.m3Tokens,
          },
          {
            id: "figma-variables",
            q: "Як ви організуєте змінні (variables) у Figma для тем і режимів?",
            wants: "Чи вмієте ви налаштувати колекції змінних з режимами та прив'язати їх до компонентів.",
            answer:
              "Змінні у Figma зберігають значення (колір, число, рядок, булеве) і об'єднуються в колекції. Режими (modes) дозволяють мати різні значення однієї змінної, наприклад для світлої та темної теми або різних брендів. Практика: спершу базова колекція сирих значень, поверх неї семантична (surface, on-surface, primary) з режимами, і компоненти посилаються лише на семантичні змінні. Тоді перемикання режиму на рівні кадру змінює весь макет без ручної правки.",
            source: SRC.figmaVariables,
          },
          {
            id: "dark-mode",
            q: "Як ви проєктуєте темну тему? Чи достатньо просто інвертувати кольори?",
            wants: "Чи розумієте ви, що темна тема потребує окремих рішень щодо поверхонь, контрасту й акцентів.",
            answer:
              "Інвертувати кольори недостатньо: потрібна окрема палітра з семантичними ролями (поверхня, текст на поверхні, акцент), перевіреними на контраст. Чистий чорний фон із білим текстом часто втомлює, тому беруть темно-сірі поверхні, а ієрархію глибини передають відтінком, а не лише тінями. Насичені акценти зазвичай трохи приглушують. У вебі систему тему можна враховувати через media query prefers-color-scheme, а перемикач дає користувачу вибір.",
            code: "@media (prefers-color-scheme: dark) {\n  :root {\n    --surface: #141218;\n    --on-surface: #e6e0e9;\n  }\n}",
            source: SRC.mdnDark,
          },
        ],
      },
      {
        id: "accessibility",
        title: "Доступність (WCAG)",
        items: [
          {
            id: "contrast",
            q: "Які вимоги WCAG до контрасту тексту? Як їх перевіряєте?",
            wants: "Чи знаєте ви конкретні співвідношення і вмієте перевіряти їх у процесі роботи, а не після розробки.",
            answer:
              "Критерій 1.4.3 (рівень AA) вимагає контрасту щонайменше 4,5:1 для звичайного тексту та 3:1 для великого (від 18 pt або 14 pt жирним). Це стосується тексту й зображень тексту, із винятками для декоративних елементів і логотипів. Контраст перевіряю ще в Figma, використовуючи плагіни чи вбудовані інструменти для обчислення співвідношення, і закладаю його в семантичні токени. Стани disabled, плейсхолдери й текст на зображеннях теж варто перевіряти.",
            source: SRC.wcagContrast,
          },
          {
            id: "color-only",
            q: "Чому не можна передавати інформацію лише кольором? Наведіть приклад.",
            wants: "Чи враховуєте ви користувачів із порушеннями кольоросприйняття і що робите замість цього.",
            answer:
              "Критерій 1.4.1 забороняє робити колір єдиним способом передати інформацію, вказати дію чи виділити елемент: люди з порушеннями кольорового зору або на сірому екрані просто не побачать різниці. Приклад: поле з помилкою, виділене лише червоною рамкою, або посилання в тексті, що відрізняється лише кольором. Додаю другий канал: іконку, текст помилки, підкреслення, шаблон у графіках. Це корисно і в яскравому світлі чи на поганих екранах.",
            source: SRC.wcagColor,
          },
          {
            id: "target-size",
            q: "Яким має бути розмір інтерактивних елементів для дотику та курсора?",
            wants: "Чи знаєте ви мінімум з WCAG і розумієте, що відступи теж важливі.",
            answer:
              "WCAG 2.2 у критерії 2.5.8 (AA) вимагає, щоб цілі вказівника мали розмір щонайменше 24×24 CSS-пікселі, або навколо них був достатній відступ. Є винятки, наприклад для посилань у реченні. Для зручності на мобільних зазвичай беруть більше: платформні рекомендації називають близько 44 pt в iOS та 48 dp в Android. Малі й щільні зони дотику збільшують кількість помилкових натискань, особливо для людей з порушеннями моторики.",
            source: SRC.wcagTarget,
          },
          {
            id: "focus-visible",
            q: "Чому не можна просто прибрати outline у кнопок і посилань?",
            wants: "Чи розумієте ви роботу з клавіатури та роль видимого фокусу в дизайні.",
            answer:
              "Критерій 2.4.7 (AA) вимагає, щоб будь-який елемент, яким керують з клавіатури, мав видимий індикатор фокусу. Без нього користувачі клавіатури, програм екранного доступу чи перемикачів не бачать, де вони перебувають на сторінці. Замість видалення outline його слід дизайнити: задати контрастний стиль для всіх інтерактивних елементів у токенах дизайн-системи. Окремо перевіряю порядок фокусу, щоб він збігався з візуальним порядком.",
            source: SRC.wcagFocus,
          },
        ],
      },
      {
        id: "figma-ui",
        title: "Figma та основи UI",
        items: [
          {
            id: "auto-layout",
            q: "Як працює Auto Layout у Figma і чим корисний для адаптивних макетів?",
            wants: "Чи володієте ви Auto Layout на рівні, достатньому, щоб будувати компоненти, які не ламаються від зміни контенту.",
            answer:
              "Auto Layout автоматично розташовує дочірні елементи у рядок чи стовпець із заданими відступами та паддінгами, а розмір фрейму підлаштовується під контент. Для кожного елемента вказують поведінку: Fixed, Hug contents (за вмістом) або Fill container (на весь контейнер). Завдяки цьому кнопка росте разом із текстом, а список — із кількістю рядків. Поєднання вкладених Auto Layout-фреймів дає макети, що поводяться ближче до flexbox у CSS і полегшують передачу розробникам.",
            source: SRC.figmaAutoLayout,
          },
          {
            id: "components-variants",
            q: "Що таке компоненти, екземпляри та варіанти у Figma? Як будуєте компонент кнопки?",
            wants: "Чи вмієте ви структурувати компонент з властивостями, а не створювати десятки окремих копій.",
            answer:
              "Основний компонент (main component) — джерело, а його екземпляри (instances) успадковують зміни. Варіанти групують схожі версії одного компонента в набір, а властивості (properties) керують ними: тип (primary/secondary), розмір, стан (default, hover, disabled), іконка, текст. Кнопку будую на Auto Layout з варіантами за станом і розміром та властивостями для тексту й іконок. Перевизначення в екземплярах мають бути обмежені, щоб не ламати систему.",
            source: SRC.figmaComponents,
          },
          {
            id: "typography",
            q: "Як ви будуєте типографічну шкалу та ієрархію тексту в інтерфейсі?",
            wants: "Чи розумієте ви роль розмірів, ваг і міжрядкового інтервалу, а не лише обираєте шрифт за смаком.",
            answer:
              "Типографічна шкала — обмежений набір стилів (заголовки, основний текст, підписи) з визначеними розміром, вагою та міжрядковим інтервалом, закріплений у токенах. Ієрархію створюють розміром, вагою й контрастом, а не десятками різних шрифтів. На платформах корисно спиратися на системні стилі: Apple рекомендує Dynamic Type, щоб користувачі могли змінювати розмір тексту. Макет має витримувати збільшений текст без обрізання та перекриттів.",
            source: SRC.higTypography,
          },
          {
            id: "hicks-law",
            q: "Як закон Хіка впливає на ваші рішення в інтерфейсі?",
            wants: "Чи вмієте ви застосовувати принципи UX обґрунтовано і не перебільшувати їх.",
            answer:
              "Закон Хіка стверджує, що час ухвалення рішення зростає з кількістю та складністю варіантів. На практиці це підстава зменшувати кількість одночасних виборів: групувати пункти меню, виділяти головну дію, розбивати довгі форми на кроки. Це не означає «менше завжди краще»: надто спрощений інтерфейс може ховати потрібне. Тому принцип доповнюю дослідженнями та тестами, а не використовую як єдиний аргумент.",
            source: SRC.hicks,
          },
        ],
      },
      {
        id: "mobile",
        title: "Мобільні патерни",
        items: [
          {
            id: "ios-android-nav",
            q: "Як відрізняється нижня навігація в iOS і Android? Скільки пунктів доречно?",
            wants: "Чи знаєте ви платформні гайдлайни і вмієте адаптувати рішення під платформу.",
            answer:
              "В iOS використовують tab bar для перемикання між основними розділами застосунку, в Material Design — navigation bar. Обидва підходять для невеликої кількості рівноцінних розділів верхнього рівня: Material радить 3–5 пунктів, а на iPhone tab bar теж зазвичай обмежений 5 вкладками. Кожен пункт має іконку та короткий підпис, а активний стан чітко виділений. Додаткові або рідкісні розділи переносять у меню чи профіль, а не додають шосту вкладку.",
            source: SRC.higTabBars,
          },
          {
            id: "thumb-fitts",
            q: "Як закон Фіттса впливає на проєктування мобільних інтерфейсів?",
            wants: "Чи враховуєте ви розмір і відстань до цілі та зручність дотику великим пальцем.",
            answer:
              "Закон Фіттса: час досягнення цілі залежить від відстані до неї та її розміру. Тому важливі й часті дії роблять великими й розташовують ближче до зони, яку легко дістати великим пальцем, а небезпечні дії — подалі від частих. Між цілями потрібні відступи, щоб уникнути хибних натискань. На великих телефонах це причина, чому основні контроли переносять з верху екрана вниз.",
            source: SRC.fitts,
          },
          {
            id: "jakobs-law",
            q: "Чому не варто винаходити власні патерни для типових задач?",
            wants: "Чи розумієте ви, що користувачі переносять очікування з інших продуктів, і знаєте, коли відхилятись від норми.",
            answer:
              "За законом Якоба користувачі проводять більшість часу на інших сайтах і застосунках, тому очікують, що ваш працюватиме так само. Знайомі патерни (пошук, кошик, вкладки, жести платформи) знижують навчання й помилки. Відхилятись варто свідомо, коли нестандартне рішення дає реальну вигоду, і це треба перевірити тестом з користувачами. На мобільних слід поважати платформні конвенції iOS та Android.",
            source: SRC.jakob,
          },
        ],
      },
      {
        id: "metrics-collab-portfolio",
        title: "Метрики, співпраця та портфоліо",
        items: [
          {
            id: "ux-metrics",
            q: "Як ви вимірюєте якість UX? Які метрики використовуєте?",
            wants: "Чи вмієте ви пов'язати дизайн-рішення з вимірюваним результатом, а не говорити «стало зручніше».",
            answer:
              "Поєдную поведінкові та суб'єктивні метрики. Поведінкові: рівень успіху виконання задачі (частка користувачів, які впоралися), час на задачу, кількість помилок, конверсія в аналітиці. Суб'єктивні: опитування на кшталт SUS чи оцінка легкості. Success rate — найпростіша й зрозуміла метрика юзабіліті. Перед змінами фіксую базовий рівень, щоб порівняти після релізу.",
            source: SRC.nnSuccess,
          },
          {
            id: "dev-handoff",
            q: "Як ви передаєте макети розробникам, щоб зменшити кількість питань?",
            wants: "Чи вмієте ви працювати з розробниками як партнер, а не передавати «картинки».",
            answer:
              "Використовую компоненти й токени, що збігаються з кодовою базою, тож розробник бачить ті самі назви. У Figma для цього є Dev Mode: режим для розробників, де видно розміри, відступи, стилі та код-фрагменти, а також статуси готовності. Додаю всі стани (hover, error, empty, loading), поведінку на різних розмірах екрана та нотатки про взаємодії. Узгоджую рішення з розробниками на ранньому етапі, щоб оцінити складність до фінального макета.",
            source: SRC.figmaDevMode,
          },
          {
            id: "design-critique",
            q: "Як ви даєте та отримуєте зворотний зв'язок на дизайн-рев'ю?",
            wants: "Чи вмієте ви обговорювати роботу предметно, без особистого й без захисної реакції.",
            answer:
              "Перед рев'ю формулюю контекст: проблему, цілі та яку саме думку хочу почути. Критику прив'язую до цілей користувача й продукту, а не до смаку («мені подобається»). Даючи фідбек, описую проблему та її наслідок, а не нав'язую рішення. Приймаючи, не виправдовуюсь одразу, а уточнюю й фіксую висновки. Така культура критики допомагає покращувати рішення і довіру в команді.",
            source: SRC.nnCritiques,
          },
          {
            id: "case-study",
            q: "Розкажіть про проєкт із портфоліо: яку проблему вирішували і яким був ваш внесок?",
            wants: "Чи вмієте ви структуровано розповісти процес, власну роль, рішення та результат із цифрами або висновками.",
            answer:
              "Структура розповіді: контекст і проблема, ваша роль у команді, дослідження та інсайти, варіанти рішень і чому обрали саме це, тести, результат та висновки. Процес зручно співвіднести з етапами дизайн-мислення: empathize, define, ideate, prototype, test. Чесно кажіть, що зробили саме ви, а що команда, і показуйте компроміси та помилки. Результат підкріплюйте метриками або якісним фідбеком, а не лише красивими екранами.",
            source: SRC.nnDesignThinking,
          },
        ],
      },
    ],
  },
  en: {
    title: "UI/UX Designer Interview Questions: 26 Questions",
    description:
      "UI/UX designer interview questions with answers: UX research, design systems, WCAG accessibility, Figma, mobile patterns, UX metrics and portfolio case studies.",
    h1: "UI/UX designer interview questions and answers",
    lead:
      "We picked these questions based on what employers actually require in live design job postings: UX research, design systems, accessibility, Figma, mobile patterns and working with developers. Answers are checked against NN/g, W3C, Material Design, Apple HIG and Figma docs.",
    categories: [
      {
        id: "ux-research",
        title: "UX research",
        items: [
          {
            id: "user-interviews",
            q: "How do you run user interviews? What mistakes do you avoid?",
            wants: "Whether you can ask open questions about real behaviour instead of leading users to the answer you want.",
            answer:
              "I start with a research goal and a guide of open questions that ask about specific past experiences (\"tell me about the last time you...\") rather than hypothetical futures. I don't lead, pitch my idea or interrupt, and I use pauses and follow-ups (\"why?\") for depth. Common mistakes: leading questions, \"would you use this?\" questions, and discussing solutions instead of problems. Interviews give qualitative insight into motivation, but they don't tell you how many people share it.",
            source: SRC.nnInterviews,
          },
          {
            id: "five-users",
            q: "How many users do you need for a usability test? Why not a lot more?",
            wants: "Whether you understand qualitative versus quantitative testing and can justify a sample size.",
            answer:
              "For a qualitative usability test, whose goal is to find problems rather than measure their prevalence, NN/g recommends about 5 participants per round: each additional user increasingly repeats problems already found. It is more effective to run several small rounds with fixes in between than one big study. If the product has distinct user groups, you test a few people from each. Quantitative metrics (time, success rate) require a much larger sample.",
            source: SRC.nnFiveUsers,
          },
          {
            id: "personas-jtbd",
            q: "How do personas differ from Jobs-to-Be-Done? Which do you use?",
            wants: "Whether you know both approaches and understand they complement rather than replace each other.",
            answer:
              "A persona describes a typical user: context, goals, behaviour and pain points. Jobs-to-Be-Done focuses on the task a person \"hires\" a product to do, regardless of who they are. Personas help build empathy and align the team; JTBD helps you see motivation and competition at the task level. In practice they are often combined: the persona gives a face and JTBD gives the reason for using the product. Both should come from research data, not assumptions.",
            source: SRC.nnPersonasJtbd,
          },
          {
            id: "research-methods",
            q: "How do you choose a UX research method: qualitative or quantitative, what people say or what they do?",
            wants: "Whether you understand that the method depends on the question and project stage, not habit.",
            answer:
              "I choose by question and stage. Qualitative methods (interviews, observation, usability tests) answer \"why\" and \"how\"; quantitative ones (surveys, analytics, A/B tests) answer \"how many\". I also separate behavioural data (what people do) from self-reported data (what they say): the two can diverge, so they work best together. Early on I do more research to understand the problem; later I test solutions and measure results.",
            source: SRC.nnCheatSheet,
          },
        ],
      },
      {
        id: "ia",
        title: "Information architecture",
        items: [
          {
            id: "card-sorting",
            q: "What is card sorting and when do you run it?",
            wants: "Whether you can structure content based on users' mental models.",
            answer:
              "Card sorting is a method where participants group cards representing content items and, if needed, name the groups. It reveals how users think the content should be organised, and the results feed menus and categories. In open sorting participants invent their own group names; in closed sorting they place cards into predefined categories. You run it when designing or redesigning navigation, and you can validate the result afterwards with a tree test.",
            source: SRC.nnCardSorting,
          },
          {
            id: "ia-vs-nav",
            q: "How does information architecture differ from navigation?",
            wants: "Whether you distinguish content structure from the interface elements that expose it.",
            answer:
              "Information architecture is how content is organised and labelled: how it is grouped, named and linked. Navigation is the set of interface elements (menus, tabs, breadcrumbs) that help users move through that structure. Good navigation can't rescue a bad architecture, and a good architecture can have several kinds of navigation. So you design structure and labels first and the visual menu patterns after.",
            source: SRC.nnIaNav,
          },
          {
            id: "progressive-disclosure",
            q: "What is progressive disclosure? Give an example.",
            wants: "Whether you can reduce interface complexity without hiding what matters.",
            answer:
              "Progressive disclosure shows only the most important and most frequently needed options first, and reveals advanced or rare ones on demand. Examples: advanced filters behind a button, a multi-step onboarding, \"Show more\", collapsible sections in settings. It lowers cognitive load for newcomers while keeping power for experienced users. The risk is hiding something many people need, so the levels should be informed by usage data.",
            source: SRC.nnProgressive,
          },
        ],
      },
      {
        id: "design-systems",
        title: "Design systems and tokens",
        items: [
          {
            id: "what-is-ds",
            q: "What is a design system and why does a product team need one?",
            wants: "Whether you understand it is more than a Figma library: a shared language between design and engineering.",
            answer:
              "A design system is a set of reusable components, standards and rules a team builds a product with, together with documentation and usage guidance. It gives consistency, speeds up work and reduces duplication between designers and developers. Importantly, the system lives both in design and in code, and has owners who maintain it. Without that, the library quickly drifts from the real product.",
            source: SRC.nnDesignSystems,
          },
          {
            id: "design-tokens",
            q: "What are design tokens and why use them instead of raw values?",
            wants: "Whether you separate the decision (\"action colour\") from the value (\"#0B57D0\") and understand the benefit for theming.",
            answer:
              "A design token is a named unit of a design decision: a colour, spacing, radius or type style. Instead of #0B57D0 in a mockup you use a token like color-primary, and its value changes in a single place. This keeps Figma and code consistent and makes themes (light/dark) and brands easy. Material Design tokens have tiers: reference (raw values), system (roles) and component tokens.",
            code: ":root {\n  --color-primary: #0b57d0;\n  --space-4: 16px;\n  --radius-md: 12px;\n}\n.button { background: var(--color-primary); padding: var(--space-4); }",
            source: SRC.m3Tokens,
          },
          {
            id: "figma-variables",
            q: "How do you organise Figma variables for themes and modes?",
            wants: "Whether you can set up variable collections with modes and bind them to components.",
            answer:
              "Figma variables store values (colour, number, string, boolean) grouped into collections. Modes let one variable hold different values, for example for light and dark themes or different brands. My practice: a base collection of raw values, a semantic collection on top (surface, on-surface, primary) with modes, and components that reference only the semantic variables. Then switching the mode on a frame changes the whole layout without manual edits.",
            source: SRC.figmaVariables,
          },
          {
            id: "dark-mode",
            q: "How do you design a dark theme? Is inverting the colours enough?",
            wants: "Whether you understand that dark theme needs separate decisions about surfaces, contrast and accents.",
            answer:
              "Inverting is not enough: you need a separate palette with semantic roles (surface, on-surface, accent) that are checked for contrast. Pure black with pure white text is often tiring, so dark grey surfaces are used and depth is conveyed by tone, not only shadows. Saturated accents are usually slightly muted. On the web the system theme can be honoured with the prefers-color-scheme media query, while a toggle gives users a choice.",
            code: "@media (prefers-color-scheme: dark) {\n  :root {\n    --surface: #141218;\n    --on-surface: #e6e0e9;\n  }\n}",
            source: SRC.mdnDark,
          },
        ],
      },
      {
        id: "accessibility",
        title: "Accessibility (WCAG)",
        items: [
          {
            id: "contrast",
            q: "What does WCAG require for text contrast? How do you check it?",
            wants: "Whether you know the actual ratios and check them during design, not after development.",
            answer:
              "Success Criterion 1.4.3 (level AA) requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text (18 pt or 14 pt bold and above). It applies to text and images of text, with exceptions for decorative elements and logos. I check contrast in Figma with plugins or built-in tools that compute the ratio, and bake it into semantic tokens. Disabled states, placeholders and text over images deserve checking too.",
            source: SRC.wcagContrast,
          },
          {
            id: "color-only",
            q: "Why must you not convey information by colour alone? Give an example.",
            wants: "Whether you consider colour-blind users and know what to do instead.",
            answer:
              "Criterion 1.4.1 forbids colour as the only way to convey information, indicate an action or distinguish an element: people with colour vision deficiencies, or on a greyscale screen, won't see the difference. Examples: a field with an error marked only by a red border, or an in-text link that differs only by colour. I add a second channel: an icon, error text, an underline, patterns in charts. It also helps in bright light or on poor displays.",
            source: SRC.wcagColor,
          },
          {
            id: "target-size",
            q: "What size should interactive elements be for touch and pointer?",
            wants: "Whether you know the WCAG minimum and understand that spacing matters too.",
            answer:
              "WCAG 2.2 criterion 2.5.8 (AA) requires pointer targets to be at least 24 by 24 CSS pixels, or to have enough spacing around them. There are exceptions, such as links inside a sentence. For mobile comfort, designers usually go larger: platform guidance points to about 44 pt on iOS and 48 dp on Android. Small, tightly packed touch targets increase mis-taps, especially for people with motor impairments.",
            source: SRC.wcagTarget,
          },
          {
            id: "focus-visible",
            q: "Why can't you simply remove the outline from buttons and links?",
            wants: "Whether you understand keyboard use and the role of visible focus in design.",
            answer:
              "Criterion 2.4.7 (AA) requires that any keyboard-operable element has a visible focus indicator. Without it, keyboard, switch and screen magnifier users can't see where they are on the page. Instead of removing the outline, design it: define a high-contrast style for all interactive elements in your design-system tokens. I also check that focus order matches the visual order.",
            source: SRC.wcagFocus,
          },
        ],
      },
      {
        id: "figma-ui",
        title: "Figma and UI fundamentals",
        items: [
          {
            id: "auto-layout",
            q: "How does Auto Layout work in Figma and why does it matter for responsive designs?",
            wants: "Whether you know Auto Layout well enough to build components that don't break when content changes.",
            answer:
              "Auto Layout automatically arranges child elements in a row or column with set spacing and padding, and the frame resizes to fit its content. For each element you pick a behaviour: Fixed, Hug contents or Fill container. That is why a button grows with its label and a list grows with its rows. Nesting Auto Layout frames gives layouts that behave much like CSS flexbox, which also makes developer handoff easier.",
            source: SRC.figmaAutoLayout,
          },
          {
            id: "components-variants",
            q: "What are components, instances and variants in Figma? How do you build a button component?",
            wants: "Whether you can structure a component with properties instead of creating dozens of separate copies.",
            answer:
              "A main component is the source and its instances inherit changes. Variants group similar versions of one component into a set, and properties control them: type (primary/secondary), size, state (default, hover, disabled), icon, label. I build a button on Auto Layout with variants for state and size and properties for the label and icons. Overrides in instances should be limited so they don't break the system.",
            source: SRC.figmaComponents,
          },
          {
            id: "typography",
            q: "How do you build a type scale and text hierarchy in an interface?",
            wants: "Whether you understand sizes, weights and line height, not just choose a typeface by taste.",
            answer:
              "A type scale is a limited set of styles (headings, body, captions) with defined size, weight and line height, stored in tokens. Hierarchy comes from size, weight and contrast, not from many different typefaces. On platforms it helps to build on system styles: Apple recommends supporting Dynamic Type so people can change text size. The layout should survive larger text without truncation or overlap.",
            source: SRC.higTypography,
          },
          {
            id: "hicks-law",
            q: "How does Hick's Law affect your interface decisions?",
            wants: "Whether you can apply UX principles with reasoning and without overstating them.",
            answer:
              "Hick's Law says decision time grows with the number and complexity of choices. In practice it is a reason to reduce simultaneous choices: group menu items, highlight the primary action, split long forms into steps. It doesn't mean \"less is always better\": an over-simplified interface may hide what people need. So I back the principle with research and tests instead of using it as the only argument.",
            source: SRC.hicks,
          },
        ],
      },
      {
        id: "mobile",
        title: "Mobile patterns",
        items: [
          {
            id: "ios-android-nav",
            q: "How does bottom navigation differ between iOS and Android? How many items are appropriate?",
            wants: "Whether you know the platform guidelines and can adapt a design to each platform.",
            answer:
              "iOS uses a tab bar to switch between the app's main sections; Material Design uses a navigation bar. Both suit a small number of equally important top-level destinations: Material recommends 3 to 5 items, and an iPhone tab bar is also typically limited to 5 tabs. Each item has an icon and a short label, and the active state is clearly marked. Extra or rare sections go into a menu or profile instead of a sixth tab.",
            source: SRC.higTabBars,
          },
          {
            id: "thumb-fitts",
            q: "How does Fitts's Law affect mobile interface design?",
            wants: "Whether you consider target size, distance and thumb reach.",
            answer:
              "Fitts's Law says the time to reach a target depends on its distance and size. So important, frequent actions are made large and placed within easy thumb reach, while destructive actions are kept away from common ones. Targets need spacing to avoid mis-taps. On large phones this is why primary controls often move from the top of the screen to the bottom.",
            source: SRC.fitts,
          },
          {
            id: "jakobs-law",
            q: "Why shouldn't you invent your own patterns for common tasks?",
            wants: "Whether you understand that users carry expectations from other products, and when to deviate.",
            answer:
              "Jakob's Law says users spend most of their time on other sites and apps, so they expect yours to work the same way. Familiar patterns (search, cart, tabs, platform gestures) reduce learning and errors. Deviate deliberately, only when an unconventional solution brings real benefit, and validate it with user testing. On mobile, respect the conventions of iOS and Android.",
            source: SRC.jakob,
          },
        ],
      },
      {
        id: "metrics-collab-portfolio",
        title: "Metrics, collaboration and portfolio",
        items: [
          {
            id: "ux-metrics",
            q: "How do you measure UX quality? Which metrics do you use?",
            wants: "Whether you can tie a design decision to a measurable outcome instead of saying \"it feels easier\".",
            answer:
              "I combine behavioural and subjective metrics. Behavioural: task success rate (the share of users who complete a task), time on task, error count, conversion in analytics. Subjective: questionnaires such as SUS or ease ratings. Success rate is the simplest and most understandable usability metric. Before making changes I record a baseline so I can compare after release.",
            source: SRC.nnSuccess,
          },
          {
            id: "dev-handoff",
            q: "How do you hand designs off to developers to reduce back-and-forth questions?",
            wants: "Whether you work with developers as a partner instead of throwing \"pictures\" over the wall.",
            answer:
              "I use components and tokens that match the codebase so developers see the same names. Figma has Dev Mode for this: a developer view showing sizes, spacing, styles and code snippets, plus readiness statuses. I include all states (hover, error, empty, loading), behaviour at different screen sizes and interaction notes. I agree on solutions with developers early so complexity is estimated before the final mockup.",
            source: SRC.figmaDevMode,
          },
          {
            id: "design-critique",
            q: "How do you give and receive feedback in a design review?",
            wants: "Whether you can discuss work objectively, without making it personal or getting defensive.",
            answer:
              "Before a review I set the context: the problem, the goals and what kind of feedback I want. I tie critique to user and product goals, not taste (\"I like it\"). When giving feedback, I describe the problem and its consequence rather than imposing a solution. When receiving it, I don't defend immediately; I ask clarifying questions and record conclusions. A healthy critique culture improves the solutions and the trust in the team.",
            source: SRC.nnCritiques,
          },
          {
            id: "case-study",
            q: "Walk me through a portfolio project: what problem did you solve and what was your contribution?",
            wants: "Whether you can tell a structured story of process, your own role, decisions and results with numbers or learnings.",
            answer:
              "Structure the story as: context and problem, your role on the team, research and insights, solution options and why you chose one, testing, then results and learnings. It helps to map the process to the design thinking stages: empathise, define, ideate, prototype, test. Be honest about what you did versus the team, and show trade-offs and mistakes. Back the result with metrics or qualitative feedback, not just polished screens.",
            source: SRC.nnDesignThinking,
          },
        ],
      },
    ],
  },
};
