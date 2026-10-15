// lib/interview/types.ts
export type InterviewLang = "uk" | "en";

/** Один вопрос. id одинаковый в обоих языках. */
export type InterviewQ = {
  id: string;
  q: string;
  /** Что хочет услышать интервьюер: 1-2 предложения. */
  wants: string;
  /** Короткий правильный ответ: 2-5 предложений, можно с примером кода в `code`. */
  answer: string;
  /** Небольшой пример кода/запроса (необязательно), до ~8 строк. */
  code?: string;
  /** Официальный источник, по которому сверен ответ. */
  source: { title: string; url: string };
  /** Каноническое имя технологии для ссылки на /jobs/stack/<slug> (необязательно). */
  tech?: string;
};

export type InterviewCategory = { id: string; title: string; items: InterviewQ[] };

export type InterviewGuide = {
  /** <title>, до ~60 символов. */
  title: string;
  /** meta description, 140-160 символов. */
  description: string;
  h1: string;
  /** Вступ: 2-3 предложения, без воды. */
  lead: string;
  categories: InterviewCategory[];
};

export type InterviewContent = Record<InterviewLang, InterviewGuide>;
