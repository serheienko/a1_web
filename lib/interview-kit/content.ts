// lib/interview-kit/content.ts
//
// 24.10.2026 (Александр: «чек-лист и инструменты для собеседования, отдельно
// кандидату и интервьюеру, на всех языках сайта, тексты по-человечески, без
// длинных тире»). Все тексты страниц /spivbesida лежат здесь, на 9 языках.
//
// Правила, о которых договорились:
// - Длинных тире в текстах нет вообще (палит машинный текст). Вместо них
//   точка, запятая или двоеточие. Диапазоны чисел через обычный дефис: 2-3.
// - Слова «бесплатно» у инструментов нет: люди злятся, если на сайте сервиса
//   оказывается платно. Правило отбора написано одной плашкой над списком.
// - В каждой задаче 3-4 сервиса, никого не выделяем, порядок не рейтинг.
// - Сервисов, которые помогают списывать на собеседовании, в списке нет.
// - Про согласие на запись не пишем (Александр: «это дефолтная история»),
//   «перебивайте кандидата» убрали: плохой совет.

import type { Locale } from "@/components/t";

export type L9 = Record<Locale, string>;

function t(uk: string, en: string, ru: string, de: string, es: string, fr: string, pl: string, ptBR: string, zh: string): L9 {
  return { uk, en, ru, de, es, fr, pl, ptBR, zh };
}

export type Role = "candidate" | "interviewer";
export type Stage = "before" | "during" | "after";

export type CheckItem = { id: string; stage: Stage; text: L9 };

export type Tool = { name: string; url: string; logo?: string; color?: string };
export type ToolGroup = { id: string; title: L9; desc: L9; tools: Tool[] };

export const ROLE_PATH: Record<Role, string> = {
  candidate: "/spivbesida/kandydatu",
  interviewer: "/spivbesida/interviueru",
};

// ───────── общее ─────────
export const UI = {
  kicker: t("A1 · Співбесіда", "A1 · Interview", "A1 · Собеседование", "A1 · Vorstellungsgespräch", "A1 · Entrevista", "A1 · Entretien", "A1 · Rozmowa kwalifikacyjna", "A1 · Entrevista", "A1 · 面试"),
  roleCandidate: t("Кандидату", "For candidates", "Кандидату", "Für Bewerber", "Para candidatos", "Pour les candidats", "Dla kandydatów", "Para candidatos", "求职者"),
  roleInterviewer: t("Інтерв'юеру", "For interviewers", "Интервьюеру", "Für Interviewer", "Para entrevistadores", "Pour les recruteurs", "Dla rekruterów", "Para entrevistadores", "面试官"),
  checklist: t("Чек-лист", "Checklist", "Чек-лист", "Checkliste", "Lista de control", "Checklist", "Lista kontrolna", "Checklist", "清单"),
  stage: {
    before: t("До співбесіди", "Before", "До собеседования", "Vorher", "Antes", "Avant", "Przed", "Antes", "面试前"),
    during: t("Під час", "During", "Во время", "Währenddessen", "Durante", "Pendant", "W trakcie", "Durante", "面试中"),
    after: t("Після", "After", "После", "Danach", "Después", "Après", "Po", "Depois", "面试后"),
  } as Record<Stage, L9>,
  progress: [
    t("Почнімо", "Let's start", "Начнём", "Los geht's", "Empecemos", "C'est parti", "Zaczynamy", "Vamos começar", "开始吧"),
    t("Гарний старт", "Good start", "Хорошее начало", "Guter Start", "Buen comienzo", "Bon début", "Dobry start", "Bom começo", "开了个好头"),
    t("Більше половини", "Over halfway", "Больше половины", "Mehr als die Hälfte", "Más de la mitad", "Plus de la moitié", "Ponad połowa", "Mais da metade", "已过半"),
    t("Усе готово", "All set", "Всё готово", "Alles bereit", "Todo listo", "Tout est prêt", "Wszystko gotowe", "Tudo pronto", "全部就绪"),
  ],
  copyChecklist: t("Скопіювати чек-лист", "Copy checklist", "Скопировать чек-лист", "Checkliste kopieren", "Copiar lista", "Copier la checklist", "Kopiuj listę", "Copiar checklist", "复制清单"),
  copy: t("Скопіювати", "Copy", "Скопировать", "Kopieren", "Copiar", "Copier", "Kopiuj", "Copiar", "复制"),
  copied: t("Скопійовано", "Copied", "Скопировано", "Kopiert", "Copiado", "Copié", "Skopiowano", "Copiado", "已复制"),
  reset: t("Почати заново", "Start over", "Начать заново", "Neu starten", "Empezar de nuevo", "Recommencer", "Zacznij od nowa", "Recomeçar", "重新开始"),
  saved: t(
    "Галочки зберігаються лише у вашому браузері.",
    "Ticks are saved only in your browser.",
    "Галочки сохраняются только в вашем браузере.",
    "Häkchen werden nur in deinem Browser gespeichert.",
    "Las marcas se guardan solo en tu navegador.",
    "Les coches sont enregistrées uniquement dans votre navigateur.",
    "Zaznaczenia zapisują się tylko w twojej przeglądarce.",
    "As marcações ficam salvas só no seu navegador.",
    "勾选记录只保存在你的浏览器中。",
  ),
  tools: t("Інструменти", "Tools", "Инструменты", "Tools", "Herramientas", "Outils", "Narzędzia", "Ferramentas", "工具"),
  toolsRule: t(
    "Як ми обираємо: шукаємо сервіси з безкоштовним планом або нормальним пробним періодом. Умови змінюються, тож перевіряйте на сайті сервісу. Порядок у списку не рейтинг.",
    "How we pick: we look for services with a free plan or a fair trial. Terms change, so check on the service's site. The order is not a ranking.",
    "Как мы выбираем: ищем сервисы с бесплатным планом или нормальным пробным периодом. Условия меняются, поэтому проверяйте на сайте сервиса. Порядок в списке не рейтинг.",
    "So wählen wir aus: Wir suchen Dienste mit Gratis-Tarif oder fairer Testphase. Konditionen ändern sich, prüf sie auf der Seite des Anbieters. Die Reihenfolge ist kein Ranking.",
    "Cómo elegimos: buscamos servicios con plan gratuito o una prueba razonable. Las condiciones cambian, así que compruébalas en la web del servicio. El orden no es un ranking.",
    "Comment on choisit : des services avec une offre gratuite ou un essai correct. Les conditions changent, vérifiez sur le site du service. L'ordre n'est pas un classement.",
    "Jak wybieramy: szukamy usług z darmowym planem albo uczciwym okresem próbnym. Warunki się zmieniają, sprawdzaj na stronie usługi. Kolejność to nie ranking.",
    "Como escolhemos: procuramos serviços com plano gratuito ou um teste justo. As condições mudam, então confira no site do serviço. A ordem não é um ranking.",
    "我们的挑选标准：有免费版或合理试用期的服务。条款会变，请以服务官网为准。排列顺序不代表排名。",
  ),
  fromA1: t("Від A1", "From A1", "От A1", "Von A1", "De A1", "Par A1", "Od A1", "Do A1", "来自 A1"),
};

// ───────── хаб /spivbesida ─────────
export const HUB = {
  h1: t("Співбесіда", "Interview", "Собеседование", "Vorstellungsgespräch", "Entrevista", "Entretien", "Rozmowa kwalifikacyjna", "Entrevista", "面试"),
  sub: t(
    "Чек-листи та інструменти для тих, хто шукає роботу, і для тих, хто наймає.",
    "Checklists and tools for people looking for a job and for people hiring.",
    "Чек-листы и инструменты для тех, кто ищет работу, и для тех, кто нанимает.",
    "Checklisten und Tools für alle, die einen Job suchen, und alle, die einstellen.",
    "Listas y herramientas para quien busca trabajo y para quien contrata.",
    "Des checklists et des outils pour ceux qui cherchent un emploi et ceux qui recrutent.",
    "Listy kontrolne i narzędzia dla szukających pracy i dla rekrutujących.",
    "Checklists e ferramentas para quem procura emprego e para quem contrata.",
    "为求职者和招聘方准备的清单与工具。",
  ),
  candidateTitle: t("Я кандидат", "I'm a candidate", "Я кандидат", "Ich bewerbe mich", "Soy candidato", "Je suis candidat", "Jestem kandydatem", "Sou candidato", "我是求职者"),
  candidateDesc: t(
    "Підготовка, поради на сам дзвінок і що робити після.",
    "Preparation, tips for the call itself and what to do after.",
    "Подготовка, советы на сам звонок и что делать после.",
    "Vorbereitung, Tipps fürs Gespräch und was danach kommt.",
    "Preparación, consejos para la llamada y qué hacer después.",
    "Préparation, conseils pour l'appel et quoi faire après.",
    "Przygotowanie, wskazówki na samą rozmowę i co potem.",
    "Preparação, dicas para a chamada e o que fazer depois.",
    "准备工作、面试中的建议以及面试后该做什么。",
  ),
  interviewerTitle: t("Я проводжу співбесіду", "I'm interviewing", "Я провожу собеседование", "Ich führe das Gespräch", "Yo entrevisto", "Je fais passer l'entretien", "Prowadzę rozmowę", "Eu entrevisto", "我是面试官"),
  interviewerDesc: t(
    "Чесний процес, готові тексти й прийоми проти AI-підказок.",
    "A fair process, ready-made messages and tricks against AI prompting.",
    "Честный процесс, готовые тексты и приёмы против AI-подсказок.",
    "Ein fairer Ablauf, fertige Texte und Tricks gegen KI-Souffleure.",
    "Un proceso justo, textos listos y trucos contra la ayuda de IA.",
    "Un processus équitable, des textes prêts et des astuces contre l'aide d'une IA.",
    "Uczciwy proces, gotowe teksty i sposoby na podpowiedzi AI.",
    "Um processo justo, textos prontos e truques contra ajuda de IA.",
    "公平的流程、现成文案，以及应对 AI 提示的方法。",
  ),
};

