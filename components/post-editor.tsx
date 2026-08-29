// components/post-editor.tsx
//
// 2026-08-29 (Aleksandr, from a 5-screenshot walkthrough of the real
// mobile-app post-creation flow + a same-day follow-up: "Кстати посты
// должны быть CRUD, create / update / delete"): the real post editor,
// replacing components/create-post-fab.tsx's stub dialog. One component
// handles both create (mode="create") and edit (mode="edit",
// initialPost supplied) — same fields, same submit shape, only the
// target endpoint and button label differ, matching how
// app/api/posts/update/route.ts is byte-for-byte app/api/posts/create/
// route.ts plus an `id`.
//
// Field-for-field this is exactly PLAN.md §6.1's documented
// posts.createPost/updatePost contract (`PostInputSchema`,
// lib/a1/schemas.ts) — no invented fields, per PLAN.md §6.5 ("the web
// form's fields are exactly the API's fields — no more, no less"):
//   - object: the Offer-a-job / Find-a-job toggle (post-job-employing /
//     post-job-seeking) — mirrors the reference screenshots' top toggle
//     and its header/placeholder copy swapping with it.
//   - title, content: the two free-text fields. `content`'s placeholder
//     swaps by `object` the same way the reference screenshots show
//     (job requirements vs. profession/skills copy).
//   - location: resolved via /api/locations (same debounced search
//     components/filters-form.tsx already uses for the read-side filter
//     — identical UI, same endpoint, this is just a second caller).
//   - categories: dataset.postCategories, single pick (sent as a
//     one-item array — the field itself is `number[]`, categories.ts's
//     categoryListBody / profile-setup-form.tsx's searchable-dropdown
//     pattern reused for the picker chrome).
//   - tags: the Remote/On-site/Hybrid, Full-time/Part-time/Contract, and
//     "N yr. exp." pills are literally dataset.postTags — the exact
//     same flat string values components/filters-form.tsx already
//     renders as filter pills — plus up to 5 free-text custom tags
//     appended to the same flat array (the "Add (5)" counter in the
//     reference screenshots is remaining slots, not a fixed count).
//   - money: a single amount + currency (dataset.currencies) + a
//     month/year toggle (the swap-arrows icon in the reference
//     screenshot) — produces one of Money.Single / Money.SingleAnnual.
//     Range salaries aren't in the reference screenshots and aren't
//     built here; add them later as their own pass if asked.
//   - media: direct-to-storage upload (upload.create -> POST the file
//     to the presigned destination -> upload.confirm), never through
//     our own server, per PLAN.md §6.1's own instruction.
//   - apply.questions: the second "Add (5)" + free-text row. Only sent
//     at all once at least one question is added — see lib/a1/
//     schemas.ts's own comment on why this field's item shape is a
//     best-effort guess, not a confirmed one.
//   - scheduled / draft: the bottom bar's clock icon (opens a native
//     datetime picker, "Schedule Post") vs. "Save draft" vs. the
//     primary "POST" button — three distinct submits, not one button
//     with a mode flag, matching the reference screenshots' own bottom
//     bar having a separate schedule affordance next to POST.
//
// Deliberately NOT built: hideAuthor / premiumPinDays / premiumHighlight
// — no reference screenshot shows them and PLAN.md never confirmed the
// last two field names, only guessed them by convention. Left out
// entirely rather than guessed in.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import type { Category, Tag, Currency } from "@/lib/a1/datasets";

type PostObject = "post-job-employing" | "post-job-seeking";

// Deliberately local/self-contained rather than importing PostInputMoney
// from lib/a1/schemas.ts — this file only ever produces two of its four
// variants (Range isn't built here yet, see header comment), so a
// narrower local type is enough and keeps this client bundle from
// depending on the server-side schema module for anything but the two
// small dataset types above (already an established pattern — see
// app/onboarding/profile/profile-setup-form.tsx's own `type Category`
// import from the same file).
type MoneyInput = { unitAmount: number; currency: string; object: "post-money-single" | "post-money-single-annual" };
// A Range/RangeAnnual salary can only exist on a post created some other
// way (this editor never produces one — see header comment) — kept as
// `unknown` here rather than typed out, since the only thing this file
// does with it is pass it through untouched when the user hasn't
// touched the salary fields (buildMoney() below), never render or
// interpret its shape.
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
};

