// lib/seo/fact-landings.ts
//
// 2026-09-19 (Александр: «Без досвіду» -- «аудитория новичков огромная
// и им на других досках плохо»; «бронювання -- в Украине очень
// актуально»). Тексты двух посадочных страниц по признакам, которых у
// бэкенда нет и которые мы считаем сами (lib/a1/job-facts.ts).
//
// Устроено как lib/seo/job-landings.ts: всё, что человек и поисковик
// видят на странице, лежит здесь, а сама страница -- один общий шаблон
// app/jobs/tag/[slug]/page.tsx.
//
// ПРО ФОРМУЛИРОВКУ БРОНИРОВАНИЯ. Нигде не обещаем бронирование от
// своего имени: компания написала это в своей вакансии, мы только
// пересказываем. Поэтому и «компанії, які пишуть», и прямая просьба
// уточнять условия у работодателя.
//
// ПРО АДРЕС. Отдельный сегмент /jobs/tag/ не случайно: /jobs/<slug> --
// это страница вакансии, и любое новое статическое имя прямо под /jobs
// пришлось бы держать в голове вечно. Та же причина, по которой
// посадочные по стеку живут на /jobs/stack/.

import type { Locale } from "@/components/t";
import type { JobFactKey } from "@/lib/a1/facts-index";

export type FactLanding = {
  slug: JobFactKey;
  /** Короткая подпись для чипа на главной и перелинковки. */
  chip: Record<Locale, string>;
  metaTitle: string;
  metaDescription: string;
  h1: Record<Locale, string>;
  countLine: Record<Locale, string>;
  lead: Record<Locale, string>;
  empty: Record<Locale, string>;
};