// ───────── заголовки страниц ─────────
export const PAGE: Record<Role, { h1: L9; sub: L9 }> = {
  candidate: {
    h1: t("Готуємося до співбесіди", "Get ready for your interview", "Готовимся к собеседованию", "Bereit fürs Vorstellungsgespräch", "Prepárate para tu entrevista", "Préparez votre entretien", "Przygotuj się do rozmowy", "Prepare-se para a entrevista", "准备好你的面试"),
    sub: t(
      "Чек-лист, який можна відмічати прямо тут, і сервіси, щоб потренуватися.",
      "A checklist you can tick off right here, plus tools to practice with.",
      "Чек-лист, который можно отмечать прямо здесь, и сервисы, чтобы потренироваться.",
      "Eine Checkliste zum Abhaken direkt hier und Tools zum Üben.",
      "Una lista que puedes marcar aquí mismo y herramientas para practicar.",
      "Une checklist à cocher ici même et des outils pour vous entraîner.",
      "Lista kontrolna do odhaczania tutaj i narzędzia do ćwiczeń.",
      "Um checklist para marcar aqui mesmo e ferramentas para treinar.",
      "可在此直接勾选的清单，以及帮助练习的工具。",
    ),
  },
  interviewer: {
    h1: t("Чесна співбесіда", "A fair interview", "Честное собеседование", "Ein faires Vorstellungsgespräch", "Una entrevista justa", "Un entretien équitable", "Uczciwa rozmowa kwalifikacyjna", "Uma entrevista justa", "公平的面试"),
    sub: t(
      "Чек-лист, готові тексти для кандидата й сервіси для запису, коду та схем. Плюс кілька прийомів, щоб помітити AI-підказки.",
      "A checklist, ready-made messages for candidates and tools for recording, code and diagrams. Plus a few ways to spot AI prompting.",
      "Чек-лист, готовые тексты для кандидата и сервисы для записи, кода и схем. Плюс несколько приёмов, чтобы заметить AI-подсказки.",
      "Checkliste, fertige Nachrichten für Bewerber und Tools für Aufnahme, Code und Diagramme. Dazu ein paar Tricks, um KI-Souffleure zu erkennen.",
      "Una lista, mensajes listos para el candidato y herramientas para grabar, programar y dibujar esquemas. Además, algunos trucos para detectar ayuda de IA.",
      "Une checklist, des messages prêts à envoyer et des outils pour enregistrer, coder et schématiser. Plus quelques astuces pour repérer l'aide d'une IA.",
      "Lista kontrolna, gotowe wiadomości dla kandydata i narzędzia do nagrywania, kodu i schematów. Do tego kilka sposobów, by wyłapać podpowiedzi AI.",
      "Um checklist, mensagens prontas para o candidato e ferramentas para gravar, programar e desenhar. E alguns truques para notar ajuda de IA.",
      "一份清单、可直接发给候选人的消息，以及录音、写代码和画图的工具。还有几招识别 AI 提示。",
    ),
  },
};