type Bootstrap = {
  categories: Category[];
  currencies: Currency[];
  hiringTags: Tag[];
  seekingTags: Tag[];
};

const EMPTY_BOOTSTRAP: Bootstrap = { categories: [], currencies: [], hiringTags: [], seekingTags: [] };

// Splits one kind's flat tag list into the three visual buckets the
// reference screenshots show. Matched on the same English `tag.text`
// values components/filters-form.tsx's own TAG_LABEL_TRANSLATIONS table
// already keys on — anything that doesn't match either bucket still
// renders, just in "other", so an unrecognized/renamed/new tag from the
// backend is never silently dropped.
const WORK_TYPE_TAGS = new Set(["Remote", "On-site", "Hybrid"]);
const EMPLOYMENT_TYPE_TAGS = new Set(["Full-time", "Part-time", "Contract"]);
function isExperienceTag(text: string): boolean {
  return /\bexp\.?\b/i.test(text) || /\byr\.?\b/i.test(text);
}

type StringKey =
  | "createTitle" | "editTitle" | "close"
  | "offerJob" | "findJob"
  | "titleLabel" | "titlePlaceholderHiring" | "titlePlaceholderSeeking"
  | "descriptionLabel" | "descriptionTipsHiring" | "descriptionTipsSeeking"
  | "locationLabel" | "locationPlaceholder"
  | "categoryLabel" | "categoryPlaceholder" | "categoryEmpty"
  | "linkLabel" | "linkPlaceholder"
  | "workType" | "employmentType" | "experience" | "otherTags"
  | "customTagPlaceholder" | "addCount"
  | "salaryLabel" | "salaryPlaceholder" | "perMonth" | "perYear"
  | "questionsLabel" | "questionPlaceholder"
  | "photoLabel" | "photoTooMany" | "photoTooBig" | "photoUploadFailed"
  | "saveDraft" | "post" | "saveChanges" | "schedulePost" | "scheduleConfirm" | "scheduleCancel"
  | "errorGeneric" | "requiredHint";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  createTitle: { uk: "Новий пост", en: "New post", ru: "Новый пост", de: "Neuer Beitrag", es: "Nueva publicación", fr: "Nouvelle publication", pl: "Nowy post", ptBR: "Nova publicação", zh: "新帖子" },
  editTitle: { uk: "Редагувати пост", en: "Edit post", ru: "Редактировать пост", de: "Beitrag bearbeiten", es: "Editar publicación", fr: "Modifier la publication", pl: "Edytuj post", ptBR: "Editar publicação", zh: "编辑帖子" },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭" },
  offerJob: { uk: "Пропоную роботу", en: "Offer a job", ru: "Предлагаю работу", de: "Job anbieten", es: "Ofrecer empleo", fr: "Offrir un emploi", pl: "Oferuję pracę", ptBR: "Oferecer emprego", zh: "提供工作" },
  findJob: { uk: "Шукаю роботу", en: "Find a job", ru: "Ищу работу", de: "Job suchen", es: "Buscar empleo", fr: "Chercher un emploi", pl: "Szukam pracy", ptBR: "Procurar emprego", zh: "找工作" },
  titleLabel: { uk: "Заголовок", en: "Title", ru: "Заголовок", de: "Titel", es: "Título", fr: "Titre", pl: "Tytuł", ptBR: "Título", zh: "标题" },
  titlePlaceholderHiring: { uk: "Наприклад, Frontend-розробник", en: "e.g. Frontend Developer", ru: "Например, Frontend-разработчик", de: "z. B. Frontend-Entwickler", es: "p. ej. Desarrollador Frontend", fr: "p. ex. Développeur Frontend", pl: "np. Programista Frontend", ptBR: "ex.: Desenvolvedor Frontend", zh: "例如：前端开发工程师" },
  titlePlaceholderSeeking: { uk: "Наприклад, Frontend-розробник шукає роботу", en: "e.g. Frontend Developer looking for work", ru: "Например, Frontend-разработчик ищет работу", de: "z. B. Frontend-Entwickler sucht Arbeit", es: "p. ej. Desarrollador Frontend busca empleo", fr: "p. ex. Développeur Frontend cherche un emploi", pl: "np. Programista Frontend szuka pracy", ptBR: "ex.: Desenvolvedor Frontend procura emprego", zh: "例如：前端开发工程师求职" },
  descriptionLabel: { uk: "Опис", en: "Description", ru: "Описание", de: "Beschreibung", es: "Descripción", fr: "Description", pl: "Opis", ptBR: "Descrição", zh: "描述" },
  descriptionTipsHiring: { uk: "Опишіть обов'язки, вимоги та умови роботи", en: "Describe responsibilities, requirements and working conditions", ru: "Опишите обязанности, требования и условия работы", de: "Beschreiben Sie Aufgaben, Anforderungen und Arbeitsbedingungen", es: "Describe responsabilidades, requisitos y condiciones", fr: "Décrivez les responsabilités, exigences et conditions", pl: "Opisz obowiązki, wymagania i warunki pracy", ptBR: "Descreva responsabilidades, requisitos e condições", zh: "描述职责、要求和工作条件" },
  descriptionTipsSeeking: { uk: "Розкажіть про свій досвід, навички та побажання", en: "Tell us about your experience, skills and preferences", ru: "Расскажите о своём опыте, навыках и пожеланиях", de: "Erzählen Sie von Ihrer Erfahrung, Fähigkeiten und Präferenzen", es: "Cuéntanos tu experiencia, habilidades y preferencias", fr: "Parlez de votre expérience, compétences et préférences", pl: "Opowiedz o doświadczeniu, umiejętnościach i preferencjach", ptBR: "Fale sobre sua experiência, habilidades e preferências", zh: "介绍你的经验、技能和偏好" },
  locationLabel: { uk: "Локація", en: "Location", ru: "Локация", de: "Standort", es: "Ubicación", fr: "Lieu", pl: "Lokalizacja", ptBR: "Localização", zh: "地点" },
  locationPlaceholder: { uk: "Пошук міста", en: "Search for a city", ru: "Поиск города", de: "Stadt suchen", es: "Buscar ciudad", fr: "Rechercher une ville", pl: "Szukaj miasta", ptBR: "Buscar cidade", zh: "搜索城市" },
  categoryLabel: { uk: "Категорія", en: "Category", ru: "Категория", de: "Kategorie", es: "Categoría", fr: "Catégorie", pl: "Kategoria", ptBR: "Categoria", zh: "分类" },
  categoryPlaceholder: { uk: "Пошук категорії", en: "Search categories", ru: "Поиск категории", de: "Kategorie suchen", es: "Buscar categoría", fr: "Rechercher une catégorie", pl: "Szukaj kategorii", ptBR: "Buscar categoria", zh: "搜索分类" },
  categoryEmpty: { uk: "Нічого не знайдено", en: "No matches", ru: "Ничего не найдено", de: "Keine Treffer", es: "Sin resultados", fr: "Aucun résultat", pl: "Brak wyników", ptBR: "Nenhum resultado", zh: "无匹配结果" },
  linkLabel: { uk: "Посилання", en: "Link", ru: "Ссылка", de: "Link", es: "Enlace", fr: "Lien", pl: "Link", ptBR: "Link", zh: "链接" },
  linkPlaceholder: { uk: "https://...", en: "https://...", ru: "https://...", de: "https://...", es: "https://...", fr: "https://...", pl: "https://...", ptBR: "https://...", zh: "https://..." },
  workType: { uk: "Формат роботи", en: "Work type", ru: "Формат работы", de: "Arbeitsform", es: "Modalidad", fr: "Mode de travail", pl: "Tryb pracy", ptBR: "Modalidade", zh: "工作方式" },
  employmentType: { uk: "Тип зайнятості", en: "Employment type", ru: "Тип занятости", de: "Beschäftigungsart", es: "Tipo de empleo", fr: "Type de contrat", pl: "Rodzaj zatrudnienia", ptBR: "Tipo de contrato", zh: "雇佣类型" },
  experience: { uk: "Досвід", en: "Experience", ru: "Опыт", de: "Erfahrung", es: "Experiencia", fr: "Expérience", pl: "Doświadczenie", ptBR: "Experiência", zh: "经验" },
  otherTags: { uk: "Інші теги", en: "Other tags", ru: "Другие теги", de: "Weitere Tags", es: "Otras etiquetas", fr: "Autres tags", pl: "Inne tagi", ptBR: "Outras tags", zh: "其他标签" },
  customTagPlaceholder: { uk: "Ваш тег...", en: "Your tag...", ru: "Ваш тег...", de: "Ihr Tag...", es: "Tu etiqueta...", fr: "Votre tag...", pl: "Twój tag...", ptBR: "Sua tag...", zh: "自定义标签..." },
  addCount: { uk: "Додати ({n})", en: "Add ({n})", ru: "Добавить ({n})", de: "Hinzufügen ({n})", es: "Añadir ({n})", fr: "Ajouter ({n})", pl: "Dodaj ({n})", ptBR: "Adicionar ({n})", zh: "添加 ({n})" },
  salaryLabel: { uk: "Зарплата", en: "Salary", ru: "Зарплата", de: "Gehalt", es: "Salario", fr: "Salaire", pl: "Wynagrodzenie", ptBR: "Salário", zh: "薪资" },
  salaryPlaceholder: { uk: "Сума", en: "Amount", ru: "Сумма", de: "Betrag", es: "Monto", fr: "Montant", pl: "Kwota", ptBR: "Valor", zh: "金额" },
  perMonth: { uk: "на місяць", en: "per month", ru: "в месяц", de: "pro Monat", es: "por mes", fr: "par mois", pl: "miesięcznie", ptBR: "por mês", zh: "每月" },
  perYear: { uk: "на рік", en: "per year", ru: "в год", de: "pro Jahr", es: "por año", fr: "par an", pl: "rocznie", ptBR: "por ano", zh: "每年" },
  questionsLabel: { uk: "Питання до відгуку", en: "Application questions", ru: "Вопросы к отклику", de: "Bewerbungsfragen", es: "Preguntas de postulación", fr: "Questions de candidature", pl: "Pytania do zgłoszenia", ptBR: "Perguntas de candidatura", zh: "申请问题" },
  questionPlaceholder: { uk: "Питання...", en: "Question...", ru: "Вопрос...", de: "Frage...", es: "Pregunta...", fr: "Question...", pl: "Pytanie...", ptBR: "Pergunta...", zh: "问题..." },
  photoLabel: { uk: "Фото", en: "Photos", ru: "Фото", de: "Fotos", es: "Fotos", fr: "Photos", pl: "Zdjęcia", ptBR: "Fotos", zh: "照片" },
  photoTooMany: { uk: "Максимум 5 фото", en: "Up to 5 photos", ru: "Максимум 5 фото", de: "Maximal 5 Fotos", es: "Máximo 5 fotos", fr: "5 photos maximum", pl: "Maksymalnie 5 zdjęć", ptBR: "Máximo de 5 fotos", zh: "最多5张照片" },
  photoTooBig: { uk: "Файл завеликий", en: "File is too large", ru: "Файл слишком большой", de: "Datei zu groß", es: "El archivo es demasiado grande", fr: "Fichier trop volumineux", pl: "Plik jest za duży", ptBR: "Arquivo muito grande", zh: "文件过大" },
  photoUploadFailed: { uk: "Не вдалося завантажити фото", en: "Couldn't upload photo", ru: "Не удалось загрузить фото", de: "Foto konnte nicht hochgeladen werden", es: "No se pudo subir la foto", fr: "Échec du téléversement", pl: "Nie udało się przesłać zdjęcia", ptBR: "Não foi possível enviar a foto", zh: "照片上传失败" },
  saveDraft: { uk: "Зберегти чернетку", en: "Save draft", ru: "Сохранить черновик", de: "Entwurf speichern", es: "Guardar borrador", fr: "Enregistrer le brouillon", pl: "Zapisz szkic", ptBR: "Salvar rascunho", zh: "保存草稿" },
  post: { uk: "ОПУБЛІКУВАТИ", en: "POST", ru: "ОПУБЛИКОВАТЬ", de: "VERÖFFENTLICHEN", es: "PUBLICAR", fr: "PUBLIER", pl: "OPUBLIKUJ", ptBR: "PUBLICAR", zh: "发布" },
  saveChanges: { uk: "ЗБЕРЕГТИ", en: "SAVE", ru: "СОХРАНИТЬ", de: "SPEICHERN", es: "GUARDAR", fr: "ENREGISTRER", pl: "ZAPISZ", ptBR: "SALVAR", zh: "保存" },
  schedulePost: { uk: "Запланувати", en: "Schedule", ru: "Запланировать", de: "Planen", es: "Programar", fr: "Planifier", pl: "Zaplanuj", ptBR: "Agendar", zh: "定时发布" },
  scheduleConfirm: { uk: "Запланувати пост", en: "Schedule Post", ru: "Запланировать пост", de: "Beitrag planen", es: "Programar publicación", fr: "Planifier la publication", pl: "Zaplanuj post", ptBR: "Agendar publicação", zh: "定时发布帖子" },
  scheduleCancel: { uk: "Скасувати", en: "Cancel", ru: "Отмена", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pl: "Anuluj", ptBR: "Cancelar", zh: "取消" },
  errorGeneric: { uk: "Щось пішло не так. Спробуйте ще раз.", en: "Something went wrong. Please try again.", ru: "Что-то пошло не так. Попробуйте ещё раз.", de: "Etwas ist schiefgelaufen. Bitte erneut versuchen.", es: "Algo salió mal. Inténtalo de nuevo.", fr: "Une erreur est survenue. Réessayez.", pl: "Coś poszło nie tak. Spróbuj ponownie.", ptBR: "Algo deu errado. Tente novamente.", zh: "出了点问题，请重试。" },
  requiredHint: { uk: "Вкажіть заголовок і категорію", en: "Add a title and a category", ru: "Укажите заголовок и категорию", de: "Titel und Kategorie angeben", es: "Añade un título y una categoría", fr: "Ajoutez un titre et une catégorie", pl: "Podaj tytuł i kategorię", ptBR: "Adicione um título e uma categoria", zh: "请填写标题和分类" },
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
function SwapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 10l-4 4 4 4M3 14h14M17 4l4 4-4 4M21 8H7" />
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

