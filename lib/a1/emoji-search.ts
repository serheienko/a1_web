// lib/a1/emoji-search.ts
//
// Поиск по панели эмодзи. Александр, 17.09.2026: «ищет не по эмодзи, а
// по русским названиям категорий, а при отсутствии совпадений молча
// возвращает текущую категорию».
//
// Теперь: слова на каждое эмодзи лежат в lib/a1/emoji-keywords.ts
// (сгенерированы из имён Юникода, английские). Запрос сначала
// переводится в английские слова по короткому словарю ниже, потом
// ищется по этим словам и по названию категории. Если ничего не нашлось
// -- отдаём пустой список, а панель честно пишет «ничего не найдено»,
// вместо того чтобы подсунуть текущую категорию и сделать вид, что так
// и надо.
import { EMOJI_CATEGORIES } from "@/lib/a1/emoji-data";
import { EMOJI_KEYWORDS } from "@/lib/a1/emoji-keywords";

/**
 * Русские и украинские слова -> английские слова из имён Юникода.
 * Список ведётся руками и заведомо неполный: он закрывает то, что люди
 * набирают чаще всего. Дополнять свободно -- одна строка на слово.
 */
export const EMOJI_QUERY_ALIASES: Record<string, string> = {
  // лица и чувства
  "смайл": "face grinning smiling",
  "улыбка": "smiling grinning",
  "усмішка": "smiling grinning",
  "смех": "laughing tears joy",
  "смiх": "laughing tears joy",
  "плач": "crying loudly tears",
  "слезы": "crying tears",
  "слёзы": "crying tears",
  "сльози": "crying tears",
  "грусть": "frowning pensive disappointed",
  "сум": "frowning pensive disappointed",
  "злой": "angry pouting",
  "злий": "angry pouting",
  "поцелуй": "kiss kissing",
  "поцілунок": "kiss kissing",
  "сон": "sleeping sleepy zzz",
  "страх": "fearful screaming",
  "подмигивание": "winking",
  "язык": "tongue",
  "очки": "sunglasses eyeglasses",
  "маска": "medical mask",
  "болезнь": "thermometer face sick nauseated",
  // руки и жесты
  "рука": "hand palm",
  "рукопожатие": "handshake",
  "рукостискання": "handshake",
  "лайк": "thumbs up",
  "палец": "finger hand thumbs",
  "аплодисменты": "clapping hands",
  "молитва": "folded hands",
  "спасибо": "folded hands",
  "дякую": "folded hands",
  "привет": "waving hand",
  "привіт": "waving hand",
  "сила": "flexed biceps",
  "ок": "ok hand",
  "кулак": "fist",
  // люди
  "человек": "person man woman",
  "людина": "person man woman",
  "ребенок": "baby child boy girl",
  "дитина": "baby child boy girl",
  "семья": "family",
  "сімя": "family",
  "врач": "health worker",
  "лікар": "health worker",
  // животные
  "кот": "cat",
  "кіт": "cat",
  "кошка": "cat",
  "собака": "dog",
  "пес": "dog",
  "пёс": "dog",
  "мышь": "mouse",
  "мыш": "mouse",
  "лошадь": "horse",
  "кінь": "horse",
  "птица": "bird",
  "птах": "bird",
  "рыба": "fish",
  "риба": "fish",
  "медведь": "bear",
  "ведмідь": "bear",
  "лиса": "fox",
  "лев": "lion",
  "обезьяна": "monkey",
  "мавпа": "monkey",
  "зверь": "animal",
  // еда
  "еда": "food",
  "їжа": "food",
  "пицца": "pizza",
  "піца": "pizza",
  "кофе": "coffee hot beverage",
  "кава": "coffee hot beverage",
  "чай": "tea",
  "пиво": "beer",
  "вино": "wine glass",
  "торт": "cake",
  "хлеб": "bread",
  "хліб": "bread",
  "мясо": "meat poultry",
  "мясо́": "meat poultry",
  "яблоко": "apple",
  "яблуко": "apple",
  "банан": "banana",
  "арбуз": "watermelon",
  "кавун": "watermelon",
  "мороженое": "ice cream",
  "морозиво": "ice cream",
  // предметы и символы
  "сердце": "heart",
  "серце": "heart",
  "огонь": "fire",
  "вогонь": "fire",
  "звезда": "star",
  "зірка": "star",
  "деньги": "money dollar banknote",
  "гроші": "money dollar banknote",
  "подарок": "gift wrapped present",
  "подарунок": "gift wrapped present",
  "телефон": "telephone mobile phone",
  "компьютер": "computer laptop",
  "компютер": "computer laptop",
  "книга": "book books",
  "часы": "clock watch",
  "годинник": "clock watch",
  "ключ": "key",
  "замок": "lock locked",
  "музыка": "musical note",
  "музика": "musical note",
  "шар": "balloon",
  "куля": "balloon",
  "корона": "crown",
  "работа": "briefcase",
  "робота": "briefcase",
  "письмо": "envelope mail",
  "лист": "envelope mail",
  "галочка": "check mark",
  "крестик": "cross mark",
  "вопрос": "question mark",
  "питання": "question mark",
  "череп": "skull",
  "робот": "robot",
  "ракета": "rocket",
  "бомба": "bomb",
  "флаг": "flag",
  "прапор": "flag",
  // природа, транспорт, места
  "солнце": "sun sunny",
  "сонце": "sun sunny",
  "луна": "moon crescent",
  "місяць": "moon crescent",
  "дождь": "rain cloud droplet",
  "дощ": "rain cloud droplet",
  "снег": "snow snowflake",
  "сніг": "snow snowflake",
  "цветок": "flower blossom rose tulip",
  "квітка": "flower blossom rose tulip",
  "дерево": "tree",
  "море": "water wave ocean",
  "гора": "mountain",
  "радуга": "rainbow",
  "веселка": "rainbow",
  "машина": "car automobile",
  "авто": "car automobile",
  "самолет": "airplane",
  "літак": "airplane",
  "поезд": "train railway",
  "поїзд": "train railway",
  "велосипед": "bicycle",
  "корабль": "ship boat",
  "корабель": "ship boat",
  "дом": "house home building",
  "дім": "house home building",
  "город": "city cityscape",
  "місто": "city cityscape",
  // спорт и праздники
  "футбол": "soccer ball",
  "мяч": "ball",
  "мяч́": "ball",
  "спорт": "ball trophy medal",
  "медаль": "medal",
  "кубок": "trophy",
  "праздник": "party popper confetti",
  "свято": "party popper confetti",
  "днюха": "birthday cake",
  "рождество": "christmas tree",
  "різдво": "christmas tree",
};

