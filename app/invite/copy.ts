// app/invite/copy.ts -- тексты экрана «Отримай Alpha» на всех 9 языках сайта.
//
// 18.10.2026 (Александр: «почему ты не делаешь локализацию сразу? у нас много языков, не два»):
// раньше здесь были только uk и en. Теперь все девять: uk, en, ru, de, es, fr, pl, ptBR, zh.
// Правила: без длинных тире; uk/ru на «Ви/Вы» (его правило для текстов интерфейса); числа и формы слов
// (друг/друга/друзів и т.п.) собирает makeT() по правилу множественного числа языка.
// Новый язык или новую строку добавлять сюда и только сюда: invite-client.tsx берёт всё через makeT().

import type { Locale } from "@/components/t";

type Plural = "slav" | "pl" | "en" | "fr" | "none";

export type Copy = {
  plural: Plural;
  /** пробел между числом и словом: " " почти везде, "" для китайского */
  sp: string;
  /** «3 друга»: именительный/счётный вид. Формы по правилу plural (slav/pl: 3 формы, en/fr: 2, none: 1) */
  friend: string[];
  /** «Запросіть 3 друзів»: винительный (для славянских отличается от friend) */
  friendAcc: string[];
  month: string[];
  /** подпись месяцев под кружком на шкале (короткая) */
  mo: string[];
  title: string;
  sub: string;
  yourLink: string;
  share: string;
  copy: string;
  copied: string;
  alphaTitle: string;
  alphaSub: string;
  perks: { icon: string; title: string; text: string }[];
  ladderTitle: string;
  scaleHint: string;
  rule: string;
  friendRow: string;
  earned: string;
  none: string;
  toNext: string;
  top: string;
  counted: string;
  invited: string;
  noInvited: string;
  stJoined: string;
  stCounted: string;
  howTitle: string;
  how: string[];
  fine: string;
  signInTitle: string;
  err: string;
  loading: string;
  notEligible: string;
  shareText: string;
};

function pick(rule: Plural, n: number, forms: string[]): string {
  let i = 0;
  const m10 = n % 10;
  const m100 = n % 100;
  if (rule === "slav") i = m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2;
  else if (rule === "pl") i = n === 1 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2;
  else if (rule === "en") i = n === 1 ? 0 : 1;
  else if (rule === "fr") i = n < 2 ? 0 : 1;
  return forms[Math.min(i, forms.length - 1)] ?? forms[0] ?? "";
}

function fmt(s: string, v: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
}

/** Собирает из данных языка набор функций, которыми пользуется экран. */
export function makeT(c: Copy) {
  const friends = (n: number) => `${n}${c.sp}${pick(c.plural, n, c.friend)}`;
  const friendsAcc = (n: number) => `${n}${c.sp}${pick(c.plural, n, c.friendAcc)}`;
  const months = (n: number) => `${n}${c.sp}${pick(c.plural, n, c.month)}`;
  return {
    ...c,
    friends,
    months,
    moLabel: (n: number) => `${n}${c.sp}${pick(c.plural, n, c.mo)}`,
    sub: (d: number) => fmt(c.sub, { d }),
    rule: (f: number, m: number) => fmt(c.rule, { f: friendsAcc(f), m: months(m) }),
    friendRow: (d: number) => fmt(c.friendRow, { d }),
    earned: (m: string) => fmt(c.earned, { m }),
    none: (f: number) => fmt(c.none, { f: friendsAcc(f) }),
    toNext: (left: number, f: number, m: string) => fmt(c.toNext, { left: friends(left), f, m }),
    pin: (n: number) => `${friends(n)} 🎉`,
    counted: (n: number) => fmt(c.counted, { n: friends(n) }),
    stJoined: (h: number) => fmt(c.stJoined, { h }),
    how: (h: number, d: number) => c.how.map((s) => fmt(s, { h, d })),
    shareText: (d: number) => fmt(c.shareText, { d }),
  };
}