// ───────── чек-лист кандидата ─────────
export const CANDIDATE_CHECKLIST: CheckItem[] = [
  { id: "c-company", stage: "before", text: t(
    "Почитайте про компанію: продукт, новини, хто проводить співбесіду.",
    "Read up on the company: product, news, who is interviewing you.",
    "Почитайте о компании: продукт, новости, кто проводит собеседование.",
    "Lies dich über die Firma ein: Produkt, News, wer das Gespräch führt.",
    "Infórmate sobre la empresa: producto, novedades, quién te entrevista.",
    "Renseignez-vous sur l'entreprise : produit, actualités, qui vous reçoit.",
    "Poczytaj o firmie: produkt, aktualności, kto prowadzi rozmowę.",
    "Pesquise sobre a empresa: produto, novidades, quem vai te entrevistar.",
    "了解公司：产品、新闻，以及谁来面试你。",
  ) },
  { id: "c-salary", stage: "before", text: t(
    "Дізнайтеся ринкову зарплату для свого стеку й країни і визначте свою цифру.",
    "Check the market salary for your stack and country, and decide on your number.",
    "Узнайте рыночную зарплату для своего стека и страны и определите свою цифру.",
    "Prüfe das Marktgehalt für deinen Stack und dein Land und leg deine Zahl fest.",
    "Consulta el salario de mercado para tu stack y país, y decide tu cifra.",
    "Vérifiez le salaire du marché pour votre stack et votre pays, et fixez votre chiffre.",
    "Sprawdź rynkowe wynagrodzenie dla swojego stacku i kraju i ustal swoją kwotę.",
    "Veja o salário de mercado para sua stack e seu país e defina seu número.",
    "查一查你的技术栈和所在国家的市场薪资，定好你的期望数字。",
  ) },
  { id: "c-stories", stage: "before", text: t(
    "Підготуйте 2-3 історії з проєктів: задача, що зробили саме ви, результат у цифрах.",
    "Prepare 2-3 project stories: the task, what you did yourself, the result in numbers.",
    "Подготовьте 2-3 истории из проектов: задача, что сделали именно вы, результат в цифрах.",
    "Bereite 2-3 Projektgeschichten vor: Aufgabe, was du selbst gemacht hast, Ergebnis in Zahlen.",
    "Prepara 2-3 historias de proyectos: la tarea, lo que hiciste tú, el resultado en números.",
    "Préparez 2-3 histoires de projets : la mission, ce que vous avez fait vous-même, le résultat chiffré.",
    "Przygotuj 2-3 historie z projektów: zadanie, co zrobiłeś sam, wynik w liczbach.",
    "Prepare 2-3 histórias de projetos: a tarefa, o que você fez, o resultado em números.",
    "准备 2-3 个项目故事：任务是什么、你亲自做了什么、用数字说明结果。",
  ) },
  { id: "c-questions", stage: "before", text: t(
    "Пройдіться типовими питаннями для своєї ролі.",
    "Go through typical questions for your role.",
    "Пройдитесь по типичным вопросам для своей роли.",
    "Geh typische Fragen für deine Rolle durch.",
    "Repasa las preguntas típicas para tu rol.",
    "Passez en revue les questions typiques pour votre poste.",
    "Przejrzyj typowe pytania dla swojej roli.",
    "Revise as perguntas típicas para a sua função.",
    "过一遍你这个岗位的常见问题。",
  ) },
  { id: "c-ask", stage: "before", text: t(
    "Підготуйте 3 питання до компанії.",
    "Prepare 3 questions for the company.",
    "Подготовьте 3 вопроса к компании.",
    "Bereite 3 Fragen an die Firma vor.",
    "Prepara 3 preguntas para la empresa.",
    "Préparez 3 questions pour l'entreprise.",
    "Przygotuj 3 pytania do firmy.",
    "Prepare 3 perguntas para a empresa.",
    "准备 3 个想问公司的问题。",
  ) },
  { id: "c-tech", stage: "before", text: t(
    "Перевірте стабільний інтернет, камеру й мікрофон, зарядіть ноутбук.",
    "Check your internet connection, camera and mic, and charge your laptop.",
    "Проверьте стабильный интернет, камеру и микрофон, зарядите ноутбук.",
    "Prüfe stabiles Internet, Kamera und Mikro und lade den Laptop.",
    "Comprueba que tu internet sea estable, la cámara y el micro, y carga el portátil.",
    "Vérifiez la stabilité d'internet, la caméra et le micro, et chargez l'ordinateur.",
    "Sprawdź stabilny internet, kamerę i mikrofon, naładuj laptopa.",
    "Confira se a internet está estável, a câmera e o microfone, e carregue o notebook.",
    "检查网络是否稳定、摄像头和麦克风，并给电脑充好电。",
  ) },
  { id: "c-room", stage: "before", text: t(
    "Тиха кімната, папір і ручка поруч.",
    "A quiet room, with pen and paper nearby.",
    "Тихая комната, бумага и ручка рядом.",
    "Ein ruhiger Raum, Stift und Papier griffbereit.",
    "Una habitación tranquila, con papel y bolígrafo a mano.",
    "Une pièce calme, avec papier et stylo à portée de main.",
    "Cichy pokój, kartka i długopis pod ręką.",
    "Um lugar silencioso, com papel e caneta por perto.",
    "找一个安静的房间，手边备好纸和笔。",
  ) },
  { id: "c-aloud", stage: "during", text: t(
    "Думайте вголос: хід думки важить більше за ідеальну відповідь.",
    "Think out loud: your reasoning matters more than a perfect answer.",
    "Думайте вслух: ход мысли важнее идеального ответа.",
    "Denk laut: Dein Lösungsweg zählt mehr als die perfekte Antwort.",
    "Piensa en voz alta: tu razonamiento importa más que una respuesta perfecta.",
    "Pensez à voix haute : votre raisonnement compte plus qu'une réponse parfaite.",
    "Myśl na głos: tok rozumowania liczy się bardziej niż idealna odpowiedź.",
    "Pense em voz alta: seu raciocínio vale mais que uma resposta perfeita.",
    "边想边说：思路比完美答案更重要。",
  ) },
  { id: "c-unknown", stage: "during", text: t(
    "Не знаєте відповіді? Так і скажіть і поясніть, як би шукали рішення.",
    "Don't know the answer? Say so, and explain how you'd find it.",
    "Не знаете ответа? Так и скажите и объясните, как искали бы решение.",
    "Du weißt es nicht? Sag es offen und erklär, wie du die Lösung suchen würdest.",
    "¿No sabes la respuesta? Dilo y explica cómo buscarías la solución.",
    "Vous ne savez pas ? Dites-le et expliquez comment vous chercheriez.",
    "Nie znasz odpowiedzi? Powiedz to i wyjaśnij, jak szukałbyś rozwiązania.",
    "Não sabe a resposta? Diga isso e explique como buscaria a solução.",
    "不知道答案？直说，并解释你会怎么找到解决办法。",
  ) },
  { id: "c-clarify", stage: "during", text: t(
    "Уточніть умову задачі, перш ніж писати код.",
    "Clarify the task before you start coding.",
    "Уточните условие задачи, прежде чем писать код.",
    "Kläre die Aufgabe, bevor du Code schreibst.",
    "Aclara el enunciado antes de escribir código.",
    "Clarifiez l'énoncé avant d'écrire du code.",
    "Doprecyzuj zadanie, zanim zaczniesz pisać kod.",
    "Esclareça o enunciado antes de escrever código.",
    "写代码之前先把题目问清楚。",
  ) },
  { id: "c-checks", stage: "during", text: t(
    "Вас можуть попросити показати вуха чи відповісти із заплющеними очима. Це нормально: так компанії захищають чесних кандидатів.",
    "You may be asked to show your ears or answer with your eyes closed. That's normal: it protects honest candidates.",
    "Вас могут попросить показать уши или ответить с закрытыми глазами. Это нормально: так компании защищают честных кандидатов.",
    "Vielleicht bittet man dich, deine Ohren zu zeigen oder mit geschlossenen Augen zu antworten. Das ist normal: So schützen Firmen ehrliche Bewerber.",
    "Puede que te pidan enseñar las orejas o responder con los ojos cerrados. Es normal: así se protege a los candidatos honestos.",
    "On peut vous demander de montrer vos oreilles ou de répondre les yeux fermés. C'est normal : cela protège les candidats honnêtes.",
    "Mogą cię poprosić o pokazanie uszu albo odpowiedź z zamkniętymi oczami. To normalne: tak firmy chronią uczciwych kandydatów.",
    "Podem pedir que você mostre as orelhas ou responda de olhos fechados. É normal: assim as empresas protegem candidatos honestos.",
    "对方可能请你露出耳朵，或闭着眼睛回答问题。这很正常：这样做是在保护诚实的候选人。",
  ) },
  { id: "c-next", stage: "during", text: t(
    "Запитайте про наступні кроки й строки.",
    "Ask about next steps and timing.",
    "Спросите о следующих шагах и сроках.",
    "Frag nach den nächsten Schritten und dem Zeitplan.",
    "Pregunta por los próximos pasos y plazos.",
    "Demandez les prochaines étapes et les délais.",
    "Zapytaj o kolejne kroki i terminy.",
    "Pergunte sobre os próximos passos e prazos.",
    "询问后续步骤和时间安排。",
  ) },
  { id: "c-thanks", stage: "after", text: t(
    "Надішліть коротке повідомлення з подякою того ж дня.",
    "Send a short thank-you note the same day.",
    "Отправьте короткое сообщение с благодарностью в тот же день.",
    "Schick noch am selben Tag ein kurzes Dankeschön.",
    "Envía un breve mensaje de agradecimiento el mismo día.",
    "Envoyez un court message de remerciement le jour même.",
    "Wyślij krótkie podziękowanie tego samego dnia.",
    "Mande uma mensagem curta de agradecimento no mesmo dia.",
    "当天发一条简短的感谢消息。",
  ) },
  { id: "c-notes", stage: "after", text: t(
    "Запишіть питання й місця, де плавали. Це ваш план до наступної співбесіди.",
    "Write down the questions and where you struggled. That's your plan for the next interview.",
    "Запишите вопросы и места, где плавали. Это ваш план к следующему собеседованию.",
    "Notier dir die Fragen und wo du gehakt hast. Das ist dein Plan fürs nächste Gespräch.",
    "Apunta las preguntas y dónde dudaste. Es tu plan para la próxima entrevista.",
    "Notez les questions et vos points faibles. C'est votre plan pour le prochain entretien.",
    "Zapisz pytania i miejsca, gdzie się gubiłeś. To twój plan na następną rozmowę.",
    "Anote as perguntas e onde você travou. Esse é seu plano para a próxima entrevista.",
    "记下被问到的问题和答得不好的地方，这就是你下一次面试的准备计划。",
  ) },
];

