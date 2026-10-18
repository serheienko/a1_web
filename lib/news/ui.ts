// lib/news/ui.ts -- статичные тексты интерфейса раздела «IT новини» на всех 9 языках.
//
// 18.10.2026 (Александр: «IT news: локализация интерфейса тоже на всех языках»). Сами статьи
// (заголовки, текст, FAQ, подписи внутри графиков) остаются на двух языках -- uk и en, как в данных.
// Здесь только то, что вокруг: заголовок раздела, «хв читання», «Коротко», «Першоджерело», плашка Telegram-бота,
// подписи живых цифр. Порядок переводов: [uk, en, ru, de, es, fr, pl, ptBR, zh].

import { LOCALES, type Locale } from "@/components/t";

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const K = {
  h1: ["IT новини", "IT News", "IT-новости", "IT-News", "Noticias IT", "Actus IT", "Wiadomości IT", "Notícias de TI", "IT 新闻"],
  lead: [
    "Найцікавіше зі світу технологій: цифри, графіки й наш погляд на те, що це означає для IT-ринку.",
    "The best of the tech world: numbers, charts and our take on what it means for the IT market.",
    "Самое интересное из мира технологий: цифры, графики и наш взгляд на то, что это значит для IT-рынка.",
    "Das Beste aus der Tech-Welt: Zahlen, Grafiken und unsere Einschätzung, was das für den IT-Markt bedeutet.",
    "Lo mejor del mundo tech: cifras, gráficos y nuestra opinión sobre lo que significa para el mercado IT.",
    "Le meilleur du monde de la tech : chiffres, graphiques et notre regard sur ce que cela signifie pour le marché IT.",
    "Najciekawsze ze świata technologii: liczby, wykresy i nasz pogląd na to, co to oznacza dla rynku IT.",
    "O melhor do mundo da tecnologia: números, gráficos e nossa visão sobre o que isso significa para o mercado de TI.",
    "科技世界的精彩内容：数据、图表，以及我们对其如何影响 IT 市场的看法。",
  ],
  latest: ["Свіже", "Latest", "Свежее", "Neu", "Lo último", "À la une", "Najnowsze", "Em destaque", "最新"],
  min: ["{n} хв читання", "{n} min read", "{n} мин чтения", "{n} Min. Lesezeit", "{n} min de lectura", "{n} min de lecture", "{n} min czytania", "{n} min de leitura", "阅读约 {n} 分钟"],
  editorial: ["Редакція A1", "A1 Editorial", "Редакция A1", "A1-Redaktion", "Redacción de A1", "Rédaction A1", "Redakcja A1", "Redação A1", "A1 编辑部"],
  short: ["Коротко", "In short", "Коротко", "Kurz gesagt", "En breve", "En bref", "W skrócie", "Resumo", "要点"],
  source: ["Першоджерело", "Primary source", "Первоисточник", "Primärquelle", "Fuente original", "Source primaire", "Źródło pierwotne", "Fonte original", "原始来源"],
  sourceNote: [
    "Усі цифри в цьому розділі взято зі сторінки першоджерела; власні висновки редакції позначено окремо.",
    "All figures in this article come from the primary source page; the editorial opinion is labelled separately.",
    "Все цифры в этом материале взяты со страницы первоисточника; собственные выводы редакции отмечены отдельно.",
    "Alle Zahlen in diesem Beitrag stammen von der Seite der Primärquelle; die Einschätzung der Redaktion ist gesondert gekennzeichnet.",
    "Todas las cifras de este artículo proceden de la página de la fuente original; la opinión de la redacción está señalada aparte.",
    "Tous les chiffres de cet article proviennent de la page de la source primaire ; l'avis de la rédaction est indiqué séparément.",
    "Wszystkie liczby w tym artykule pochodzą ze strony źródła pierwotnego; opinia redakcji jest oznaczona osobno.",
    "Todos os números deste artigo vêm da página da fonte original; a opinião da redação está indicada separadamente.",
    "本文所有数据均来自原始来源页面；编辑部的观点单独标注。",
  ],
  related: ["Ще з IT новин", "More IT news", "Ещё из IT-новостей", "Mehr IT-News", "Más noticias IT", "Plus d'actus IT", "Więcej wiadomości IT", "Mais notícias de TI", "更多 IT 新闻"],
  faq: ["Часті запитання", "FAQ", "Частые вопросы", "Häufige Fragen", "Preguntas frecuentes", "Questions fréquentes", "Najczęstsze pytania", "Perguntas frequentes", "常见问题"],
  botTitle: [
    "Вакансії під цю тему — у Telegram", "Jobs on this topic, in Telegram", "Вакансии по этой теме — в Telegram", "Jobs zu diesem Thema, in Telegram",
    "Vacantes sobre este tema, en Telegram", "Offres sur ce sujet, dans Telegram", "Oferty pracy w tym temacie, w Telegramie", "Vagas sobre este tema, no Telegram", "该主题的职位，通过 Telegram 获取",
  ],
  botText: [
    "Підключіть бота A1: надішлемо нові вакансії за вашим фільтром, щойно вони з’являться.",
    "Connect the A1 bot and we will message you new jobs matching your filter as soon as they appear.",
    "Подключите бота A1: пришлём новые вакансии по вашему фильтру, как только они появятся.",
    "Verbinde den A1-Bot: Wir schicken dir neue Jobs zu deinem Filter, sobald sie erscheinen.",
    "Conecta el bot de A1: te enviaremos las vacantes nuevas de tu filtro en cuanto aparezcan.",
    "Connectez le bot A1 : nous vous enverrons les nouvelles offres correspondant à votre filtre dès leur parution.",
    "Połącz bota A1: wyślemy Ci nowe oferty pasujące do Twojego filtra, gdy tylko się pojawią.",
    "Conecte o bot do A1: enviaremos as novas vagas do seu filtro assim que aparecerem.",
    "连接 A1 机器人：符合你筛选条件的新职位一出现，我们就会发给你。",
  ],
  botBtn: ["Підключити бота", "Connect the bot", "Подключить бота", "Bot verbinden", "Conectar el bot", "Connecter le bot", "Połącz bota", "Conectar o bot", "连接机器人"],
  liveWorld: ["ML/Data вакансій у світі", "ML/Data jobs worldwide", "ML/Data-вакансий в мире", "ML/Data-Jobs weltweit", "vacantes de ML/Data en el mundo", "offres ML/Data dans le monde", "ofert ML/Data na świecie", "vagas de ML/Data no mundo", "全球 ML/数据职位"],
  liveUa: ["ML/Data вакансій в Україні", "ML/Data jobs in Ukraine", "ML/Data-вакансий в Украине", "ML/Data-Jobs in der Ukraine", "vacantes de ML/Data en Ucrania", "offres ML/Data en Ukraine", "ofert ML/Data na Ukrainie", "vagas de ML/Data na Ucrânia", "乌克兰 ML/数据职位"],
  liveShare: ["частка серед усіх вакансій A1", "share of all A1 jobs", "доля среди всех вакансий A1", "Anteil an allen A1-Jobs", "proporción de todas las vacantes de A1", "part de toutes les offres A1", "udział wśród wszystkich ofert A1", "fatia de todas as vagas do A1", "占 A1 全部职位的比例"],
  liveSalaryMl: ["медіана річної зарплати в ML (USD)", "median yearly pay in ML (USD)", "медианная годовая зарплата в ML (USD)", "Median-Jahresgehalt in ML (USD)", "salario anual mediano en ML (USD)", "salaire annuel médian en ML (USD)", "mediana rocznego wynagrodzenia w ML (USD)", "salário anual mediano em ML (USD)", "ML 年薪中位数（美元）"],
  liveSalaryAll: ["медіана по всіх вакансіях із зарплатою", "median across all jobs with pay", "медиана по всем вакансиям с зарплатой", "Median aller Jobs mit Gehaltsangabe", "mediana de todas las vacantes con salario", "médiane de toutes les offres avec salaire", "mediana wszystkich ofert z wynagrodzeniem", "mediana de todas as vagas com salário", "所有含薪资职位的中位数"],
  liveBasedOn: [
    "Рахуємо з усіх відкритих вакансій A1; зарплати — лише там, де їх указано (USD, рік). Теги: Machine Learning, Data Science, PyTorch, TensorFlow.",
    "Calculated from every open A1 job; pay only where it is stated (USD, per year). Tags: Machine Learning, Data Science, PyTorch, TensorFlow.",
    "Считаем по всем открытым вакансиям A1; зарплаты — только там, где они указаны (USD, год). Теги: Machine Learning, Data Science, PyTorch, TensorFlow.",
    "Berechnet aus allen offenen A1-Jobs; Gehälter nur, wo sie angegeben sind (USD, pro Jahr). Tags: Machine Learning, Data Science, PyTorch, TensorFlow.",
    "Calculado con todas las vacantes abiertas de A1; salarios solo donde se indican (USD, por año). Etiquetas: Machine Learning, Data Science, PyTorch, TensorFlow.",
    "Calculé à partir de toutes les offres ouvertes d'A1 ; salaires uniquement lorsqu'ils sont indiqués (USD, par an). Tags : Machine Learning, Data Science, PyTorch, TensorFlow.",
    "Obliczone na podstawie wszystkich otwartych ofert A1; wynagrodzenia tylko tam, gdzie je podano (USD, rocznie). Tagi: Machine Learning, Data Science, PyTorch, TensorFlow.",
    "Calculado a partir de todas as vagas abertas do A1; salários apenas onde informados (USD, por ano). Tags: Machine Learning, Data Science, PyTorch, TensorFlow.",
    "根据 A1 全部开放职位计算；薪资仅统计注明的部分（美元，年薪）。标签：Machine Learning、Data Science、PyTorch、TensorFlow。",
  ],
  liveOpen: ["Відкрити", "Open", "Открыть", "Öffnen", "Abrir", "Ouvrir", "Otwórz", "Abrir", "打开"],
} satisfies Record<string, Nine>;

