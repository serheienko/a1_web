// components/post-editor.tsx
//
// 2026-08-29 (Aleksandr, from a 5-screenshot walkthrough of the real
// mobile-app post-creation flow + a same-day follow-up: "Кстати посты
// должны быть CRUD, create / update / delete"): the real post editor,
// replacing components/create-post-fab.tsx's stub dialog. One component
// handles both create (mode="create") and edit (mode="edit",
// initialPost supplied) — same fields, same submit shape, only the
// target endpoint and button label differ.
//
// Field-for-field this is exactly PLAN.md §6.1's documented
// posts.createPost/updatePost contract (`PostInputSchema`,
// lib/a1/schemas.ts) — no invented fields, per PLAN.md §6.5 ("the web
// form's fields are exactly the API's fields — no more, no less").
// See the original 2026-08-29 commit message for the full field-by-
// field rationale; this header now only tracks what changed since.
//
// 2026-08-29, round 2 (Aleksandr, live-testing the first build —
// screenshots of a broken salary row, an uncategorized "2/3/4/5+"
// bucket, a runaway year-0002 schedule bug, etc.):
//   - Required-field validation now matches the reference screenshots
//     exactly: title >= 10 chars, description >= 30 chars, location and
//     category both required, inline red hints shown live (not gated on
//     a submit attempt) — "Поставь минимальные значения ввода, иначе
//     нельзя постити."
//   - The Offer-a-job/Find-a-job toggle is now `sticky top-0` inside the
//     scrolling body — "Делай закреплённым, чтобы не заезжало наверх."
//   - Salary row rebuilt: the amount input now has `min-w-0` (a flex-1
//     input without it refuses to shrink and pushed the currency
//     select off the visible area — the exact bug in the screenshot),
//     the currency `<select>` is narrower, and the month/year toggle is
//     now two explicit labeled pills instead of an unlabeled swap icon
//     — "можно опционально выбирать зп в год, или мес (annual / mo)."
//   - Photos: cap dropped from 5 to 3, and every photo is now
//     canvas-compressed client-side (long edge <= 1600px, JPEG quality
//     stepped down until under ~280KB) before it ever reaches
//     upload.create — "они повинні стискатися і зберігатися в розмірі
//     макс 200-300 кб на шт."
//   - Tag bucketing fixed: dataset.postTags' experience tags after the
//     first one are bare "2"/"3"/"4"/"5+" strings, not "N yr. exp." —
//     isExperienceTag() now also matches a bare number(+) so they land
//     in the Experience bucket instead of "Other tags."
//   - Category picker: IT sorted first (same fix profile-setup-form.tsx
//     already has for its own industry picker), a taller/viewport-aware
//     dropdown, and a rotating chevron on the input — "де є дропдауни
//     ставь стрілки вниз."
//   - Location search now shows a spinner while a query is in flight —
//     the debounced fetch itself was already correct and shared with
//     components/filters-form.tsx, but a query that legitimately
//     returns zero matches (e.g. a Cyrillic city name the backend index
//     doesn't have) looked identical to "broken" with no feedback at
//     all.
//   - The schedule picker is a new custom popover (date + time inputs,
//     both range-clamped to [today, +1 year], plus quick-pick chips)
//     that opens ABOVE the bottom bar instead of a native
//     `datetime-local` control, which (a) could accept a hand-typed
//     year like "0002" with Schedule still enabled, and (b) let its
//     native OS calendar render below the viewport with no way to
//     scroll to it — both reported live: "я поставил 0002 год и кнопка
//     запланировать активна... дай другой більш зручний пікер."
//   - "Save draft" no longer silently closes the dialog. The first
//     successful draft save remembers the created post's id
//     (`savedPostId`) so every later save — draft, post, or schedule —
//     updates that SAME post instead of creating a new one each click;
//     the dialog stays open and shows a "Draft saved" badge next to the
//     title for a few seconds — "непонятно, сохранилось ли что-то?
//     Надо отображать, что чернетку збережено, наприклад наверху
//     справа." Posting or scheduling still closes the dialog — those
//     are a completed action, unlike a draft checkpoint.
//
// 2026-08-29, round 3 (Aleksandr, live-testing round 2's build — the
// salary row broke again on Safari, "5+" was still miscategorized, a
// blank dialog greeted the user with 3 red errors, tags/categories were
// still raw English, and the schedule popover clipped itself):
//   - isExperienceTag() now strips whitespace before testing for a bare
//     number — the live "5+" tag turned out to be "5 +" (a space before
//     the plus), which the round-2 regex didn't tolerate.
//   - Tag pills and the category picker now run through
//     components/label-translations.ts's translateTagLabel/
//     translateCategoryLabel (the same tables components/filters-form.tsx
//     already had for its own dropdowns, pulled into a shared module) —
//     "формати роботи, тип зайнятості і досвід вокалізувати під кожну
//     мову," and categories were in the same boat.
//   - Required-field/min-length hints no longer render the instant the
//     dialog opens. Each field only shows its red hint once it's been
//     touched (blurred), and clicking a submit button while something's
//     missing touches every field at once instead of doing nothing —
//     "сразу снизу пишет три ошибки... это трабл."
//   - Salary row rebuilt a second time with CSS Grid instead of flex —
//     the flex version still broke on Safari specifically (a flex-basis
//     quirk collapsed the amount input to its native spinner decoration).
//     Grid's fixed column tracks can't be misread the same way. The
//     currency select is narrower still and the amount input's native
//     number-spinner buttons are hidden.
//   - The schedule popover is now `position: fixed` (computed from the
//     dialog's and the clock button's bounding rects) instead of
//     `absolute bottom-full` — the dialog's own `overflow-hidden`
//     (needed for its rounded corners) was clipping the popover's top
//     whenever it grew taller than the gap above the footer, and no
//     amount of scrolling could reveal the clipped part — "не можу
//     проскроллити і побачити питання до відгуку, поки відкритий
//     календар." The native <input type="date"> is also gone, replaced
//     by a month/year <select> pair (picking a year is one click) plus a
//     day grid — "рік складно вибрати і написати вручну, дай інший
//     пікер." The footer's own Save-draft/Post buttons now switch to
//     Cancel/Schedule while the popover is open instead of showing a
//     second, redundant primary button — "не треба друга синя кнопка."
//
// 2026-08-29, round 4 (Aleksandr reproduced both "не вдалося завантажити
// фото" and "щось пішло не так" live; Vercel's function logs named the
// actual cause — round 3's guess wasn't it): every one of these routes'
// callAsVisitor() call came back 401 `{"code":"TOKEN_VALIDATION_ERROR",
// "message":"Token revoked."}`, and the External-APIs trace showed
// auth.refreshToken WAS attempted — its own retry attempt just also got
// a 401, which bubbled up as a raw, unrecognized A1ApiError (502) instead
// of the existing not_signed_in handling ever kicking in. Fixed in
// lib/a1/visitor-call.ts: callAsVisitor now catches a 401 from either the
// refresh call itself or the retried original call and converts it to
// NoSessionError — a revoked refresh token can never succeed no matter
// how many times it's retried, so there's nothing to gain by surfacing
// the raw error instead of routing through the same "session's dead,
// sign back in" path a missing cookie already takes. All 9 routes using
// callAsVisitor now also clearSession() on that path, so the dead cookie
// doesn't keep tripping the same failure on every later call. The photo
// upload path (handleFileSelected(), previously only checked by
// submit()) now redirects to /sign-in the same way, via a small shared
// isNotSignedIn() helper.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import type { Category, Tag, Currency } from "@/lib/a1/datasets";
import { translateTagLabel, translateCategoryLabel } from "@/components/label-translations";
import { LottiePlayer } from "@/components/lottie-player";
import { formatBytes, formatRelativeTime } from "@/lib/format";

type PostObject = "post-job-employing" | "post-job-seeking";

// Deliberately local/self-contained rather than importing PostInputMoney
// from lib/a1/schemas.ts — this file only ever produces two of its four
// variants (Range isn't built here, see header comment), so a narrower
// local type is enough and keeps this client bundle from depending on
// the server-side schema module for anything but the two small dataset
// types above (already an established pattern — see
// app/onboarding/profile/profile-setup-form.tsx's own `type Category`
// import from the same file).
type MoneyInput = { unitAmount: number; currency: string; object: "post-money-single" | "post-money-single-annual" };
// A Range/RangeAnnual salary can only exist on a post created some other
// way (this editor never produces one) — kept loosely typed here since
// the only thing this file does with it is pass it through untouched
// when the user hasn't touched the salary fields (buildMoney() below),
// never render or interpret its shape.
type ExistingMoney = MoneyInput | (Record<string, unknown> & { object: string }) | null;

// Passed straight through to posts.createPost/updatePost's `media`
// array untouched — this file never needs to interpret a MediaDocument
// beyond the three fields it renders a thumbnail from.
type MediaDoc = { _id: string; fileReference: string; object: "media-document" } & Record<string, unknown>;

type MediaItem = { doc: MediaDoc; previewUrl: string };

export type EditablePost = {
  id: string;
  title: string;
  content: string;
  object: PostObject;
  links: { title: string; url: string }[];
  location: { id: number; label: string } | null;
  categories: number[];
  tags: string[];
  money: ExistingMoney;
  media: MediaDoc[];
  // Optional: whether this post is still a draft (never published). Only
  // components/post-owner-menu.tsx's MinePost currently supplies this
  // (from /api/posts/mine) -- see the isEditingPublishedPost comment
  // below in this file for why the footer's Save-draft/Schedule buttons
  // read it. Undefined (e.g. mode="create", or any future caller that
  // doesn't have it) is treated the same as a draft -- never hides the
  // buttons on missing information.
  isDraft?: boolean;
};

type Bootstrap = {
  categories: Category[];
  currencies: Currency[];
  hiringTags: Tag[];
  seekingTags: Tag[];
};

const EMPTY_BOOTSTRAP: Bootstrap = { categories: [], currencies: [], hiringTags: [], seekingTags: [] };

const TITLE_MIN = 10;
// Aleksandr, 2026-08-30: "запостил такой заголовок, длинный, и не мог
// запостить пост... надо вытянуть фактически максимум количества
// символов на заголовок [из моб. приложения] и поставить также в
// десктопе." The live failure (Vercel logs, 2026-08-29 23:29 UTC) was
// just a bare 500 INTERNAL_SERVER_ERROR from posts.createPost with no
// validation message or character count in it, so 120 first went in as
// an unconfirmed placeholder -- Aleksandr has since checked the mobile
// app's own input against this and confirmed 120 is right ("да, вроде
// такой лимит и есть"), so this is now a real confirmed limit like
// every other PLAN.md fix in this file, not a guess.
const TITLE_MAX = 120;
const DESCRIPTION_MIN = 30;
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 300 * 1024;
const MAX_PHOTO_DIMENSION = 1600;

// Splits one kind's flat tag list into the three visual buckets the
// reference screenshots show. Matched on the same English `tag.text`
// values components/filters-form.tsx's own TAG_LABEL_TRANSLATIONS table
// already keys on — anything that doesn't match either bucket still
// renders, just in "other", so an unrecognized/renamed/new tag from the
// backend is never silently dropped.
const WORK_TYPE_TAGS = new Set(["Remote", "On-site", "Hybrid"]);
const EMPLOYMENT_TYPE_TAGS = new Set(["Full-time", "Part-time", "Contract"]);
// "1 yr. exp." is the only experience tag with "yr"/"exp" in its text —
// live data confirmed (2026-08-29) that 2/3/4/5+ years come back as
// bare "2", "3", "4", "5+", so a bare-number(+) string is ALSO treated
// as an experience tag, not just anything mentioning "yr"/"exp".
// 2026-08-29 round 3: "5+" alone still landed in Other tags — the live
// string turned out to be "5 +" (a space before the plus), which the
// first version of this regex didn't tolerate. Whitespace is stripped
// before testing so any spacing variant matches the same way.
function isExperienceTag(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  return /\bexp\.?\b/i.test(text) || /\byr\.?\b/i.test(text) || /^\d+\+?$/.test(compact);
}