// ───────── чек-лист интервьюера ─────────
export const INTERVIEWER_CHECKLIST: CheckItem[] = [
  { id: "i-invite", stage: "before", text: t(
    "У запрошенні: формат, тривалість, хто буде на дзвінку. Додайте: камера увімкнена, без навушників.",
    "In the invite: format, length, who will be on the call. Add: camera on, no headphones.",
    "В приглашении: формат, длительность, кто будет на звонке. Добавьте: камера включена, без наушников.",
    "In der Einladung: Format, Dauer, wer dabei ist. Dazu: Kamera an, keine Kopfhörer.",
    "En la invitación: formato, duración, quién estará en la llamada. Añade: cámara encendida, sin auriculares.",
    "Dans l'invitation : format, durée, qui sera présent. Ajoutez : caméra allumée, sans écouteurs.",
    "W zaproszeniu: format, czas trwania, kto będzie na rozmowie. Dodaj: kamera włączona, bez słuchawek.",
    "No convite: formato, duração, quem estará na chamada. Acrescente: câmera ligada, sem fones.",
    "在邀请中写明：形式、时长、谁会参加。再加上：开摄像头，不戴耳机。",
  ) },
  { id: "i-cv", stage: "before", text: t(
    "Підготуйте 2-3 питання про конкретні проєкти з резюме кандидата.",
    "Prepare 2-3 questions about specific projects from the candidate's CV.",
    "Подготовьте 2-3 вопроса о конкретных проектах из резюме кандидата.",
    "Bereite 2-3 Fragen zu konkreten Projekten aus dem Lebenslauf vor.",
    "Prepara 2-3 preguntas sobre proyectos concretos del CV del candidato.",
    "Préparez 2-3 questions sur des projets précis du CV du candidat.",
    "Przygotuj 2-3 pytania o konkretne projekty z CV kandydata.",
    "Prepare 2-3 perguntas sobre projetos específicos do currículo do candidato.",
    "针对候选人简历里的具体项目准备 2-3 个问题。",
  ) },
  { id: "i-twist", stage: "before", text: t(
    "Задача з продовженням: базове питання й дві зміни умови.",
    "A task with follow-ups: a base question plus two changes to the conditions.",
    "Задача с продолжением: базовый вопрос и два изменения условия.",
    "Eine Aufgabe mit Fortsetzung: Grundfrage plus zwei geänderte Bedingungen.",
    "Una tarea con continuación: una pregunta base y dos cambios de condiciones.",
    "Un exercice à rebondissements : une question de base et deux changements de contraintes.",
    "Zadanie z ciągiem dalszym: pytanie bazowe i dwie zmiany warunków.",
    "Uma tarefa com continuação: uma pergunta base e duas mudanças nas condições.",
    "设计带后续的题目：一个基础问题，再加两次条件变化。",
  ) },
  { id: "i-scale", stage: "before", text: t(
    "Одна шкала оцінки для всіх кандидатів. Запишіть її до початку.",
    "One scoring scale for every candidate. Write it down beforehand.",
    "Одна шкала оценки для всех кандидатов. Запишите её до начала.",
    "Eine Bewertungsskala für alle Bewerber. Schreib sie vorher auf.",
    "Una misma escala de evaluación para todos. Escríbela antes de empezar.",
    "Une même grille d'évaluation pour tous. Notez-la avant de commencer.",
    "Jedna skala oceny dla wszystkich kandydatów. Zapisz ją przed startem.",
    "Uma mesma escala de avaliação para todos. Anote antes de começar.",
    "所有候选人用同一套评分标准，开始前写下来。",
  ) },
  { id: "i-head", stage: "during", text: t(
    "На початку попросіть повернути голову ліворуч і праворуч і зняти розумні окуляри.",
    "At the start, ask them to turn their head left and right and take off smart glasses.",
    "В начале попросите повернуть голову влево и вправо и снять умные очки.",
    "Bitte zu Beginn, den Kopf nach links und rechts zu drehen und smarte Brillen abzunehmen.",
    "Al principio, pide que gire la cabeza a izquierda y derecha y se quite las gafas inteligentes.",
    "Au début, demandez de tourner la tête à gauche et à droite et de retirer les lunettes connectées.",
    "Na początku poproś o obrót głowy w lewo i w prawo i zdjęcie inteligentnych okularów.",
    "No início, peça para virar a cabeça para os lados e tirar óculos inteligentes.",
    "开始时请对方左右转头，并摘下智能眼镜。",
  ) },
  { id: "i-speaker", stage: "during", text: t(
    "Звук через динамік ноутбука, без навушників.",
    "Sound through the laptop speaker, no headphones.",
    "Звук через динамик ноутбука, без наушников.",
    "Ton über den Laptop-Lautsprecher, ohne Kopfhörer.",
    "Sonido por el altavoz del portátil, sin auriculares.",
    "Le son par le haut-parleur de l'ordinateur, sans écouteurs.",
    "Dźwięk przez głośnik laptopa, bez słuchawek.",
    "Som pelo alto-falante do notebook, sem fones.",
    "声音走电脑扬声器，不戴耳机。",
  ) },
  { id: "i-paper", stage: "during", text: t(
    "Попросіть намалювати схему на папері й показати в камеру.",
    "Ask for a diagram drawn on paper and shown to the camera.",
    "Попросите нарисовать схему на бумаге и показать в камеру.",
    "Lass dir eine Skizze auf Papier zeichnen und in die Kamera halten.",
    "Pide un esquema dibujado en papel y mostrado a la cámara.",
    "Demandez un schéma dessiné sur papier et montré à la caméra.",
    "Poproś o schemat narysowany na kartce i pokazany do kamery.",
    "Peça um esquema desenhado no papel e mostrado para a câmera.",
    "请对方在纸上画出示意图，再对着摄像头展示。",
  ) },
  { id: "i-screen", stage: "during", text: t(
    "Live coding: демонстрація всього екрана, а не одного вікна.",
    "Live coding: share the whole screen, not a single window.",
    "Live coding: демонстрация всего экрана, а не одного окна.",
    "Live-Coding: ganzen Bildschirm teilen, nicht nur ein Fenster.",
    "Live coding: compartir toda la pantalla, no una sola ventana.",
    "Live coding : partage de tout l'écran, pas d'une seule fenêtre.",
    "Live coding: udostępnianie całego ekranu, nie jednego okna.",
    "Live coding: compartilhar a tela inteira, não só uma janela.",
    "现场编程：共享整个屏幕，而不是单个窗口。",
  ) },
  { id: "i-eyes", stage: "during", text: t(
    "За бажанням: одне питання із заплющеними очима.",
    "Optional: one question answered with eyes closed.",
    "По желанию: один вопрос с закрытыми глазами.",
    "Optional: eine Frage mit geschlossenen Augen beantworten lassen.",
    "Opcional: una pregunta con los ojos cerrados.",
    "En option : une question les yeux fermés.",
    "Opcjonalnie: jedno pytanie z zamkniętymi oczami.",
    "Opcional: uma pergunta de olhos fechados.",
    "可选：请对方闭着眼睛回答一个问题。",
  ) },
  { id: "i-score", stage: "after", text: t(
    "Оцініть за шкалою одразу, поки все свіже.",
    "Score against the scale right away, while it's fresh.",
    "Оцените по шкале сразу, пока всё свежо.",
    "Bewerte direkt nach Skala, solange alles frisch ist.",
    "Evalúa con la escala enseguida, mientras está fresco.",
    "Évaluez avec la grille tout de suite, tant que c'est frais.",
    "Oceń według skali od razu, póki pamiętasz.",
    "Avalie pela escala logo em seguida, enquanto está fresco.",
    "趁记忆犹新，马上按评分标准打分。",
  ) },
  { id: "i-whole", stage: "after", text: t(
    "Одна дивна ознака ще не привід для відмови. Дивіться на картину загалом і уточніть на наступному етапі.",
    "One odd signal isn't a reason to reject. Look at the whole picture and check again at the next stage.",
    "Один странный признак ещё не повод для отказа. Смотрите на картину в целом и уточните на следующем этапе.",
    "Ein einzelnes seltsames Signal ist kein Ablehnungsgrund. Sieh das Gesamtbild und prüf in der nächsten Runde nach.",
    "Una sola señal rara no es motivo de rechazo. Mira el conjunto y compruébalo en la siguiente fase.",
    "Un seul signal bizarre ne justifie pas un refus. Regardez l'ensemble et vérifiez à l'étape suivante.",
    "Jeden dziwny sygnał to jeszcze nie powód do odmowy. Patrz na całość i sprawdź na kolejnym etapie.",
    "Um sinal estranho sozinho não é motivo para recusar. Veja o quadro geral e confirme na próxima etapa.",
    "单个可疑迹象不足以拒绝。看整体表现，在下一轮再确认。",
  ) },
  { id: "i-reply", stage: "after", text: t(
    "Дайте кандидату відповідь у обіцяний строк, навіть якщо це «ні».",
    "Give the candidate an answer when you promised, even if it's a no.",
    "Дайте кандидату ответ в обещанный срок, даже если это «нет».",
    "Gib dem Bewerber zum versprochenen Termin Bescheid, auch wenn es ein Nein ist.",
    "Da una respuesta al candidato en el plazo prometido, aunque sea un no.",
    "Répondez au candidat dans le délai promis, même si c'est non.",
    "Daj kandydatowi odpowiedź w obiecanym terminie, nawet jeśli to „nie”.",
    "Dê uma resposta ao candidato no prazo prometido, mesmo que seja não.",
    "在承诺的时间内答复候选人，即使结果是拒绝。",
  ) },
];

// ───────── приёмы против AI-подсказок (только интервьюеру) ─────────
export type AntifraudIcon = "ear" | "eye" | "pen" | "clock" | "twist" | "screen";

