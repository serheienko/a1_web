// lib/a1/magic-wand.ts
//
// Magic Wand на сайте (волна 5, 2026-10-03): типы ответа account.magicWand
// и слияние результатов -- та же логика, что в приложении
// (magic_wand_result.dart / magic_wand_apply.dart / magic_wand_cubit.dart).
// Файл без серверных зависимостей: его читает и клиентская панель, и роут.

export type MagicWandField =
  | "name"
  | "bio"
  | "occupation"
  | "companies"
  | "location"
  | "industry"
  | "languages"
  | "education"
  | "skills"
  | "hobbies"
  | "books"
  | "movies"
  | "games"
  // 09.10.2026 Magic Post (posts.magicWand): чипы публикации.
  | "title"
  | "content"
  | "category"
  | "salary"
  | "workMode"
  | "workContract"
  | "experience"
  | "questions";

/** Чипы панели, в порядке финального макета Александра (30.09.2026). */
export const MAGIC_WAND_CHIPS: MagicWandField[] = [
  "name",
  "bio",
  "industry",
  "education",
  "companies",
  "hobbies",
  "skills",
  "languages",
  "location",
];

/** Цвет иконки каждого чипа (как в приложении, MagicWandStyle). */
export const MAGIC_WAND_CHIP_COLOR: Partial<Record<MagicWandField, string>> = {
  name: "#148CFF",
  bio: "#EF52D4",
  industry: "#22DC85",
  education: "#8564FF",
  companies: "#26E7E7",
  hobbies: "#168CF8",
  skills: "#FFC247",
  languages: "#7470FF",
  location: "#FFC547",
  // Magic Post
  title: "#148CFF",
  content: "#EF52D4",
  category: "#22DC85",
  salary: "#26E7E7",
  workMode: "#8564FF",
  workContract: "#168CF8",
  experience: "#7470FF",
  questions: "#FE4BA3",
};

/** Ключи account.updateProfile, которые заполняет чип. */
export function patchKeysOf(field: MagicWandField): string[] {
  switch (field) {
    case "name":
      return ["firstName", "lastName"];
    case "bio":
      return ["bio"];
    case "occupation":
      return ["occupation"];
    case "companies":
      return ["companies"];
    case "location":
      return ["location"];
    case "industry":
      return ["workInterests"];
    case "languages":
      return ["languages"];
    case "education":
      return ["education"];
    case "skills":
      return ["skills"];
    case "hobbies":
      return ["hobbies"];
    case "books":
      return ["favoriteBooks"];
    case "movies":
      return ["favoriteMovies"];
    case "games":
      return ["favoriteGames"];
    case "title":
      return ["title"];
    case "content":
      return ["content"];
    case "category":
      return ["categories"];
    case "salary":
      return ["salary"];
    case "workMode":
      return ["workMode"];
    case "workContract":
      return ["workContract"];
    case "experience":
      return ["experience"];
    case "questions":
      return ["applyQuestions"];
  }
}

export type MagicWandFieldState = {
  field: MagicWandField;
  status: "filled" | "missing";
  preview: string | null;
  hint: string | null;
  note: string | null;
};

export type MagicWandPatch = Record<string, unknown>;

export type MagicWandLocation = {
  _id: number;
  displayName?: string;
  country?: string;
  city?: string;
} | null;

export type MagicWandResult = {
  transcript: string;
  patch: MagicWandPatch;
  location: MagicWandLocation;
  fields: MagicWandFieldState[];
  storyLanguage: string | null;
  /** Magic Post: what the story is (job-seeking / job-employing), if the server worked it out. */
  kind?: string | null;
};

const FIELD_NAMES = new Set<string>([
  "name", "bio", "occupation", "companies", "location", "industry", "languages",
  "education", "skills", "hobbies", "books", "movies", "games",
  "title", "content", "category", "salary", "workMode", "workContract", "experience", "questions",
]);

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

/** Разбирает `data` из account.magicWand; null, если форма неожиданная. */
export function parseMagicWandResult(data: unknown): MagicWandResult | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const fields: MagicWandFieldState[] = [];
  if (Array.isArray(o.fields)) {
    for (const f of o.fields) {
      if (!f || typeof f !== "object") continue;
      const r = f as Record<string, unknown>;
      if (typeof r.field !== "string" || !FIELD_NAMES.has(r.field)) continue;
      fields.push({
        field: r.field as MagicWandField,
        status: r.status === "filled" ? "filled" : "missing",
        preview: str(r.preview),
        hint: str(r.hint),
        note: str(r.note),
      });
    }
  }
  const loc = o.location && typeof o.location === "object" ? (o.location as Record<string, unknown>) : null;
  return {
    transcript: typeof o.transcript === "string" ? o.transcript : "",
    patch: o.patch && typeof o.patch === "object" && !Array.isArray(o.patch) ? { ...(o.patch as MagicWandPatch) } : {},
    location:
      loc && typeof loc._id === "number"
        ? {
            _id: loc._id,
            displayName: typeof loc.displayName === "string" ? loc.displayName : undefined,
            country: typeof loc.country === "string" ? loc.country : undefined,
            city: typeof loc.city === "string" ? loc.city : undefined,
          }
        : null,
    fields,
    storyLanguage: str(o.storyLanguage),
    kind: str(o.kind),
  };
}

/** Патч без того, что заполнял [field] (нажали × на чипе). */
export function patchWithout(patch: MagicWandPatch, field: MagicWandField): MagicWandPatch {
  const keys = new Set(patchKeysOf(field));
  return Object.fromEntries(Object.entries(patch).filter(([k]) => !keys.has(k)));
}