/**
 * Слова запроса. `exact` -- английские слова из словаря выше: по ним
 * совпадение должно быть словом целиком, иначе «машина» -> "car"
 * вытащит ещё и carrot с headscarf (подстрока "car" сидит внутри
 * обоих). `prefix` -- то, что человек набрал сам: здесь совпадение по
 * началу слова, чтобы недописанное "hea" находило heart.
 */
export function expandEmojiQuery(raw: string): { exact: string[]; prefix: string[] } {
  const query = raw.trim().toLowerCase();
  if (!query) return { exact: [], prefix: [] };
  const exact = new Set<string>();
  const prefix = new Set<string>();
  for (const word of query.split(/\s+/)) {
    if (!word) continue;
    prefix.add(word);
    const alias = EMOJI_QUERY_ALIASES[word];
    if (alias) for (const part of alias.split(" ")) exact.add(part);
  }
  return { exact: Array.from(exact), prefix: Array.from(prefix) };
}

function matches(words: string[], terms: { exact: string[]; prefix: string[] }): boolean {
  for (const word of words) {
    // Слово целиком или его простое множественное число: в именах
    // Юникода встречается и "heart", и "three hearts".
    if (terms.exact.some((term) => word === term || word === `${term}s`)) return true;
    if (terms.prefix.some((term) => word.startsWith(term))) return true;
  }
  return false;
}

/**
 * Эмодзи под запрос. Пустой массив -- честное «ничего не нашлось»;
 * подменять его текущей категорией нельзя, иначе поиск выглядит
 * сломанным (ровно та жалоба, с которой всё началось).
 */
export function searchEmojis(raw: string): string[] {
  const terms = expandEmojiQuery(raw);
  if (terms.exact.length === 0 && terms.prefix.length === 0) return [];

  const found: string[] = [];
  const seen = new Set<string>();

  // Сначала категории, чьё название совпало: «живот» -> «Животные».
  for (const category of EMOJI_CATEGORIES) {
    const label = category.labelRu.toLowerCase();
    if (!terms.prefix.some((term) => label.includes(term))) continue;
    for (const emoji of category.emojis) {
      if (seen.has(emoji)) continue;
      seen.add(emoji);
      found.push(emoji);
    }
  }

  // Затем сами эмодзи по словам из Юникода.
  for (const category of EMOJI_CATEGORIES) {
    for (const emoji of category.emojis) {
      if (seen.has(emoji)) continue;
      const words = EMOJI_KEYWORDS[emoji];
      if (!words) continue;
      if (!matches(words.split(" "), terms)) continue;
      seen.add(emoji);
      found.push(emoji);
    }
  }

  return found;
}