export const ANTIFRAUD = {
  title: t("Як помітити AI-підказки", "How to spot AI prompting", "Как заметить AI-подсказки", "So erkennst du KI-Souffleure", "Cómo detectar ayuda de IA", "Repérer l'aide d'une IA", "Jak wyłapać podpowiedzi AI", "Como perceber ajuda de IA", "如何识别 AI 提示"),
  sub: t(
    "Необов'язково, але корисно. Перевірки однакові для всіх, тож чесним кандидатам вони не заважають.",
    "Optional, but useful. The checks are the same for everyone, so honest candidates don't mind.",
    "Необязательно, но полезно. Проверки одинаковые для всех, поэтому честным кандидатам они не мешают.",
    "Optional, aber hilfreich. Die Checks sind für alle gleich, ehrliche Bewerber stört das nicht.",
    "Opcional, pero útil. Las comprobaciones son iguales para todos, así que a los candidatos honestos no les molestan.",
    "Facultatif, mais utile. Les vérifications sont les mêmes pour tous, les candidats honnêtes n'y voient pas d'inconvénient.",
    "Opcjonalne, ale przydatne. Sprawdzenia są takie same dla wszystkich, więc uczciwym kandydatom nie przeszkadzają.",
    "Opcional, mas útil. As verificações são iguais para todos, então não incomodam candidatos honestos.",
    "可选，但很有用。所有人检查方式相同，诚实的候选人不会介意。",
  ),
  cards: [
    { icon: "ear" as AntifraudIcon,
      title: t("Навушники", "Headphones", "Наушники", "Kopfhörer", "Auriculares", "Écouteurs", "Słuchawki", "Fones", "耳机"),
      text: t(
        "Попросіть повернути голову. Без навушника голосом ніхто не підкаже.",
        "Ask them to turn their head. With no earpiece, nobody can whisper answers.",
        "Попросите повернуть голову. Без наушника голосом никто не подскажет.",
        "Bitte, den Kopf zu drehen. Ohne Ohrhörer kann niemand vorsagen.",
        "Pide que gire la cabeza. Sin auricular, nadie puede soplar respuestas.",
        "Demandez de tourner la tête. Sans oreillette, personne ne peut souffler.",
        "Poproś o obrót głowy. Bez słuchawki nikt nie podpowie głosem.",
        "Peça para virar a cabeça. Sem fone, ninguém sopra respostas.",
        "请对方转头。没有耳机，就没人能悄悄提示答案。",
      ) },
    { icon: "eye" as AntifraudIcon,
      title: t("Заплющені очі", "Eyes closed", "Закрытые глаза", "Augen zu", "Ojos cerrados", "Yeux fermés", "Zamknięte oczy", "Olhos fechados", "闭眼回答"),
      text: t(
        "Одне питання із заплющеними очима. Хто думає сам, відповість. Хто читає з екрана, зупиниться.",
        "One question with eyes closed. Someone thinking for themselves answers. Someone reading a screen stops.",
        "Один вопрос с закрытыми глазами. Кто думает сам, ответит. Кто читает с экрана, остановится.",
        "Eine Frage mit geschlossenen Augen. Wer selbst denkt, antwortet. Wer abliest, stockt.",
        "Una pregunta con los ojos cerrados. Quien piensa por sí mismo responde. Quien lee de la pantalla se detiene.",
        "Une question les yeux fermés. Qui réfléchit répond. Qui lit un écran s'arrête.",
        "Jedno pytanie z zamkniętymi oczami. Kto myśli sam, odpowie. Kto czyta z ekranu, utknie.",
        "Uma pergunta de olhos fechados. Quem pensa sozinho responde. Quem lê na tela trava.",
        "请对方闭眼回答一个问题。自己思考的人能答上来，照着屏幕念的人会卡住。",
      ) },
    { icon: "pen" as AntifraudIcon,
      title: t("Папір і ручка", "Pen and paper", "Бумага и ручка", "Stift und Papier", "Papel y bolígrafo", "Papier et stylo", "Kartka i długopis", "Papel e caneta", "纸和笔"),
      text: t(
        "Схема від руки, показана в камеру. Програма-підказчик за людину не намалює.",
        "A hand-drawn diagram shown to the camera. No helper app can draw it for them.",
        "Схема от руки, показанная в камеру. Программа-подсказчик за человека не нарисует.",
        "Eine Skizze von Hand, in die Kamera gehalten. Keine Helfer-App zeichnet das für den Bewerber.",
        "Un esquema a mano mostrado a la cámara. Ninguna app de ayuda puede dibujarlo por él.",
        "Un schéma à la main montré à la caméra. Aucune appli d'aide ne le dessine à sa place.",
        "Schemat narysowany ręcznie i pokazany do kamery. Żadna aplikacja-podpowiadacz nie narysuje go za kandydata.",
        "Um esquema à mão mostrado para a câmera. Nenhum app de ajuda desenha por ele.",
        "手绘示意图并对着摄像头展示。任何提示软件都没法代画。",
      ) },
    { icon: "clock" as AntifraudIcon,
      title: t("Однакова пауза", "Same pause", "Одинаковая пауза", "Gleiche Pause", "La misma pausa", "Même pause", "Ta sama pauza", "A mesma pausa", "同样的停顿"),
      text: t(
        "Пауза 3-5 секунд і перед легким, і перед складним питанням. Схоже, відповіді йдуть через AI.",
        "A 3-5 second pause before easy and hard questions alike. Answers may be going through AI.",
        "Пауза 3-5 секунд и перед лёгким, и перед сложным вопросом. Похоже, ответы идут через AI.",
        "3-5 Sekunden Pause vor leichten wie schweren Fragen. Vermutlich laufen die Antworten über KI.",
        "Una pausa de 3-5 segundos tanto ante preguntas fáciles como difíciles. Puede que las respuestas pasen por una IA.",
        "Une pause de 3-5 secondes avant les questions faciles comme difficiles. Les réponses passent peut-être par une IA.",
        "Pauza 3-5 sekund przed łatwym i trudnym pytaniem. Możliwe, że odpowiedzi idą przez AI.",
        "Uma pausa de 3-5 segundos antes de perguntas fáceis e difíceis. Pode ser que as respostas venham de uma IA.",
        "无论问题难易，回答前都停顿 3-5 秒，答案可能来自 AI。",
      ) },
    { icon: "twist" as AntifraudIcon,
      title: t("Зміна умови", "Change the conditions", "Смена условия", "Bedingung ändern", "Cambia las condiciones", "Changer les contraintes", "Zmiana warunków", "Mude as condições", "改变条件"),
      text: t(
        "Змініть умову задачі. Людина спирається на свою попередню відповідь, AI видає нову з нуля.",
        "Change the task's conditions. A person builds on their previous answer, AI starts from scratch.",
        "Измените условие задачи. Человек опирается на свой прошлый ответ, AI выдаёт новый с нуля.",
        "Ändere die Aufgabe. Ein Mensch baut auf seiner Antwort auf, KI fängt bei null an.",
        "Cambia el enunciado. Una persona se apoya en su respuesta anterior, la IA empieza de cero.",
        "Modifiez l'énoncé. Une personne s'appuie sur sa réponse précédente, l'IA repart de zéro.",
        "Zmień warunki zadania. Człowiek nawiązuje do swojej odpowiedzi, AI zaczyna od zera.",
        "Mude o enunciado. Uma pessoa parte da resposta anterior, a IA recomeça do zero.",
        "改动题目条件。真人会接着自己之前的回答往下说，AI 则从头另起一套。",
      ) },
    { icon: "screen" as AntifraudIcon,
      title: t("Весь екран", "Whole screen", "Весь экран", "Ganzer Bildschirm", "Pantalla completa", "Tout l'écran", "Cały ekran", "Tela inteira", "整个屏幕"),
      text: t(
        "Демонстрація всього екрана. Приховані підказчики ловлять сервіси з розділу інструментів нижче.",
        "Full screen sharing. Hidden helper apps can be caught with the tools listed below.",
        "Демонстрация всего экрана. Скрытые подсказчики ловят сервисы из раздела инструментов ниже.",
        "Den ganzen Bildschirm teilen. Versteckte Helfer-Apps erkennen die Tools weiter unten.",
        "Compartir toda la pantalla. Las apps de ayuda ocultas se detectan con las herramientas de abajo.",
        "Partage de tout l'écran. Les outils ci-dessous repèrent les applis d'aide cachées.",
        "Udostępnianie całego ekranu. Ukryte podpowiadacze wyłapią narzędzia z listy poniżej.",
        "Compartilhamento da tela inteira. Os apps de ajuda ocultos são detectados pelas ferramentas abaixo.",
        "共享整个屏幕。隐藏的提示软件可以用下面列出的工具检测。",
      ) },
  ],
};