export const FACT_LANDINGS: FactLanding[] = [
  {
    slug: "no-experience",
    chip: {
      uk: "Без досвіду", en: "No experience", ru: "Без опыта",
      de: "Ohne Erfahrung", es: "Sin experiencia", fr: "Sans expérience",
      pl: "Bez doświadczenia", ptBR: "Sem experiência", zh: "无需经验",
    },
    metaTitle: "Робота без досвіду — вакансії для початківців | A1 Jobs",
    metaDescription:
      "Вакансії, куди беруть без досвіду: стажування, trainee та junior-позиції. Оновлюється щодня.",
    h1: {
      uk: "Робота без досвіду", en: "Entry-level jobs", ru: "Работа без опыта",
      de: "Jobs für Berufseinsteiger", es: "Empleos sin experiencia",
      fr: "Emplois sans expérience", pl: "Praca bez doświadczenia",
      ptBR: "Vagas sem experiência", zh: "无经验职位",
    },
    countLine: {
      uk: "{n} вакансій, куди беруть без досвіду",
      en: "{n} open jobs that take you without experience",
      ru: "{n} вакансий, куда берут без опыта",
      de: "{n} offene Stellen ohne Berufserfahrung",
      es: "{n} vacantes abiertas sin experiencia",
      fr: "{n} offres ouvertes sans expérience",
      pl: "{n} otwartych ofert bez doświadczenia",
      ptBR: "{n} vagas abertas sem experiência",
      zh: "{n} 个无需经验的职位",
    },
    lead: {
      uk: "Перша робота в IT: стажування, trainee та junior-позиції, де комерційний досвід не потрібен. Список оновлюється щодня.",
      en: "Your first job in tech: internships, trainee and junior roles where commercial experience is not required. Updated daily.",
      ru: "Первая работа в IT: стажировки, trainee и junior-позиции, где коммерческий опыт не нужен. Список обновляется ежедневно.",
      de: "Der erste Job in der IT: Praktika, Trainee- und Junior-Stellen ohne Berufserfahrung. Täglich aktualisiert.",
      es: "Tu primer empleo en IT: prácticas, trainee y puestos junior sin experiencia comercial. Se actualiza a diario.",
      fr: "Premier emploi dans l'IT : stages, postes trainee et junior sans expérience professionnelle. Mise à jour quotidienne.",
      pl: "Pierwsza praca w IT: staże, trainee i stanowiska junior bez doświadczenia komercyjnego. Aktualizowane codziennie.",
      ptBR: "Seu primeiro emprego em TI: estágios, trainee e vagas junior sem experiência comercial. Atualizado diariamente.",
      zh: "IT 行业的第一份工作：实习、培训生和初级岗位，无需商业经验。每日更新。",
    },
    empty: {
      uk: "Поки немає відкритих вакансій без досвіду.",
      en: "No open entry-level jobs yet.",
      ru: "Пока нет открытых вакансий без опыта.",
      de: "Noch keine offenen Einsteigerstellen.",
      es: "Aún no hay vacantes sin experiencia.",
      fr: "Pas encore d'offres sans expérience.",
      pl: "Nie ma jeszcze ofert bez doświadczenia.",
      ptBR: "Ainda não há vagas sem experiência.",
      zh: "暂无无经验职位。",
    },
  },
  {
    slug: "reservation",
    chip: {
      uk: "🪖 Бронювання", en: "🪖 Deferment", ru: "🪖 Бронирование",
      de: "🪖 Freistellung", es: "🪖 Aplazamiento", fr: "🪖 Sursis",
      pl: "🪖 Odroczenie", ptBR: "🪖 Adiamento", zh: "🪖 兵役缓征",
    },
    metaTitle: "Робота з бронюванням — вакансії | A1 Jobs",
    metaDescription:
      "Вакансії, де компанія пише про бронювання співробітників. Оновлюється щодня.",
    h1: {
      uk: "Робота з бронюванням", en: "Jobs with military deferment",
      ru: "Работа с бронированием", de: "Jobs mit Wehrdienst-Freistellung",
      es: "Empleos con aplazamiento militar", fr: "Emplois avec sursis militaire",
      pl: "Praca z odroczeniem od mobilizacji", ptBR: "Vagas com adiamento militar",
      zh: "提供兵役缓征的职位",
    },
    countLine: {
      uk: "{n} вакансій, де компанія згадує бронювання",
      en: "{n} open jobs where the company mentions deferment",
      ru: "{n} вакансий, где компания упоминает бронирование",
      de: "{n} offene Stellen mit erwähnter Freistellung",
      es: "{n} vacantes donde la empresa menciona el aplazamiento",
      fr: "{n} offres où l'entreprise mentionne le sursis",
      pl: "{n} ofert, w których firma wspomina o odroczeniu",
      ptBR: "{n} vagas em que a empresa menciona o adiamento",
      zh: "{n} 个公司提及兵役缓征的职位",
    },
    lead: {
      uk: "Компанії, які прямо пишуть у вакансії, що бронюють співробітників. Це обіцянка роботодавця, а не наша гарантія — умови та строки уточнюйте безпосередньо в компанії.",
      en: "Companies that explicitly mention employee deferment in the job ad. This is the employer's own promise, not our guarantee — check the terms with the company directly.",
      ru: "Компании, которые прямо пишут в вакансии, что бронируют сотрудников. Это обещание работодателя, а не наша гарантия — условия и сроки уточняйте напрямую в компании.",
      de: "Unternehmen, die in der Anzeige ausdrücklich eine Freistellung erwähnen. Das ist die Zusage des Arbeitgebers, keine Garantie von uns — klären Sie die Bedingungen direkt mit dem Unternehmen.",
      es: "Empresas que mencionan expresamente el aplazamiento en la oferta. Es la promesa del empleador, no nuestra garantía: confirma las condiciones con la empresa.",
      fr: "Entreprises qui mentionnent explicitement le sursis dans l'annonce. C'est la promesse de l'employeur, pas notre garantie : vérifiez les conditions auprès de l'entreprise.",
      pl: "Firmy, które wprost piszą w ofercie o odroczeniu dla pracowników. To obietnica pracodawcy, a nie nasza gwarancja — warunki potwierdź bezpośrednio w firmie.",
      ptBR: "Empresas que mencionam explicitamente o adiamento na vaga. É a promessa do empregador, não nossa garantia — confirme as condições com a empresa.",
      zh: "在职位描述中明确提到为员工办理兵役缓征的公司。这是雇主的承诺，而非我们的保证，具体条件请直接与公司确认。",
    },
    empty: {
      uk: "Поки немає відкритих вакансій із бронюванням.",
      en: "No open jobs with deferment yet.",
      ru: "Пока нет открытых вакансий с бронированием.",
      de: "Noch keine offenen Stellen mit Freistellung.",
      es: "Aún no hay vacantes con aplazamiento.",
      fr: "Pas encore d'offres avec sursis.",
      pl: "Nie ma jeszcze ofert z odroczeniem.",
      ptBR: "Ainda não há vagas com adiamento.",
      zh: "暂无提供兵役缓征的职位。",
    },
  },
  {
    // 23.09.2026 (Александр: «просто, чтобы чисто визуально
    // отражалось, типа тех, кто указал ЗП»). Не фильтр «від $X» и не
    // повзунок: зарплата есть только у 7,2% вакансий (204 из 2 822,
    // замер по продакшену), и любой порог прятал бы почти всю доску.
    // Здесь один признак -- сумма названа или нет.
    slug: "with-salary",
    chip: {
      uk: "💵 З зарплатою", en: "💵 Salary shown", ru: "💵 С зарплатой",
      de: "💵 Mit Gehalt", es: "💵 Con salario", fr: "💵 Salaire affiché",
      pl: "💵 Z wynagrodzeniem", ptBR: "💵 Com salário", zh: "💵 标明薪资",
    },
    metaTitle: "Вакансії із зазначеною зарплатою | A1 Jobs",
    metaDescription:
      "Вакансії, де компанія одразу називає суму. Без здогадок і «обговорюється на співбесіді». Оновлюється щодня.",
    h1: {
      uk: "Вакансії із зазначеною зарплатою", en: "Jobs that state the salary",
      ru: "Вакансии с указанной зарплатой", de: "Stellen mit Gehaltsangabe",
      es: "Vacantes con salario indicado", fr: "Offres avec salaire indiqué",
      pl: "Oferty z podanym wynagrodzeniem", ptBR: "Vagas com salário informado",
      zh: "标明薪资的职位",
    },
    countLine: {
      uk: "{n} вакансій, де компанія назвала суму",
      en: "{n} open jobs where the company states the pay",
      ru: "{n} вакансий, где компания назвала сумму",
      de: "{n} offene Stellen mit genannter Vergütung",
      es: "{n} vacantes donde la empresa indica el salario",
      fr: "{n} offres où l'entreprise indique la rémunération",
      pl: "{n} ofert, w których firma podaje wynagrodzenie",
      ptBR: "{n} vagas em que a empresa informa o salário",
      zh: "{n} 个公司标明薪资的职位",
    },
    lead: {
      uk: "Компанії, які не ховають цифру. Сума береться з поля вакансії, а не вгадується з тексту — тому тут не буде «від 100 доларів» там, де йшлося про щось інше.",
      en: "Companies that do not hide the number. The amount comes from the vacancy's own salary field, never guessed from the text — so no figure here means something it did not mean in the ad.",
      ru: "Компании, которые не прячут цифру. Сумма берётся из поля вакансии, а не угадывается из текста — поэтому здесь не будет «от 100 долларов» там, где речь шла о другом.",
      de: "Unternehmen, die die Zahl nicht verstecken. Der Betrag stammt aus dem Gehaltsfeld der Anzeige und wird nie aus dem Text geraten.",
      es: "Empresas que no esconden la cifra. El importe procede del campo de salario de la oferta, nunca se deduce del texto.",
      fr: "Des entreprises qui ne cachent pas le chiffre. Le montant provient du champ salaire de l'annonce, jamais deviné dans le texte.",
      pl: "Firmy, które nie ukrywają kwoty. Wartość pochodzi z pola wynagrodzenia w ofercie, nigdy nie jest zgadywana z treści.",
      ptBR: "Empresas que não escondem o valor. O montante vem do campo de salário da vaga, nunca é deduzido do texto.",
      zh: "不隐藏数字的公司。金额取自职位的薪资字段，绝不从描述文本中推测。",
    },
    empty: {
      uk: "Поки немає вакансій із зазначеною зарплатою.",
      en: "No jobs with a stated salary yet.",
      ru: "Пока нет вакансий с указанной зарплатой.",
      de: "Noch keine Stellen mit Gehaltsangabe.",
      es: "Aún no hay vacantes con salario indicado.",
      fr: "Pas encore d'offres avec salaire indiqué.",
      pl: "Nie ma jeszcze ofert z podanym wynagrodzeniem.",
      ptBR: "Ainda não há vagas com salário informado.",
      zh: "暂无标明薪资的职位。",
    },
  },
];

export function findFactLanding(slug: string): FactLanding | undefined {
  return FACT_LANDINGS.find((l) => l.slug === slug);
}