export function PostEditor({
  mode,
  initialPost,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initialPost?: EditablePost;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const lang = useActiveLocale();
  const [bootstrap, setBootstrap] = useState<Bootstrap>(EMPTY_BOOTSTRAP);

  const [object, setObject] = useState<PostObject>(initialPost?.object ?? "post-job-employing");
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [content, setContent] = useState(initialPost?.content ?? "");

  const [location, setLocation] = useState<{ id: number; label: string } | null>(initialPost?.location ?? null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<{ id: number; label: string }[]>([]);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationRequestIdRef = useRef(0);

  const [category, setCategory] = useState<Category | null>(null);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [linkUrl, setLinkUrl] = useState(initialPost?.links?.[0]?.url ?? "");

  const [selectedTags, setSelectedTags] = useState<string[]>(initialPost?.tags ?? []);
  const [customTagInput, setCustomTagInput] = useState("");

  // Only pre-fill amount/currency for the two variants this editor can
  // actually reproduce (Single / SingleAnnual). A Range/RangeAnnual
  // salary (never created by this editor, only possibly pre-existing)
  // is deliberately left out of the visible fields — see buildMoney()
  // below for how it survives an edit untouched instead of being
  // silently dropped to null.
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

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");

  const [pendingAction, setPendingAction] = useState<"post" | "draft" | "schedule" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/post-editor/bootstrap")
      .then((r) => r.json())
      .then((data) => {
        setBootstrap({
          categories: data.categories ?? [],
          currencies: data.currencies ?? [],
          hiringTags: data.hiringTags ?? [],
          seekingTags: data.seekingTags ?? [],
        });
        if (initialPost && initialPost.categories.length > 0) {
          const found = (data.categories as Category[]).find((c) => c.value === initialPost.categories[0]);
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
      return;
    }
    const requestId = ++locationRequestIdRef.current;
    try {
      const res = await fetch(`/api/locations?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (requestId === locationRequestIdRef.current) setLocationResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      if (requestId === locationRequestIdRef.current) setLocationResults([]);
    }
  }

  function onLocationQueryChange(value: string) {
    setLocationQuery(value);
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    locationDebounceRef.current = setTimeout(() => searchLocationsClient(value), 350);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (media.length >= 5) {
      setError(t("photoTooMany", lang));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError(t("photoTooBig", lang));
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const createRes = await fetch("/api/upload/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimetype: file.type || "application/octet-stream", bytes: file.size }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.ok || !createData.result?.url) {
        setError(t("photoUploadFailed", lang));
        setUploading(false);
        return;
      }
      const { id, url, fields } = createData.result as { id: string; url: string; fields: Record<string, string> };
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value);
      formData.append("file", file);
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
        setError(t("photoUploadFailed", lang));
        setUploading(false);
        return;
      }
      setMedia((prev) => [...prev, { doc: confirmData.media, previewUrl: URL.createObjectURL(file) }]);
    } catch {
      setError(t("photoUploadFailed", lang));
    } finally {
      setUploading(false);
    }
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  const canSubmit = title.trim().length > 0 && category !== null;

  function buildMoney(): ExistingMoney {
    const amount = Number(salaryAmount);
    if (!salaryAmount || Number.isNaN(amount) || amount <= 0 || !salaryCurrency) {
      // Nothing entered in the (visible) salary fields. If the post
      // being edited already had a Range/RangeAnnual salary this editor
      // doesn't expose, send it back unchanged rather than clearing it —
      // only an explicit edit to the amount/currency fields should ever
      // touch an existing salary.
      return initialPost && !initialMoneyIsSimple ? initialPost.money : null;
    }
    return { unitAmount: amount, currency: salaryCurrency, object: salaryAnnual ? "post-money-single-annual" : "post-money-single" };
  }

  async function submit(action: "post" | "draft" | "schedule") {
    if (!canSubmit || pendingAction) return;
    let scheduledSeconds: number | null = null;
    if (action === "schedule") {
      if (!scheduleValue) return;
      const ms = new Date(scheduleValue).getTime();
      if (Number.isNaN(ms)) return;
      scheduledSeconds = Math.floor(ms / 1000);
    }

    setPendingAction(action);
    setError(null);

    const input: Record<string, unknown> = {
      object,
      title: title.trim(),
      content: content.trim(),
      links: linkUrl.trim() ? [{ title: "", url: linkUrl.trim() }] : [],
      location: location?.id ?? null,
      media: media.map((m) => m.doc),
      money: buildMoney(),
      tags: selectedTags,
      categories: category ? [category.value] : [],
      draft: action === "draft",
      scheduled: scheduledSeconds,
    };
    if (questions.length > 0) {
      input.apply = { questions: questions.map((q) => ({ question: q })) };
    }

    try {
      const endpoint = mode === "edit" ? "/api/posts/update" : "/api/posts/create";
      const body = mode === "edit" ? { id: initialPost!.id, input } : { input };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        setError(t("errorGeneric", lang));
        setPendingAction(null);
        return;
      }
      onSaved?.();
      onClose();
    } catch {
      setError(t("errorGeneric", lang));
      setPendingAction(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl dark:bg-neutral-950 sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            {mode === "edit" ? t("editTitle", lang) : t("createTitle", lang)}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("close", lang)} className="text-neutral-400 transition hover:text-neutral-900 dark:hover:text-neutral-50">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 grid grid-cols-2 gap-2">
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

          <div className="mb-4 flex flex-col gap-1.5">
            <label className={labelClass}>{t("titleLabel", lang)}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={object === "post-job-employing" ? t("titlePlaceholderHiring", lang) : t("titlePlaceholderSeeking", lang)}
              className={inputClass}
            />
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <label className={labelClass}>{t("descriptionLabel", lang)}</label>
              <span
                title={object === "post-job-employing" ? t("descriptionTipsHiring", lang) : t("descriptionTipsSeeking", lang)}
                className="flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-neutral-300 text-[9px] text-neutral-400 dark:border-neutral-600"
              >
                i
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={object === "post-job-employing" ? t("descriptionTipsHiring", lang) : t("descriptionTipsSeeking", lang)}
              rows={4}
              className={inputClass + " resize-none"}
            />
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
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => onLocationQueryChange(e.target.value)}
                  placeholder={t("locationPlaceholder", lang)}
                  className={inputClass}
                  autoComplete="off"
                />
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
                        }}
                        className="block w-full truncate px-3.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="relative mb-4 flex flex-col gap-1.5">
            <label className={labelClass}>{t("categoryLabel", lang)}</label>
            <input
              type="text"
              value={categoryOpen ? categoryQuery : (category?.text ?? "")}
              onFocus={() => {
                setCategoryOpen(true);
                setCategoryQuery("");
              }}
              onChange={(e) => setCategoryQuery(e.target.value)}
              onBlur={() => setTimeout(() => setCategoryOpen(false), 120)}
              placeholder={t("categoryPlaceholder", lang)}
              className={inputClass}
              autoComplete="off"
            />
            {categoryOpen && (
              <div className="absolute top-full z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
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
                    {c.text}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <label className={labelClass}>{t("linkLabel", lang)}</label>
            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder={t("linkPlaceholder", lang)} className={inputClass} />
          </div>

          {workTypeTags.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              <span className={labelClass}>{t("workType", lang)}</span>
              <div className="flex flex-wrap gap-1.5">
                {workTypeTags.map((tg) => (
                  <button key={tg.value} type="button" onClick={() => toggleTag(tg.value)} className={pillClass(selectedTags.includes(tg.value))}>
                    {tg.text}
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
                    {tg.text}
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
                    {tg.text}
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
                    {tg.text}
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

          <div className="mb-4 flex flex-col gap-1.5">
            <label className={labelClass}>{t("salaryLabel", lang)}</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="0"
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
                placeholder={t("salaryPlaceholder", lang)}
                className={inputClass + " flex-1"}
              />
              <select value={salaryCurrency} onChange={(e) => setSalaryCurrency(e.target.value)} className={inputClass + " w-24 shrink-0"}>
                {bootstrap.currencies.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.value.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSalaryAnnual((v) => !v)}
                title={salaryAnnual ? t("perYear", lang) : t("perMonth", lang)}
                className="flex shrink-0 items-center gap-1 rounded-xl border border-neutral-300 px-2.5 text-neutral-500 transition hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-50"
              >
                <SwapIcon />
              </button>
            </div>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">{salaryAnnual ? t("perYear", lang) : t("perMonth", lang)}</span>
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
              {media.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-600 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-500"
                >
                  {uploading ? (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-spin" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <PlusSquareIcon />
                  )}
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
          </div>

          {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="border-t border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
          {scheduleOpen && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-neutral-100 p-2 dark:bg-neutral-900">
              <input
                type="datetime-local"
                value={scheduleValue}
                onChange={(e) => setScheduleValue(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
              />
              <button type="button" onClick={() => setScheduleOpen(false)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50">
                {t("scheduleCancel", lang)}
              </button>
              <button
                type="button"
                onClick={() => submit("schedule")}
                disabled={!canSubmit || !scheduleValue || pendingAction !== null}
                className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {t("scheduleConfirm", lang)}
              </button>
            </div>
          )}

          {!canSubmit && <p className="mb-2 text-xs text-neutral-400 dark:text-neutral-500">{t("requiredHint", lang)}</p>}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScheduleOpen((v) => !v)}
              aria-label={t("schedulePost", lang)}
              disabled={!canSubmit}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 transition hover:text-neutral-900 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-50"
            >
              <ClockIcon />
            </button>
            <button
              type="button"
              onClick={() => submit("draft")}
              disabled={!canSubmit || pendingAction !== null}
              className="rounded-full border border-neutral-300 px-3.5 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {t("saveDraft", lang)}
            </button>
            <button
              type="button"
              onClick={() => submit("post")}
              disabled={!canSubmit || pendingAction !== null}
              className="flex-1 rounded-full bg-accent py-2.5 text-sm font-bold tracking-wide text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {mode === "edit" ? t("saveChanges", lang) : t("post", lang)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