// ───────── готовые тексты (только интервьюеру) ─────────
export const TEMPLATES = {
  title: t("Готові тексти", "Ready-made messages", "Готовые тексты", "Fertige Texte", "Textos listos", "Textes prêts à l'emploi", "Gotowe teksty", "Textos prontos", "现成文案"),
  items: [
    {
      id: "invite",
      label: t("Для запрошення", "For the invite", "Для приглашения", "Für die Einladung", "Para la invitación", "Pour l'invitation", "Do zaproszenia", "Para o convite", "用于邀请"),
      text: t(
        "Вітаю! Запрошуємо вас на співбесіду [дата, час]. Триватиме близько [N] хвилин. Формат: відеодзвінок з увімкненою камерою, без навушників, звук через динамік. Ці умови однакові для всіх кандидатів. До зустрічі!",
        "Hi! We'd like to invite you to an interview on [date, time]. It will take about [N] minutes. Format: video call with your camera on, no headphones, sound through the speaker. These conditions are the same for every candidate. See you soon!",
        "Здравствуйте! Приглашаем вас на собеседование [дата, время]. Оно займёт около [N] минут. Формат: видеозвонок с включённой камерой, без наушников, звук через динамик. Эти условия одинаковы для всех кандидатов. До встречи!",
        "Hallo! Wir laden dich zum Gespräch am [Datum, Uhrzeit] ein. Es dauert etwa [N] Minuten. Format: Videocall mit Kamera, ohne Kopfhörer, Ton über den Lautsprecher. Diese Bedingungen gelten für alle Bewerber. Bis bald!",
        "¡Hola! Te invitamos a una entrevista el [fecha, hora]. Durará unos [N] minutos. Formato: videollamada con la cámara encendida, sin auriculares y con el sonido por el altavoz. Las condiciones son las mismas para todos los candidatos. ¡Hasta pronto!",
        "Bonjour ! Nous vous invitons à un entretien le [date, heure]. Il durera environ [N] minutes. Format : visio avec caméra allumée, sans écouteurs, son par le haut-parleur. Ces conditions sont les mêmes pour tous les candidats. À bientôt !",
        "Cześć! Zapraszamy na rozmowę [data, godzina]. Potrwa około [N] minut. Format: wideorozmowa z włączoną kamerą, bez słuchawek, dźwięk przez głośnik. Te warunki są takie same dla wszystkich kandydatów. Do zobaczenia!",
        "Olá! Convidamos você para uma entrevista em [data, horário]. Vai durar cerca de [N] minutos. Formato: videochamada com câmera ligada, sem fones, som pelo alto-falante. As condições são iguais para todos os candidatos. Até logo!",
        "你好！诚邀你参加面试，时间：[日期、时间]，大约 [N] 分钟。形式：视频通话，请开启摄像头，不戴耳机，声音走扬声器。所有候选人条件相同。到时见！",
      ),
    },
    {
      id: "chat",
      label: t("У чат перед початком", "In the chat before you start", "В чат перед началом", "Für den Chat vor dem Start", "En el chat antes de empezar", "Dans le chat avant de commencer", "Na czat przed startem", "No chat antes de começar", "开始前发到聊天框"),
      text: t(
        "Добрий день! Перед початком увімкніть, будь ласка, камеру й зніміть навушники, говоримо через динамік. Це стандарт для всіх кандидатів. Дякуємо!",
        "Hello! Before we start, please turn on your camera and take off your headphones, we'll talk through the speaker. It's the same for every candidate. Thank you!",
        "Добрый день! Перед началом включите, пожалуйста, камеру и снимите наушники, говорим через динамик. Это стандарт для всех кандидатов. Спасибо!",
        "Hallo! Bevor wir starten: Bitte Kamera einschalten und Kopfhörer abnehmen, wir sprechen über den Lautsprecher. Das gilt für alle Bewerber. Danke!",
        "¡Hola! Antes de empezar, enciende la cámara y quítate los auriculares, hablaremos por el altavoz. Es igual para todos los candidatos. ¡Gracias!",
        "Bonjour ! Avant de commencer, merci d'allumer votre caméra et de retirer vos écouteurs, on parle par le haut-parleur. C'est pareil pour tous les candidats. Merci !",
        "Dzień dobry! Zanim zaczniemy, włącz proszę kamerę i zdejmij słuchawki, rozmawiamy przez głośnik. To standard dla wszystkich kandydatów. Dziękujemy!",
        "Olá! Antes de começar, ligue a câmera e tire os fones, vamos falar pelo alto-falante. É o padrão para todos os candidatos. Obrigado!",
        "你好！开始之前，请打开摄像头并摘下耳机，我们用扬声器交流。所有候选人都一样。谢谢！",
      ),
    },
  ],
};

// ───────── инструменты ─────────
// Ссылки с пометкой источника: потом видно, сколько переходов дала страница
// (пригодится, если сервисы захотят партнёрку или рекламу).
const REF = "utm_source=a1appp&utm_medium=interview_kit";
function ref(url: string): string {
  return url + (url.includes("?") ? "&" : "?") + REF;
}

const G_RECORD: ToolGroup = {
  id: "record",
  title: t("Записати й розшифрувати", "Record and transcribe", "Записать и расшифровать", "Aufnehmen und transkribieren", "Grabar y transcribir", "Enregistrer et transcrire", "Nagraj i spisz", "Gravar e transcrever", "录音与转写"),
  desc: t(
    "Запис дзвінка, текст розмови й короткий підсумок, щоб не відволікатися на нотатки.",
    "Call recording, transcript and a short summary, so you don't get distracted taking notes.",
    "Запись звонка, текст разговора и короткий итог, чтобы не отвлекаться на заметки.",
    "Aufnahme, Transkript und kurze Zusammenfassung, damit du nicht mitschreiben musst.",
    "Grabación, transcripción y un resumen breve para no distraerte tomando notas.",
    "Enregistrement, transcription et court résumé, pour ne pas vous disperser à prendre des notes.",
    "Nagranie, transkrypcja i krótkie podsumowanie, żeby nie rozpraszać się notatkami.",
    "Gravação, transcrição e um resumo curto, para não se distrair anotando.",
    "录下通话、生成文字稿和简短总结，不用分心记笔记。",
  ),
  tools: [
    { name: "Fathom", url: ref("https://fathom.video"), logo: "fathom" },
    { name: "Fireflies.ai", url: ref("https://fireflies.ai"), color: "#E1306C" },
    { name: "tl;dv", url: ref("https://tldv.io"), color: "#6E3DEB" },
    { name: "Otter.ai", url: ref("https://otter.ai"), color: "#1F6FEB" },
  ],
};

const G_CODE: ToolGroup = {
  id: "code",
  title: t("Код наживо", "Live coding", "Код вживую", "Live-Coding", "Código en vivo", "Code en direct", "Kod na żywo", "Código ao vivo", "现场编程"),
  desc: t(
    "Спільний редактор: кандидат пише, ви бачите кожну літеру.",
    "A shared editor: the candidate types, you see every keystroke.",
    "Общий редактор: кандидат пишет, вы видите каждую букву.",
    "Ein gemeinsamer Editor: Der Bewerber tippt, du siehst jede Taste.",
    "Un editor compartido: el candidato escribe y tú ves cada tecla.",
    "Un éditeur partagé : le candidat tape, vous voyez chaque frappe.",
    "Wspólny edytor: kandydat pisze, ty widzisz każdy znak.",
    "Um editor compartilhado: o candidato digita e você vê cada tecla.",
    "共享编辑器：候选人敲代码，你能看到每一次按键。",
  ),
  tools: [
    { name: "CoderPad", url: ref("https://coderpad.io"), color: "#2C3E50" },
    { name: "CodeSignal", url: ref("https://codesignal.com"), logo: "codesignal" },
    { name: "HackerRank", url: ref("https://www.hackerrank.com"), logo: "hackerrank" },
    { name: "CodeSandbox", url: ref("https://codesandbox.io"), logo: "codesandbox" },
  ],
};

const G_BOARD: ToolGroup = {
  id: "board",
  title: t("Дошка для схем", "Whiteboard", "Доска для схем", "Whiteboard", "Pizarra", "Tableau blanc", "Tablica", "Quadro branco", "白板"),
  desc: t(
    "Для системного дизайну й архітектури: малюєте разом в одному вікні.",
    "For system design and architecture: draw together in one window.",
    "Для системного дизайна и архитектуры: рисуете вместе в одном окне.",
    "Für System Design und Architektur: gemeinsam in einem Fenster zeichnen.",
    "Para diseño de sistemas y arquitectura: dibujáis juntos en una ventana.",
    "Pour le system design et l'architecture : dessinez ensemble dans une même fenêtre.",
    "Do projektowania systemów i architektury: rysujecie razem w jednym oknie.",
    "Para system design e arquitetura: desenhem juntos na mesma janela.",
    "用于系统设计和架构：在同一个窗口里一起画。",
  ),
  tools: [
    { name: "Excalidraw", url: ref("https://excalidraw.com"), logo: "excalidraw" },
    { name: "tldraw", url: ref("https://www.tldraw.com"), logo: "tldraw" },
    { name: "Miro", url: ref("https://miro.com"), logo: "miro" },
  ],
};

