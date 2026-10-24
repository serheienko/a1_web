// lib/interview-kit/mr-kit.tsx
//
// 24.10.2026 (Александр: «под блоком "профіль замість резюме" показать по
// стрелке пример заполненного профиля нашего кота Mr Kit, на 100% как
// профиль на сайте, со всеми приколами: шкалы, GitHub, Dribbble, Stack
// Overflow, всё в кошачьем мире; он хранитель и талисман вселенной A1»).
//
// Рисуется тем же components/profile-view.tsx, что и настоящие профили, но
// из этих готовых данных, без единого запроса.
//
// Второй заход, тот же день (Александр):
// - «это пример для всего мира, переведи всё, что написано в профиле, на все
//   9 языков» -- поэтому компонент клиентский: берёт язык сайта
//   (useActiveLocale) и собирает данные кота на нём. Переключили язык --
//   профиль меняется сразу, вместе с голосовой визиткой.
// - «ссылки не должны нажиматься, это плейсхолдеры» -- всё внутри .kit-demo
//   не кликается (CSS в app/spivbesida/kit.tsx), кнопки-стрелки «открыть на
//   GitHub / Dribbble / Stack Overflow» спрятаны.
// - «добавь ему пост», «вместо Киева планету Нептун», «языки + все
//   межгалактические».
"use client";

import { ProfileView, type WorkStyleChip } from "@/components/profile-view";
import { PostCard } from "@/components/post-card";
import type { WebProfile } from "@/types/web-profile";
import type { WebPost } from "@/types/web-post";
import type { GithubSummary, GithubWeek } from "@/lib/github/core";
import type { StackoverflowSummary } from "@/lib/stackoverflow/core";
import type { DribbbleSnapshot } from "@/lib/dribbble/core";
import { MR_KIT_AVATAR, MR_KIT_AVATAR_BLUR } from "@/lib/interview-kit/mr-kit-avatar";
import { WORK_STYLE_PREFERENCE_SECTIONS } from "@/components/work-style-labels";
import { LOCALES, type Locale } from "@/components/t";
import { useActiveLocale } from "@/lib/use-active-locale";

type L9 = Record<Locale, string>;
function t(uk: string, en: string, ru: string, de: string, es: string, fr: string, pl: string, ptBR: string, zh: string): L9 {
  return { uk, en, ru, de, es, fr, pl, ptBR, zh };
}

const USERNAME = "mrkit";
const CAT = MR_KIT_AVATAR;
const CAT_BLUR = MR_KIT_AVATAR_BLUR;

// Голосовые визитки кота от Александра (ElevenLabs), по одной на каждый язык
// сайта, пережаты в моно 64 kbps (~270 КБ). Играет запись на языке сайта.
const VOICE = Object.fromEntries(LOCALES.map((l) => [l, `/spivbesida/mr-kit-voice-${l}.mp3`])) as Record<Locale, string>;

