// lib/cv/i18n.ts -- заголовки PDF-резюме на 9 языках (28.10.2026).
// Текст, который человек написал сам (о себе, должности), не переводим.
import type { CvLang } from "@/lib/cv/detect-lang";

type Key =
  | "resumeFrom"
  | "about"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "hobbies"
  | "favorites"
  | "books"
  | "movies"
  | "games"
  | "interactive1"
  | "interactive2"
  | "createdIn"
  | "listen"
  | "present"
  | "contributions"
  | "dribbbleWorks"
  | "soReputation";

const S: Record<Key, Record<CvLang, string>> = {
  resumeFrom: { uk: "Резюме з A1", ru: "Резюме из A1", en: "Resume from A1", de: "Lebenslauf aus A1", es: "CV de A1", fr: "CV depuis A1", pl: "CV z A1", ptBR: "Currículo do A1", zh: "A1 简历" },
  about: { uk: "Про себе", ru: "О себе", en: "About", de: "Über mich", es: "Sobre mí", fr: "À propos", pl: "O mnie", ptBR: "Sobre mim", zh: "关于我" },
  experience: { uk: "Досвід", ru: "Опыт", en: "Experience", de: "Berufserfahrung", es: "Experiencia", fr: "Expérience", pl: "Doświadczenie", ptBR: "Experiência", zh: "工作经验" },
  education: { uk: "Освіта", ru: "Образование", en: "Education", de: "Ausbildung", es: "Educación", fr: "Formation", pl: "Wykształcenie", ptBR: "Formação", zh: "教育背景" },
  skills: { uk: "Навички", ru: "Навыки", en: "Skills", de: "Fähigkeiten", es: "Habilidades", fr: "Compétences", pl: "Umiejętności", ptBR: "Habilidades", zh: "技能" },
  languages: { uk: "Мови", ru: "Языки", en: "Languages", de: "Sprachen", es: "Idiomas", fr: "Langues", pl: "Języki", ptBR: "Idiomas", zh: "语言" },
  hobbies: { uk: "Захоплення", ru: "Увлечения", en: "Interests", de: "Interessen", es: "Aficiones", fr: "Centres d'intérêt", pl: "Zainteresowania", ptBR: "Interesses", zh: "兴趣爱好" },
  favorites: { uk: "Улюблене", ru: "Любимое", en: "Favorites", de: "Favoriten", es: "Favoritos", fr: "Favoris", pl: "Ulubione", ptBR: "Favoritos", zh: "喜爱" },
  books: { uk: "Книги", ru: "Книги", en: "Books", de: "Bücher", es: "Libros", fr: "Livres", pl: "Książki", ptBR: "Livros", zh: "书籍" },
  movies: { uk: "Фільми", ru: "Фильмы", en: "Movies", de: "Filme", es: "Películas", fr: "Films", pl: "Filmy", ptBR: "Filmes", zh: "电影" },
  games: { uk: "Ігри", ru: "Игры", en: "Games", de: "Spiele", es: "Juegos", fr: "Jeux", pl: "Gry", ptBR: "Jogos", zh: "游戏" },
  interactive1: { uk: "Інтерактивний", ru: "Интерактивный", en: "Interactive", de: "Interaktives", es: "Perfil", fr: "Profil", pl: "Interaktywny", ptBR: "Perfil", zh: "A1 上的" },
  interactive2: { uk: "профіль в A1", ru: "профиль в A1", en: "profile on A1", de: "Profil auf A1", es: "interactivo en A1", fr: "interactif sur A1", pl: "profil w A1", ptBR: "interativo no A1", zh: "互动主页" },
  createdIn: { uk: "Створено в A1", ru: "Создано в A1", en: "Made with A1", de: "Erstellt mit A1", es: "Hecho con A1", fr: "Créé avec A1", pl: "Stworzone w A1", ptBR: "Feito com A1", zh: "由 A1 生成" },
  listen: { uk: "Послухайте мене", ru: "Послушайте меня", en: "Hear me speak", de: "Hören Sie mir zu", es: "Escúcheme", fr: "Écoutez-moi", pl: "Posłuchaj mnie", ptBR: "Me ouça", zh: "听我介绍" },
  present: { uk: "дотепер", ru: "по настоящее время", en: "present", de: "heute", es: "actualidad", fr: "aujourd'hui", pl: "obecnie", ptBR: "atual", zh: "至今" },
  contributions: { uk: "внесків за рік", ru: "вкладов за год", en: "contributions this year", de: "Beiträge im Jahr", es: "contribuciones este año", fr: "contributions cette année", pl: "kontrybucji w roku", ptBR: "contribuições no ano", zh: "年度贡献" },
  dribbbleWorks: { uk: "робіт на Dribbble", ru: "работ на Dribbble", en: "shots on Dribbble", de: "Shots auf Dribbble", es: "trabajos en Dribbble", fr: "shots sur Dribbble", pl: "prac na Dribbble", ptBR: "trabalhos no Dribbble", zh: "Dribbble 作品" },
  soReputation: { uk: "репутації Stack Overflow", ru: "репутации Stack Overflow", en: "Stack Overflow reputation", de: "Stack-Overflow-Reputation", es: "reputación en Stack Overflow", fr: "réputation Stack Overflow", pl: "reputacji Stack Overflow", ptBR: "reputação no Stack Overflow", zh: "Stack Overflow 声望" },
};

export function cvText(lang: CvLang, key: Key): string {
  return S[key][lang] ?? S[key].en;
}

const YEARS: Record<CvLang, Partial<Record<Intl.LDMLPluralRule, string>>> = {
  uk: { one: "{n} рік досвіду", few: "{n} роки досвіду", many: "{n} років досвіду", other: "{n} року досвіду" },
  ru: { one: "{n} год опыта", few: "{n} года опыта", many: "{n} лет опыта", other: "{n} года опыта" },
  en: { one: "{n} year of experience", other: "{n} years of experience" },
  de: { one: "{n} Jahr Erfahrung", other: "{n} Jahre Erfahrung" },
  es: { one: "{n} año de experiencia", other: "{n} años de experiencia" },
  fr: { one: "{n} an d'expérience", other: "{n} ans d'expérience" },
  pl: { one: "{n} rok doświadczenia", few: "{n} lata doświadczenia", many: "{n} lat doświadczenia", other: "{n} roku doświadczenia" },
  ptBR: { one: "{n} ano de experiência", other: "{n} anos de experiência" },
  zh: { other: "{n} 年经验" },
};

export const CV_LOCALE_TAG: Record<CvLang, string> = {
  uk: "uk", ru: "ru", en: "en", de: "de", es: "es", fr: "fr", pl: "pl", ptBR: "pt-BR", zh: "zh-Hans",
};

export function yearsText(lang: CvLang, n: number): string {
  const forms = YEARS[lang];
  let cat: Intl.LDMLPluralRule = "other";
  try {
    cat = new Intl.PluralRules(CV_LOCALE_TAG[lang]).select(n);
  } catch {
    /* other */
  }
  return (forms[cat] ?? forms.other ?? "{n}").replace("{n}", String(n));
}

/** Все подписи резюме на языке -- чтобы подгрузить под них шрифт (китайский). */
export function allCvTexts(lang: CvLang): string {
  return Object.values(S).map((m) => m[lang] ?? "").join("") + Object.values(YEARS[lang]).join("");
}
