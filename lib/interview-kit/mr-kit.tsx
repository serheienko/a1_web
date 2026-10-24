// lib/interview-kit/mr-kit.tsx
//
// 24.10.2026 (Александр: «под блоком "профіль замість резюме" показать по
// стрелке пример заполненного профиля нашего кота Mr Kit, на 100% как
// профиль на сайте, со всеми приколами: шкалы, GitHub, Dribbble, Stack
// Overflow, всё в кошачьем мире; он хранитель и талисман вселенной A1»).
//
// Рисуется тем же components/profile-view.tsx, что и настоящие профили, но
// из этих готовых данных, без единого запроса. Ссылки в примере никуда не
// ведут ("#"): аккаунтов кота на GitHub и прочих сервисах нет, а вести людей
// на чужие страницы с похожим логином нельзя.
//
// Аватарка и голосовая визитка -- позже (Александр пришлёт): пока вместо
// фото стоит стандартный кот сайта, визитки нет.

import { ProfileView, type WorkStyleChip } from "@/components/profile-view";
import type { WebProfile } from "@/types/web-profile";
import type { GithubSummary, GithubWeek } from "@/lib/github/core";
import type { StackoverflowSummary } from "@/lib/stackoverflow/core";
import type { DribbbleSnapshot } from "@/lib/dribbble/core";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { WORK_STYLE_PREFERENCE_SECTIONS } from "@/components/work-style-labels";
import { T, type Locale } from "@/components/t";

type L9 = Record<Locale, string>;
function t(uk: string, en: string, ru: string, de: string, es: string, fr: string, pl: string, ptBR: string, zh: string): L9 {
  return { uk, en, ru, de, es, fr, pl, ptBR, zh };
}

const USERNAME = "mrkit";
const CAT = pickDefaultCatAvatar(USERNAME);

const PROFILE: WebProfile = {
  username: USERNAME,
  fullName: "Mr Kit",
  avatarUrl: null,
  voiceIntroUrl: null,
  occupation: "professional",
  expertise: "Senior",
  profileTitle: "Guardian of the A1 universe and its official mascot",
  bio:
    "I keep the A1 universe running. I nap on keyboards, approve pull requests with one paw and make sure every developer finds a job before dinner.\n\nAsk me about catnip-driven development, rooftop running and why every deploy goes better with a warm laptop.",
  location: { city: "Kyiv", region: "Kyiv", country: "UA", display: "Kyiv, Ukraine", coordinates: null },
  links: [
    { title: "GitHub", url: "https://github.com/mr-kit-a1" },
    { title: "Dribbble", url: "https://dribbble.com/mrkit" },
    { title: "Stack Overflow", url: "https://stackoverflow.com/users/7777777/mr-kit" },
    { title: "jobs.a1appp.com", url: "https://jobs.a1appp.com" },
  ],
  companies: [
    {
      name: "A1",
      positionDescription: "Chief Mascot Officer",
      description: "Keeps the A1 universe running and greets every new developer.",
      positionStart: null,
      positionEnd: null,
      employeesCount: 25,
      establishedYear: 2024,
      link: null,
      category: 1,
    },
    {
      name: "A1 Run",
      positionDescription: "Lead rooftop runner",
      description: "Main character of the A1 mini-game: runs over rooftops and collects connections.",
      positionStart: null,
      positionEnd: null,
      employeesCount: null,
      establishedYear: 2026,
      link: null,
      category: 2,
    },
  ],
  education: ["Academy of Naps, PhD in Catnip-Driven Development"],
  skills: [
    { value: "Napping", level: 100 },
    { value: "Bug hunting", level: 97 },
    { value: "TypeScript", level: 92 },
    { value: "Flutter", level: 88 },
    { value: "System design", level: 81 },
    { value: "Rust", level: 64 },
  ],
  languages: [
    { value: "uk", level: 4 },
    { value: "en", level: 4 },
    { value: "es", level: 2 },
    { value: "ja", level: 1 },
  ],
  // Сами подписи -- ниже (HOBBIES/INTERESTS), здесь только чтобы секции было что показать.
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

const CATEGORY: Record<number, string> = { 1: "IT", 2: "Gaming" };

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

const GITHUB: GithubSummary = {
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
    { name: "a1-universe", description: "Source code of the A1 universe. Handle with paws.", stars: 2048, url: "#", language: "Dart" },
    { name: "catnip-scheduler", description: "Schedules naps between deploys. Zero-downtime purring.", stars: 1337, url: "#", language: "TypeScript" },
    { name: "laser-pointer-js", description: "Makes any DOM element chase a red dot.", stars: 842, url: "#", language: "JavaScript" },
    { name: "keyboard-warmer", description: "Keeps your keyboard warm by sitting on it. Rust edition.", stars: 512, url: "#", language: "Rust" },
  ],
  fetchedAt: "2026-10-24T00:00:00.000Z",
};

const STACKOVERFLOW: StackoverflowSummary = {
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
  bestAnswer: { title: "How do I stop my cat from walking on the keyboard during a deploy?", url: "#", score: 777 },
  fetchedAt: "2026-10-24T00:00:00.000Z",
};

// Работы на Dribbble -- настоящие картинки вселенной A1 из /public.
const DRIBBBLE: DribbbleSnapshot = {
  login: "mrkit",
  name: "Mr Kit",
  avatarUrl: CAT,
  htmlUrl: "#",
  followers: 9000,
  shotsCount: 6,
  shots: [
    { id: "a1-run", title: "A1 Run: rooftop chase", imageUrl: "/game/preview.webp", htmlUrl: "#" },
    { id: "a1-map", title: "Map of the A1 universe", imageUrl: "/game-map/cover.webp", htmlUrl: "#" },
    { id: "a1-app", title: "A1 app, home screen", imageUrl: "/download/hero.webp", htmlUrl: "#" },
    { id: "a1-first250", title: "First 250 badge", imageUrl: "/first250/banner.webp", htmlUrl: "#" },
    { id: "a1-map-night", title: "A1 universe at night", imageUrl: "/game-map/map-preview-dark.webp", htmlUrl: "#" },
    { id: "a1-promo", title: "A1 launch poster", imageUrl: "/promo/a1-promo-en.jpg", htmlUrl: "#" },
  ],
  fetchedAt: "2026-10-24T00:00:00.000Z",
};

/** Пример заполненного профиля -- тот же вид, что /u/<имя>, без запросов. */
export function MrKitProfile() {
  return (
    <ProfileView
      profile={PROFILE}
      routeUsername={USERNAME}
      raw={null}
      avatarBlur={null}
      companyCategoryLabel={(id) => (id == null ? null : (CATEGORY[id] ?? null))}
      hobbyItems={HOBBIES}
      workInterestItems={INTERESTS}
      workStyleChips={WORK_STYLE_CHIPS}
      covers={{ books: [null, null], movies: [null, null], games: [null, null] }}
      openJobs={0}
      posts={
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <T uk="Поки що немає опублікованих дописів" en="No published posts yet" ru="Пока нет опубликованных публикаций" de="Noch keine veröffentlichten Beiträge" es="Aún no hay publicaciones" fr="Aucune publication pour le moment" pl="Brak opublikowanych postów" ptBR="Ainda não há publicações" zh="暂无已发布的帖子" />
        </p>
      }
      postsCount={0}
      demo={{ github: GITHUB, stackoverflow: STACKOVERFLOW, dribbble: DRIBBBLE }}
      embed
    />
  );
}