// ───── тексты профиля на 9 языках ─────
const TX = {
  title: t(
    "Хранитель всесвіту A1 і його офіційний талісман",
    "Guardian of the A1 universe and its official mascot",
    "Хранитель вселенной A1 и её официальный талисман",
    "Hüter des A1-Universums und sein offizielles Maskottchen",
    "Guardián del universo A1 y su mascota oficial",
    "Gardien de l'univers A1 et sa mascotte officielle",
    "Strażnik wszechświata A1 i jego oficjalna maskotka",
    "Guardião do universo A1 e seu mascote oficial",
    "A1 宇宙的守护者和官方吉祥物",
  ),
  bio: t(
    "Я стежу, щоб всесвіт A1 працював. Сплю на клавіатурах, апрувлю pull request'и однією лапою і дбаю, щоб кожен розробник знайшов роботу до вечері.\n\nПитайте мене про catnip-driven development, біг дахами і про те, чому кожен деплой краще йде на теплому ноутбуці.",
    "I keep the A1 universe running. I nap on keyboards, approve pull requests with one paw and make sure every developer finds a job before dinner.\n\nAsk me about catnip-driven development, rooftop running and why every deploy goes better with a warm laptop.",
    "Я слежу, чтобы вселенная A1 работала. Сплю на клавиатурах, апрувлю pull request'ы одной лапой и забочусь, чтобы каждый разработчик нашёл работу до ужина.\n\nСпрашивайте меня про catnip-driven development, бег по крышам и о том, почему любой деплой лучше идёт на тёплом ноутбуке.",
    "Ich halte das A1-Universum am Laufen. Ich schlafe auf Tastaturen, approve Pull Requests mit einer Pfote und sorge dafür, dass alle Entwickler vor dem Abendessen einen Job finden.\n\nFrag mich nach Catnip-Driven Development, Rennen über Dächer und warum jedes Deployment auf einem warmen Laptop besser läuft.",
    "Mantengo en marcha el universo A1. Duermo sobre teclados, apruebo pull requests con una pata y me aseguro de que cada desarrollador encuentre trabajo antes de la cena.\n\nPregúntame por el catnip-driven development, las carreras por los tejados y por qué cada deploy sale mejor con un portátil calentito.",
    "Je fais tourner l'univers A1. Je dors sur les claviers, j'approuve les pull requests d'une patte et je veille à ce que chaque développeur trouve un job avant le dîner.\n\nParlez-moi de catnip-driven development, de course sur les toits et de pourquoi chaque déploiement se passe mieux sur un portable bien chaud.",
    "Pilnuję, żeby wszechświat A1 działał. Śpię na klawiaturach, zatwierdzam pull requesty jedną łapą i dbam o to, żeby każdy programista znalazł pracę przed kolacją.\n\nZapytaj mnie o catnip-driven development, bieganie po dachach i o to, dlaczego każdy deploy idzie lepiej na ciepłym laptopie.",
    "Eu mantenho o universo A1 funcionando. Durmo em teclados, aprovo pull requests com uma pata e garanto que todo desenvolvedor encontre um emprego antes do jantar.\n\nMe pergunte sobre catnip-driven development, corrida pelos telhados e por que todo deploy sai melhor num notebook quentinho.",
    "我负责让 A1 宇宙正常运转。我在键盘上睡觉，用一只爪子批准 pull request，并确保每位开发者在晚饭前找到工作。\n\n可以问我关于猫薄荷驱动开发、屋顶跑酷，以及为什么在温暖的笔记本上部署总是更顺利。",
  ),
  a1Pos: t("Головний талісман", "Chief Mascot Officer", "Главный талисман", "Chief Mascot Officer", "Mascota en jefe", "Mascotte en chef", "Główna maskotka", "Mascote-chefe", "首席吉祥物官"),
  a1Desc: t(
    "Підтримує роботу всесвіту A1 і вітає кожного нового розробника.",
    "Keeps the A1 universe running and greets every new developer.",
    "Поддерживает работу вселенной A1 и встречает каждого нового разработчика.",
    "Hält das A1-Universum am Laufen und begrüßt alle neuen Entwickler.",
    "Mantiene en marcha el universo A1 y da la bienvenida a cada nuevo desarrollador.",
    "Fait tourner l'univers A1 et accueille chaque nouveau développeur.",
    "Dba o działanie wszechświata A1 i wita każdego nowego programistę.",
    "Mantém o universo A1 funcionando e recebe cada novo desenvolvedor.",
    "让 A1 宇宙保持运转，并欢迎每一位新开发者。",
  ),
  runPos: t("Головний бігун по дахах", "Lead rooftop runner", "Главный бегун по крышам", "Lead-Dachläufer", "Corredor principal de tejados", "Coureur de toits en chef", "Główny biegacz po dachach", "Corredor-chefe de telhados", "首席屋顶跑者"),
  runDesc: t(
    "Головний герой міні-гри A1: біжить дахами і збирає контакти.",
    "Main character of the A1 mini-game: runs over rooftops and collects connections.",
    "Главный герой мини-игры A1: бежит по крышам и собирает контакты.",
    "Hauptfigur des A1-Minispiels: rennt über Dächer und sammelt Kontakte.",
    "Protagonista del minijuego de A1: corre por los tejados y reúne contactos.",
    "Héros du mini-jeu A1 : il court sur les toits et collecte des contacts.",
    "Główny bohater minigry A1: biega po dachach i zbiera kontakty.",
    "Protagonista do minijogo do A1: corre pelos telhados e coleta conexões.",
    "A1 小游戏的主角：在屋顶上奔跑，收集人脉。",
  ),
  edu: t(
    "Академія дрімоти, PhD з catnip-driven development",
    "Academy of Naps, PhD in Catnip-Driven Development",
    "Академия дрёмы, PhD по catnip-driven development",
    "Akademie des Nickerchens, PhD in Catnip-Driven Development",
    "Academia de la Siesta, doctorado en catnip-driven development",
    "Académie de la Sieste, doctorat en catnip-driven development",
    "Akademia Drzemki, doktorat z catnip-driven development",
    "Academia da Soneca, PhD em catnip-driven development",
    "午睡学院，猫薄荷驱动开发博士",
  ),
  napping: t("Дрімота", "Napping", "Дрёма", "Nickerchen", "Siestas", "Siestes", "Drzemki", "Sonecas", "打盹"),
  bugs: t("Полювання на баги", "Bug hunting", "Охота на баги", "Bug-Jagd", "Caza de bugs", "Chasse aux bugs", "Polowanie na bugi", "Caça a bugs", "捉虫"),
  sysDesign: t("Системний дизайн", "System design", "Системный дизайн", "Systemdesign", "Diseño de sistemas", "Conception de systèmes", "Projektowanie systemów", "Design de sistemas", "系统设计"),
  place: t("Нептун, всесвіт A1", "Neptune, A1 Universe", "Нептун, вселенная A1", "Neptun, A1-Universum", "Neptuno, universo A1", "Neptune, univers A1", "Neptun, wszechświat A1", "Netuno, universo A1", "海王星，A1 宇宙"),
  langsNote: t(
    "І всі інші мови, включно з міжгалактичними 🛸",
    "Plus every other language, intergalactic ones included 🛸",
    "И все остальные языки, включая межгалактические 🛸",
    "Und alle anderen Sprachen, intergalaktische inklusive 🛸",
    "Y todos los demás idiomas, incluidos los intergalácticos 🛸",
    "Et toutes les autres langues, intergalactiques comprises 🛸",
    "I wszystkie inne języki, łącznie z międzygalaktycznymi 🛸",
    "E todos os outros idiomas, inclusive os intergalácticos 🛸",
    "以及所有其他语言，包括星际语言 🛸",
  ),
  repoUniverse: t(
    "Вихідний код всесвіту A1. Брати лапами обережно.",
    "Source code of the A1 universe. Handle with paws.",
    "Исходный код вселенной A1. Обращаться лапами бережно.",
    "Quellcode des A1-Universums. Mit Pfoten vorsichtig anfassen.",
    "Código fuente del universo A1. Manipular con patas.",
    "Code source de l'univers A1. À manipuler avec les pattes.",
    "Kod źródłowy wszechświata A1. Obchodzić się łapami ostrożnie.",
    "Código-fonte do universo A1. Manuseie com as patas.",
    "A1 宇宙的源代码。请用爪子小心操作。",
  ),
  repoCatnip: t(
    "Планує дрімоту між деплоями. Муркотіння без простою.",
    "Schedules naps between deploys. Zero-downtime purring.",
    "Планирует дрёму между деплоями. Мурчание без простоя.",
    "Plant Nickerchen zwischen Deployments. Schnurren ohne Downtime.",
    "Programa siestas entre deploys. Ronroneo sin caídas.",
    "Planifie les siestes entre deux déploiements. Ronronnement sans interruption.",
    "Planuje drzemki między deployami. Mruczenie bez przestojów.",
    "Agenda sonecas entre deploys. Ronronar sem downtime.",
    "在两次部署之间安排午睡。零停机呼噜。",
  ),
  repoLaser: t(
    "Змушує будь-який DOM-елемент ганятися за червоною точкою.",
    "Makes any DOM element chase a red dot.",
    "Заставляет любой DOM-элемент гоняться за красной точкой.",
    "Lässt jedes DOM-Element einem roten Punkt hinterherjagen.",
    "Hace que cualquier elemento del DOM persiga un punto rojo.",
    "Fait courir n'importe quel élément du DOM après un point rouge.",
    "Sprawia, że każdy element DOM goni czerwoną kropkę.",
    "Faz qualquer elemento do DOM correr atrás de um ponto vermelho.",
    "让任意 DOM 元素追着红点跑。",
  ),
  repoWarmer: t(
    "Гріє вашу клавіатуру, сидячи на ній. Версія на Rust.",
    "Keeps your keyboard warm by sitting on it. Rust edition.",
    "Греет вашу клавиатуру, сидя на ней. Версия на Rust.",
    "Hält deine Tastatur warm, indem er draufsitzt. Rust-Edition.",
    "Mantiene tu teclado calentito sentándose encima. Edición Rust.",
    "Garde votre clavier au chaud en s'asseyant dessus. Édition Rust.",
    "Grzeje klawiaturę, siedząc na niej. Wersja w Rust.",
    "Mantém seu teclado quentinho sentando em cima dele. Edição Rust.",
    "坐在键盘上为它保暖。Rust 版。",
  ),
  soBest: t(
    "Як не дати коту ходити по клавіатурі під час деплою?",
    "How do I stop my cat from walking on the keyboard during a deploy?",
    "Как не дать коту ходить по клавиатуре во время деплоя?",
    "Wie halte ich meine Katze während eines Deployments von der Tastatur fern?",
    "¿Cómo evito que mi gato camine sobre el teclado durante un deploy?",
    "Comment empêcher mon chat de marcher sur le clavier pendant un déploiement ?",
    "Jak powstrzymać kota przed chodzeniem po klawiaturze podczas deployu?",
    "Como impedir meu gato de andar no teclado durante um deploy?",
    "部署时怎样阻止我的猫在键盘上走来走去？",
  ),
  postTitle: t(
    "Senior Mascot шукає теплий ноутбук і класну команду",
    "Senior Mascot looking for a warm laptop and a great team",
    "Senior Mascot ищет тёплый ноутбук и классную команду",
    "Senior Mascot sucht warmen Laptop und tolles Team",
    "Senior Mascot busca portátil calentito y un gran equipo",
    "Senior Mascot cherche un portable bien chaud et une super équipe",
    "Senior Mascot szuka ciepłego laptopa i świetnego zespołu",
    "Senior Mascot procura notebook quentinho e um ótimo time",
    "资深吉祥物寻找温暖的笔记本和优秀团队",
  ),
  // Александр: «$3 000–5 000 для кота странно» -- зарплата в кошачьей валюте,
  // но в том же виде «от–до /міс», что у настоящих вакансий.
  salary: t("🥫 300–500 консерв/міс", "🥫 300–500 cans/mo", "🥫 300–500 консерв/мес", "🥫 300–500 Dosen/Monat", "🥫 300–500 latas/mes", "🥫 300–500 boîtes/mois", "🥫 300–500 puszek/mies.", "🥫 300–500 latas/mês", "🥫 300–500 罐/月"),
  postText: t(
    "Вмію тримати всесвіт A1 у робочому стані, знаходити баги носом і підіймати настрій команді на дейліках. Remote, з підвіконня. Оплата смаколиками обговорюється.",
    "I can keep the A1 universe running, sniff out bugs and lift the team's mood at dailies. Remote, from the windowsill. Payment in treats is negotiable.",
    "Умею держать вселенную A1 в рабочем состоянии, находить баги носом и поднимать команде настроение на дейликах. Remote, с подоконника. Оплата вкусняшками обсуждается.",
    "Ich halte das A1-Universum am Laufen, erschnüffle Bugs und hebe die Stimmung im Daily. Remote, vom Fensterbrett. Bezahlung in Leckerlis ist verhandelbar.",
    "Sé mantener en marcha el universo A1, olfatear bugs y subir el ánimo del equipo en las dailies. Remoto, desde la ventana. El pago en premios es negociable.",
    "Je sais faire tourner l'univers A1, flairer les bugs et remonter le moral de l'équipe aux dailies. À distance, depuis le rebord de la fenêtre. Paiement en friandises négociable.",
    "Potrafię utrzymać wszechświat A1 w ruchu, wywęszyć bugi i poprawić zespołowi humor na daily. Zdalnie, z parapetu. Zapłata w smakołykach do negocjacji.",
    "Sei manter o universo A1 funcionando, farejar bugs e animar o time nas dailies. Remoto, do parapeito. Pagamento em petiscos a combinar.",
    "我能让 A1 宇宙保持运转，用鼻子嗅出 bug，还能在每日站会上提升团队士气。远程，在窗台上办公。可用零食支付，价格面议。",
  ),
};