export const COPY: Record<Locale, Copy> = {
  uk: {
    plural: "slav",
    sp: " ",
    friend: ["друг", "друга", "друзів"],
    friendAcc: ["друга", "друзів", "друзів"],
    month: ["місяць", "місяці", "місяців"],
    mo: ["міс.", "міс.", "міс."],
    title: "Отримай Alpha",
    sub: "Запрошуйте друзів в A1 і отримуйте Alpha безкоштовно. Друг теж отримає {d} днів Alpha в подарунок 🎁",
    yourLink: "Ваше посилання",
    share: "🎁 Поділитися",
    copy: "Копіювати",
    copied: "Скопійовано ✓",
    alphaTitle: "Що таке A1 Alpha",
    alphaSub: "Клуб для тих, хто серйозно шукає роботу чи людей. Зазвичай Alpha платна, а тут її можна отримати безкоштовно.",
    perks: [
      { icon: "🔎", title: "Alpha Пошук", text: "Розкажіть словами, що шукаєте, і ШІ підбере найкращі вакансії та пояснить, чому вони підходять саме вам." },
      { icon: "🔔", title: "Нові збіги щодня", text: "Alpha запамʼятовує ваш портрет і раз на день надсилає свіжі вакансії в окремий чат." },
      { icon: "✨", title: "Magic Post", text: "Опишіть вакансію чи пост голосом або текстом, і Alpha сама заповнить усі поля." },
      { icon: "🐠", title: "Значок і бігуча стрічка", text: "Значок учасника клубу біля імені й ваш власний рядок-думка, який бачать усі." },
    ],
    ladderTitle: "Скільки друзів, стільки подарунків",
    scaleHint: "У кружечку: скільки друзів. Під ним: місяців Alpha. Кружечок заповнюється, коли друг зараховується.",
    rule: "Запросіть {f} і отримайте {m} Alpha",
    friendRow: "Запрошені друзі отримають: {d} днів Alpha в подарунок",
    earned: "Вже зароблено: {m} Alpha 🎉",
    none: "Поки що 0. Запросіть {f}, і це вже місяць Alpha!",
    toNext: "Ще {left} до {f}, і ви отримаєте {m} Alpha",
    top: "Це максимум 🎉 Далі партнерська програма з виплатами. Напишіть нам.",
    counted: "Зараховано: {n}",
    invited: "Ваші друзі",
    noInvited: "Поки нікого. Надішліть посилання, і друзі зʼявляться тут.",
    stJoined: "Чекає {h} годин",
    stCounted: "Зараховано ✓",
    howTitle: "Як це працює",
    how: [
      "Друг відкриває ваше посилання і реєструється в A1.",
      "Через {h} годин він зараховується. Так ми відсіюємо фейкові реєстрації.",
      "Місяці Alpha накопичуються на вашому акаунті й увімкнуться самі, щойно ми запустимо Alpha.",
      "Друг теж отримує {d} днів Alpha в подарунок.",
    ],
    fine: "Свій акаунт запросити не можна, один друг має одного запрошувача. Фейкові реєстрації не зараховуються.",
    signInTitle: "Увійдіть, щоб отримати своє посилання",
    err: "Щось пішло не так. Спробуйте ще раз за хвилину.",
    loading: "Завантаження…",
    notEligible: "Для цього акаунта програма недоступна.",
    shareText: "Приєднуйтесь до A1 і отримайте Alpha на {d} днів",
  },
  en: {
    plural: "en",
    sp: " ",
    friend: ["friend", "friends"],
    friendAcc: ["friend", "friends"],
    month: ["month", "months"],
    mo: ["mo", "mo"],
    title: "Get Alpha",
    sub: "Invite friends to A1 and get Alpha for free. Your friend gets {d} days of Alpha as a gift too 🎁",
    yourLink: "Your link",
    share: "🎁 Share with a friend",
    copy: "Copy",
    copied: "Copied ✓",
    alphaTitle: "What is A1 Alpha",
    alphaSub: "A club for people who are serious about finding a job or talent. Alpha is normally paid, and here you can get it for free.",
    perks: [
      { icon: "🔎", title: "Alpha Search", text: "Tell it in your own words what you want, and AI picks the best jobs and explains why they fit you." },
      { icon: "🔔", title: "New matches daily", text: "Alpha remembers your profile and sends fresh jobs to a separate chat once a day." },
      { icon: "✨", title: "Magic Post", text: "Describe a job or a post by voice or text, and Alpha fills in all the fields for you." },
      { icon: "🐠", title: "Badge and running line", text: "A club badge next to your name and your own one-line thought that everyone can see." },
    ],
    ladderTitle: "More friends, more gifts",
    scaleHint: "In the circle: friends. Below it: months of Alpha. A circle fills up once a friend counts.",
    rule: "Invite {f} and get {m} of Alpha",
    friendRow: "Invited friends get: {d} days of Alpha as a gift",
    earned: "Earned so far: {m} of Alpha 🎉",
    none: "Nothing yet. Invite {f} and that's already a month of Alpha!",
    toNext: "{left} more to reach {f}, and you'll have {m} of Alpha",
    top: "That's the top 🎉 Next is the partner programme with payouts. Write to us.",
    counted: "{n} counted",
    invited: "Your friends",
    noInvited: "Nobody yet. Send your link and your friends will show up here.",
    stJoined: "Waiting {h} hours",
    stCounted: "Counted ✓",
    howTitle: "How it works",
    how: [
      "A friend opens your link and signs up to A1.",
      "After {h} hours they count. This is how we filter out fake sign-ups.",
      "Alpha months pile up on your account and switch on by themselves once Alpha launches.",
      "Your friend gets {d} days of Alpha as a gift too.",
    ],
    fine: "You can't invite your own account, and one friend has one inviter. Fake sign-ups don't count.",
    signInTitle: "Sign in to get your link",
    err: "Something went wrong. Please try again in a minute.",
    loading: "Loading…",
    notEligible: "The programme isn't available for this account.",
    shareText: "Join A1 and get {d} days of Alpha",
  },
  ru: {
    plural: "slav",
    sp: " ",
    friend: ["друг", "друга", "друзей"],
    friendAcc: ["друга", "друзей", "друзей"],
    month: ["месяц", "месяца", "месяцев"],
    mo: ["мес.", "мес.", "мес."],
    title: "Получи Alpha",
    sub: "Приглашайте друзей в A1 и получайте Alpha бесплатно. Друг тоже получит {d} дней Alpha в подарок 🎁",
    yourLink: "Ваша ссылка",
    share: "🎁 Поделиться",
    copy: "Копировать",
    copied: "Скопировано ✓",
    alphaTitle: "Что такое A1 Alpha",
    alphaSub: "Клуб для тех, кто всерьёз ищет работу или людей. Обычно Alpha платная, а здесь её можно получить бесплатно.",
    perks: [
      { icon: "🔎", title: "Alpha Поиск", text: "Расскажите словами, что ищете, и ИИ подберёт лучшие вакансии и объяснит, почему они подходят именно вам." },
      { icon: "🔔", title: "Новые совпадения каждый день", text: "Alpha запоминает ваш портрет и раз в день присылает свежие вакансии в отдельный чат." },
      { icon: "✨", title: "Magic Post", text: "Опишите вакансию или пост голосом или текстом, и Alpha сама заполнит все поля." },
      { icon: "🐠", title: "Значок и бегущая строка", text: "Значок участника клуба рядом с именем и ваша собственная строка-мысль, которую видят все." },
    ],
    ladderTitle: "Сколько друзей, столько подарков",
    scaleHint: "В кружке: сколько друзей. Под ним: месяцев Alpha. Кружок заполняется, когда друг засчитывается.",
    rule: "Пригласите {f} и получите {m} Alpha",
    friendRow: "Приглашённые друзья получают: {d} дней Alpha в подарок",
    earned: "Уже заработано: {m} Alpha 🎉",
    none: "Пока 0. Пригласите {f}, и это уже месяц Alpha!",
    toNext: "Ещё {left} до {f}, и вы получите {m} Alpha",
    top: "Это максимум 🎉 Дальше партнёрская программа с выплатами. Напишите нам.",
    counted: "Засчитано: {n}",
    invited: "Ваши друзья",
    noInvited: "Пока никого. Отправьте ссылку, и друзья появятся здесь.",
    stJoined: "Ждёт {h} часов",
    stCounted: "Засчитан ✓",
    howTitle: "Как это работает",
    how: [
      "Друг открывает вашу ссылку и регистрируется в A1.",
      "Через {h} часов он засчитывается. Так мы отсеиваем фейковые регистрации.",
      "Месяцы Alpha копятся на вашем аккаунте и включатся сами, как только мы запустим Alpha.",
      "Друг тоже получает {d} дней Alpha в подарок.",
    ],
    fine: "Свой аккаунт пригласить нельзя, у одного друга один пригласивший. Фейковые регистрации не засчитываются.",
    signInTitle: "Войдите, чтобы получить свою ссылку",
    err: "Что-то пошло не так. Попробуйте ещё раз через минуту.",
    loading: "Загрузка…",
    notEligible: "Для этого аккаунта программа недоступна.",
    shareText: "Присоединяйтесь к A1 и получите Alpha на {d} дней",
  },
  de: {
    plural: "en",
    sp: " ",
    friend: ["Freund", "Freunde"],
    friendAcc: ["Freund", "Freunde"],
    month: ["Monat", "Monate"],
    mo: ["Mon.", "Mon."],
    title: "Hol dir Alpha",
    sub: "Lade Freunde zu A1 ein und erhalte Alpha kostenlos. Dein Freund bekommt ebenfalls {d} Tage Alpha geschenkt 🎁",
    yourLink: "Dein Link",
    share: "🎁 Teilen",
    copy: "Kopieren",
    copied: "Kopiert ✓",
    alphaTitle: "Was ist A1 Alpha",
    alphaSub: "Ein Club für alle, die ernsthaft einen Job oder Talente suchen. Alpha ist normalerweise kostenpflichtig, hier gibt es sie gratis.",
    perks: [
      { icon: "🔎", title: "Alpha Suche", text: "Beschreibe in eigenen Worten, was du suchst, und die KI wählt die besten Jobs aus und erklärt, warum sie zu dir passen." },
      { icon: "🔔", title: "Täglich neue Treffer", text: "Alpha merkt sich dein Profil und schickt dir einmal am Tag frische Jobs in einen eigenen Chat." },
      { icon: "✨", title: "Magic Post", text: "Beschreibe einen Job oder Beitrag per Sprache oder Text, und Alpha füllt alle Felder für dich aus." },
      { icon: "🐠", title: "Abzeichen und Laufschrift", text: "Ein Club-Abzeichen neben deinem Namen und deine eigene Gedankenzeile, die alle sehen." },
    ],
    ladderTitle: "Mehr Freunde, mehr Geschenke",
    scaleHint: "Im Kreis: Freunde. Darunter: Monate Alpha. Ein Kreis füllt sich, sobald ein Freund zählt.",
    rule: "Lade {f} ein und erhalte {m} Alpha",
    friendRow: "Eingeladene Freunde bekommen: {d} Tage Alpha geschenkt",
    earned: "Bisher verdient: {m} Alpha 🎉",
    none: "Noch nichts. Lade {f} ein, und schon hast du einen Monat Alpha!",
    toNext: "Noch {left} bis {f}, dann hast du {m} Alpha",
    top: "Das ist das Maximum 🎉 Danach gibt es ein Partnerprogramm mit Auszahlungen. Schreib uns.",
    counted: "Gezählt: {n}",
    invited: "Deine Freunde",
    noInvited: "Noch niemand. Schick deinen Link, dann erscheinen deine Freunde hier.",
    stJoined: "Wartet {h} Stunden",
    stCounted: "Gezählt ✓",
    howTitle: "So funktioniert's",
    how: [
      "Ein Freund öffnet deinen Link und registriert sich bei A1.",
      "Nach {h} Stunden zählt er. So filtern wir gefälschte Registrierungen heraus.",
      "Die Alpha-Monate sammeln sich auf deinem Konto und schalten sich von selbst ein, sobald Alpha startet.",
      "Dein Freund bekommt ebenfalls {d} Tage Alpha geschenkt.",
    ],
    fine: "Das eigene Konto kannst du nicht einladen, und ein Freund hat genau eine einladende Person. Gefälschte Registrierungen zählen nicht.",
    signInTitle: "Melde dich an, um deinen Link zu erhalten",
    err: "Etwas ist schiefgelaufen. Bitte versuche es in einer Minute erneut.",
    loading: "Wird geladen…",
    notEligible: "Das Programm ist für dieses Konto nicht verfügbar.",
    shareText: "Komm zu A1 und hol dir {d} Tage Alpha",
  },
  es: {
    plural: "en",
    sp: " ",
    friend: ["amigo", "amigos"],
    friendAcc: ["amigo", "amigos"],
    month: ["mes", "meses"],
    mo: ["mes", "meses"],
    title: "Consigue Alpha",
    sub: "Invita a tus amigos a A1 y consigue Alpha gratis. Tu amigo también recibe {d} días de Alpha de regalo 🎁",
    yourLink: "Tu enlace",
    share: "🎁 Compartir",
    copy: "Copiar",
    copied: "Copiado ✓",
    alphaTitle: "Qué es A1 Alpha",
    alphaSub: "Un club para quienes buscan trabajo o talento en serio. Alpha suele ser de pago, y aquí puedes conseguirla gratis.",
    perks: [
      { icon: "🔎", title: "Búsqueda Alpha", text: "Cuenta con tus palabras qué buscas y la IA elige las mejores vacantes y te explica por qué encajan contigo." },
      { icon: "🔔", title: "Coincidencias nuevas cada día", text: "Alpha recuerda tu perfil y te envía vacantes recientes a un chat aparte una vez al día." },
      { icon: "✨", title: "Magic Post", text: "Describe una vacante o una publicación por voz o por texto y Alpha rellena todos los campos por ti." },
      { icon: "🐠", title: "Insignia y línea animada", text: "Una insignia del club junto a tu nombre y tu propia línea de pensamiento que ve todo el mundo." },
    ],
    ladderTitle: "Más amigos, más regalos",
    scaleHint: "En el círculo: amigos. Debajo: meses de Alpha. El círculo se llena cuando un amigo cuenta.",
    rule: "Invita a {f} y consigue {m} de Alpha",
    friendRow: "Los amigos invitados reciben: {d} días de Alpha de regalo",
    earned: "Conseguido hasta ahora: {m} de Alpha 🎉",
    none: "Todavía nada. Invita a {f} y ya tienes un mes de Alpha.",
    toNext: "Te faltan {left} para llegar a {f} y tendrás {m} de Alpha",
    top: "Es el máximo 🎉 Después viene el programa de socios con pagos. Escríbenos.",
    counted: "Contados: {n}",
    invited: "Tus amigos",
    noInvited: "Aún nadie. Envía tu enlace y tus amigos aparecerán aquí.",
    stJoined: "Esperando {h} horas",
    stCounted: "Contado ✓",
    howTitle: "Cómo funciona",
    how: [
      "Un amigo abre tu enlace y se registra en A1.",
      "Pasadas {h} horas, cuenta. Así filtramos los registros falsos.",
      "Los meses de Alpha se acumulan en tu cuenta y se activan solos en cuanto lancemos Alpha.",
      "Tu amigo también recibe {d} días de Alpha de regalo.",
    ],
    fine: "No puedes invitar a tu propia cuenta y cada amigo tiene un solo invitador. Los registros falsos no cuentan.",
    signInTitle: "Inicia sesión para obtener tu enlace",
    err: "Algo ha salido mal. Inténtalo de nuevo en un minuto.",
    loading: "Cargando…",
    notEligible: "El programa no está disponible para esta cuenta.",
    shareText: "Únete a A1 y consigue {d} días de Alpha",
  },
  fr: {
    plural: "fr",
    sp: " ",
    friend: ["ami", "amis"],
    friendAcc: ["ami", "amis"],
    month: ["mois", "mois"],
    mo: ["mois", "mois"],
    title: "Obtenez Alpha",
    sub: "Invitez vos amis sur A1 et obtenez Alpha gratuitement. Votre ami reçoit aussi {d} jours d'Alpha en cadeau 🎁",
    yourLink: "Votre lien",
    share: "🎁 Partager",
    copy: "Copier",
    copied: "Copié ✓",
    alphaTitle: "Qu'est-ce que A1 Alpha ?",
    alphaSub: "Un club pour ceux qui cherchent sérieusement un emploi ou des talents. Alpha est normalement payant, ici vous l'obtenez gratuitement.",
    perks: [
      { icon: "🔎", title: "Recherche Alpha", text: "Dites avec vos mots ce que vous cherchez : l'IA choisit les meilleures offres et explique pourquoi elles vous conviennent." },
      { icon: "🔔", title: "Nouveaux résultats chaque jour", text: "Alpha retient votre profil et envoie chaque jour de nouvelles offres dans un chat dédié." },
      { icon: "✨", title: "Magic Post", text: "Décrivez une offre ou une publication à la voix ou par écrit, et Alpha remplit tous les champs à votre place." },
      { icon: "🐠", title: "Badge et ligne défilante", text: "Un badge de membre à côté de votre nom et votre propre ligne de pensée, visible par tous." },
    ],
    ladderTitle: "Plus d'amis, plus de cadeaux",
    scaleHint: "Dans le cercle : le nombre d'amis. Dessous : les mois d'Alpha. Un cercle se remplit quand un ami est comptabilisé.",
    rule: "Invitez {f} et obtenez {m} d'Alpha",
    friendRow: "Les amis invités reçoivent : {d} jours d'Alpha en cadeau",
    earned: "Déjà gagné : {m} d'Alpha 🎉",
    none: "Rien pour l'instant. Invitez {f} et c'est déjà un mois d'Alpha !",
    toNext: "Encore {left} pour atteindre {f}, et vous aurez {m} d'Alpha",
    top: "C'est le maximum 🎉 Ensuite, place au programme partenaire avec rémunération. Écrivez-nous.",
    counted: "Comptabilisés : {n}",
    invited: "Vos amis",
    noInvited: "Personne pour l'instant. Envoyez votre lien et vos amis apparaîtront ici.",
    stJoined: "En attente : {h} heures",
    stCounted: "Comptabilisé ✓",
    howTitle: "Comment ça marche",
    how: [
      "Un ami ouvre votre lien et s'inscrit sur A1.",
      "Après {h} heures, il est comptabilisé. C'est ainsi que nous écartons les fausses inscriptions.",
      "Les mois d'Alpha s'accumulent sur votre compte et s'activent d'eux-mêmes dès le lancement d'Alpha.",
      "Votre ami reçoit aussi {d} jours d'Alpha en cadeau.",
    ],
    fine: "Vous ne pouvez pas inviter votre propre compte, et chaque ami n'a qu'un seul parrain. Les fausses inscriptions ne comptent pas.",
    signInTitle: "Connectez-vous pour obtenir votre lien",
    err: "Une erreur s'est produite. Réessayez dans une minute.",
    loading: "Chargement…",
    notEligible: "Le programme n'est pas disponible pour ce compte.",
    shareText: "Rejoignez A1 et obtenez {d} jours d'Alpha",
  },
  pl: {
    plural: "pl",
    sp: " ",
    friend: ["znajomy", "znajomych", "znajomych"],
    friendAcc: ["znajomego", "znajomych", "znajomych"],
    month: ["miesiąc", "miesiące", "miesięcy"],
    mo: ["mies.", "mies.", "mies."],
    title: "Zdobądź Alpha",
    sub: "Zapraszaj znajomych do A1 i zdobywaj Alpha za darmo. Twój znajomy też dostanie {d} dni Alpha w prezencie 🎁",
    yourLink: "Twój link",
    share: "🎁 Udostępnij",
    copy: "Kopiuj",
    copied: "Skopiowano ✓",
    alphaTitle: "Czym jest A1 Alpha",
    alphaSub: "Klub dla tych, którzy poważnie szukają pracy lub ludzi. Alpha zwykle jest płatna, a tutaj możesz ją dostać za darmo.",
    perks: [
      { icon: "🔎", title: "Wyszukiwanie Alpha", text: "Napisz własnymi słowami, czego szukasz, a AI dobierze najlepsze oferty i wyjaśni, dlaczego do Ciebie pasują." },
      { icon: "🔔", title: "Nowe dopasowania codziennie", text: "Alpha zapamiętuje Twój profil i raz dziennie wysyła świeże oferty na osobny czat." },
      { icon: "✨", title: "Magic Post", text: "Opisz ofertę lub post głosem albo tekstem, a Alpha sama uzupełni wszystkie pola." },
      { icon: "🐠", title: "Odznaka i przewijany pasek", text: "Odznaka członka klubu obok imienia i Twoja własna linijka z myślą, którą widzą wszyscy." },
    ],
    ladderTitle: "Im więcej znajomych, tym więcej prezentów",
    scaleHint: "W kółku: liczba znajomych. Pod nim: miesiące Alpha. Kółko wypełnia się, gdy znajomy zostanie zaliczony.",
    rule: "Zaproś {f} i zdobądź {m} Alpha",
    friendRow: "Zaproszeni znajomi dostają: {d} dni Alpha w prezencie",
    earned: "Zdobyte do tej pory: {m} Alpha 🎉",
    none: "Na razie nic. Zaproś {f}, a to już miesiąc Alpha!",
    toNext: "Jeszcze {left} do {f}, a dostaniesz {m} Alpha",
    top: "To maksimum 🎉 Dalej jest program partnerski z wypłatami. Napisz do nas.",
    counted: "Zaliczeni: {n}",
    invited: "Twoi znajomi",
    noInvited: "Na razie nikogo. Wyślij link, a znajomi pojawią się tutaj.",
    stJoined: "Czeka {h} godzin",
    stCounted: "Zaliczony ✓",
    howTitle: "Jak to działa",
    how: [
      "Znajomy otwiera Twój link i rejestruje się w A1.",
      "Po {h} godzinach zostaje zaliczony. W ten sposób odsiewamy fałszywe rejestracje.",
      "Miesiące Alpha zbierają się na Twoim koncie i włączą się same, gdy tylko uruchomimy Alpha.",
      "Twój znajomy też dostaje {d} dni Alpha w prezencie.",
    ],
    fine: "Nie można zaprosić własnego konta, a jeden znajomy ma jednego zapraszającego. Fałszywe rejestracje się nie liczą.",
    signInTitle: "Zaloguj się, aby dostać swój link",
    err: "Coś poszło nie tak. Spróbuj ponownie za minutę.",
    loading: "Ładowanie…",
    notEligible: "Program nie jest dostępny dla tego konta.",
    shareText: "Dołącz do A1 i zdobądź {d} dni Alpha",
  },
  ptBR: {
    plural: "en",
    sp: " ",
    friend: ["amigo", "amigos"],
    friendAcc: ["amigo", "amigos"],
    month: ["mês", "meses"],
    mo: ["mês", "meses"],
    title: "Ganhe Alpha",
    sub: "Convide amigos para o A1 e ganhe Alpha de graça. Seu amigo também recebe {d} dias de Alpha de presente 🎁",
    yourLink: "Seu link",
    share: "🎁 Compartilhar",
    copy: "Copiar",
    copied: "Copiado ✓",
    alphaTitle: "O que é o A1 Alpha",
    alphaSub: "Um clube para quem procura emprego ou talentos com seriedade. O Alpha costuma ser pago, e aqui você pode ganhar de graça.",
    perks: [
      { icon: "🔎", title: "Busca Alpha", text: "Conte com suas palavras o que você procura, e a IA escolhe as melhores vagas e explica por que combinam com você." },
      { icon: "🔔", title: "Novas vagas todo dia", text: "O Alpha memoriza seu perfil e envia vagas novas para um chat separado uma vez por dia." },
      { icon: "✨", title: "Magic Post", text: "Descreva uma vaga ou um post por voz ou texto, e o Alpha preenche todos os campos para você." },
      { icon: "🐠", title: "Selo e linha animada", text: "Um selo do clube ao lado do seu nome e sua própria frase em destaque, que todos veem." },
    ],
    ladderTitle: "Mais amigos, mais presentes",
    scaleHint: "No círculo: amigos. Embaixo: meses de Alpha. O círculo se preenche quando um amigo é contabilizado.",
    rule: "Convide {f} e ganhe {m} de Alpha",
    friendRow: "Amigos convidados recebem: {d} dias de Alpha de presente",
    earned: "Já conquistado: {m} de Alpha 🎉",
    none: "Ainda nada. Convide {f} e já é um mês de Alpha!",
    toNext: "Mais {left} para chegar a {f}, e você terá {m} de Alpha",
    top: "É o máximo 🎉 Depois vem o programa de parceiros com pagamentos. Escreva para nós.",
    counted: "Contabilizados: {n}",
    invited: "Seus amigos",
    noInvited: "Ninguém ainda. Envie seu link e seus amigos aparecerão aqui.",
    stJoined: "Aguardando {h} horas",
    stCounted: "Contabilizado ✓",
    howTitle: "Como funciona",
    how: [
      "Um amigo abre seu link e se cadastra no A1.",
      "Depois de {h} horas, ele é contabilizado. Assim filtramos cadastros falsos.",
      "Os meses de Alpha se acumulam na sua conta e ativam sozinhos assim que o Alpha for lançado.",
      "Seu amigo também recebe {d} dias de Alpha de presente.",
    ],
    fine: "Você não pode convidar a própria conta, e cada amigo tem um único convidador. Cadastros falsos não contam.",
    signInTitle: "Entre para receber seu link",
    err: "Algo deu errado. Tente novamente em um minuto.",
    loading: "Carregando…",
    notEligible: "O programa não está disponível para esta conta.",
    shareText: "Entre no A1 e ganhe {d} dias de Alpha",
  },
  zh: {
    plural: "none",
    sp: "",
    friend: ["位好友"],
    friendAcc: ["位好友"],
    month: ["个月"],
    mo: ["个月"],
    title: "领取 Alpha",
    sub: "邀请好友加入 A1，免费获得 Alpha。你的好友也会获赠 {d} 天 Alpha 🎁",
    yourLink: "你的链接",
    share: "🎁 分享",
    copy: "复制",
    copied: "已复制 ✓",
    alphaTitle: "什么是 A1 Alpha",
    alphaSub: "为认真找工作或找人才的人准备的俱乐部。Alpha 通常是付费的，这里可以免费获得。",
    perks: [
      { icon: "🔎", title: "Alpha 搜索", text: "用自己的话说出想找什么，AI 会挑出最合适的职位，并解释为什么适合你。" },
      { icon: "🔔", title: "每日新匹配", text: "Alpha 会记住你的画像，每天一次把最新职位发到专属聊天中。" },
      { icon: "✨", title: "Magic Post", text: "用语音或文字描述职位或帖子，Alpha 会自动填好所有字段。" },
      { icon: "🐠", title: "徽章与滚动字幕", text: "名字旁边的俱乐部徽章，还有人人可见的专属一句话。" },
    ],
    ladderTitle: "好友越多，礼物越多",
    scaleHint: "圆圈里是好友数，下方是 Alpha 月数。好友被计入后，圆圈就会填满。",
    rule: "邀请{f}，获得{m} Alpha",
    friendRow: "受邀好友将获得：{d} 天 Alpha 作为礼物",
    earned: "已获得：{m} Alpha 🎉",
    none: "目前还没有。邀请{f}，就能获得一个月 Alpha！",
    toNext: "还差{left}达到 {f} 位，即可获得{m} Alpha",
    top: "已达上限 🎉 接下来是带分成的合作伙伴计划，欢迎联系我们。",
    counted: "已计入：{n}",
    invited: "你的好友",
    noInvited: "暂时还没有。发出链接，好友会显示在这里。",
    stJoined: "等待 {h} 小时",
    stCounted: "已计入 ✓",
    howTitle: "如何运作",
    how: [
      "好友打开你的链接并注册 A1。",
      "{h} 小时后计入。这样可以过滤虚假注册。",
      "Alpha 月数会累积在你的账号上，Alpha 上线后自动生效。",
      "你的好友也会获赠 {d} 天 Alpha。",
    ],
    fine: "不能邀请自己的账号，一位好友只有一位邀请人，虚假注册不计入。",
    signInTitle: "登录以获取你的链接",
    err: "出了点问题，请一分钟后重试。",
    loading: "加载中…",
    notEligible: "此账号暂不适用该计划。",
    shareText: "加入 A1，免费获得 {d} 天 Alpha",
  },
};