// 2026-08-29: same "IT first" fix app/onboarding/profile/profile-setup-
// form.tsx already applies to its own industry picker — IT is the
// single most common answer on a jobs platform. `text` carries a
// leading emoji ("💾 IT"), so match on letters only.
function sortItFirst(categories: Category[]): Category[] {
  const itIndex = categories.findIndex((c) => c.text.replace(/[^a-zA-Z]/g, "").toUpperCase() === "IT");
  if (itIndex <= 0) return categories;
  return [categories[itIndex]!, ...categories.slice(0, itIndex), ...categories.slice(itIndex + 1)];
}

// Client-side compression before a photo ever reaches upload.create —
// "фото повинні стискатися і зберігатися в розмірі макс 200-300 кб на
// шт." Resizes to a 1600px long edge and re-encodes as JPEG, stepping
// quality down until under ~280KB (a little under the 300KB ask, to
// leave headroom). Falls back to the original file untouched on any
// failure (unsupported browser, decode error) — a slightly larger photo
// is a much smaller problem than a photo that silently never uploads.
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
      const scale = MAX_PHOTO_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    let blob: Blob | null = null;
    let quality = 0.85;
    for (let i = 0; i < 6; i++) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob || blob.size <= MAX_PHOTO_BYTES || quality <= 0.35) break;
      quality -= 0.15;
    }
    if (!blob) return file;
    const base = file.name.replace(/\.\w+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// 2026-08-29 round 4: shared by handleFileSelected() and submit() —
// both hit the same backend routes, both can hit the same "session's
// refresh token was itself revoked" case (see lib/a1/visitor-call.ts's
// callAsVisitor), and both should react the same way: send the visitor
// back to sign in instead of a generic "couldn't upload"/"something went
// wrong" that gives no path forward.
function isNotSignedIn(data: unknown): boolean {
  return typeof data === "object" && data !== null && (data as { message?: unknown }).message === "not_signed_in";
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function toTimeInputValue(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// 2026-08-29 round 3: "picker даты стоит старый, він типу не сильно
// зручний, мілкий, там складно вибрати рік" — the OS-native calendar
// attached to <input type="date"> can't be restyled or repositioned (it
// rendered off-screen below the modal, see round 2's header note above)
// and makes picking a year across a click-tiny month-by-month stepper.
// Replaced with a fully custom month+year <select> pair (jumping to any
// valid year is one click) plus a day grid, both driven by these small
// helpers rather than any native date-picker UI. Locale-aware via Intl
// rather than a hand-written month/weekday name table for all 9
// languages, which would be easy to get subtly wrong.
const LOCALE_BCP47: Record<Locale, string> = {
  uk: "uk-UA", en: "en-US", ru: "ru-RU", de: "de-DE", es: "es-ES",
  fr: "fr-FR", pl: "pl-PL", ptBR: "pt-BR", zh: "zh-CN",
};
function monthOnlyLabel(year: number, month: number, lang: Locale): string {
  try {
    return new Intl.DateTimeFormat(LOCALE_BCP47[lang], { month: "long" }).format(new Date(year, month, 1));
  } catch {
    return String(month + 1);
  }
}
function weekdayShortNames(lang: Locale): string[] {
  try {
    const fmt = new Intl.DateTimeFormat(LOCALE_BCP47[lang], { weekday: "short" });
    const days: string[] = [];
    // 2024-01-01 was a Monday — a fixed Mon-first reference week so the
    // header always lines up with the Monday-first day grid below.
    for (let i = 0; i < 7; i++) days.push(fmt.format(new Date(2024, 0, 1 + i)));
    return days;
  } catch {
    return ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  }
}
function buildCalendarCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Sun=0..Sat=6 -> Mon-first offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

type StringKey =
  | "createTitle" | "editTitle" | "close"
  | "offerJob" | "findJob"
  | "titleLabel" | "titlePlaceholderHiring" | "titlePlaceholderSeeking" | "titleTooShort"
  | "descriptionLabel" | "descriptionTipsHiring" | "descriptionTipsSeeking" | "descriptionTooShort"
  | "locationLabel" | "locationPlaceholder" | "locationEmpty" | "requiredField"
  | "categoryLabel" | "categoryPlaceholder" | "categoryEmpty"
  | "linkLabel" | "linkPlaceholder" | "linkInvalid"
  | "workType" | "employmentType" | "experience" | "otherTags"
  | "customTagPlaceholder" | "addCount"
  | "salaryLabel" | "salaryPlaceholder" | "perMonth" | "perYear"
  | "questionsLabel" | "questionPlaceholder"
  | "photoLabel" | "photoTooMany" | "photoTooBig" | "photoUploadFailed" | "photoUploadQuotaExceeded"
  | "saveDraft" | "draftSaved" | "post" | "saveChanges" | "schedulePost"
  | "scheduleConfirm" | "scheduleActionCaps" | "scheduleCancel" | "scheduleTimeLabel"
  | "scheduleToday" | "scheduleTomorrow" | "scheduleIn3Days" | "scheduleInWeek"
  | "scheduleInvalid" | "errorGeneric" | "requiredHint"
  | "closeConfirmTitle" | "closeConfirmBody" | "continueEditing" | "discardClose"
  | "postingLabel" | "updatingLabel" | "schedulingLabel"
  | "deletePost" | "confirmDeleteTitle" | "confirmDeleteBody" | "deleteFailed";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  createTitle: { uk: "Новий допис", en: "New post", ru: "Новая публикация", de: "Neuer Beitrag", es: "Nueva publicación", fr: "Nouvelle publication", pl: "Nowy post", ptBR: "Nova publicação", zh: "新帖子" },
  editTitle: { uk: "Редагувати допис", en: "Edit post", ru: "Редактировать публикацию", de: "Beitrag bearbeiten", es: "Editar publicación", fr: "Modifier la publication", pl: "Edytuj post", ptBR: "Editar publicação", zh: "编辑帖子" },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭" },
  offerJob: { uk: "Пропоную роботу", en: "Offer a job", ru: "Предлагаю работу", de: "Job anbieten", es: "Ofrecer empleo", fr: "Offrir un emploi", pl: "Oferuję pracę", ptBR: "Oferecer emprego", zh: "提供工作" },
  findJob: { uk: "Шукаю роботу", en: "Find a job", ru: "Ищу работу", de: "Job suchen", es: "Buscar empleo", fr: "Chercher un emploi", pl: "Szukam pracy", ptBR: "Procurar emprego", zh: "找工作" },
  titleLabel: { uk: "Заголовок", en: "Title", ru: "Заголовок", de: "Titel", es: "Título", fr: "Titre", pl: "Tytuł", ptBR: "Título", zh: "标题" },
  titlePlaceholderHiring: { uk: "Наприклад, Frontend-розробник", en: "e.g. Frontend Developer", ru: "Например, Frontend-разработчик", de: "z. B. Frontend-Entwickler", es: "p. ej. Desarrollador Frontend", fr: "p. ex. Développeur Frontend", pl: "np. Programista Frontend", ptBR: "ex.: Desenvolvedor Frontend", zh: "例如：前端开发工程师" },
  titlePlaceholderSeeking: { uk: "Наприклад, Frontend-розробник шукає роботу", en: "e.g. Frontend Developer looking for work", ru: "Например, Frontend-разработчик ищет работу", de: "z. B. Frontend-Entwickler sucht Arbeit", es: "p. ej. Desarrollador Frontend busca empleo", fr: "p. ex. Développeur Frontend cherche un emploi", pl: "np. Programista Frontend szuka pracy", ptBR: "ex.: Desenvolvedor Frontend procura emprego", zh: "例如：前端开发工程师求职" },
  titleTooShort: { uk: "Мінімум {n} символів", en: "Minimum length is {n} characters", ru: "Минимум {n} символов", de: "Mindestens {n} Zeichen", es: "Mínimo {n} caracteres", fr: "Minimum {n} caractères", pl: "Minimum {n} znaków", ptBR: "Mínimo de {n} caracteres", zh: "最少{n}个字符" },
  descriptionLabel: { uk: "Опис", en: "Description", ru: "Описание", de: "Beschreibung", es: "Descripción", fr: "Description", pl: "Opis", ptBR: "Descrição", zh: "描述" },
  descriptionTipsHiring: { uk: "Опишіть обов'язки, вимоги та умови роботи", en: "Describe responsibilities, requirements and working conditions", ru: "Опишите обязанности, требования и условия работы", de: "Beschreiben Sie Aufgaben, Anforderungen und Arbeitsbedingungen", es: "Describe responsabilidades, requisitos y condiciones", fr: "Décrivez les responsabilités, exigences et conditions", pl: "Opisz obowiązki, wymagania i warunki pracy", ptBR: "Descreva responsabilidades, requisitos e condições", zh: "描述职责、要求和工作条件" },
  descriptionTipsSeeking: { uk: "Розкажіть про свій досвід, навички та побажання", en: "Tell us about your experience, skills and preferences", ru: "Расскажите о своём опыте, навыках и пожеланиях", de: "Erzählen Sie von Ihrer Erfahrung, Fähigkeiten und Präferenzen", es: "Cuéntanos tu experiencia, habilidades y preferencias", fr: "Parlez de votre expérience, compétences et préférences", pl: "Opowiedz o doświadczeniu, umiejętnościach i preferencjach", ptBR: "Fale sobre sua experiência, habilidades e preferências", zh: "介绍你的经验、技能和偏好" },
  descriptionTooShort: { uk: "Мінімум {n} символів", en: "Minimum length is {n} characters", ru: "Минимум {n} символов", de: "Mindestens {n} Zeichen", es: "Mínimo {n} caracteres", fr: "Minimum {n} caractères", pl: "Minimum {n} znaków", ptBR: "Mínimo de {n} caracteres", zh: "最少{n}个字符" },
  locationLabel: { uk: "Локація", en: "Location", ru: "Локация", de: "Standort", es: "Ubicación", fr: "Lieu", pl: "Lokalizacja", ptBR: "Localização", zh: "地点" },
  locationPlaceholder: { uk: "Пошук міста", en: "Search for a city", ru: "Поиск города", de: "Stadt suchen", es: "Buscar ciudad", fr: "Rechercher une ville", pl: "Szukaj miasta", ptBR: "Buscar cidade", zh: "搜索城市" },
  locationEmpty: { uk: "Нічого не знайдено", en: "No matches", ru: "Ничего не найдено", de: "Keine Treffer", es: "Sin resultados", fr: "Aucun résultat", pl: "Brak wyników", ptBR: "Nenhum resultado", zh: "无匹配结果" },
  requiredField: { uk: "Обов'язкове поле", en: "Required field", ru: "Обязательное поле", de: "Pflichtfeld", es: "Campo obligatorio", fr: "Champ requis", pl: "Pole wymagane", ptBR: "Campo obrigatório", zh: "必填字段" },
  categoryLabel: { uk: "Категорія", en: "Category", ru: "Категория", de: "Kategorie", es: "Categoría", fr: "Catégorie", pl: "Kategoria", ptBR: "Categoria", zh: "分类" },
  categoryPlaceholder: { uk: "Пошук категорії", en: "Search categories", ru: "Поиск категории", de: "Kategorie suchen", es: "Buscar categoría", fr: "Rechercher une catégorie", pl: "Szukaj kategorii", ptBR: "Buscar categoria", zh: "搜索分类" },
  categoryEmpty: { uk: "Нічого не знайдено", en: "No matches", ru: "Ничего не найдено", de: "Keine Treffer", es: "Sin resultados", fr: "Aucun résultat", pl: "Brak wyników", ptBR: "Nenhum resultado", zh: "无匹配结果" },
  linkLabel: { uk: "Посилання", en: "Link", ru: "Ссылка", de: "Link", es: "Enlace", fr: "Lien", pl: "Link", ptBR: "Link", zh: "链接" },
  linkPlaceholder: { uk: "https://...", en: "https://...", ru: "https://...", de: "https://...", es: "https://...", fr: "https://...", pl: "https://...", ptBR: "https://...", zh: "https://..." },
  linkInvalid: {
    uk: "Введіть коректне посилання (наприклад, site.com)", en: "Enter a valid link (e.g. site.com)", ru: "Введите корректную ссылку (например, site.com)",
    de: "Geben Sie einen gültigen Link ein (z. B. site.com)", es: "Introduce un enlace válido (p. ej., site.com)", fr: "Saisissez un lien valide (ex. site.com)",
    pl: "Wpisz poprawny link (np. site.com)", ptBR: "Insira um link válido (ex.: site.com)", zh: "请输入有效链接（例如 site.com）",
  },
  workType: { uk: "Формат роботи", en: "Work type", ru: "Формат работы", de: "Arbeitsform", es: "Modalidad", fr: "Mode de travail", pl: "Tryb pracy", ptBR: "Modalidade", zh: "工作方式" },
  employmentType: { uk: "Тип зайнятості", en: "Employment type", ru: "Тип занятости", de: "Beschäftigungsart", es: "Tipo de empleo", fr: "Type de contrat", pl: "Rodzaj zatrudnienia", ptBR: "Tipo de contrato", zh: "雇佣类型" },
  experience: { uk: "Досвід", en: "Experience", ru: "Опыт", de: "Erfahrung", es: "Experiencia", fr: "Expérience", pl: "Doświadczenie", ptBR: "Experiência", zh: "经验" },
  otherTags: { uk: "Інші теги", en: "Other tags", ru: "Другие теги", de: "Weitere Tags", es: "Otras etiquetas", fr: "Autres tags", pl: "Inne tagi", ptBR: "Outras tags", zh: "其他标签" },
  customTagPlaceholder: { uk: "Ваш тег...", en: "Your tag...", ru: "Ваш тег...", de: "Ihr Tag...", es: "Tu etiqueta...", fr: "Votre tag...", pl: "Twój tag...", ptBR: "Sua tag...", zh: "自定义标签..." },
  addCount: { uk: "Додати ({n})", en: "Add ({n})", ru: "Добавить ({n})", de: "Hinzufügen ({n})", es: "Añadir ({n})", fr: "Ajouter ({n})", pl: "Dodaj ({n})", ptBR: "Adicionar ({n})", zh: "添加 ({n})" },
  salaryLabel: { uk: "Зарплата", en: "Salary", ru: "Зарплата", de: "Gehalt", es: "Salario", fr: "Salaire", pl: "Wynagrodzenie", ptBR: "Salário", zh: "薪资" },
  salaryPlaceholder: { uk: "Сума", en: "Amount", ru: "Сумма", de: "Betrag", es: "Monto", fr: "Montant", pl: "Kwota", ptBR: "Valor", zh: "金额" },
  perMonth: { uk: "міс", en: "mo", ru: "мес", de: "Mon.", es: "mes", fr: "mois", pl: "mies.", ptBR: "mês", zh: "月" },
  perYear: { uk: "рік", en: "year", ru: "год", de: "Jahr", es: "año", fr: "an", pl: "rok", ptBR: "ano", zh: "年" },
  questionsLabel: { uk: "Питання до відгуку", en: "Application questions", ru: "Вопросы к отклику", de: "Bewerbungsfragen", es: "Preguntas de postulación", fr: "Questions de candidature", pl: "Pytania do zgłoszenia", ptBR: "Perguntas de candidatura", zh: "申请问题" },
  questionPlaceholder: { uk: "Питання...", en: "Question...", ru: "Вопрос...", de: "Frage...", es: "Pregunta...", fr: "Question...", pl: "Pytanie...", ptBR: "Pergunta...", zh: "问题..." },
  photoLabel: { uk: "Фото", en: "Photos", ru: "Фото", de: "Fotos", es: "Fotos", fr: "Photos", pl: "Zdjęcia", ptBR: "Fotos", zh: "照片" },
  photoTooMany: { uk: "Максимум 3 фото", en: "Up to 3 photos", ru: "Максимум 3 фото", de: "Maximal 3 Fotos", es: "Máximo 3 fotos", fr: "3 photos maximum", pl: "Maksymalnie 3 zdjęcia", ptBR: "Máximo de 3 fotos", zh: "最多3张照片" },
  photoTooBig: { uk: "Файл завеликий", en: "File is too large", ru: "Файл слишком большой", de: "Datei zu groß", es: "El archivo es demasiado grande", fr: "Fichier trop volumineux", pl: "Plik jest za duży", ptBR: "Arquivo muito grande", zh: "文件过大" },
  photoUploadFailed: { uk: "Не вдалося завантажити фото", en: "Couldn't upload photo", ru: "Не удалось загрузить фото", de: "Foto konnte nicht hochgeladen werden", es: "No se pudo subir la foto", fr: "Échec du téléversement", pl: "Nie udało się przesłać zdjęcia", ptBR: "Não foi possível enviar a foto", zh: "照片上传失败" },
  // 2026-09-02 (Aleksandr, native-app "Daily Uploads" screenshot: "лимит
  // по daily uploads на 1 пользователя 20 мб день, на вэбе надо тоже
  // прокинуть... Возьми всю логику с моб версии") -- lead-in only, the
  // byte figures + reset countdown are appended separately
  // (formatBytes/formatRelativeTime, lib/format.ts) where this is used.
  photoUploadQuotaExceeded: {
    uk: "Досягнуто денний ліміт завантажень", en: "Daily upload limit reached", ru: "Достигнут дневной лимит загрузок",
    de: "Tägliches Upload-Limit erreicht", es: "Límite diario de subidas alcanzado", fr: "Limite quotidienne de téléversement atteinte",
    pl: "Osiągnięto dzienny limit przesyłania", ptBR: "Limite diário de envio atingido", zh: "已达每日上传上限",
  },
  saveDraft: { uk: "Зберегти чернетку", en: "Save draft", ru: "Сохранить черновик", de: "Entwurf speichern", es: "Guardar borrador", fr: "Enregistrer le brouillon", pl: "Zapisz szkic", ptBR: "Salvar rascunho", zh: "保存草稿" },
  draftSaved: { uk: "Чернетку збережено", en: "Draft saved", ru: "Черновик сохранён", de: "Entwurf gespeichert", es: "Borrador guardado", fr: "Brouillon enregistré", pl: "Szkic zapisany", ptBR: "Rascunho salvo", zh: "草稿已保存" },
  post: { uk: "ОПУБЛІКУВАТИ", en: "POST", ru: "ОПУБЛИКОВАТЬ", de: "VERÖFFENTLICHEN", es: "PUBLICAR", fr: "PUBLIER", pl: "OPUBLIKUJ", ptBR: "PUBLICAR", zh: "发布" },
  saveChanges: { uk: "ЗБЕРЕГТИ", en: "SAVE", ru: "СОХРАНИТЬ", de: "SPEICHERN", es: "GUARDAR", fr: "ENREGISTRER", pl: "ZAPISZ", ptBR: "SALVAR", zh: "保存" },
  schedulePost: { uk: "Запланувати", en: "Schedule", ru: "Запланировать", de: "Planen", es: "Programar", fr: "Planifier", pl: "Zaplanuj", ptBR: "Agendar", zh: "定时发布" },
  scheduleConfirm: { uk: "Запланувати допис", en: "Schedule Post", ru: "Запланировать публикацию", de: "Beitrag planen", es: "Programar publicación", fr: "Planifier la publication", pl: "Zaplanuj post", ptBR: "Agendar publicação", zh: "定时发布帖子" },
  scheduleActionCaps: { uk: "ЗАПЛАНУВАТИ", en: "SCHEDULE", ru: "ЗАПЛАНИРОВАТЬ", de: "PLANEN", es: "PROGRAMAR", fr: "PLANIFIER", pl: "ZAPLANUJ", ptBR: "AGENDAR", zh: "定时发布" },
  scheduleCancel: { uk: "Скасувати", en: "Cancel", ru: "Отмена", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pl: "Anuluj", ptBR: "Cancelar", zh: "取消" },
  scheduleTimeLabel: { uk: "Час", en: "Time", ru: "Время", de: "Uhrzeit", es: "Hora", fr: "Heure", pl: "Godzina", ptBR: "Hora", zh: "时间" },
  scheduleToday: { uk: "Сьогодні ввечері", en: "This evening", ru: "Сегодня вечером", de: "Heute Abend", es: "Esta noche", fr: "Ce soir", pl: "Dziś wieczorem", ptBR: "Hoje à noite", zh: "今晚" },
  scheduleTomorrow: { uk: "Завтра вранці", en: "Tomorrow morning", ru: "Завтра утром", de: "Morgen früh", es: "Mañana por la mañana", fr: "Demain matin", pl: "Jutro rano", ptBR: "Amanhã de manhã", zh: "明天早上" },
  scheduleIn3Days: { uk: "Через 3 дні", en: "In 3 days", ru: "Через 3 дня", de: "In 3 Tagen", es: "En 3 días", fr: "Dans 3 jours", pl: "Za 3 dni", ptBR: "Em 3 dias", zh: "3天后" },
  scheduleInWeek: { uk: "Через тиждень", en: "In a week", ru: "Через неделю", de: "In einer Woche", es: "En una semana", fr: "Dans une semaine", pl: "Za tydzień", ptBR: "Em uma semana", zh: "一周后" },
  scheduleInvalid: { uk: "Оберіть коректну дату в межах року", en: "Pick a valid date within a year from now", ru: "Выберите корректную дату в пределах года", de: "Wählen Sie ein gültiges Datum innerhalb eines Jahres", es: "Elige una fecha válida dentro de un año", fr: "Choisissez une date valide dans l'année à venir", pl: "Wybierz poprawną datę w ciągu roku", ptBR: "Escolha uma data válida dentro de um ano", zh: "请选择一年内的有效日期" },
  errorGeneric: { uk: "Щось пішло не так. Спробуйте ще раз.", en: "Something went wrong. Please try again.", ru: "Что-то пошло не так. Попробуйте ещё раз.", de: "Etwas ist schiefgelaufen. Bitte erneut versuchen.", es: "Algo salió mal. Inténtalo de nuevo.", fr: "Une erreur est survenue. Réessayez.", pl: "Coś poszło nie tak. Spróbuj ponownie.", ptBR: "Algo deu errado. Tente novamente.", zh: "出了点问题，请重试。" },
  requiredHint: { uk: "Заповніть заголовок, опис, локацію і категорію", en: "Fill in title, description, location and category", ru: "Заполните заголовок, описание, локацию и категорию", de: "Titel, Beschreibung, Standort und Kategorie ausfüllen", es: "Completa título, descripción, ubicación y categoría", fr: "Renseignez titre, description, lieu et catégorie", pl: "Uzupełnij tytuł, opis, lokalizację i kategorię", ptBR: "Preencha título, descrição, localização e categoria", zh: "请填写标题、描述、地点和分类" },
  // Aleksandr, 2026-08-29 (3 screenshots of the native app's own flow):
  // "если я заполнил поля и случайно кликнул вне формы, форма должна
  // меня спросить 'сохранить черновик'... у нас там спрашивает сразу:
  // save to draft или типа continue" -- see isDirty/requestClose below.
  closeConfirmTitle: { uk: "Зберегти чернетку?", en: "Save as draft?", ru: "Сохранить черновик?", de: "Als Entwurf speichern?", es: "¿Guardar como borrador?", fr: "Enregistrer comme brouillon ?", pl: "Zapisać jako szkic?", ptBR: "Salvar como rascunho?", zh: "保存为草稿吗？" },
  closeConfirmBody: { uk: "Інакше вписані дані буде втрачено.", en: "Otherwise what you entered will be lost.", ru: "Иначе введённые данные будут потеряны.", de: "Andernfalls gehen Ihre Eingaben verloren.", es: "De lo contrario, se perderá lo que escribiste.", fr: "Sinon, les données saisies seront perdues.", pl: "W przeciwnym razie wpisane dane zostaną utracone.", ptBR: "Caso contrário, os dados inseridos serão perdidos.", zh: "否则已填写的内容将会丢失。" },
  continueEditing: { uk: "Продовжити редагування", en: "Continue editing", ru: "Продолжить редактирование", de: "Weiter bearbeiten", es: "Seguir editando", fr: "Continuer la modification", pl: "Kontynuuj edycję", ptBR: "Continuar editando", zh: "继续编辑" },
  // Aleksandr, 2026-08-30: "давай ещё кнопку добавим... если я просто
  // хочу закрыть, но ничего сохранять не хочу" -- a third option in the
  // same popover that discards everything and closes, bypassing the
  // draft save entirely (calls onClose() directly, same as the no-op
  // "not dirty" path in requestClose() above).
  discardClose: { uk: "Закрити без збереження", en: "Close without saving", ru: "Закрыть без сохранения", de: "Ohne Speichern schließen", es: "Cerrar sin guardar", fr: "Fermer sans enregistrer", pl: "Zamknij bez zapisywania", ptBR: "Fechar sem salvar", zh: "不保存并关闭" },
  // Aleksandr, 2026-08-30 (native app screenshot + a cat Lottie sticker):
  // "хочу когда мы создаем пост чтобы страница как бы релоадилась и
  // показывала нам типа posting... и этого же кота мы можем
  // использовать на апдейтинг" -- see the postingBannerLabel usage
  // further down for which of these two shows.
  postingLabel: { uk: "Публікується...", en: "Posting...", ru: "Публикуется...", de: "Wird veröffentlicht...", es: "Publicando...", fr: "Publication en cours...", pl: "Publikowanie...", ptBR: "Publicando...", zh: "发布中..." },
  updatingLabel: { uk: "Оновлюється...", en: "Updating...", ru: "Обновляется...", de: "Wird aktualisiert...", es: "Actualizando...", fr: "Mise à jour en cours...", pl: "Aktualizowanie...", ptBR: "Atualizando...", zh: "更新中..." },
  schedulingLabel: { uk: "Планується...", en: "Scheduling...", ru: "Планируется...", de: "Wird geplant...", es: "Programando...", fr: "Planification en cours...", pl: "Planowanie...", ptBR: "Agendando...", zh: "计划中..." },
  // 2026-08-30 (Aleksandr, live screenshot of the Edit modal on an
  // actual existing draft): "вместо 'зберегти чернетку', если это уже
  // чернетка - надо поставить кнопку 'удалить'... надо ж добавить ще
  // одну кнопку 'опублікувати'... итого: Запланувати / Видалити /
  // Зберегти / Опублікувати" -- see isEditingExistingDraft's own
  // comment further down for the exact footer this produces. Text
  // matches components/post-owner-menu.tsx's existing Delete strings
  // verbatim (same action, same confirm-before-destructive pattern),
  // not reinvented here.
  deletePost: { uk: "Видалити", en: "Delete", ru: "Удалить", de: "Löschen", es: "Eliminar", fr: "Supprimer", pl: "Usuń", ptBR: "Excluir", zh: "删除" },
  confirmDeleteTitle: { uk: "Точно видалити чернетку?", en: "Delete this draft for good?", ru: "Точно удалить черновик?", de: "Diesen Entwurf wirklich löschen?", es: "¿Eliminar este borrador definitivamente?", fr: "Supprimer définitivement ce brouillon ?", pl: "Na pewno usunąć ten szkic?", ptBR: "Excluir este rascunho definitivamente?", zh: "确定要永久删除这份草稿吗？" },
  confirmDeleteBody: { uk: "Цю дію не можна скасувати.", en: "This can't be undone.", ru: "Это действие нельзя отменить.", de: "Das kann nicht rückgängig gemacht werden.", es: "Esta acción no se puede deshacer.", fr: "Cette action est irréversible.", pl: "Tej czynności nie można cofnąć.", ptBR: "Essa ação não pode ser desfeita.", zh: "此操作无法撤销。" },
  deleteFailed: { uk: "Не вдалося видалити", en: "Couldn't delete", ru: "Не удалось удалить", de: "Löschen fehlgeschlagen", es: "No se pudo eliminar", fr: "Échec de la suppression", pl: "Nie udało się usunąć", ptBR: "Não foi possível excluir", zh: "删除失败" },
};

function t(key: StringKey, lang: Locale, vars?: Record<string, string | number>): string {
  let s = STRINGS[key][lang];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/30 dark:border-neutral-700 dark:bg-black dark:text-neutral-100";
const invalidInputClass =
  "w-full rounded-xl border border-red-400 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-700 dark:bg-black dark:text-neutral-100";
const labelClass = "text-xs font-medium text-neutral-500 dark:text-neutral-400";
const pillClass = (active: boolean) =>
  "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
  (active
    ? "border-accent bg-accent/10 text-accent"
    : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800");

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
// 2026-08-30: same visual weight/stroke as ClockIcon right above (both
// sit in the same round icon-button slot in the footer) -- see
// isEditingExistingDraft's own comment further down for where this is
// used.
function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
function PlusSquareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
// 2026-08-29: "де є дропдауни ставь стрілки вниз" — same chevron style
// app/onboarding/profile/profile-setup-form.tsx already uses for its
// own searchable dropdown, rotated 180° when open.
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={"pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 transition-transform dark:text-neutral-500 " + (open ? "rotate-180" : "")}
    >
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={"animate-spin " + (className ?? "h-4 w-4 text-neutral-400")} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type ScheduleTarget = { date: string; time: string };

export function PostEditor({
  mode,
  initialPost,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initialPost?: EditablePost;
  onClose: () => void;
  /** Called after EVERY successful save (draft, post, or schedule) —
   *  purely "data changed, refresh whatever list is behind you." Never
   *  closes the dialog itself; only onClose does that. */
  onSaved?: () => void;
}) {
  const lang = useActiveLocale();
  const [bootstrap, setBootstrap] = useState<Bootstrap>(EMPTY_BOOTSTRAP);

  // The id of the post this session is actually writing to. Starts as
  // initialPost's id in edit mode, null in create mode — but the FIRST
  // successful save in create mode (draft or otherwise) fills this in,
  // so every subsequent save in the same dialog session updates that
  // one post instead of minting a new one on every "Save draft" click.
  const [savedPostId, setSavedPostId] = useState<string | null>(initialPost?.id ?? null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  // 2026-09-02 (Aleksandr: "я пробую опять выходить, оно мне опять
  // спрашивает: Сберегти чернетку. Получается какая-то херня") --
  // isDirty below used to mean "any field is non-empty," which stays
  // true forever once you've typed anything, even the INSTANT after a
  // successful save with nothing changed since. This snapshots the
  // fields a save actually wrote (set right after every successful
  // submit() below) so isDirty can ask the right question after the
  // first save: not "is there content" but "is there content that
  // hasn't been saved yet."
  const savedSnapshotRef = useRef<string | null>(null);
  // Aleksandr, 2026-08-29: close-with-unsaved-content confirmation --
  // see isDirty and requestClose() further down for the full story.
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  // 2026-08-30: delete-from-within-the-editor, only reachable when
  // isEditingExistingDraft further down is true -- see that constant's
  // own comment for the full footer this feeds.
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const [object, setObject] = useState<PostObject>(initialPost?.object ?? "post-job-employing");
  const [title, setTitle] = useState(initialPost?.title ?? "");
  // See TITLE_MAX's own comment -- belt-and-suspenders clamp for any
  // path that sets `title` past the limit without going through the
  // input's own onChange handler (dictation/composition input on
  // mobile has been observed doing exactly that).
  useEffect(() => {
    if (title.length > TITLE_MAX) setTitle(title.slice(0, TITLE_MAX));
  }, [title]);
  const [content, setContent] = useState(initialPost?.content ?? "");

  const [location, setLocation] = useState<{ id: number; label: string } | null>(initialPost?.location ?? null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<{ id: number; label: string }[]>([]);
  const [locationPending, setLocationPending] = useState(false);
  const [locationSearched, setLocationSearched] = useState(false);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationRequestIdRef = useRef(0);

  const [category, setCategory] = useState<Category | null>(null);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryDropUp, setCategoryDropUp] = useState(false);
  const [categoryMaxHeight, setCategoryMaxHeight] = useState(260);

  const [linkUrl, setLinkUrl] = useState(initialPost?.links?.[0]?.url ?? "");

  const [selectedTags, setSelectedTags] = useState<string[]>(initialPost?.tags ?? []);
  const [customTagInput, setCustomTagInput] = useState("");

  const initialMoneyIsSimple =
    initialPost?.money?.object === "post-money-single" || initialPost?.money?.object === "post-money-single-annual";
  const [salaryAmount, setSalaryAmount] = useState(
    initialMoneyIsSimple ? String((initialPost!.money as MoneyInput).unitAmount) : "",
  );
  const [salaryCurrency, setSalaryCurrency] = useState(
    initialMoneyIsSimple ? (initialPost!.money as MoneyInput).currency : "",
  );
  const [salaryAnnual, setSalaryAnnual] = useState(initialPost?.money?.object === "post-money-single-annual");

  const [questions, setQuestions] = useState<string[]>([]);
  const [questionInput, setQuestionInput] = useState("");

  const [media, setMedia] = useState<MediaItem[]>(
    (initialPost?.media ?? []).map((doc) => ({ doc, previewUrl: `/api/media/${doc._id}?ref=${encodeURIComponent(doc.fileReference)}` })),
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const now = useMemo(() => new Date(), []);
  const maxScheduleDate = useMemo(() => {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }, [now]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleTarget>({ date: toDateInputValue(now), time: toTimeInputValue(now) });
  // The month/year the calendar grid is currently showing — independent
  // of `schedule.date` so browsing to a different month doesn't move the
  // actual selection until a day is clicked. Synced from schedule.date
  // whenever the popover opens (see the effect below) and updated
  // directly by the quick-pick buttons.
  const [calYear, setCalYear] = useState(() => now.getFullYear());
  const [calMonth, setCalMonth] = useState(() => now.getMonth());
  // 2026-08-29 round 3: the schedule popover now renders via
  // `position: fixed` (computed from these refs) instead of being
  // absolutely positioned inside the dialog — the dialog needs
  // `overflow-hidden` for its rounded corners, which was silently
  // clipping the popover whenever it grew taller than the space between
  // the footer and the top of the dialog ("не можу питання до відгуку
  // проскроллити вище" — the popover's own top was cut off, not a
  // scrolling problem). `position: fixed` escapes that clipping
  // entirely since neither ancestor uses a transform/filter.
  const dialogRef = useRef<HTMLDivElement>(null);
  const scheduleButtonRef = useRef<HTMLButtonElement>(null);
  const [schedulePos, setSchedulePos] = useState<{ left: number; right: number; bottom: number; maxHeight: number } | null>(null);

  const [pendingAction, setPendingAction] = useState<"post" | "draft" | "schedule" | null>(null);
  // Aleksandr, 2026-08-30 ("не было анимации... прогресс-бар, постинг
  // надписи, всё такое. Этого не было"): the banner below WAS mounting
  // -- but posts.createPost is often faster than the ~250KB posting-
  // cat.json can fetch+parse (components/lottie-player.tsx's own
  // 2026-08-29 finding: these Lottie JSON files take multiple seconds
  // on a cold fetch), so the whole banner (including the still-loading,
  // still-invisible cat) could mount and unmount again before a human
  // eye registers it. pendingSinceRef timestamps the moment the banner
  // appears; submit() holds it on screen for at least MIN_BANNER_MS
  // regardless of how fast the actual API call was.
  const pendingSinceRef = useRef<number | null>(null);
  const MIN_BANNER_MS = 900;
  const [error, setError] = useState<string | null>(null);

  // 2026-08-29 round 3: "у меня сразу снизу пишет три ошибки... это
  // трабл" — the min-length/required hints below used to render the
  // instant the dialog opened, before the user had typed a single
  // character. Each field's hint (and its red border) now waits for
  // that field to be "touched" (blurred at least once), and clicking a
  // submit button while something's missing touches everything at once
  // — matching the reference screenshot's "tried to submit, here's
  // what's wrong" moment instead of greeting an empty form with red text.
  const [titleTouched, setTitleTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [locationTouched, setLocationTouched] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [linkTouched, setLinkTouched] = useState(false);
  function markAllTouched() {
    setTitleTouched(true);
    setDescriptionTouched(true);
    setLocationTouched(true);
    setCategoryTouched(true);
    setLinkTouched(true);
  }

  // Aleksandr, 2026-08-30, same finding as pendingSinceRef above: warm
  // the posting-cat animation's own fetch + lottie-web module import as
  // soon as the editor opens, not only once Post/Save is actually
  // clicked -- by the time isSubmittingPost's banner mounts, this is
  // very likely already sitting in the browser's HTTP cache and the
  // module already loaded, instead of racing the create/update request
  // from a cold start. Fire-and-forget: components/lottie-player.tsx
  // does its own fetch+import too and already degrades silently if
  // either fails, so there is nothing to await or handle here.
  useEffect(() => {
    import("lottie-web").catch(() => {});
    fetch("/animations/posting-cat.json").catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/post-editor/bootstrap")
      .then((r) => r.json())
      .then((data) => {
        const categories = sortItFirst(data.categories ?? []);
        setBootstrap({
          categories,
          currencies: data.currencies ?? [],
          hiringTags: data.hiringTags ?? [],
          seekingTags: data.seekingTags ?? [],
        });
        if (initialPost && initialPost.categories.length > 0) {
          const found = (categories as Category[]).find((c) => c.value === initialPost.categories[0]);
          if (found) setCategory(found);
        }
        if (!salaryCurrency && data.currencies?.[0]) setSalaryCurrency(data.currencies[0].value);
      })
      .catch(() => {});
    // Runs once on mount only — bootstrap data doesn't change per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tagsForKind = object === "post-job-employing" ? bootstrap.hiringTags : bootstrap.seekingTags;
  const workTypeTags = tagsForKind.filter((tg) => WORK_TYPE_TAGS.has(tg.text));
  const employmentTypeTags = tagsForKind.filter((tg) => EMPLOYMENT_TYPE_TAGS.has(tg.text));
  const experienceTags = tagsForKind.filter((tg) => isExperienceTag(tg.text));
  const otherTags = tagsForKind.filter(
    (tg) => !WORK_TYPE_TAGS.has(tg.text) && !EMPLOYMENT_TYPE_TAGS.has(tg.text) && !isExperienceTag(tg.text),
  );
  const datasetTagValues = useMemo(() => new Set(tagsForKind.map((tg) => tg.value)), [tagsForKind]);
  const customTags = selectedTags.filter((tg) => !datasetTagValues.has(tg));

  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    const list = q ? bootstrap.categories.filter((c) => c.text.toLowerCase().includes(q)) : bootstrap.categories;
    return list.slice(0, 50);
  }, [bootstrap.categories, categoryQuery]);

  function toggleTag(value: string) {
    setSelectedTags((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function addCustomTag() {
    const value = customTagInput.trim();
    if (!value || customTags.length >= 5 || selectedTags.includes(value)) return;
    setSelectedTags((prev) => [...prev, value]);
    setCustomTagInput("");
  }

  function removeCustomTag(value: string) {
    setSelectedTags((prev) => prev.filter((v) => v !== value));
  }

  function addQuestion() {
    const value = questionInput.trim();
    if (!value || questions.length >= 5) return;
    setQuestions((prev) => [...prev, value]);
    setQuestionInput("");
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function searchLocationsClient(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setLocationResults([]);
      setLocationPending(false);
      setLocationSearched(false);
      return;
    }
    const requestId = ++locationRequestIdRef.current;
    setLocationPending(true);
    try {
      const res = await fetch(`/api/locations?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (requestId === locationRequestIdRef.current) {
        // 2026-08-29 (PLAN.md §6.32): posts.createPost rejects a
        // country-level location outright -- drop those here so a
        // visitor can never pick one that would 400 on submit.
        // components/filters-form.tsx's own location search keeps every
        // result (filtering the feed by a whole country is legitimate),
        // this is the one call site that needs the narrower list.
        const all: { id: number; label: string; hasCity?: boolean }[] = Array.isArray(data.results) ? data.results : [];
        setLocationResults(all.filter((loc) => loc.hasCity !== false));
        setLocationSearched(true);
      }
    } catch {
      if (requestId === locationRequestIdRef.current) {
        setLocationResults([]);
        setLocationSearched(true);
      }
    } finally {
      if (requestId === locationRequestIdRef.current) setLocationPending(false);
    }
  }

  function onLocationQueryChange(value: string) {
    setLocationQuery(value);
    setLocationSearched(false);
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    locationDebounceRef.current = setTimeout(() => searchLocationsClient(value), 350);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (media.length >= MAX_PHOTOS) {
      setError(t("photoTooMany", lang));
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError(t("photoTooBig", lang));
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const createRes = await fetch("/api/upload/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimetype: compressed.type || "application/octet-stream", bytes: compressed.size }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.ok || !createData.result?.url) {
        if (isNotSignedIn(createData)) {
          window.location.href = "/sign-in?reason=create-post";
          return;
        }
        console.error("[post-editor] photo upload/create failed", { status: createRes.status, message: createData?.message, detail: createData?.detail });
        // Aleksandr, 2026-09-02: same 20MB/day-per-user quota the native
        // app enforces (app/api/upload/create/route.ts) -- shown as an
        // actual reason instead of the generic upload-failed message.
        if (createData?.message === "quota_exceeded" && createData.usage) {
          const usage = createData.usage as { usedBytes: number; limitBytes: number; resetAt: number };
          const resetsIn = formatRelativeTime(new Date(usage.resetAt * 1000), lang);
          setError(`${t("photoUploadQuotaExceeded", lang)} (${formatBytes(usage.usedBytes)} / ${formatBytes(usage.limitBytes)}, ${resetsIn})`);
        } else {
          setError(t("photoUploadFailed", lang));
        }
        setUploading(false);
        return;
      }
      const { id, url, fields } = createData.result as { id: string; url: string; fields: Record<string, string> };
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value);
      formData.append("file", compressed);
      const uploadRes = await fetch(url, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        setError(t("photoUploadFailed", lang));
        setUploading(false);
        return;
      }
      const confirmRes = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok || !confirmData.ok) {
        if (isNotSignedIn(confirmData)) {
          window.location.href = "/sign-in?reason=create-post";
          return;
        }
        console.error("[post-editor] photo upload/confirm failed", { status: confirmRes.status, message: confirmData?.message, detail: confirmData?.detail });
        setError(t("photoUploadFailed", lang));
        setUploading(false);
        return;
      }
      setMedia((prev) => [...prev, { doc: confirmData.media, previewUrl: URL.createObjectURL(compressed) }]);
    } catch {
      setError(t("photoUploadFailed", lang));
    } finally {
      setUploading(false);
    }
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  const titleValid = title.trim().length >= TITLE_MIN;
  const descriptionValid = content.trim().length >= DESCRIPTION_MIN;
  // Aleksandr, 2026-08-30, two screenshots of a broken link on a published
  // post: "В создании пост показывай ошибку, если ссылка заполняется без
  // .com или еще чего то. Я написал просто link и оно ушло в пост" --
  // optional field (empty is fine, same as before), but a non-empty value
  // has to at least look like a domain: requires a dot followed by a
  // letters-only TLD of 2+ chars, so a bare word like "link" fails while
  // "link.com" or "https://link.com/path" pass. Deliberately not trying to
  // be a real RFC 3986 validator -- just enough to catch exactly the
  // "forgot the domain part" case Aleksandr hit.
  const linkValid = linkUrl.trim().length === 0 || /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/[^\s]*)?$/i.test(linkUrl.trim());
  const canSubmit = titleValid && descriptionValid && location !== null && category !== null && linkValid;

  // 2026-09-02 (Aleksandr, live screenshot: pressing "Зберегти чернетку"
  // on a form still failing full validation -- e.g. a title under
  // TITLE_MIN -- did nothing at all, "меня просто закидывает назад в
  // окно и всё, и ничего не происходит"... "черноветка должна
  // сберегаться в любом состоянии, типа, если даже там три символа
  // написал, это мои проблемы, это же черновик"): every draft-save call
  // site used to share canSubmit with the real Post/Save-changes/
  // Schedule actions, so an incomplete form -- the ONE case a draft is
  // actually for -- could never be saved as a draft at all. A draft only
  // needs something worth keeping (a title, a description, or a photo
  // already uploaded), not a publishable post.
  const canSaveDraft = title.trim().length > 0 || content.trim().length > 0 || media.length > 0;

  // Aleksandr, 2026-08-29 (screenshot of the Edit modal on an already-
  // live job post): "если пост уже запощен - кнопок 'зберегти чернетку'
  // и 'запланировать' не должно быть... а зберегти должно быть на всю
  // ширину" -- draft-save and scheduling only make sense for a post
  // that hasn't gone out yet. `initialPost.isDraft === false` (strict
  // check, not just falsy) is the signal: true only when this is a
  // real edit of a post /api/posts/mine already reported as non-draft.
  // `undefined` (create mode, or editing an actual draft) keeps all
  // three footer buttons exactly as before.
  const isEditingPublishedPost = mode === "edit" && initialPost?.isDraft === false;

  // 2026-08-30 (Aleksandr, live screenshot of this exact modal open on
  // an actual draft): "вместо 'зберегти чернетку', если это уже
  // чернетка - надо поставить кнопку 'удалить'", then refining it
  // further in the same breath once he'd thought about what else was
  // missing: "надо ж по идее добавить еще одну кнопку 'опубліковати'...
  // удалить можно просто сделать круглую иконку с мусоркою, чтобы
  // сохранить место... итого: Запланувати / Видалити / Зберегти /
  // Опублікувати". True only for a real edit of an EXISTING draft
  // (never create mode, never a scheduled/published post being edited —
  // those keep their own existing footers untouched below). Feeds four
  // slots in the same row: the existing schedule-clock icon, a new
  // trash-icon delete button right after it, the existing "Зберегти
  // чернетку" pill (unchanged — still just re-saves as a draft), and
  // the existing big blue button relabeled from "ЗБЕРЕГТИ" to
  // "ОПУБЛІКУВАТИ" below (its submit("post") action already sets
  // draft:false either way — editing a draft's "Save" button already
  // silently published it before this, just under a misleading label).
  const isEditingExistingDraft = mode === "edit" && initialPost?.isDraft === true && !!initialPost?.id;

  async function handleDeleteConfirmed() {
    if (!initialPost?.id) return;
    setDeleteError(false);
    setDeleting(true);
    try {
      const res = await fetch("/api/posts/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: initialPost.id }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        setDeleteError(true);
        setDeleting(false);
        return;
      }
      // Same event components/post-owner-menu.tsx's own delete now
      // dispatches, so whatever list opened this editor (currently only
      // components/profile-tabs.tsx's drafts/scheduled section) drops
      // the card without needing a prop threaded through here.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("a1:post-deleted", { detail: { id: initialPost.id } }));
      }
      onClose();
    } catch {
      setDeleteError(true);
      setDeleting(false);
    }
  }

  // 2026-08-29 (Aleksandr, 3 screenshots of the native app's "New post"
  // flow -- create modal, its close-confirm prompt, the resulting Draft
  // Posts sheet): "если я заполнил поля и случайно кликнул вне формы,
  // форма должна меня спросить 'сохранить черновик'... а то я могу
  // случайно нажать, оно выйдет и будет заеб переписывать". Scoped to
  // mode==="create" only -- a brand-new post with nothing typed yet has
  // nothing worth prompting about, and diffing an edit session against
  // its own initialPost is a separate, fuzzier problem (which field
  // counts as "changed"?) that wasn't asked for here; editing still
  // closes immediately like before.
  // Same fields isDirty already cared about, serialized so two calls
  // can be compared with `!==` -- see savedSnapshotRef's own comment.
  function fieldsSnapshot(): string {
    return JSON.stringify({
      title: title.trim(),
      content: content.trim(),
      locationId: location?.id ?? null,
      linkUrl: linkUrl.trim(),
      tags: selectedTags,
      category: category?.value ?? null,
      salaryAmount: salaryAmount.trim(),
      questions,
      media: media.map((m) => m.doc),
    });
  }

  const isDirty =
    mode === "create" &&
    (savedSnapshotRef.current === null
      ? title.trim().length > 0 ||
        content.trim().length > 0 ||
        location !== null ||
        linkUrl.trim().length > 0 ||
        selectedTags.length > 0 ||
        category !== null ||
        salaryAmount.trim().length > 0 ||
        questions.length > 0 ||
        media.length > 0
      : fieldsSnapshot() !== savedSnapshotRef.current);

  // The single entry point both the backdrop click and the header's ✕
  // now go through instead of calling onClose() directly -- see the
  // confirm-close popover rendered near the end of this component.
  function requestClose() {
    if (isDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    onClose();
  }

  // Aleksandr, 2026-08-30 (native app screenshot + a cat Lottie
  // sticker): drives the posting/updating banner further down, which
  // replaces the dialog card entirely the instant Post/Save-changes is
  // clicked (pendingAction is set synchronously at the top of submit(),
  // before the fetch) -- NOT shown for a draft save, which already has
  // its own inline "чернетку збережено" checkmark and stays open.
  const isSubmittingPost = pendingAction === "post" || pendingAction === "schedule";
  const isUpdatingExisting = mode === "edit" || savedPostId !== null;

  function buildMoney(): ExistingMoney {
    const amount = Number(salaryAmount);
    if (!salaryAmount || Number.isNaN(amount) || amount <= 0 || !salaryCurrency) {
      // Nothing entered in the (visible) salary fields. If the post
      // being edited already had a Range/RangeAnnual salary this editor
      // doesn't expose, send it back unchanged rather than clearing it.
      return initialPost && !initialMoneyIsSimple ? initialPost.money : null;
    }
    return { unitAmount: amount, currency: salaryCurrency, object: salaryAnnual ? "post-money-single-annual" : "post-money-single" };
  }

  function scheduleDateObject(): Date | null {
    if (!schedule.date || !schedule.time) return null;
    const d = new Date(`${schedule.date}T${schedule.time}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Hard guard against the exact live bug reported: a hand-typed year
  // like "0002" left the native datetime-local control's value
  // "valid enough" to submit. Re-validated numerically here regardless
  // of what the date input's own `min`/`max` attributes already do,
  // since typed input can bypass those in some browsers.
  function scheduleIsValid(): boolean {
    const d = scheduleDateObject();
    if (!d) return false;
    return d.getTime() > now.getTime() && d.getTime() <= maxScheduleDate.getTime();
  }

  function applyScheduleQuickPick(offsetDays: number, hour: number, minute = 0) {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, minute, 0, 0);
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
    setSchedule({ date: toDateInputValue(d), time: toTimeInputValue(d) });
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  }

  const scheduleYearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = now.getFullYear(); y <= maxScheduleDate.getFullYear(); y++) years.push(y);
    return years;
  }, [now, maxScheduleDate]);

  const scheduleMonthOptions = useMemo(() => {
    const minMonth = calYear === now.getFullYear() ? now.getMonth() : 0;
    const maxMonth = calYear === maxScheduleDate.getFullYear() ? maxScheduleDate.getMonth() : 11;
    const months: number[] = [];
    for (let m = minMonth; m <= maxMonth; m++) months.push(m);
    return months;
  }, [calYear, now, maxScheduleDate]);

  function onCalYearChange(y: number) {
    setCalYear(y);
    const minMonth = y === now.getFullYear() ? now.getMonth() : 0;
    const maxMonth = y === maxScheduleDate.getFullYear() ? maxScheduleDate.getMonth() : 11;
    setCalMonth((m) => Math.min(Math.max(m, minMonth), maxMonth));
  }

  function isDaySelectable(d: Date): boolean {
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const minOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const maxOnly = new Date(maxScheduleDate.getFullYear(), maxScheduleDate.getMonth(), maxScheduleDate.getDate()).getTime();
    return dOnly >= minOnly && dOnly <= maxOnly;
  }

  function isSelectedScheduleDay(d: Date): boolean {
    const parts = schedule.date.split("-").map(Number);
    const y = parts[0], m = parts[1], dd = parts[2];
    return y === d.getFullYear() && (m ?? 0) - 1 === d.getMonth() && dd === d.getDate();
  }

  function selectCalendarDay(d: Date) {
    if (!isDaySelectable(d)) return;
    setSchedule((s) => ({ ...s, date: toDateInputValue(d) }));
  }

  // Computes where the popover lands as fixed-position coordinates, from
  // the dialog's and the clock button's current bounding rects — see the
  // schedulePos state comment above for why this replaced simple
  // `absolute bottom-full` positioning.
  function openSchedulePopover() {
    const dlg = dialogRef.current;
    const btn = scheduleButtonRef.current;
    if (dlg && btn) {
      const dlgRect = dlg.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const margin = 12;
      setSchedulePos({
        left: dlgRect.left + 20,
        right: window.innerWidth - dlgRect.right + 20,
        bottom: window.innerHeight - btnRect.top + 8,
        maxHeight: Math.max(240, btnRect.top - margin - 8),
      });
    }
    setScheduleOpen(true);
  }

  async function submit(action: "post" | "draft" | "schedule", opts?: { closeAfter?: boolean }) {
    if (pendingAction) return;
    // Draft gets the loose canSaveDraft check (see its own comment
    // above); Post/Schedule still need the real thing, same as always.
    if (action === "draft" ? !canSaveDraft : !canSubmit) return;
    let scheduledSeconds: number | null = null;
    if (action === "schedule") {
      if (!scheduleIsValid()) return;
      scheduledSeconds = Math.floor(scheduleDateObject()!.getTime() / 1000);
    }

    setPendingAction(action);
    pendingSinceRef.current = Date.now();
    setError(null);

    const input: Record<string, unknown> = {
      // 2026-08-29 round 5 (PLAN.md §6.26): the write-side API wants
      // "post-job-employing-input"/"post-job-seeking-input" — an
      // "-input"-suffixed sibling of the plain literal used everywhere
      // else in this component (tabsForKind, labels, PostObject state).
      // Only this one field needs the suffix; confirmed live via the
      // exact enum list in the backend's own 400 error.
      object: `${object}-input`,
      title: title.trim().slice(0, TITLE_MAX),
      content: content.trim(),
      // 2026-08-30: linkValid (gating canSubmit above) only confirms this
      // looks like a domain, e.g. "site.com" with no scheme -- confirmed
      // via app/jobs/[slug]/page.tsx that a schemeless value renders as
      // `<a href="site.com">`, which the browser resolves as a RELATIVE
      // link off the current post's own URL, not an absolute one. Adding
      // https:// here (only when a scheme isn't already there) is what
      // actually makes the link work when clicked, not just pass
      // validation.
      links: linkUrl.trim() ? [{ title: "", url: /^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}` }] : [],
      location: location?.id ?? null,
      media: media.map((m) => m.doc),
      money: buildMoney(),
      tags: selectedTags,
      categories: category ? [category.value] : [],
      draft: action === "draft",
      scheduled: scheduledSeconds,
    };
    if (questions.length > 0) {
      input.apply = { questions: questions.map((q) => ({ question: q, object: "apply-question-input" as const })) };
    }

    try {
      const targetId = savedPostId ?? (mode === "edit" ? initialPost?.id : undefined);
      const endpoint = targetId ? "/api/posts/update" : "/api/posts/create";
      const body = targetId ? { id: targetId, input } : { input };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        // 2026-08-29 round 3: "не получилось сделать пост, обязательные
        // условия вписал, но не вышло" — couldn't reproduce this live
        // (no way to sign in as the user from here), but a stray browser
        // tab was sitting on /sign-in?reason=create-post, which is
        // exactly what a session that quietly expired while the form was
        // being filled out looks like. app/api/posts/create's route
        // already tells us this precisely (`message: "not_signed_in"`
        // on a 401) — when that's the cause, send the user to sign back
        // in instead of showing a generic error that gives no next step.
        // Logged either way so a *different* failure is diagnosable from
        // the browser console next time, instead of just "something went
        // wrong."
        console.error("[post-editor] save failed", { status: res.status, message: data?.message, detail: data?.detail });
        if (data?.message === "not_signed_in") {
          window.location.href = "/sign-in?reason=create-post";
          return;
        }
        setError(t("errorGeneric", lang));
        setPendingAction(null);
        setScheduleOpen(false);
        return;
      }
      const newId = (data.post as { _id?: string } | undefined)?._id;
      if (!targetId && newId) setSavedPostId(newId);

      // Give the posting/updating banner (and its cat animation) a
      // fair chance to actually be seen -- see pendingSinceRef's own
      // comment above.
      if (action === "post" || action === "schedule") {
        const elapsed = Date.now() - (pendingSinceRef.current ?? Date.now());
        if (elapsed < MIN_BANNER_MS) {
          await new Promise((resolve) => setTimeout(resolve, MIN_BANNER_MS - elapsed));
        }
      }

      // Whatever just got written to the server is, by definition, no
      // longer "unsaved" -- see savedSnapshotRef's own comment. Taken
      // AFTER the request resolves, from current field state, same as
      // what `input` above was actually built from a moment earlier.
      savedSnapshotRef.current = fieldsSnapshot();

      onSaved?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("a1:post-saved"));
      }
      if (action === "draft" && !opts?.closeAfter) {
        // Stay open — see header comment. Show a transient confirmation
        // instead of the dialog just vanishing.
        setDraftSavedAt(Date.now());
        setPendingAction(null);
      } else {
        onClose();
      }
    } catch {
      setError(t("errorGeneric", lang));
      setPendingAction(null);
      setScheduleOpen(false);
    }
  }

  useEffect(() => {
    if (draftSavedAt === null) return;
    const timer = setTimeout(() => setDraftSavedAt(null), 3000);
    return () => clearTimeout(timer);
  }, [draftSavedAt]);

  useEffect(() => {
    if (!scheduleOpen) return;
    const parts = schedule.date.split("-").map(Number);
    if (parts[0]) setCalYear(parts[0]);
    if (parts[1]) setCalMonth(parts[1] - 1);
    // Only re-syncs at the moment the popover opens — deliberately not
    // keyed on `schedule.date` too, so browsing to a different month
    // while it's open doesn't keep snapping back to the selected date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleOpen]);

  if (isSubmittingPost) {
    // Aleksandr, 2026-08-30: replaces the whole dialog the instant
    // Post/Save-changes is clicked -- no dark backdrop (pointer-events-
    // none on this wrapper, -auto only on the card itself) so the feed
    // underneath stays visible and scrollable, matching "чтобы лента
    // сама типа дергалась, как бы рефрешилась" -- the actual refresh
    // happens via onSaved() in submit() once the request resolves and
    // this whole component unmounts. This swap IS the editor closing --
    // the big multi-field form is gone the instant this branch renders,
    // leaving only this small card.
    //
    // 2026-08-30 (screen recording): "появляется справа... надо, чтобы
    // по центру сверху над лентой показывалась эта штука" -- was
    // `items-end ... sm:justify-end` (bottom on mobile, bottom-right on
    // desktop); moved to top-center on every viewport, with enough
    // top padding to clear the sticky nav bar (site-nav.tsx) instead of
    // sitting flush under/behind it.
    return (
      <div className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-center p-4 pt-20">
        <div className="pointer-events-auto flex w-full max-w-xs items-center gap-3 rounded-2xl bg-white p-3 pr-4 shadow-xl ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {pendingAction === "schedule"
                ? t("schedulingLabel", lang)
                : isUpdatingExisting
                  ? t("updatingLabel", lang)
                  : t("postingLabel", lang)}
            </p>
            <div className="relative mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-accent animate-progress-indeterminate" />
            </div>
          </div>
          <LottiePlayer src="/animations/posting-cat.json" size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={requestClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl dark:bg-neutral-950 sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            {mode === "edit" ? t("editTitle", lang) : t("createTitle", lang)}
          </h2>
          <div className="flex items-center gap-3">
            {draftSavedAt !== null && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {t("draftSaved", lang)}
              </span>
            )}
            <button type="button" onClick={requestClose} aria-label={t("close", lang)} className="text-neutral-400 transition hover:text-neutral-900 dark:hover:text-neutral-50">
              <CloseIcon />
            </button>
          </div>
        </div>

        {confirmCloseOpen && (
          // Small centered dialog-on-a-dialog, above everything else in
          // here (z-[70] > the z-[60] backdrop) -- own backdrop click
          // AND its own stopPropagation so it behaves like a real modal,
          // not just another row in the form.
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
            onClick={() => setConfirmCloseOpen(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
            >
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{t("closeConfirmTitle", lang)}</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t("closeConfirmBody", lang)}</p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!canSaveDraft) {
                      // Same "highlight what's missing" behavior the
                      // footer's own Save-draft button already has --
                      // dismiss this popover so the marked-invalid
                      // fields underneath are actually visible. Only
                      // reachable with a genuinely empty form (see
                      // canSaveDraft above) -- isDirty already gates
                      // whether this whole confirm dialog shows at all.
                      markAllTouched();
                      setConfirmCloseOpen(false);
                      return;
                    }
                    setConfirmCloseOpen(false);
                    submit("draft", { closeAfter: true });
                  }}
                  className="rounded-full bg-accent py-2.5 text-sm font-bold tracking-wide text-white transition hover:opacity-90"
                >
                  {t("saveDraft", lang)}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCloseOpen(false)}
                  className="rounded-full border border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {t("continueEditing", lang)}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmCloseOpen(false);
                    onClose();
                  }}
                  className="rounded-full py-2.5 text-sm font-medium text-neutral-500 transition hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
                >
                  {t("discardClose", lang)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2026-08-30: same dialog-on-a-dialog pattern as confirmCloseOpen
            right above (its own comment explains the z-[70]/backdrop
            choice) -- reused verbatim here for the new delete action, one
            extra tap away from the trash-icon button in the footer, same
            as components/post-owner-menu.tsx's existing delete confirm
            step for the detail-page "•••" menu. */}
        {confirmDeleteOpen && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
            onClick={() => !deleting && setConfirmDeleteOpen(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
            >
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{t("confirmDeleteTitle", lang)}</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t("confirmDeleteBody", lang)}</p>
              {deleteError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{t("deleteFailed", lang)}</p>}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleDeleteConfirmed}
                  disabled={deleting}
                  className="rounded-full bg-red-600 py-2.5 text-sm font-bold tracking-wide text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? <Spinner className="mx-auto h-4 w-4 text-white" /> : t("deletePost", lang)}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                  disabled={deleting}
                  className="rounded-full border border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {t("scheduleCancel", lang)}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative flex-1 overflow-y-auto px-5 py-4">
          {/* Aleksandr, 2026-08-30 (2 screenshots of the schedule popover
              open over this form): "надо чтобы, когда мы нажимаем внутри
              первой модалки вне календаря, где угодно... неактивные
              кнопки, чтобы она закрывалась" -- the popover's own
              stopPropagation only ever stopped ITS OWN clicks from
              reaching the level-1 dialog's requestClose; a click on a
              format pill, blank padding, etc. here had no effect on the
              popover at all. Scoped to just this scrollable form area
              (not the header or footer) so the footer's own Cancel/
              Schedule buttons -- the popover's real actions -- keep
              working untouched; z-20 sits above this area's own sticky
              z-10 header but below the popover's z-30, so the popover
              (visually on top) still gets its own clicks -- browsers
              hit-test whichever element is topmost at that pixel, not
              DOM order -- while anything else in this area hits this
              overlay instead of whatever's behind it, closing the
              popover without also activating that underlying control. */}
          {scheduleOpen && (
            <div className="absolute inset-0 z-20" onClick={() => setScheduleOpen(false)} aria-hidden="true" />
          )}
          {/* 2026-08-29: "делай закреплённым, чтобы не заезжало наверх" —
              sticky inside the scroll container so this toggle (and the
              header/description copy it drives) stays visible instead of
              scrolling away as soon as the form grows past one screen. */}
          <div className="sticky top-0 z-10 -mx-5 mb-4 bg-white px-5 pb-4 dark:bg-neutral-950">
            <div className="grid grid-cols-2 gap-2">
              {(["post-job-employing", "post-job-seeking"] as PostObject[]).map((value) => {
                const active = object === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setObject(value)}
                    className={
                      "rounded-xl border px-3 py-2.5 text-sm font-medium transition " +
                      (active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600")
                    }
                    aria-pressed={active}
                  >
                    {value === "post-job-employing" ? t("offerJob", lang) : t("findJob", lang)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <label className={labelClass}>{t("titleLabel", lang)}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              onBlur={() => setTitleTouched(true)}
              placeholder={object === "post-job-employing" ? t("titlePlaceholderHiring", lang) : t("titlePlaceholderSeeking", lang)}
              maxLength={TITLE_MAX}
              className={titleTouched && !titleValid ? invalidInputClass : inputClass}
            />
            {titleTouched && !titleValid && <span className="text-xs text-red-500">{t("titleTooShort", lang, { n: TITLE_MIN })}</span>}
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            {/* Aleksandr, 2026-08-29: "убери этот знак (i)" -- the "i"
                info-bubble next to the label is gone; its tip text lives
                on as the textarea's own placeholder below (unchanged),
                so nothing about what it explained is lost. */}
            <label className={labelClass}>{t("descriptionLabel", lang)}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={() => setDescriptionTouched(true)}
              placeholder={object === "post-job-employing" ? t("descriptionTipsHiring", lang) : t("descriptionTipsSeeking", lang)}
              rows={4}
              className={(descriptionTouched && !descriptionValid ? invalidInputClass : inputClass) + " resize-none"}
            />
            {descriptionTouched && !descriptionValid && <span className="text-xs text-red-500">{t("descriptionTooShort", lang, { n: DESCRIPTION_MIN })}</span>}
          </div>

          <div className="relative mb-4 flex flex-col gap-1.5">
            <label className={labelClass}>{t("locationLabel", lang)}</label>
            {location ? (
              <div className="flex items-center rounded-xl bg-accent/10">
                <div className="min-w-0 flex-1 truncate px-3.5 py-2.5 text-sm font-medium text-accent">{location.label}</div>
                <button type="button" onClick={() => setLocation(null)} className="mr-2 shrink-0 text-accent transition hover:opacity-70">
                  <CloseIcon />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => onLocationQueryChange(e.target.value)}
                    onBlur={() => setLocationTouched(true)}
                    placeholder={t("locationPlaceholder", lang)}
                    className={(locationTouched && !location ? invalidInputClass : inputClass) + " pr-9"}
                    autoComplete="off"
                  />
                  {locationPending && <Spinner className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />}
                </div>
                {!locationPending && locationSearched && locationQuery.trim().length >= 2 && locationResults.length === 0 && (
                  <span className="px-1 text-xs text-neutral-400 dark:text-neutral-500">{t("locationEmpty", lang)}</span>
                )}
                {locationResults.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
                    {locationResults.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          setLocation(loc);
                          setLocationQuery("");
                          setLocationResults([]);
                          setLocationSearched(false);
                        }}
                        className="block w-full truncate px-3.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>
                )}
                {locationTouched && !location && <span className="text-xs text-red-500">{t("requiredField", lang)}</span>}
              </>
            )}
          </div>

          <div className="relative mb-4 flex flex-col gap-1.5">
            <label className={labelClass}>{t("categoryLabel", lang)}</label>
            <div className="relative">
              <input
                type="text"
                value={categoryOpen ? categoryQuery : (category ? translateCategoryLabel(category.text, lang) : "")}
                onFocus={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const margin = 16;
                  const spaceBelow = window.innerHeight - rect.bottom - margin;
                  const spaceAbove = rect.top - margin;
                  const dropUp = spaceBelow < 200 && spaceAbove > spaceBelow;
                  setCategoryDropUp(dropUp);
                  setCategoryMaxHeight(Math.max(160, Math.min(320, dropUp ? spaceAbove : spaceBelow)));
                  setCategoryOpen(true);
                  setCategoryQuery("");
                }}
                onChange={(e) => setCategoryQuery(e.target.value)}
                onBlur={() => {
                  setCategoryTouched(true);
                  setTimeout(() => setCategoryOpen(false), 120);
                }}
                placeholder={t("categoryPlaceholder", lang)}
                className={(categoryTouched && !category ? invalidInputClass : inputClass) + " pr-9"}
                autoComplete="off"
              />
              <ChevronIcon open={categoryOpen} />
            </div>
            {categoryTouched && !category && <span className="text-xs text-red-500">{t("requiredField", lang)}</span>}
            {categoryOpen && (
              <div
                style={{ maxHeight: categoryMaxHeight }}
                className={
                  "absolute z-10 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 " +
                  (categoryDropUp ? "bottom-full mb-1" : "top-full mt-1")
                }
              >
                {filteredCategories.length === 0 && (
                  <div className="px-4 py-2 text-sm text-neutral-400">{t("categoryEmpty", lang)}</div>
                )}
                {filteredCategories.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setCategory(c);
                      setCategoryOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    {translateCategoryLabel(c.text, lang)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <label className={labelClass}>{t("linkLabel", lang)}</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onBlur={() => setLinkTouched(true)}
              placeholder={t("linkPlaceholder", lang)}
              className={linkTouched && !linkValid ? invalidInputClass : inputClass}
            />
            {linkTouched && !linkValid && <span className="text-xs text-red-500">{t("linkInvalid", lang)}</span>}
          </div>

          {workTypeTags.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              <span className={labelClass}>{t("workType", lang)}</span>
              <div className="flex flex-wrap gap-1.5">
                {workTypeTags.map((tg) => (
                  <button key={tg.value} type="button" onClick={() => toggleTag(tg.value)} className={pillClass(selectedTags.includes(tg.value))}>
                    {translateTagLabel(tg.text, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {employmentTypeTags.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              <span className={labelClass}>{t("employmentType", lang)}</span>
              <div className="flex flex-wrap gap-1.5">
                {employmentTypeTags.map((tg) => (
                  <button key={tg.value} type="button" onClick={() => toggleTag(tg.value)} className={pillClass(selectedTags.includes(tg.value))}>
                    {translateTagLabel(tg.text, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {experienceTags.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              <span className={labelClass}>{t("experience", lang)}</span>
              <div className="flex flex-wrap gap-1.5">
                {experienceTags.map((tg) => (
                  <button key={tg.value} type="button" onClick={() => toggleTag(tg.value)} className={pillClass(selectedTags.includes(tg.value))}>
                    {translateTagLabel(tg.text, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {otherTags.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              <span className={labelClass}>{t("otherTags", lang)}</span>
              <div className="flex flex-wrap gap-1.5">
                {otherTags.map((tg) => (
                  <button key={tg.value} type="button" onClick={() => toggleTag(tg.value)} className={pillClass(selectedTags.includes(tg.value))}>
                    {translateTagLabel(tg.text, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              {customTags.map((tg) => (
                <span key={tg} className={pillClass(true) + " inline-flex items-center gap-1"}>
                  {tg}
                  <button type="button" onClick={() => removeCustomTag(tg)} aria-label={t("close", lang)} className="opacity-70 hover:opacity-100">
                    <CloseIcon />
                  </button>
                </span>
              ))}
            </div>
            {customTags.length < 5 && (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder={t("customTagPlaceholder", lang)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  disabled={!customTagInput.trim()}
                  className="shrink-0 rounded-xl border border-neutral-300 px-3 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {t("addCount", lang, { n: 5 - customTags.length })}
                </button>
              </div>
            )}
          </div>

          {/* 2026-08-29 round 3: rebuilt again with CSS Grid instead of
              flex — the round-2 flex version (flex-1 + min-w-0) still
              broke on Safari (reported live: the amount input collapsed
              to its native number-spinner decoration while the currency
              select silently absorbed the rest of the row's width, a
              known Safari flex-basis quirk). Three explicit grid
              columns (1fr / narrow fixed / auto) can't be misread by any
              browser's flex algorithm the way flex-grow/shrink math can.
              Currency select narrowed further (w-16, was w-[4.5rem]) and
              given its own chevron since `appearance-none` drops the
              native one; the amount input's native up/down spinner
              buttons are hidden (they were eating into its usable width
              too) — "USD пікер уже, а само поле зарплата пошире". */}
          <div className="mb-4 flex flex-col gap-1.5">
            <label className={labelClass}>{t("salaryLabel", lang)}</label>
            <div className="grid grid-cols-[1fr_4rem_auto] items-stretch gap-1.5">
              <input
                type="number"
                min="0"
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
                placeholder={t("salaryPlaceholder", lang)}
                className={inputClass + " min-w-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"}
              />
              <div className="relative min-w-0">
                <select
                  value={salaryCurrency}
                  onChange={(e) => setSalaryCurrency(e.target.value)}
                  className={inputClass + " w-full appearance-none pl-2 pr-5"}
                >
                  {bootstrap.currencies.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.value.toUpperCase()}
                    </option>
                  ))}
                </select>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex shrink-0 overflow-hidden rounded-xl border border-neutral-300 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setSalaryAnnual(false)}
                  className={"px-2.5 text-xs font-medium transition " + (!salaryAnnual ? "bg-accent/10 text-accent" : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800")}
                >
                  {t("perMonth", lang)}
                </button>
                <button
                  type="button"
                  onClick={() => setSalaryAnnual(true)}
                  className={"border-l border-neutral-300 px-2.5 text-xs font-medium transition dark:border-neutral-700 " + (salaryAnnual ? "bg-accent/10 text-accent" : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800")}
                >
                  {t("perYear", lang)}
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <label className={labelClass}>{t("questionsLabel", lang)}</label>
            <div className="flex flex-col gap-1.5">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-neutral-100 px-3.5 py-2 text-sm text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                  <span className="truncate">{q}</span>
                  <button type="button" onClick={() => removeQuestion(i)} aria-label={t("close", lang)} className="ml-2 shrink-0 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
                    <CloseIcon />
                  </button>
                </div>
              ))}
            </div>
            {questions.length < 5 && (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addQuestion();
                    }
                  }}
                  placeholder={t("questionPlaceholder", lang)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={addQuestion}
                  disabled={!questionInput.trim()}
                  className="shrink-0 rounded-xl border border-neutral-300 px-3 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {t("addCount", lang, { n: 5 - questions.length })}
                </button>
              </div>
            )}
          </div>

          <div className="mb-2 flex flex-col gap-1.5">
            <label className={labelClass}>{t("photoLabel", lang)}</label>
            <div className="flex flex-wrap gap-2">
              {media.map((m, i) => (
                <div key={m.doc._id + i} className="relative h-16 w-16 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <img src={m.previewUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    aria-label={t("close", lang)}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              ))}
              {media.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-600 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-500"
                >
                  {uploading ? <Spinner className="h-5 w-5" /> : <PlusSquareIcon />}
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
          </div>

          {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="relative border-t border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
          {!canSubmit && <p className="mb-2 text-xs text-neutral-400 dark:text-neutral-500">{t("requiredHint", lang)}</p>}

          {/* 2026-08-29 round 3: "если нажимаю запланировать пост, то не
              надо вторая синяя кнопка" — the popover no longer carries
              its own Cancel/Schedule buttons. The footer's own two
              buttons switch role instead: Save-draft becomes Cancel and
              Post/Save becomes Schedule while the popover is open, since
              scheduling is the one action that makes sense at that
              point — see the button row below. */}
          <div className="flex items-center gap-2">
            {isEditingPublishedPost ? (
              // Already-published post being edited: no draft-save, no
              // scheduling (both belong to a post that hasn't gone out
              // yet) -- just one full-width Save. See
              // isEditingPublishedPost's own comment above.
              <button
                type="button"
                onClick={() => {
                  if (!canSubmit) { markAllTouched(); return; }
                  submit("post");
                }}
                disabled={pendingAction !== null}
                className={"flex-1 rounded-full bg-accent py-2.5 text-sm font-bold tracking-wide text-white transition hover:opacity-90 disabled:opacity-50" + (!canSubmit ? " opacity-50" : "")}
              >
                {t("saveChanges", lang)}
              </button>
            ) : (
              <>
                <button
                  ref={scheduleButtonRef}
                  type="button"
                  onClick={() => (scheduleOpen ? setScheduleOpen(false) : openSchedulePopover())}
                  aria-label={t("schedulePost", lang)}
                  className={
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition " +
                    (scheduleOpen ? "border-accent bg-accent/10 text-accent" : "border-neutral-300 text-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-50") +
                    (!canSubmit ? " opacity-50" : "")
                  }
                >
                  <ClockIcon />
                </button>
                {/* 2026-08-30: see isEditingExistingDraft's own comment
                    above -- round icon button (not a labelled pill) "чтобы
                    сохранить место" now that this row has four things in
                    it instead of three. Hidden while the schedule popover
                    branch below is showing, same as the draft/post pair
                    it sits next to. */}
                {isEditingExistingDraft && !scheduleOpen && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(true)}
                    aria-label={t("deletePost", lang)}
                    disabled={pendingAction !== null}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-red-900 dark:hover:bg-red-500/10 dark:hover:text-red-500"
                  >
                    <TrashIcon />
                  </button>
                )}
                {scheduleOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setScheduleOpen(false)}
                      className="rounded-full border border-neutral-300 px-3.5 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      {t("scheduleCancel", lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canSubmit) { markAllTouched(); return; }
                        if (!scheduleIsValid()) return;
                        submit("schedule");
                      }}
                      disabled={pendingAction !== null}
                      className={"flex-1 rounded-full bg-accent py-2.5 text-sm font-bold tracking-wide text-white transition hover:opacity-90 disabled:opacity-50" + (!canSubmit || !scheduleIsValid() ? " opacity-50" : "")}
                    >
                      {t("scheduleActionCaps", lang)}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canSaveDraft) { markAllTouched(); return; }
                        submit("draft");
                      }}
                      disabled={pendingAction !== null}
                      className={"rounded-full border border-neutral-300 px-3.5 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800" + (!canSaveDraft ? " opacity-50" : "")}
                    >
                      {pendingAction === "draft" ? <Spinner className="h-3.5 w-3.5" /> : t("saveDraft", lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canSubmit) { markAllTouched(); return; }
                        submit("post");
                      }}
                      disabled={pendingAction !== null}
                      className={"flex-1 rounded-full bg-accent py-2.5 text-sm font-bold tracking-wide text-white transition hover:opacity-90 disabled:opacity-50" + (!canSubmit ? " opacity-50" : "")}
                    >
                      {isEditingExistingDraft
                        ? t("post", lang)
                        : mode === "edit" || savedPostId
                          ? t("saveChanges", lang)
                          : t("post", lang)}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* 2026-08-29 round 3: rendered as `position: fixed` (schedulePos,
            computed in openSchedulePopover() above) rather than absolutely
            inside the dialog — the dialog's own `overflow-hidden` (needed
            for its rounded corners) was silently clipping the popover's
            top whenever it grew taller than the gap above the footer
            ("не можу проскроллити і побачити питання до відгуку повністю,
            поки відкритий календар"). Fixed positioning escapes that
            clipping entirely. Also replaces the native <input type="date">
            with a custom month/year <select> pair + day grid — the OS
            calendar couldn't be restyled, rendered off-screen, and made
            picking a specific year a multi-click affair ("рік складно
            вибрати і написати вручну"); scheduleIsValid() still gates the
            actual submit regardless of what's shown here. */}
        {scheduleOpen && schedulePos && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ left: schedulePos.left, right: schedulePos.right, bottom: schedulePos.bottom, maxHeight: schedulePos.maxHeight }}
            className="fixed z-30 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="mb-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => applyScheduleQuickPick(0, 18)} className={pillClass(false)}>{t("scheduleToday", lang)}</button>
              <button type="button" onClick={() => applyScheduleQuickPick(1, 9)} className={pillClass(false)}>{t("scheduleTomorrow", lang)}</button>
              <button type="button" onClick={() => applyScheduleQuickPick(3, 12)} className={pillClass(false)}>{t("scheduleIn3Days", lang)}</button>
              <button type="button" onClick={() => applyScheduleQuickPick(7, 12)} className={pillClass(false)}>{t("scheduleInWeek", lang)}</button>
            </div>

            <div className="mb-2">
              <div className="mb-1.5 flex items-center gap-1.5">
                <select
                  value={calMonth}
                  onChange={(e) => setCalMonth(Number(e.target.value))}
                  className={inputClass + " min-w-0 flex-1 py-1.5 text-xs capitalize"}
                >
                  {scheduleMonthOptions.map((m) => (
                    <option key={m} value={m}>{monthOnlyLabel(calYear, m, lang)}</option>
                  ))}
                </select>
                <select
                  value={calYear}
                  onChange={(e) => onCalYearChange(Number(e.target.value))}
                  // Aleksandr, 2026-08-30 (mobile screenshot): this select
                  // was rendering nearly full-width, squeezing the month
                  // select next to it down to just its disclosure arrow.
                  // Root cause: inputClass already bakes in `w-full`, and
                  // an appended `w-20` has the SAME CSS specificity (both
                  // are single-class width rules) -- which one wins is
                  // decided by their order in Tailwind's compiled
                  // stylesheet, not by the order they're written in this
                  // className string, and here `w-full` was winning. `!`
                  // (Tailwind's important modifier) forces this w-20 to
                  // actually apply regardless of that ordering.
                  className={inputClass + " !w-20 shrink-0 py-1.5 text-xs"}
                >
                  {scheduleYearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {weekdayShortNames(lang).map((wd, i) => (
                  <span key={i} className="py-1 text-[10px] font-medium uppercase text-neutral-400 dark:text-neutral-500">{wd}</span>
                ))}
                {buildCalendarCells(calYear, calMonth).map((d, i) => {
                  if (!d) return <span key={"blank" + i} />;
                  const selectable = isDaySelectable(d);
                  const selected = isSelectedScheduleDay(d);
                  return (
                    <button
                      key={d.getTime()}
                      type="button"
                      disabled={!selectable}
                      onClick={() => selectCalendarDay(d)}
                      className={
                        "rounded-lg py-1.5 text-xs font-medium transition " +
                        (selected
                          ? "bg-accent text-white"
                          : selectable
                            ? "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                            : "cursor-default text-neutral-300 dark:text-neutral-700")
                      }
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-1 flex flex-col gap-1">
              <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{t("scheduleTimeLabel", lang)}</label>
              <input
                type="time"
                value={schedule.time}
                onChange={(e) => setSchedule((s) => ({ ...s, time: e.target.value }))}
                // Aleksandr, 2026-08-30: "уменьши ширину" -- was
                // stretching edge-to-edge (inputClass's own `w-full`);
                // `!w-32` is plenty for an HH:MM value and matches the
                // compact treatment now used for the year select above.
                className={inputClass + " !w-32 py-2 text-sm"}
              />
            </div>
            {!scheduleIsValid() && <p className="text-xs text-red-500">{t("scheduleInvalid", lang)}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