const SHOTS: { id: string; title: L9; image: string; blur: string }[] = [
  { id: "a1-run", image: "/spivbesida/shots/a1-run.webp", blur: "data:image/jpeg;base64,/9j//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgQEBMQExYWFhYWFhoYGhsbGxoaGhobGxsdHR0iIiIdHR0bGx0dICAiIiUmJSMjIiMmJigoKDAwLi44ODpFRVP/xABfAAADAQAAAAAAAAAAAAAAAAAAAwIHAQEBAAAAAAAAAAAAAAAAAAACBBABAAEEAAcBAAAAAAAAAAAAAQKRABESgWJRIUEDoWERAQADAQAAAAAAAAAAAAAAAAABEVES/8AAEQgADAAQAwEiAAIRAAMRAP/aAAwDAQACEQMRAD8Aw/1xgyxPbHKg/bmcYknXIeNkXjjta906ULN38oXT0NTr/9k=", title: t("A1 Run: погоня дахами", "A1 Run: rooftop chase", "A1 Run: погоня по крышам", "A1 Run: Jagd über die Dächer", "A1 Run: persecución por los tejados", "A1 Run : course-poursuite sur les toits", "A1 Run: pościg po dachach", "A1 Run: perseguição pelos telhados", "A1 Run：屋顶追逐") },
  { id: "a1-map", image: "/spivbesida/shots/a1-map.webp", blur: "data:image/jpeg;base64,/9j//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgQEBMQExYWFhYWFhoYGhsbGxoaGhobGxsdHR0iIiIdHR0bGx0dICAiIiUmJSMjIiMmJigoKDAwLi44ODpFRVP/xABjAAEBAQAAAAAAAAAAAAAAAAADAgYBAQEAAAAAAAAAAAAAAAAAAAMEEAABAgUFAQEBAAAAAAAAAAABIQIxEQADBEFhEoEisfAyEQEAAgMBAQAAAAAAAAAAAAABESEAEmFBIv/AABEIAAwAEAMBIgACEQADEQD/2gAMAwEAAhEDEQA/AM1atg+3Onccpcp/dVd1j8cPM+UgChIScNuqPGA/mI5fQUpsqVu35AE3LFYb660au5bfnMnD5YiqXuf/2Q==", title: t("Карта всесвіту A1", "Map of the A1 universe", "Карта вселенной A1", "Karte des A1-Universums", "Mapa del universo A1", "Carte de l'univers A1", "Mapa wszechświata A1", "Mapa do universo A1", "A1 宇宙地图") },
  { id: "a1-app", image: "/spivbesida/shots/a1-app.webp", blur: "data:image/jpeg;base64,/9j//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgQEBMQExYWFhYWFhoYGhsbGxoaGhobGxsdHR0iIiIdHR0bGx0dICAiIiUmJSMjIiMmJigoKDAwLi44ODpFRVP/xABeAAEBAQAAAAAAAAAAAAAAAAAGBAcBAQEAAAAAAAAAAAAAAAAAAAMGEAACAgICAwEAAAAAAAAAAAACAQARIRIEUQNBcTERAAMAAwEAAAAAAAAAAAAAAAACAREDsSL/wAARCAAMABADASIAAhEAAxEA/9oADAMBAAIRAxEAPwDDBHZpdxiuCANA0O5CmjRbJXb/AC/VO4PFtEqlA8rygW6LOc/cSj1siz1LQ8dP/9k=", title: t("Застосунок A1, головний екран", "A1 app, home screen", "Приложение A1, главный экран", "A1-App, Startbildschirm", "App A1, pantalla de inicio", "Appli A1, écran d'accueil", "Aplikacja A1, ekran główny", "App A1, tela inicial", "A1 应用，主屏幕") },
  { id: "a1-first250", image: "/spivbesida/shots/a1-first250.webp", blur: "data:image/jpeg;base64,/9j//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgQEBMQExYWFhYWFhoYGhsbGxoaGhobGxsdHR0iIiIdHR0bGx0dICAiIiUmJSMjIiMmJigoKDAwLi44ODpFRVP/xABkAAEBAAAAAAAAAAAAAAAAAAAGBAEBAQAAAAAAAAAAAAAAAAAAAwUQAAIBAwQCAwEAAAAAAAAAAAECERIEA1ExIQBBcYGRQgURAAICAgMBAAAAAAAAAAAAACEBAwIAETEScSL/wAARCAAMABADASIAAhEAAxEA/9oADAMBAAIRAxEAPwCK4ucdwy4lQMg5rCySSaSY4I05AnyOpl/nqwWm3w8gbhyfZkz8dM2uUtdZMpVSwDmTO8Iuuh++uUc5S9X5q8kHgTvM+4ie17ziqjXX529k4Diqzbwc5//Z", title: t("Значок «Перші 250»", "First 250 badge", "Значок «Первые 250»", "Abzeichen „Erste 250“", "Insignia «Primeros 250»", "Badge « 250 premiers »", "Odznaka „Pierwsze 250”", "Selo “Primeiros 250”", "“首批 250”徽章") },
  { id: "a1-map-night", image: "/spivbesida/shots/a1-map-night.webp", blur: "data:image/jpeg;base64,/9j//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgQEBMQExYWFhYWFhoYGhsbGxoaGhobGxsdHR0iIiIdHR0bGx0dICAiIiUmJSMjIiMmJigoKDAwLi44ODpFRVP/xABcAAADAQAAAAAAAAAAAAAAAAABBQMGAQEBAAAAAAAAAAAAAAAAAAAABBAAAgEEAwEAAAAAAAAAAAAAAQIAcRIhEUFh0VERAQADAQAAAAAAAAAAAAAAAAABEVES/8AAEQgADAAQAwEiAAIRAAMRAP/aAAwDAQACEQMRAD8AxaWjQwZZtEcikU3EZ+Qu50te/Y5nU9v/2Q==", title: t("Всесвіт A1 вночі", "A1 universe at night", "Вселенная A1 ночью", "Das A1-Universum bei Nacht", "El universo A1 de noche", "L'univers A1 la nuit", "Wszechświat A1 nocą", "O universo A1 à noite", "夜晚的 A1 宇宙") },
  { id: "a1-promo", image: "/spivbesida/shots/a1-promo.webp", blur: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAPwBAAAD//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgQEBMQExYWFhYWFhoYGhsbGxoaGhobGxsdHR0iIiIdHR0bGx0dICAiIiUmJSMjIiMmJigoKDAwLi44ODpFRVP/xABhAAEBAAAAAAAAAAAAAAAAAAAEBQEBAQAAAAAAAAAAAAAAAAAAAQQQAAECBgAHAQAAAAAAAAAAAAIBABIRIQYDBIGRYxMUosJTEQADAQEBAAAAAAAAAAAAAAAAATHwMwL/wAARCAAMABADASIAAhEAAxEA/9oADAMBAAIRAxEAPwChZ1dPLWS98uUANl4T8HDP9/gmaza6eVOuS+gOxdAoWsAqlIouMlR1+eiegQ//2Q==", title: t("Постер запуску A1", "A1 launch poster", "Постер запуска A1", "A1-Launch-Poster", "Póster del lanzamiento de A1", "Affiche du lancement d'A1", "Plakat premiery A1", "Pôster de lançamento do A1", "A1 发布海报") },
];

function buildProfile(l: Locale): WebProfile {
  return {
    username: USERNAME,
    fullName: "Mr Kit",
    avatarUrl: CAT,
    voiceIntroUrl: VOICE[l],
    occupation: "professional",
    expertise: "Senior",
    profileTitle: TX.title[l],
    bio: TX.bio[l],
    // Показывается не это, а подпись с планетой (demo.locationLabel), но поле должно быть.
    location: { city: "Neptune", region: "", country: "", display: TX.place[l], coordinates: null },
    links: [
      { title: "GitHub", url: "https://github.com/mr-kit-a1" },
      { title: "Dribbble", url: "https://dribbble.com/mrkit" },
      { title: "Stack Overflow", url: "https://stackoverflow.com/users/7777777/mr-kit" },
      { title: "jobs.a1appp.com", url: "https://jobs.a1appp.com" },
    ],
    companies: [
      { name: "A1", positionDescription: TX.a1Pos[l], description: TX.a1Desc[l], positionStart: null, positionEnd: null, employeesCount: 25, establishedYear: 2024, link: null, category: 1 },
      { name: "A1 Run", positionDescription: TX.runPos[l], description: TX.runDesc[l], positionStart: null, positionEnd: null, employeesCount: null, establishedYear: 2026, link: null, category: 2 },
    ],
    education: [TX.edu[l]],
    skills: [
      { value: TX.napping[l], level: 100 },
      { value: TX.bugs[l], level: 97 },
      { value: "TypeScript", level: 92 },
      { value: "Flutter", level: 88 },
      { value: TX.sysDesign[l], level: 81 },
      { value: "Rust", level: 64 },
    ],
    languages: [
      { value: "uk", level: 4 },
      { value: "en", level: 4 },
      { value: "es", level: 2 },
      { value: "ja", level: 1 },
    ],
    // Сами подписи -- в HOBBIES/INTERESTS, здесь только чтобы секции было что показать.
    hobbies: [1, 2, 3],
    workInterests: [1, 2, 3],
    favoriteBooks: [
      { title: "The Cat in the Hat", author: "Dr. Seuss" },
      { title: "Clean Code", author: "Robert C. Martin" },
    ],
    favoriteMovies: [{ title: "Puss in Boots" }, { title: "The Matrix" }],
    favoriteGames: [{ title: "Stray" }, { title: "A1 Run" }],
    workStylePreferences: {
      workEnvironment: [1],
      personalityType: [1],
      workLifeBalance: [1],
      workStyle: [1],
      workAvailability: [],
      projectType: [],
      leadershipStyle: [1],
      riskTolerance: [],
      workloadAndTaskDelegation: [],
      decisionMakingStyle: [],
      preferredCollaborationStyle: [],
      partnershipPreference: [],
      preferredWorkingEnvironment: [],
      learningStyle: [],
    },
    phone: null,
    email: null,
    dob: null,
  };
}

const HOBBIES: L9[] = [
  t("Сон на клавіатурі", "Napping on keyboards", "Сон на клавиатуре", "Auf Tastaturen schlafen", "Dormir sobre teclados", "Dormir sur les claviers", "Spanie na klawiaturze", "Dormir no teclado", "趴在键盘上睡觉"),
  t("Біг дахами", "Rooftop running", "Бег по крышам", "Über Dächer rennen", "Correr por los tejados", "Courir sur les toits", "Bieganie po dachach", "Correr pelos telhados", "屋顶跑酷"),
  t("Полювання на лазерну указку", "Chasing laser pointers", "Охота на лазерную указку", "Laserpointer jagen", "Cazar punteros láser", "Chasser les pointeurs laser", "Polowanie na wskaźnik laserowy", "Caçar ponteiro laser", "追激光笔"),
];

const INTERESTS: L9[] = [
  t("Найм розробників", "Hiring developers", "Найм разработчиков", "Entwickler einstellen", "Contratar desarrolladores", "Recruter des développeurs", "Rekrutacja programistów", "Contratar desenvolvedores", "招聘开发者"),
  t("Open source", "Open source", "Open source", "Open Source", "Código abierto", "Open source", "Open source", "Código aberto", "开源"),
  t("Developer experience", "Developer experience", "Developer experience", "Developer Experience", "Experiencia del desarrollador", "Expérience développeur", "Developer experience", "Experiência do desenvolvedor", "开发者体验"),
];

const STYLE_VALUES: Partial<Record<WorkStyleChip["key"], L9>> = {
  workEnvironment: t("Віддалено, з підвіконня", "Remote, from the windowsill", "Удалённо, с подоконника", "Remote, vom Fensterbrett", "Remoto, desde la ventana", "À distance, depuis le rebord de la fenêtre", "Zdalnie, z parapetu", "Remoto, do parapeito", "远程，在窗台上"),
  personalityType: t("Інтроверт до першої смаколики", "Introvert until the first treat", "Интроверт до первой вкусняшки", "Introvertiert bis zum ersten Leckerli", "Introvertido hasta el primer premio", "Introverti jusqu'à la première friandise", "Introwertyk do pierwszego smakołyka", "Introvertido até o primeiro petisco", "吃到零食前是内向型"),
  workLifeBalance: t("16 годин сну на добу", "16 hours of sleep a day", "16 часов сна в сутки", "16 Stunden Schlaf am Tag", "16 horas de sueño al día", "16 heures de sommeil par jour", "16 godzin snu na dobę", "16 horas de sono por dia", "每天睡 16 小时"),
  workStyle: t("Короткі спринти між дрімотами", "Short sprints between naps", "Короткие спринты между дрёмами", "Kurze Sprints zwischen Nickerchen", "Sprints cortos entre siestas", "Des sprints courts entre deux siestes", "Krótkie sprinty między drzemkami", "Sprints curtos entre cochilos", "小睡之间的短冲刺"),
  leadershipStyle: t("Лідер, що веде лапою", "Leads by paw", "Лидер, который ведёт лапой", "Führt mit der Pfote", "Lidera con la pata", "Mène à la patte", "Lider, który prowadzi łapą", "Lidera com a pata", "用爪子带队"),
};

const WORK_STYLE_CHIPS: WorkStyleChip[] = WORK_STYLE_PREFERENCE_SECTIONS.flatMap(({ key, ...section }) => {
  const values = STYLE_VALUES[key];
  return values ? [{ key, section: section as L9, values }] : [];
});

const CATEGORY: Record<number, L9> = {
  1: t("IT", "IT", "IT", "IT", "IT", "IT", "IT", "TI", "IT"),
  2: t("Ігри", "Gaming", "Игры", "Gaming", "Videojuegos", "Jeux vidéo", "Gry", "Games", "游戏"),
};

// ───── GitHub: календарь за 2026 год до сегодняшнего дня, узор стабильный ─────
function githubWeeks(): { weeks: GithubWeek[]; total: number } {
  const end = new Date(Date.UTC(2026, 9, 24));
  const weeks: GithubWeek[] = [];
  let week: GithubWeek = { days: [] };
  let total = 0;
  for (let d = new Date(Date.UTC(2026, 0, 1)); d <= end; d = new Date(d.getTime() + 86400000)) {
    if (d.getUTCDay() === 0 && week.days.length) {
      weeks.push(week);
      week = { days: [] };
    }
    const i = Math.floor(d.getTime() / 86400000);
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    // Кот работает рывками: по выходным спит, перед релизами коммитит пачками.
    const n = weekend ? (i % 7 === 0 ? 2 : 0) : (i * 37) % 11;
    const count = n > 8 ? 9 + (i % 6) : n;
    const level = (count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 9 ? 3 : 4) as 0 | 1 | 2 | 3 | 4;
    total += count;
    week.days.push({ date: d.toISOString().slice(0, 10), count, level });
  }
  if (week.days.length) weeks.push(week);
  return { weeks, total };
}

const GH = githubWeeks();

function buildGithub(l: Locale): GithubSummary {
  return {
    login: "mr-kit-a1",
    name: "Mr Kit",
    avatarUrl: CAT,
    htmlUrl: "#",
    publicRepos: 9,
    followers: 2048,
    totalContributions: GH.total,
    weeks: GH.weeks,
    year: 2026,
    years: [2026],
    languages: [
      { name: "TypeScript", percent: 38, color: "#3178c6" },
      { name: "Dart", percent: 27, color: "#00B4AB" },
      { name: "Rust", percent: 15, color: "#dea584" },
      { name: "JavaScript", percent: 12, color: "#f1e05a" },
      { name: "other", percent: 8, color: "#8e8e93" },
    ],
    topRepos: [
      { name: "a1-universe", description: TX.repoUniverse[l], stars: 2048, url: "#", language: "Dart" },
      { name: "catnip-scheduler", description: TX.repoCatnip[l], stars: 1337, url: "#", language: "TypeScript" },
      { name: "laser-pointer-js", description: TX.repoLaser[l], stars: 842, url: "#", language: "JavaScript" },
      { name: "keyboard-warmer", description: TX.repoWarmer[l], stars: 512, url: "#", language: "Rust" },
    ],
    fetchedAt: "2026-10-24T00:00:00.000Z",
  };
}

function buildStackoverflow(l: Locale): StackoverflowSummary {
  return {
    id: 7777777,
    displayName: "Mr Kit",
    htmlUrl: "#",
    avatarUrl: CAT,
    reputation: 12840,
    badges: { gold: 9, silver: 42, bronze: 99 },
    answerCount: 314,
    acceptRate: 92,
    topTags: [
      { name: "typescript", score: 1520, answerCount: 120 },
      { name: "flutter", score: 980, answerCount: 77 },
      { name: "cats", score: 777, answerCount: 64 },
      { name: "naps", score: 420, answerCount: 31 },
    ],
    bestAnswer: { title: TX.soBest[l], url: "#", score: 777 },
    fetchedAt: "2026-10-24T00:00:00.000Z",
  };
}

// Работы на Dribbble -- настоящие картинки вселенной A1, уменьшенные до 480x360.
function buildDribbble(l: Locale): DribbbleSnapshot {
  return {
    login: "mrkit",
    name: "Mr Kit",
    avatarUrl: CAT,
    htmlUrl: "#",
    followers: 9000,
    shotsCount: SHOTS.length,
    shots: SHOTS.map((s) => ({ id: s.id, title: s.title[l], imageUrl: s.image, htmlUrl: "#", blurDataUrl: s.blur })),
    fetchedAt: "2026-10-24T00:00:00.000Z",
  };
}

// Один пост кота -- только для примера, на сайте его нет.
const POST_DATE = new Date(Date.UTC(2026, 9, 22, 9, 0));
function buildPost(l: Locale): WebPost {
  return {
    id: "mrkit-demo-post",
    kind: "seeking",
    title: TX.postTitle[l],
    slug: "mrkit-demo",
    contentText: TX.postText[l],
    contentHtml: `<p>${TX.postText[l]}</p>`,
    publishedAt: POST_DATE,
    sourcePublishedAt: null,
    updatedAt: null,
    author: { userId: null, name: "Mr Kit", username: USERNAME, avatarUrl: CAT, isAnonymous: false, unclaimed: false, external: false },
    location: null,
    isRemote: true,
    categories: [],
    tags: ["TypeScript", "Flutter", "Rust"],
    salary: { min: 3000, max: 5000, currency: "USD", period: "MONTH" },
    images: [],
    links: [],
    viewCount: 777,
    hasApplyForm: false,
    applyQuestions: [],
    isExternal: false,
    externalUrl: null,
  };
}

/** Синяя планетка вместо флага (Александр: «Нептун, A1 Universe»). */
function PlanetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="mr-1 inline-block -translate-y-px align-middle">
      <defs>
        <radialGradient id="mrkit-planet" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#9fc0ff" />
          <stop offset="55%" stopColor="#3f6df5" />
          <stop offset="100%" stopColor="#1c2f9e" />
        </radialGradient>
      </defs>
      <ellipse cx="12" cy="13" rx="11" ry="3.4" fill="none" stroke="#b9c8ff" strokeWidth="1.4" transform="rotate(-18 12 13)" />
      <circle cx="12" cy="12" r="7" fill="url(#mrkit-planet)" />
      <path d="M5.6 10.6c2.6.9 9.9.6 12.6-.9" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M1.6 15.8c3.2 1.6 17.6-2.4 20.8-7" stroke="#b9c8ff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="18.6" cy="5" r="1" fill="#ffd34d" />
    </svg>
  );
}