const G_DETECT: ToolGroup = {
  id: "detect",
  title: t("Перевірка на AI-підказчики", "AI helper detection", "Проверка на AI-подсказчики", "KI-Helfer erkennen", "Detectar ayudantes de IA", "Détecter les assistants IA", "Wykrywanie podpowiadaczy AI", "Detectar ajudantes de IA", "检测 AI 提示软件"),
  desc: t(
    "Сервіси, що помічають приховані програми-підказчики під час співбесіди.",
    "Services that notice hidden helper apps during the interview.",
    "Сервисы, которые замечают скрытые программы-подсказчики во время собеседования.",
    "Dienste, die versteckte Helfer-Apps im Gespräch bemerken.",
    "Servicios que detectan apps de ayuda ocultas durante la entrevista.",
    "Des services qui repèrent les applis d'aide cachées pendant l'entretien.",
    "Usługi, które wyłapują ukryte aplikacje-podpowiadacze w trakcie rozmowy.",
    "Serviços que percebem apps de ajuda ocultos durante a entrevista.",
    "能在面试中发现隐藏提示软件的服务。",
  ),
  tools: [
    { name: "Truely", url: ref("https://validia.ai/ai-assistant-detector"), color: "#111827" },
    { name: "Talview", url: ref("https://www.talview.com"), color: "#0B5FFF" },
    { name: "Fabric", url: ref("https://www.fabrichq.ai"), color: "#7C3AED" },
  ],
};

const G_SCHEDULE: ToolGroup = {
  id: "schedule",
  title: t("Призначити час", "Scheduling", "Назначить время", "Termine planen", "Agendar", "Planifier", "Umawianie terminu", "Agendar", "安排时间"),
  desc: t(
    "Кандидат сам обирає вільний слот, без листування туди-сюди.",
    "The candidate picks a free slot, no back-and-forth emails.",
    "Кандидат сам выбирает свободный слот, без переписки туда-сюда.",
    "Der Bewerber wählt selbst einen freien Slot, ohne Mail-Pingpong.",
    "El candidato elige un hueco libre, sin idas y venidas de correos.",
    "Le candidat choisit un créneau libre, sans allers-retours d'e-mails.",
    "Kandydat sam wybiera wolny termin, bez przerzucania się mailami.",
    "O candidato escolhe um horário livre, sem troca de e-mails.",
    "候选人自己挑选空闲时段，不用来回发邮件。",
  ),
  tools: [
    { name: "Calendly", url: ref("https://calendly.com"), logo: "calendly" },
    { name: "Cal.com", url: ref("https://cal.com"), logo: "caldotcom" },
    { name: "Google Calendar", url: ref("https://calendar.google.com"), logo: "googlecalendar" },
  ],
};

const G_PRACTICE: ToolGroup = {
  id: "practice",
  title: t("Потренуватися", "Practice", "Потренироваться", "Üben", "Practicar", "S'entraîner", "Poćwicz", "Treinar", "模拟练习"),
  desc: t(
    "Пробні співбесіди з AI або з живими людьми.",
    "Mock interviews with AI or with real people.",
    "Пробные собеседования с AI или с живыми людьми.",
    "Probe-Interviews mit KI oder echten Menschen.",
    "Entrevistas de prueba con IA o con personas reales.",
    "Des entretiens d'entraînement avec une IA ou de vraies personnes.",
    "Próbne rozmowy z AI albo z prawdziwymi ludźmi.",
    "Entrevistas simuladas com IA ou com pessoas reais.",
    "和 AI 或真人进行模拟面试。",
  ),
  tools: [
    { name: "Interview Warmup", url: ref("https://grow.google/certificates/interview-warmup/"), logo: "google" },
    { name: "interviewing.io", url: ref("https://interviewing.io"), color: "#0F172A" },
    { name: "Yoodli", url: ref("https://yoodli.ai"), color: "#5B5BD6" },
  ],
};

const G_ALGO: ToolGroup = {
  id: "algo",
  title: t("Задачі на алгоритми", "Algorithm problems", "Задачи на алгоритмы", "Algorithmus-Aufgaben", "Problemas de algoritmos", "Exercices d'algorithmes", "Zadania algorytmiczne", "Problemas de algoritmos", "算法题"),
  desc: t(
    "Типові задачі з технічних співбесід, з розв'язками й обговореннями.",
    "Typical tech interview problems, with solutions and discussions.",
    "Типичные задачи с технических собеседований, с решениями и обсуждениями.",
    "Typische Aufgaben aus Tech-Interviews, mit Lösungen und Diskussionen.",
    "Problemas típicos de entrevistas técnicas, con soluciones y debates.",
    "Les exercices classiques des entretiens techniques, avec solutions et discussions.",
    "Typowe zadania z rozmów technicznych, z rozwiązaniami i dyskusjami.",
    "Problemas típicos de entrevistas técnicas, com soluções e discussões.",
    "技术面试常见题目，附解法和讨论。",
  ),
  tools: [
    { name: "LeetCode", url: ref("https://leetcode.com"), logo: "leetcode" },
    { name: "NeetCode", url: ref("https://neetcode.io"), color: "#2563EB" },
    { name: "HackerRank", url: ref("https://www.hackerrank.com"), logo: "hackerrank" },
    { name: "Codewars", url: ref("https://www.codewars.com"), logo: "codewars" },
  ],
};

export const TOOL_GROUPS: Record<Role, ToolGroup[]> = {
  interviewer: [G_RECORD, G_CODE, G_BOARD, G_DETECT, G_SCHEDULE],
  // 24.10.2026: блок «Резюме» убран (Александр): A1 ведёт к тому, что профиль
  // заменяет резюме, советовать конструкторы CV значит спорить с собой.
  candidate: [G_PRACTICE, G_ALGO, G_BOARD],
};

// ───────── «От A1» (кандидату) ─────────
export const FROM_A1 = [
  {
    id: "questions",
    // Украинский и русский читают украинскую страницу, остальные -- английскую.
    href: { uk: "/pytannia-na-spivbesidi", ru: "/pytannia-na-spivbesidi", other: "/interview-questions" },
    title: t("Питання на співбесіді", "Interview questions", "Вопросы на собеседовании", "Interviewfragen", "Preguntas de entrevista", "Questions d'entretien", "Pytania na rozmowie", "Perguntas de entrevista", "面试问题"),
    desc: t("Типові питання за професіями.", "Typical questions by role.", "Типичные вопросы по профессиям.", "Typische Fragen nach Beruf.", "Preguntas típicas por rol.", "Questions typiques par métier.", "Typowe pytania według zawodu.", "Perguntas típicas por função.", "按岗位整理的常见问题。"),
  },
  {
    id: "salaries",
    href: { uk: "/stats", ru: "/stats", other: "/stats" },
    title: t("Зарплати за технологіями", "Salaries by technology", "Зарплаты по технологиям", "Gehälter nach Technologie", "Salarios por tecnología", "Salaires par technologie", "Wynagrodzenia według technologii", "Salários por tecnologia", "按技术划分的薪资"),
    desc: t(
      "Медіана у вашій країні: знатимете свою цифру.",
      "The median in your country, so you know your number.",
      "Медиана в вашей стране: будете знать свою цифру.",
      "Der Median in deinem Land, damit du deine Zahl kennst.",
      "La mediana en tu país, para saber tu cifra.",
      "La médiane dans votre pays, pour connaître votre chiffre.",
      "Mediana w twoim kraju, żebyś znał swoją kwotę.",
      "A mediana no seu país, para saber seu número.",
      "你所在国家的薪资中位数，心里有个数。",
    ),
  },
];

export const CHECKLIST: Record<Role, CheckItem[]> = {
  candidate: CANDIDATE_CHECKLIST,
  interviewer: INTERVIEWER_CHECKLIST,
};

