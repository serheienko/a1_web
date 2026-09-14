// lib/seo/slug.ts
//
// URL slug for a post detail page: "<kebab-title>-<postId>" (PLAN.md §3.1).
//
// 2026-09-14 (Александр, SEO-разбор: адреса вида /jobs/po_155816537245483017
// у половины вакансий). Раньше здесь кебабился ТОЛЬКО ASCII, и в шапке
// файла это честно значилось как «acceptable for now»: украинский или
// русский заголовок схлопывался в пустоту, и в адресе не оставалось ни
// одного ключевого слова -- только внутренний id. А заголовков на
// кириллице у нас большинство.
//
// Теперь кириллица транслитерируется. Таблица -- официальная украинская
// (постанова КМУ №55 від 2010-01-27), та самая, по которой в загранпаспорте
// пишут Kyiv, Zhytomyr, Yurii: её узнают и люди, и поиск. Плюс четыре
// буквы, которых в украинском нет, но которые приезжают в русских
// заголовках с DOU: ё, ъ, ы, э.
//
// Момент для правки удачный: на 2026-09-14 Google не проиндексировал с
// этого поддомена ни одной страницы (проверено в Search Console: «URL
// неизвестен Google»), то есть менять адреса сейчас вообще ничего не
// стоит. Старые ссылки и так не ломаются -- app/jobs/[slug]/page.tsx и
// app/talents/[slug]/page.tsx пересчитывают канонический слаг на каждом
// заходе и делают постоянный редирект, если пришли не по нему.

/**
 * Украинская транслитерация по КМУ №55. Две особенности стандарта,
 * которые здесь честно воспроизведены:
 *
 *  1. Пять букв (є, ї, й, ю, я) в НАЧАЛЕ слова пишутся иначе, чем
 *     внутри: Єнакієве -> Yenakiieve, але Медвін -> Medvin. Отсюда
 *     отдельная таблица WORD_INITIAL_MAP.
 *  2. Сполучення «зг» -> "zgh", а не "zh" -- иначе Згорани не
 *     отличить от Жорани.
 *
 * Мягкий знак и апостроф не передаются вовсе -- так в стандарте.
 */
const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", ж: "zh",
  з: "z", и: "y", і: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ь: "", "'": "", "’": "", "ʼ": "",
  // Позиционные — значения для СЕРЕДИНЫ слова.
  є: "ie", ї: "i", й: "i", ю: "iu", я: "ia",
  // Русские буквы, которых нет в украинском алфавите: в заголовках с
  // DOU они встречаются, и без них слово теряло бы букву.
  ё: "yo", ъ: "", ы: "y", э: "e",
};

/** Те же пять букв, но в начале слова. */
const WORD_INITIAL_MAP: Record<string, string> = {
  є: "ye", ї: "yi", й: "y", ю: "yu", я: "ya",
};

/**
 * Буква или цифра — чтобы понять, стоим ли мы в начале слова.
 * Апостроф сюда тоже входит намеренно: сам он не транслитерируется, но
 * слово не разрывает, и буква после него по стандарту берёт форму
 * СЕРЕДИНЫ слова: Знам’янка -> Znamianka, а не Znamyanka.
 */
const WORD_CHAR = /[a-z0-9Ѐ-ӿ'’ʼ]/;

export function transliterate(input: string): string {
  const lower = input.toLowerCase();
  let out = "";

  for (let i = 0; i < lower.length; i += 1) {
    const ch = lower[i] ?? "";

    // «зг» — до разбора одиночных букв, иначе «з» съест ход первой.
    if (ch === "з" && lower[i + 1] === "г") {
      out += "zgh";
      i += 1;
      continue;
    }

    const prev = i === 0 ? "" : lower[i - 1] ?? "";
    const atWordStart = i === 0 || !WORD_CHAR.test(prev);
    const initial = atWordStart ? WORD_INITIAL_MAP[ch] : undefined;
    const mapped = initial ?? CYRILLIC_MAP[ch];

    // Незнакомый символ пропускаем как есть: ниже его всё равно
    // подчистит замена всего, что не [a-z0-9], на дефис.
    out += mapped ?? ch;
  }

  return out;
}

export function slugify(title: string, id: string): string {
  const kebab = transliterate(title)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // диакритика: ä -> a, ç -> c
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    // slice мог обрубить слово посередине и оставить дефис на конце —
    // без этой строки в адресе получалось бы "...--po_123".
    .replace(/-+$/, "");

  return kebab ? `${kebab}-${id}` : id;
}

const POST_ID_PATTERN = /(po_[a-zA-Z0-9]+)$/;

/**
 * Inverse of slugify(): pull the trailing post id back out of a
 * "<kebab-title>-<postId>" slug (or a bare id). Post ids only ever contain
 * the "po_" prefix plus alphanumerics — no hyphens — so matching the
 * trailing token is unambiguous even when the kebab title itself ends in
 * digits.
 *
 * Транслитерация выше подчёркивание породить не может (всё, что не
 * [a-z0-9], становится дефисом), так что "po_" в хвосте — всегда
 * настоящий id, а не кусок заголовка.
 */
export function parseSlugId(slug: string): string | null {
  const match = slug.match(POST_ID_PATTERN);
  return match ? (match[1] ?? null) : null;
}