/** Пример заполненного профиля -- тот же вид, что /u/<имя>, без запросов, на языке сайта. */
export function MrKitProfile() {
  const l = useActiveLocale();
  return (
    <div className="kit-demo">
      <ProfileView
        profile={buildProfile(l)}
        routeUsername={USERNAME}
        raw={null}
        avatarBlur={{ blurDataUrl: CAT_BLUR, width: 600, height: 600 }}
        companyCategoryLabel={(id) => (id == null ? null : (CATEGORY[id]?.[l] ?? null))}
        hobbyItems={HOBBIES}
        workInterestItems={INTERESTS}
        workStyleChips={WORK_STYLE_CHIPS}
        covers={{ books: [null, null], movies: [null, null], games: [null, null] }}
        openJobs={0}
        posts={
          <div className="kit-demo-static">
            <PostCard post={buildPost(l)} avatarBlurDataUrl={CAT_BLUR} onOpen={() => {}} showReservation={false} salaryOverride={TX.salary[l]} />
          </div>
        }
        postsCount={1}
        demo={{
          github: buildGithub(l),
          stackoverflow: buildStackoverflow(l),
          dribbble: buildDribbble(l),
          voiceByLocale: VOICE,
          locationLabel: (
            <>
              <PlanetIcon />
              {TX.place[l]}
            </>
          ),
          languagesNote: TX.langsNote[l],
        }}
        embed
      />
    </div>
  );
}