export type NewsUiKey = keyof typeof K;
const INDEX: Record<Locale, number> = { uk: 0, en: 1, ru: 2, de: 3, es: 4, fr: 5, pl: 6, ptBR: 7, zh: 8 };

export function nui(key: NewsUiKey, locale: Locale): string {
  return K[key][INDEX[locale]] ?? K[key][1];
}

/** Текст на всех 9 языках для <T {...ntt("h1")} />; vars подставляются в {n}. */
export function ntt(key: NewsUiKey, vars?: Record<string, string | number>): Record<Locale, string> {
  const out = {} as Record<Locale, string>;
  for (const l of LOCALES) out[l] = nui(key, l).replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? ""));
  return out;
}

/** Подписи живого блока для каждого из 9 языков (клиент выбирает по языку сайта). */
export type LiveLabels = { world: string; ua: string; share: string; salaryMl: string; salaryAll: string; basedOn: string; open: string };
export function liveLabelsAll(): Record<Locale, LiveLabels> {
  const out = {} as Record<Locale, LiveLabels>;
  for (const l of LOCALES) {
    out[l] = { world: nui("liveWorld", l), ua: nui("liveUa", l), share: nui("liveShare", l), salaryMl: nui("liveSalaryMl", l), salaryAll: nui("liveSalaryAll", l), basedOn: nui("liveBasedOn", l), open: nui("liveOpen", l) };
  }
  return out;
}

/** Дата на всех 9 языках. */
export function dateAll(iso: string): Record<Locale, string> {
  const tags: Record<Locale, string> = { uk: "uk-UA", en: "en-US", ru: "ru-RU", de: "de-DE", es: "es-ES", fr: "fr-FR", pl: "pl-PL", ptBR: "pt-BR", zh: "zh-CN" };
  const out = {} as Record<Locale, string>;
  for (const l of LOCALES) out[l] = new Date(iso + "T12:00:00Z").toLocaleDateString(tags[l], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return out;
}

/** Язык интерфейса: страница uk показывает uk или ru, страница en -- остальные семь. */
export function newsLocale(pageLang: "uk" | "en", active: Locale): Locale {
  if (pageLang === "uk") return active === "ru" ? "ru" : "uk";
  return active === "uk" || active === "ru" ? "en" : active;
}