/** [base], где всё от [field] взято из [answer] (ответ про один чип). */
export function patchWithField(base: MagicWandPatch, answer: MagicWandPatch, field: MagicWandField): MagicWandPatch {
  const out = patchWithout(base, field);
  for (const k of patchKeysOf(field)) if (k in answer) out[k] = answer[k];
  return out;
}

function itemKey(field: MagicWandField, item: unknown): string | null {
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    const v =
      field === "companies"
        ? o.name
        : field === "skills" || field === "languages"
          ? o.value
          : field === "books" || field === "movies" || field === "games"
            ? o.title
            : null;
    return v == null ? null : String(v).trim().toLowerCase();
  }
  if (typeof item === "string") return item.trim().toLowerCase();
  if (typeof item === "number") return String(item);
  return null;
}

const MERGED_LIST_LIMITS: Partial<Record<MagicWandField, number>> = { industry: 5, hobbies: 5 };

/**
 * Второй рассказ про чип, который уже зелёный (на него не нажимали):
 * новое добавляется к найденному раньше, а не заменяет его. Один и тот же
 * элемент -- побеждает новый. Одиночные значения (имя, о себе) заменяются.
 */
export function patchMerged(base: MagicWandPatch, answer: MagicWandPatch, field: MagicWandField): MagicWandPatch {
  const merged: MagicWandPatch = { ...base };
  for (const key of patchKeysOf(field)) {
    if (!(key in answer)) continue;
    const fresh = answer[key];
    const old = base[key];
    if (Array.isArray(fresh) && Array.isArray(old) && field !== "location") {
      const limit = MERGED_LIST_LIMITS[field];
      const seen = new Set<string>();
      const out: unknown[] = [];
      for (const item of [...fresh, ...old]) {
        const k = itemKey(field, item);
        if (k != null && seen.has(k)) continue;
        if (k != null) seen.add(k);
        if (limit != null && out.length >= limit) break;
        out.push(item);
      }
      merged[key] = [...out.filter((e) => !fresh.includes(e)), ...out.filter((e) => fresh.includes(e))];
    } else {
      merged[key] = fresh;
    }
  }
  return merged;
}

/** Склейка превью двух рассказов про один чип без повторов. */
export function mergedPreview(field: MagicWandField, a: string | null, b: string | null): string | null {
  const sep = field === "education" ? "; " : ", ";
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const p of [...(a ? a.split(sep) : []), ...(b ? b.split(sep) : [])]) {
    const t = p.trim();
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      parts.push(t);
    }
  }
  return parts.length ? parts.join(sep) : null;
}

/** Состояние панели -- чистая функция, чтобы её было удобно проверять. */
export type MagicWandPanelData = {
  chips: Partial<Record<MagicWandField, MagicWandFieldState>>;
  patch: MagicWandPatch;
  location: MagicWandLocation;
  hasResult: boolean;
};

export const EMPTY_MAGIC_WAND_DATA: MagicWandPanelData = { chips: {}, patch: {}, location: null, hasResult: false };

/** Принимает ответ сервера (порт MagicWandCubit._adopt). */
export function adoptMagicWandResult(
  state: MagicWandPanelData,
  result: MagicWandResult,
  focus: MagicWandField | null,
): MagicWandPanelData {
  const chips = { ...state.chips };
  let patch = { ...state.patch };
  let location = state.location;

  for (const fresh of result.fields) {
    const old = chips[fresh.field];
    // Отвечая про один чип, человек мог упомянуть и другое: оно заполняет
    // ещё пустые чипы, а уже зелёный меняется, только если спрашивали о нём.
    if (focus && fresh.field !== focus && old?.status === "filled") continue;
    if (fresh.status === "filled") {
      if (!focus && old?.status === "filled") {
        patch = patchMerged(patch, result.patch, fresh.field);
        chips[fresh.field] = {
          ...fresh,
          preview: mergedPreview(fresh.field, old.preview, fresh.preview),
          hint: fresh.hint ?? old.hint,
          note: fresh.note ?? old.note,
        };
      } else {
        chips[fresh.field] = fresh;
        patch = patchWithField(patch, result.patch, fresh.field);
      }
      if (fresh.field === "location") location = result.location;
    } else if (!old || old.status !== "filled") {
      chips[fresh.field] = fresh;
    } else if (focus === fresh.field) {
      chips[fresh.field] = { ...old, hint: fresh.hint ?? old.hint, note: fresh.note ?? old.note };
    }
  }

  // Не чипы: день рождения, телефон и ссылки, сказанные вслух, всё равно
  // попадают в форму. Побеждает последнее упоминание.
  for (const key of ["dob", "links", "phoneNumber", "link"]) {
    if (result.patch[key] != null) patch[key] = result.patch[key];
  }
  return { chips, patch, location, hasResult: true };
}

/** × на зелёном чипе: серый снова, подсказка остаётся. */
export function removeMagicWandField(state: MagicWandPanelData, field: MagicWandField): MagicWandPanelData {
  const chip = state.chips[field];
  if (!chip || chip.status !== "filled") return state;
  return {
    ...state,
    chips: { ...state.chips, [field]: { field, status: "missing", preview: null, hint: chip.hint, note: null } },
    patch: patchWithout(state.patch, field),
    location: field === "location" ? null : state.location,
  };
}

export function magicWandFilledCount(state: MagicWandPanelData, chips: MagicWandField[] = MAGIC_WAND_CHIPS): number {
  return chips.filter((f) => state.chips[f]?.status === "filled").length;
}