// ───────── «Профіль A1 замість резюме» (кандидату) ─────────
// 24.10.2026 (Александр: «продвигать тезис, что профиль заменяет резюме;
// гостю "Створити профіль", тем, кто заполнил меньше 5 полей, "Заповніть",
// заполненным не показывать; теги, чем профиль лучше; ниже пример профиля
// кота по стрелке»).
export const PROFILE_CV = {
  title: t("Профіль A1 замість резюме", "Your A1 profile instead of a CV", "Профиль A1 вместо резюме", "Dein A1-Profil statt Lebenslauf", "Tu perfil de A1 en lugar del CV", "Votre profil A1 à la place du CV", "Profil A1 zamiast CV", "Seu perfil A1 no lugar do currículo", "用 A1 个人主页代替简历"),
  text: t(
    "Класичне резюме застаріло. Надішліть рекрутеру одне посилання на свій профіль A1: живий, інтерактивний і завжди актуальний. Тримайте його заповненим: рекрутери дивляться саме на нього.",
    "The classic CV is outdated. Send a recruiter one link to your A1 profile: live, interactive and always up to date. Keep it filled in: that's what recruiters look at.",
    "Классическое резюме устарело. Отправьте рекрутеру одну ссылку на свой профиль A1: живой, интерактивный и всегда актуальный. Держите его заполненным: рекрутеры смотрят именно на него.",
    "Der klassische Lebenslauf ist von gestern. Schick Recruitern einen Link zu deinem A1-Profil: lebendig, interaktiv und immer aktuell. Halte es vollständig: genau das schauen sich Recruiter an.",
    "El CV clásico se ha quedado viejo. Envía a los reclutadores un enlace a tu perfil de A1: vivo, interactivo y siempre al día. Mantenlo completo: es lo que miran los reclutadores.",
    "Le CV classique a fait son temps. Envoyez aux recruteurs un lien vers votre profil A1 : vivant, interactif et toujours à jour. Gardez-le complet : c'est lui que les recruteurs regardent.",
    "Klasyczne CV to przeszłość. Wyślij rekruterowi jeden link do profilu A1: żywego, interaktywnego i zawsze aktualnego. Dbaj, żeby był uzupełniony: to na niego patrzą rekruterzy.",
    "O currículo clássico ficou para trás. Mande ao recrutador um link para seu perfil A1: vivo, interativo e sempre atualizado. Mantenha-o completo: é isso que os recrutadores olham.",
    "传统简历已经过时。给招聘方发一个 A1 个人主页链接就够了：生动、可互动，而且随时是最新的。请保持主页完整：招聘方看的就是它。",
  ),
  // 24.10.2026: блок висит для всех (рекомендация «тримайте профіль заповненим»),
  // текст под место: вход в раздел (обе стороны), кандидату, интервьюеру.
  textHub: t(
    "Класичне резюме застаріло. Профіль A1 живий та інтерактивний: голос, стек, GitHub і роботи за одним посиланням. Тримайте його заповненим, це працює в обидва боки: кандидата простіше оцінити, а компанії простіше довіритися.",
    "The classic CV is outdated. An A1 profile is live and interactive: voice, stack, GitHub and work samples behind one link. Keep it filled in, it works both ways: candidates are easier to evaluate, and companies are easier to trust.",
    "Классическое резюме устарело. Профиль A1 живой и интерактивный: голос, стек, GitHub и работы по одной ссылке. Держите его заполненным, это работает в обе стороны: кандидата проще оценить, а компании проще доверять.",
    "Der klassische Lebenslauf ist von gestern. Ein A1-Profil ist lebendig und interaktiv: Stimme, Stack, GitHub und Arbeitsproben hinter einem Link. Halte es vollständig, das hilft beiden Seiten: Kandidaten lassen sich leichter einschätzen, Unternehmen wirken vertrauenswürdiger.",
    "El CV clásico se ha quedado viejo. Un perfil de A1 es vivo e interactivo: voz, stack, GitHub y trabajos en un solo enlace. Mantenlo completo, funciona en ambos sentidos: al candidato es más fácil evaluarlo y en la empresa es más fácil confiar.",
    "Le CV classique a fait son temps. Un profil A1 est vivant et interactif : voix, stack, GitHub et réalisations derrière un seul lien. Gardez-le complet, ça marche dans les deux sens : un candidat s'évalue plus facilement, une entreprise inspire plus confiance.",
    "Klasyczne CV to przeszłość. Profil A1 jest żywy i interaktywny: głos, stack, GitHub i projekty pod jednym linkiem. Dbaj, żeby był uzupełniony, to działa w obie strony: kandydata łatwiej ocenić, a firmie łatwiej zaufać.",
    "O currículo clássico ficou para trás. Um perfil A1 é vivo e interativo: voz, stack, GitHub e trabalhos em um só link. Mantenha-o completo, isso vale para os dois lados: fica mais fácil avaliar o candidato e confiar na empresa.",
    "传统简历已经过时。A1 个人主页生动又可互动：语音、技术栈、GitHub 和作品都在一个链接里。请保持主页完整，这对双方都有好处：候选人更容易被了解，公司也更容易被信任。",
  ),
  textInterviewer: t(
    "Класичне резюме застаріло. Перед дзвінком відкрийте профіль кандидата в A1: голос, стек, GitHub і роботи на одній сторінці. І тримайте заповненим профіль своєї компанії: кандидати теж дивляться, з ким говорять.",
    "The classic CV is outdated. Before the call, open the candidate's A1 profile: voice, stack, GitHub and work samples on one page. And keep your company profile filled in too: candidates also check who they're talking to.",
    "Классическое резюме устарело. Перед звонком откройте профиль кандидата в A1: голос, стек, GitHub и работы на одной странице. И держите заполненным профиль своей компании: кандидаты тоже смотрят, с кем говорят.",
    "Der klassische Lebenslauf ist von gestern. Öffne vor dem Call das A1-Profil der Person: Stimme, Stack, GitHub und Arbeitsproben auf einer Seite. Und halte auch euer Firmenprofil vollständig: Kandidaten schauen ebenfalls, mit wem sie sprechen.",
    "El CV clásico se ha quedado viejo. Antes de la llamada, abre el perfil de A1 del candidato: voz, stack, GitHub y trabajos en una sola página. Y mantén completo el perfil de tu empresa: los candidatos también miran con quién hablan.",
    "Le CV classique a fait son temps. Avant l'appel, ouvrez le profil A1 du candidat : voix, stack, GitHub et réalisations sur une seule page. Et gardez aussi le profil de votre entreprise complet : les candidats regardent eux aussi à qui ils parlent.",
    "Klasyczne CV to przeszłość. Przed rozmową otwórz profil kandydata w A1: głos, stack, GitHub i projekty na jednej stronie. I dbaj o uzupełniony profil swojej firmy: kandydaci też sprawdzają, z kim rozmawiają.",
    "O currículo clássico ficou para trás. Antes da chamada, abra o perfil A1 do candidato: voz, stack, GitHub e trabalhos em uma só página. E mantenha completo o perfil da sua empresa: os candidatos também olham com quem estão falando.",
    "传统简历已经过时。通话前先打开候选人的 A1 主页：语音、技术栈、GitHub 和作品都在一页上。也请保持公司主页完整：候选人同样会看自己在和谁交谈。",
  ),
  myProfile: t("Мій профіль", "My profile", "Мой профиль", "Mein Profil", "Mi perfil", "Mon profil", "Mój profil", "Meu perfil", "我的主页"),
  tags: [
    { id: "voice", label: t("Голосова візитка", "Voice intro", "Голосовая визитка", "Sprach-Intro", "Presentación de voz", "Présentation vocale", "Wizytówka głosowa", "Apresentação em áudio", "语音名片") },
    { id: "skills", label: t("Стек і рівень навичок", "Stack and skill levels", "Стек и уровень навыков", "Stack und Skill-Level", "Stack y nivel", "Stack et niveau", "Stack i poziom", "Stack e nível", "技术栈与熟练度") },
    { id: "github", label: t("GitHub", "GitHub", "GitHub", "GitHub", "GitHub", "GitHub", "GitHub", "GitHub", "GitHub") },
    { id: "dribbble", label: t("Dribbble", "Dribbble", "Dribbble", "Dribbble", "Dribbble", "Dribbble", "Dribbble", "Dribbble", "Dribbble") },
    { id: "so", label: t("Stack Overflow", "Stack Overflow", "Stack Overflow", "Stack Overflow", "Stack Overflow", "Stack Overflow", "Stack Overflow", "Stack Overflow", "Stack Overflow") },
    { id: "links", label: t("Посилання", "Links", "Ссылки", "Links", "Enlaces", "Liens", "Linki", "Links", "链接") },
    { id: "exp", label: t("Досвід і компанії", "Experience", "Опыт и компании", "Erfahrung", "Experiencia", "Expérience", "Doświadczenie", "Experiência", "工作经历") },
    { id: "langs", label: t("Мови", "Languages", "Языки", "Sprachen", "Idiomas", "Langues", "Języki", "Idiomas", "语言") },
  ],
  create: t("Створити профіль", "Create profile", "Создать профиль", "Profil erstellen", "Crear perfil", "Créer mon profil", "Utwórz profil", "Criar perfil", "创建个人主页"),
  fill: t("Заповнити профіль", "Complete your profile", "Заполнить профиль", "Profil vervollständigen", "Completar perfil", "Compléter mon profil", "Uzupełnij profil", "Completar perfil", "完善个人主页"),
  filled: t("Заповнено", "Completed", "Заполнено", "Ausgefüllt", "Completado", "Rempli", "Uzupełniono", "Preenchido", "已完成"),
  example: t("Приклад заповненого профілю", "Example of a complete profile", "Пример заполненного профиля", "Beispiel für ein vollständiges Profil", "Ejemplo de perfil completo", "Exemple de profil complet", "Przykład wypełnionego profilu", "Exemplo de perfil completo", "完整个人主页示例"),
};
