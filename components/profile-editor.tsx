// components/profile-editor.tsx
//
// 2026-08-30 (Aleksandr, from two screenshots of his own "Al Ex" profile
// card): the full profile-editing dialog — every field
// account.updateProfile accepts (ProfileInputSchema / EditableProfileSchema,
// lib/a1/schemas.ts), not a phased subset. "Да, со всех полей." Modeled
// directly on components/post-editor.tsx's own dialog (same chrome, same
// bootstrap-then-edit-then-save shape, same client-side compression
// approach for photos) since that component is this codebase's only
// precedent for "a big multi-section CRUD dialog talking to the A1 API."
//
// Field-by-field requirements, all from that same message:
//   - Photos: max 3, client-compressed to ~200-300KB each — copies
//     post-editor.tsx's compressImage() verbatim (same constants, same
//     canvas-resize-then-step-down-JPEG-quality approach). The first
//     photo doubles as the profile avatar (lib/a1/user-mappers.ts:
//     avatarUrl = photos[0]) — called out in the section hint rather
//     than left as a silent surprise.
//   - Voice intro: "Голосовая визитка у нас тоже проходит звуковую
//     очистку и сжимается, посмотри как это у нас сделано" — turned out
//     nothing existed to look at (components/voice-intro-context.tsx is
//     playback-only, confirmed by full read). Built fresh below:
//     getUserMedia's raw mic stream is routed through a small live
//     Web Audio graph (highpass filter to cut low rumble, then a
//     DynamicsCompressorNode to even out loudness — literally "audio
//     cleanup + compression") before MediaRecorder ever sees it, and
//     the recorder itself encodes opus at a capped 64kbps — a second,
//     file-size sense of "compression" — instead of the browser's much
//     larger default bitrate. No mobile-app internals were available to
//     reverse-engineer here (native app code, not this web repo), so
//     this is a from-scratch design matching the ASK ("cleaned up and
//     compressed"), not a port of an existing implementation.
//   - Edit-button placement: see components/edit-profile-button.tsx and
//     its call site in app/u/[username]/page.tsx.
//   - Favorite books/movies/games: this dialog only collects title(+
//     author) text — the attractive cover art the profile page renders
//     (lib/covers.ts, resolved by title against OpenLibrary/TMDB/RAWG)
//     is a RENDER-time lookup, confirmed by reading that file and its
//     one call site (app/u/[username]/page.tsx's favoriteTile()); there
//     is no cover-picking UI to build here.
//   - Occupation: "та же штука, что и при онбординге, там у нас
//     коты-анимации с фоном" — reuses <OccupationIcon background={true}>,
//     the ORIGINAL (non-"-nobg") variant app/onboarding/profile/
//     profile-setup-form.tsx already uses, not the plain profile-page
//     background={false} one.
//   - "Поля естественно тоже должны быть CRUD" — every list field
//     (links, companies, education, skills, languages, favorites) has
//     its own add/edit/remove controls in this dialog's local state.
//     Deliberately NOT one API call per list-item edit though: this
//     dialog holds the visitor's whole editable profile as one local
//     snapshot (bootstrapped once from GET /api/account/profile-editor/
//     bootstrap) and a single "Save" button persists the entire
//     snapshot via POST /api/account/profile-editor/update — the CRUD
//     the request asked for is real (add/edit/remove any entry, freely,
//     before saving), it just batches into one write, the same way this
//     component's own form fields already would.
//
// Explicitly OUT of scope here: the animated-gradient display name
// Aleksandr also asked for ("На имя можнно настраивать прикольный
// градиент с анимацией") — confirmed via exhaustive search that nothing
// like it exists anywhere in this web codebase yet, and he's sending a
// screenshot/video of the mobile app's version before this attempts to
// reverse-engineer or replicate it. Not built here; revisit once that
// reference material arrives.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LOCALES, LOCALE_CLASS, LOCALE_TAG, type Locale } from "@/components/t";
import { OccupationIcon } from "@/components/occupation-icon";
import { OCCUPATION_LABELS } from "@/components/occupation-labels";
import { WORK_STYLE_PREFERENCE_SECTIONS } from "@/components/work-style-labels";
// Value import from the client-safe standalone module, NOT lib/a1/
// datasets.ts directly — that file's own real dependency chain (lib/a1/
// client.ts -> lib/a1/auth.ts, the server-only service-account token
// cache) must never end up in this "use client" component's bundle. See
// lib/work-style-keys.ts's header comment. Category/WorkStylePreferencesDataset
// below are `import type` only, which TypeScript fully erases, so those
// two are safe to pull from lib/a1/datasets.ts itself.
import { WORK_STYLE_DATASET_KEYS } from "@/lib/work-style-keys";
import { translateHobbyGroup, translateHobbyItem, translateWorkInterest, translateWorkStyleOption, translateCompanyCategory } from "@/lib/pill-translations";
import type { Category, WorkStylePreferencesDataset } from "@/lib/a1/datasets";
import type { EditableProfile, MediaDocument } from "@/lib/a1/schemas";
import { PhotoCropModal } from "@/components/photo-crop-modal";
// Plain bit math, no dependency chain — safe to import into this client
// component the same way lib/work-style-keys.ts is (see that file's own
// header comment for the class of bug this avoids).
import { canShowPhone, canShowDob } from "@/lib/a1/user-flags";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import { authFetch } from "@/lib/auth-fetch";

// ---------------------------------------------------------------------------
// Constants shared with components/post-editor.tsx's own photo handling —
// same numbers, same reasoning ("фото повинні стискатися і зберігатися в
// розмірі макс 200-300 кб на шт").
// ---------------------------------------------------------------------------
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 300 * 1024;
const MAX_PHOTO_DIMENSION = 1600;
// 2026-08-30, live-testing feedback: "вона кстати не до 60, а до 120 сек" —
// the voice intro's real limit is double what this was built against.
const VOICE_MAX_SECONDS = 120;
const VOICE_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
const VOICE_BITRATE = 64000;

// 2026-08-30, live-testing feedback ("Языки можно добавлять до 10",
// "Хоби до 5", "Компании вроде до 10 (проверь)") — caps on the three
// list fields that can otherwise grow unbounded. None of these are
// independently confirmed against a real backend-side limit (the ask was
// phrased as Aleksandr's own recollection, "вроде", for companies
// specifically) — enforced here as a client-side UX cap either way,
// consistent with the fixed MAX_PHOTOS above.
const MAX_LANGUAGES = 10;
const MAX_HOBBIES = 5;
const MAX_COMPANIES = 10;

// 2026-08-30, live-testing feedback ("отдельная кнопка 'present' которая
// будет показывать, что до сейчас"): the value written into a company's
// positionEnd field when the "Present" toggle is on -- see the Companies
// section's own isPositionOngoing comment for why this is a plain string
// sentinel rather than a dedicated boolean field.
const PRESENT_SENTINEL = "Present";

const OCCUPATION_VALUES = ["entrepreneur", "professional", "freelancer"] as const;
type OccupationValue = (typeof OCCUPATION_VALUES)[number];

// A curated common-language list for the searchable picker below —
// Resource.User.languages[].value is a bare ISO 639-1 code with no
// dataset.* lookup of its own (confirmed: lib/format.ts's
// formatLanguageName() already resolves these via Intl.DisplayNames
// rather than a backend-provided list), so there is nothing to fetch
// here. This is deliberately a practical subset, not the full ISO list —
// a language missing from it can still be typed directly into the
// filter box (see languageOptions below, which always includes an exact
// typed code even if unlisted).
const COMMON_LANGUAGE_CODES = [
  "en", "es", "fr", "de", "it", "pt", "ru", "uk", "pl", "zh", "ja", "ko", "ar", "hi", "tr",
  "nl", "sv", "no", "da", "fi", "cs", "el", "he", "th", "vi", "id", "ms", "ro", "hu", "bg",
  "hr", "sk", "sr", "fa", "ur", "bn", "ta", "sw", "et", "lt", "lv", "sl",
];

// ---------------------------------------------------------------------------
// i18n — same STRINGS/t() pattern as components/post-editor.tsx.
// ---------------------------------------------------------------------------
type StringKey =
  | "dialogTitle" | "close" | "save" | "saving" | "saveFailed" | "saveFailedCategoryRequired" | "saveFailedInvalidLink" | "notSignedIn"
  | "closeConfirmTitle" | "closeConfirmBody" | "continueEditing" | "discardClose"
  | "sectionBasic" | "sectionPhotos" | "sectionVoice" | "sectionLinks" | "sectionCompanies"
  | "sectionEducation" | "sectionSkills" | "sectionLanguages" | "sectionHobbies"
  | "sectionInterests" | "sectionFavorites" | "sectionWorkStyle"
  | "usernameLabel" | "usernamePlaceholder"
  | "phoneLabel" | "phonePlaceholder" | "dobLabel" | "showOnProfile"
  | "firstNameLabel" | "lastNameLabel" | "bioLabel" | "bioPlaceholder"
  | "profileTitleLabel" | "profileTitlePlaceholder" | "occupationLabel"
  | "expertiseLabel" | "expertisePlaceholder" | "locationLabel" | "locationPlaceholder"
  | "locationEmpty" | "locationSearching" | "locationClear"
  | "photoHint" | "photoTooMany" | "photoTooBig" | "photoUploadFailed" | "photoUploadQuotaExceeded"
  | "voiceHint" | "recordStart" | "recordStop" | "recordUploading" | "recordFailed" | "uploadAudioFile" | "processingAudio"
  | "removeVoice" | "micDenied" | "recordNotSupported" | "playVoice"
  | "linkTitlePlaceholder" | "linkUrlPlaceholder" | "addLink"
  | "companyNamePlaceholder" | "companyDescriptionPlaceholder" | "companyCategoryPlaceholder"
  | "companyCategoryEmpty" | "companyPositionTitlePlaceholder" | "companyPositionStartPlaceholder"
  | "companyPositionEndPlaceholder" | "companyPresent" | "companyEmployeesPlaceholder"
  | "companyLinkUrlPlaceholder"
  | "addCompany" | "companyUntitled"
  | "educationPlaceholder" | "addEducation"
  | "skillNamePlaceholder" | "skillLevelLabel" | "addSkill"
  | "languagePlaceholder" | "languageLevelLabel" | "levelBeginner" | "levelElementary"
  | "levelIntermediate" | "levelAdvanced" | "levelNative" | "addLanguage"
  | "favoriteBooksLabel" | "favoriteMoviesLabel" | "favoriteGamesLabel"
  | "titlePlaceholder" | "authorPlaceholder" | "addItem"
  | "addAria" | "removeAria" | "loadFailed";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  dialogTitle: {
    uk: "Редагувати профіль", en: "Edit profile", ru: "Редактировать профиль", de: "Profil bearbeiten",
    es: "Editar perfil", fr: "Modifier le profil", pl: "Edytuj profil", ptBR: "Editar perfil", zh: "编辑资料",
  },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭" },
  save: { uk: "Зберегти", en: "Save", ru: "Сохранить", de: "Speichern", es: "Guardar", fr: "Enregistrer", pl: "Zapisz", ptBR: "Salvar", zh: "保存" },
  saving: { uk: "Зберігаємо…", en: "Saving…", ru: "Сохраняем…", de: "Speichern…", es: "Guardando…", fr: "Enregistrement…", pl: "Zapisywanie…", ptBR: "Salvando…", zh: "保存中…" },
  saveFailed: {
    uk: "Не вдалося зберегти. Спробуйте ще раз.", en: "Couldn't save. Please try again.",
    ru: "Не удалось сохранить. Попробуйте ещё раз.", de: "Speichern fehlgeschlagen. Bitte erneut versuchen.",
    es: "No se pudo guardar. Inténtalo de nuevo.", fr: "Échec de l'enregistrement. Réessayez.",
    pl: "Nie udało się zapisać. Spróbuj ponownie.", ptBR: "Não foi possível salvar. Tente novamente.", zh: "保存失败,请重试。",
  },
  // 2026-08-30, live-testing feedback: a company that has anything typed
  // into it (name, description, position, etc.) but no category selected
  // used to be sent to account.updateProfile with `category: null` — this
  // codebase already confirmed once, the hard way (app/api/account/
  // update-profile/route.ts's own header comment), that the backend's
  // Company shape requires category to be a REAL value, not merely
  // present-but-null like every other company sub-field. Sending one
  // broke the entire profile save with no field-level indication of why.
  // Caught client-side now (see handleSave's own validation) instead of
  // round-tripping to the backend to find out again.
  saveFailedCategoryRequired: {
    uk: "Оберіть категорію компанії, позначеної нижче — без неї профіль не зберігається.",
    en: "Pick a category for the company marked below — the profile can't save without it.",
    ru: "Выберите категорию компании, отмеченной ниже — без неё профиль не сохранится.",
    de: "Wählen Sie eine Kategorie für das unten markierte Unternehmen — ohne sie kann das Profil nicht gespeichert werden.",
    es: "Elige una categoría para la empresa marcada abajo — el perfil no se puede guardar sin ella.",
    fr: "Choisissez une catégorie pour l'entreprise indiquée ci-dessous — le profil ne peut pas être enregistré sans elle.",
    pl: "Wybierz kategorię firmy zaznaczonej poniżej — bez tego profilu nie da się zapisać.",
    ptBR: "Escolha uma categoria para a empresa marcada abaixo — o perfil não pode ser salvo sem ela.",
    zh: "请为下方标记的公司选择一个类别——否则无法保存资料。",
  },
  // 2026-08-31, live-testing feedback ("Показывай ошибку если нет
  // расширения [у ссылки]"): the URL fields (top-level Links section and
  // each company's own link) accepted any plain text at all -- e.g. the
  // literal word "Link" (screenshot: someone had typed it straight into
  // the URL field, whether by mistake or a stray autofill) -- with zero
  // feedback that it isn't a usable link. Caught client-side in
  // handleSave now, same "block + highlight the offending row(s)" pattern
  // as saveFailedCategoryRequired above, via isPlausibleUrl().
  saveFailedInvalidLink: {
    uk: "Посилання, позначене нижче, не схоже на справжню URL-адресу (потрібен домен із розширенням, напр. .com).",
    en: "The link marked below doesn't look like a real URL (needs a domain with an extension, e.g. .com).",
    ru: "Ссылка, отмеченная ниже, не похожа на настоящий URL (нужен домен с расширением, напр. .com).",
    de: "Der unten markierte Link sieht nicht wie eine echte URL aus (braucht eine Domain mit Endung, z. B. .com).",
    es: "El enlace marcado abajo no parece una URL real (necesita un dominio con extensión, p. ej. .com).",
    fr: "Le lien indiqué ci-dessous ne ressemble pas à une vraie URL (il faut un domaine avec une extension, p. ex. .com).",
    pl: "Link zaznaczony poniżej nie wygląda na prawdziwy adres URL (potrzebna domena z rozszerzeniem, np. .com).",
    ptBR: "O link marcado abaixo não parece uma URL real (precisa de um domínio com extensão, ex.: .com).",
    zh: "下方标记的链接看起来不是有效的网址(需要带扩展名的域名,例如 .com)。",
  },
  notSignedIn: {
    uk: "Сесію завершено. Увійдіть ще раз.", en: "Your session ended. Please sign in again.",
    ru: "Сессия завершена. Войдите ещё раз.", de: "Sitzung beendet. Bitte erneut anmelden.",
    es: "Tu sesión terminó. Inicia sesión de nuevo.", fr: "Session terminée. Reconnectez-vous.",
    pl: "Sesja wygasła. Zaloguj się ponownie.", ptBR: "Sessão encerrada. Faça login novamente.", zh: "会话已结束,请重新登录。",
  },
  closeConfirmTitle: {
    uk: "Закрити без збереження?", en: "Close without saving?", ru: "Закрыть без сохранения?",
    de: "Ohne Speichern schließen?", es: "¿Cerrar sin guardar?", fr: "Fermer sans enregistrer ?",
    pl: "Zamknąć bez zapisywania?", ptBR: "Fechar sem salvar?", zh: "不保存就关闭?",
  },
  closeConfirmBody: {
    uk: "Ваші зміни в профілі не буде збережено.", en: "Your profile changes won't be saved.",
    ru: "Ваши изменения в профиле не будут сохранены.", de: "Ihre Profiländerungen werden nicht gespeichert.",
    es: "No se guardarán los cambios en tu perfil.", fr: "Vos modifications de profil ne seront pas enregistrées.",
    pl: "Zmiany w profilu nie zostaną zapisane.", ptBR: "Suas alterações de perfil não serão salvas.", zh: "您的资料更改将不会保存。",
  },
  continueEditing: { uk: "Продовжити редагування", en: "Continue editing", ru: "Продолжить редактирование", de: "Weiter bearbeiten", es: "Seguir editando", fr: "Continuer à modifier", pl: "Kontynuuj edycję", ptBR: "Continuar editando", zh: "继续编辑" },
  discardClose: { uk: "Закрити без збереження", en: "Discard and close", ru: "Закрыть без сохранения", de: "Verwerfen und schließen", es: "Descartar y cerrar", fr: "Ignorer et fermer", pl: "Odrzuć i zamknij", ptBR: "Descartar e fechar", zh: "放弃并关闭" },
  sectionBasic: { uk: "Основне", en: "Basics", ru: "Основное", de: "Grundlagen", es: "Datos básicos", fr: "Informations de base", pl: "Podstawy", ptBR: "Informações básicas", zh: "基本信息" },
  sectionPhotos: { uk: "Фото", en: "Photos", ru: "Фото", de: "Fotos", es: "Fotos", fr: "Photos", pl: "Zdjęcia", ptBR: "Fotos", zh: "照片" },
  sectionVoice: { uk: "Голосова візитка", en: "Voice intro", ru: "Голосовая визитка", de: "Sprachvorstellung", es: "Presentación de voz", fr: "Présentation vocale", pl: "Wizytówka głosowa", ptBR: "Apresentação em áudio", zh: "语音简介" },
  sectionLinks: { uk: "Посилання", en: "Links", ru: "Ссылки", de: "Links", es: "Enlaces", fr: "Liens", pl: "Linki", ptBR: "Links", zh: "链接" },
  sectionCompanies: { uk: "Компанії", en: "Companies", ru: "Компании", de: "Unternehmen", es: "Empresas", fr: "Entreprises", pl: "Firmy", ptBR: "Empresas", zh: "公司" },
  sectionEducation: { uk: "Освіта", en: "Education", ru: "Образование", de: "Ausbildung", es: "Educación", fr: "Formation", pl: "Edukacja", ptBR: "Educação", zh: "教育经历" },
  sectionSkills: { uk: "Навички", en: "Skills", ru: "Навыки", de: "Fähigkeiten", es: "Habilidades", fr: "Compétences", pl: "Umiejętności", ptBR: "Habilidades", zh: "技能" },
  sectionLanguages: { uk: "Мови", en: "Languages", ru: "Языки", de: "Sprachen", es: "Idiomas", fr: "Langues", pl: "Języki", ptBR: "Idiomas", zh: "语言" },
  sectionHobbies: { uk: "Хобі", en: "Hobbies", ru: "Хобби", de: "Hobbys", es: "Aficiones", fr: "Loisirs", pl: "Hobby", ptBR: "Hobbies", zh: "爱好" },
  sectionInterests: { uk: "Інтереси в роботі", en: "Work interests", ru: "Интересы в работе", de: "Berufliche Interessen", es: "Intereses laborales", fr: "Intérêts professionnels", pl: "Zainteresowania zawodowe", ptBR: "Interesses profissionais", zh: "工作兴趣" },
  sectionFavorites: { uk: "Улюблене", en: "Favorites", ru: "Избранное", de: "Favoriten", es: "Favoritos", fr: "Favoris", pl: "Ulubione", ptBR: "Favoritos", zh: "收藏" },
  sectionWorkStyle: { uk: "Стиль роботи", en: "Work style", ru: "Стиль работы", de: "Arbeitsstil", es: "Estilo de trabajo", fr: "Style de travail", pl: "Styl pracy", ptBR: "Estilo de trabalho", zh: "工作风格" },
  // 2026-08-30, live-testing feedback: "Ти пропустив нікнейм?" — added,
  // see EditableProfileSchema/ProfileInputSchema's own comments on why
  // this wasn't already there and why the write side isn't confirmed.
  usernameLabel: { uk: "Нікнейм", en: "Username", ru: "Никнейм", de: "Benutzername", es: "Nombre de usuario", fr: "Nom d'utilisateur", pl: "Nazwa użytkownika", ptBR: "Nome de usuário", zh: "用户名" },
  usernamePlaceholder: { uk: "напр. alex_dev", en: "e.g. alex_dev", ru: "напр. alex_dev", de: "z. B. alex_dev", es: "p. ej. alex_dev", fr: "ex. alex_dev", pl: "np. alex_dev", ptBR: "ex.: alex_dev", zh: "例如 alex_dev" },
  // 2026-08-30, live-testing feedback: "Пропущено поля телефон і дата
  // народження (ці поля можна ховати з профілю тогглом)."
  phoneLabel: { uk: "Телефон", en: "Phone", ru: "Телефон", de: "Telefon", es: "Teléfono", fr: "Téléphone", pl: "Telefon", ptBR: "Telefone", zh: "电话" },
  // 2026-08-30, live-testing feedback: "тут, наверное, не показывай плюс
  // три восемь ноль, потому что это код Украины, а он может быть же
  // любым каким-то другим" -- "+380…" hard-coded Ukraine's own country
  // code as if every visitor's number started with it. Swapped for a
  // country-neutral instruction (include your own country code) instead
  // of guessing at a "generic-looking" fake number, since any digit
  // string here (+1…, +44…, etc.) would just repeat the same mistake for
  // a different country.
  phonePlaceholder: { uk: "+код країни і номер", en: "+country code and number", ru: "+код страны и номер", de: "+Landesvorwahl und Nummer", es: "+código de país y número", fr: "+indicatif du pays et numéro", pl: "+numer kierunkowy kraju i numer", ptBR: "+código do país e número", zh: "+国家代码和号码" },
  dobLabel: { uk: "Дата народження", en: "Date of birth", ru: "Дата рождения", de: "Geburtsdatum", es: "Fecha de nacimiento", fr: "Date de naissance", pl: "Data urodzenia", ptBR: "Data de nascimento", zh: "出生日期" },
  showOnProfile: { uk: "Показувати в профілі", en: "Show on profile", ru: "Показывать в профиле", de: "Im Profil anzeigen", es: "Mostrar en el perfil", fr: "Afficher sur le profil", pl: "Pokaż w profilu", ptBR: "Mostrar no perfil", zh: "在资料中显示" },
  firstNameLabel: { uk: "Ім'я", en: "First name", ru: "Имя", de: "Vorname", es: "Nombre", fr: "Prénom", pl: "Imię", ptBR: "Nome", zh: "名字" },
  lastNameLabel: { uk: "Прізвище", en: "Last name", ru: "Фамилия", de: "Nachname", es: "Apellido", fr: "Nom", pl: "Nazwisko", ptBR: "Sobrenome", zh: "姓氏" },
  bioLabel: { uk: "Про себе", en: "Bio", ru: "О себе", de: "Über mich", es: "Biografía", fr: "Bio", pl: "O mnie", ptBR: "Bio", zh: "简介" },
  bioPlaceholder: {
    uk: "Розкажіть трохи про себе", en: "Tell people a bit about yourself", ru: "Расскажите немного о себе",
    de: "Erzählen Sie etwas über sich", es: "Cuéntanos un poco sobre ti", fr: "Parlez un peu de vous",
    pl: "Opowiedz o sobie", ptBR: "Conte um pouco sobre você", zh: "简单介绍一下自己",
  },
  profileTitleLabel: { uk: "Заголовок профілю", en: "Profile title", ru: "Заголовок профиля", de: "Profiltitel", es: "Título del perfil", fr: "Titre du profil", pl: "Tytuł profilu", ptBR: "Título do perfil", zh: "个人主页标题" },
  profileTitlePlaceholder: {
    uk: "Наприклад, «Senior Frontend розробник»", en: "e.g. \"Senior Frontend Developer\"",
    ru: "Например, «Senior Frontend разработчик»", de: "z. B. „Senior Frontend-Entwickler“",
    es: "Ej.: «Desarrollador Frontend Senior»", fr: "Ex. : « Développeur Frontend Senior »",
    pl: "Np. „Senior Frontend Developer”", ptBR: "Ex.: \"Desenvolvedor Frontend Sênior\"", zh: "例如“高级前端开发工程师”",
  },
  // 2026-08-30, live-testing feedback: "там де 'я' — надо 'діяльність'".
  // Only uk changed, same conservative scope as OCCUPATION_LABELS' own
  // 2026-08-30 correction right above it in this dialog.
  occupationLabel: { uk: "Діяльність", en: "I am a...", ru: "Я...", de: "Ich bin...", es: "Soy...", fr: "Je suis...", pl: "Jestem...", ptBR: "Eu sou...", zh: "我是..." },
  // 2026-08-30, live-testing feedback: "Роль і навички — вроде у нас
  // називається 'професійна роль'" — Aleksandr's own phrasing was hedged
  // ("вроде", "I think"), not a flat correction, but it's the only lead
  // available without app access from this session; renamed to match.
  // Re-check against the app directly if this turns out wrong.
  expertiseLabel: { uk: "Професійна роль", en: "Professional role", ru: "Профессиональная роль", de: "Berufliche Rolle", es: "Rol profesional", fr: "Rôle professionnel", pl: "Rola zawodowa", ptBR: "Função profissional", zh: "职业角色" },
  expertisePlaceholder: {
    uk: "Розробник, Засновник, Дизайнер", en: "Developer, Founder, Designer", ru: "Разработчик, Основатель, Дизайнер",
    de: "Entwickler, Gründer, Designer", es: "Desarrollador, Fundador, Diseñador", fr: "Développeur, Fondateur, Designer",
    pl: "Programista, Założyciel, Projektant", ptBR: "Desenvolvedor, Fundador, Designer", zh: "开发者、创始人、设计师",
  },
  locationLabel: { uk: "Місцезнаходження", en: "Location", ru: "Местоположение", de: "Standort", es: "Ubicación", fr: "Localisation", pl: "Lokalizacja", ptBR: "Localização", zh: "所在地" },
  locationPlaceholder: { uk: "Пошук міста", en: "Search for a city", ru: "Поиск города", de: "Stadt suchen", es: "Buscar ciudad", fr: "Rechercher une ville", pl: "Szukaj miasta", ptBR: "Buscar cidade", zh: "搜索城市" },
  locationEmpty: { uk: "Нічого не знайдено", en: "No matches", ru: "Ничего не найдено", de: "Keine Treffer", es: "Sin resultados", fr: "Aucun résultat", pl: "Brak wyników", ptBR: "Nenhum resultado", zh: "无匹配结果" },
  locationSearching: { uk: "Пошук…", en: "Searching…", ru: "Поиск…", de: "Suche…", es: "Buscando…", fr: "Recherche…", pl: "Szukanie…", ptBR: "Buscando…", zh: "搜索中…" },
  locationClear: { uk: "Очистити", en: "Clear", ru: "Очистить", de: "Löschen", es: "Borrar", fr: "Effacer", pl: "Wyczyść", ptBR: "Limpar", zh: "清除" },
  photoHint: {
    uk: "До 3 фото. Перше фото — ваш аватар. Стискаються автоматично.",
    en: "Up to 3 photos. The first one is your avatar. Compressed automatically.",
    ru: "До 3 фото. Первое фото — ваш аватар. Сжимаются автоматически.",
    de: "Bis zu 3 Fotos. Das erste ist Ihr Avatar. Wird automatisch komprimiert.",
    es: "Hasta 3 fotos. La primera es tu avatar. Se comprimen automáticamente.",
    fr: "Jusqu'à 3 photos. La première est votre avatar. Compression automatique.",
    pl: "Do 3 zdjęć. Pierwsze to Twój awatar. Kompresowane automatycznie.",
    ptBR: "Até 3 fotos. A primeira é seu avatar. Compactadas automaticamente.",
    zh: "最多 3 张照片。第一张将作为头像,会自动压缩。",
  },
  photoTooMany: { uk: "Максимум 3 фото", en: "Maximum 3 photos", ru: "Максимум 3 фото", de: "Maximal 3 Fotos", es: "Máximo 3 fotos", fr: "3 photos maximum", pl: "Maksymalnie 3 zdjęcia", ptBR: "Máximo de 3 fotos", zh: "最多 3 张照片" },
  photoTooBig: { uk: "Файл занадто великий", en: "File is too large", ru: "Файл слишком большой", de: "Datei ist zu groß", es: "El archivo es demasiado grande", fr: "Le fichier est trop volumineux", pl: "Plik jest zbyt duży", ptBR: "O arquivo é muito grande", zh: "文件过大" },
  photoUploadFailed: { uk: "Не вдалося завантажити фото", en: "Couldn't upload photo", ru: "Не удалось загрузить фото", de: "Foto-Upload fehlgeschlagen", es: "No se pudo subir la foto", fr: "Échec de l'envoi de la photo", pl: "Nie udało się przesłać zdjęcia", ptBR: "Não foi possível enviar a foto", zh: "照片上传失败" },
  // 2026-09-02 (Aleksandr, native-app "Daily Uploads" screenshot: "лимит
  // по daily uploads на 1 пользователя 20 мб день, на вэбе надо тоже
  // прокинуть... Возьми всю логику с моб версии") -- lead-in only, the
  // byte figures + reset countdown are appended separately
  // (formatBytes/formatRelativeTime, lib/format.ts). Reused for both
  // uploadCroppedPhoto and uploadVoice below -- same account-wide quota
  // either way, not photo-specific despite this key's name matching
  // post-editor.tsx's own copy of it.
  photoUploadQuotaExceeded: {
    uk: "Досягнуто денний ліміт завантажень", en: "Daily upload limit reached", ru: "Достигнут дневной лимит загрузок",
    de: "Tägliches Upload-Limit erreicht", es: "Límite diario de subidas alcanzado", fr: "Limite quotidienne de téléversement atteinte",
    pl: "Osiągnięto dzienny limit przesyłania", ptBR: "Limite diário de envio atingido", zh: "已达每日上传上限",
  },
  voiceHint: {
    uk: `До ${VOICE_MAX_SECONDS} с. Запис автоматично очищується від шуму та стискається.`,
    en: `Up to ${VOICE_MAX_SECONDS}s. The recording is automatically cleaned up and compressed.`,
    ru: `До ${VOICE_MAX_SECONDS} с. Запись автоматически очищается от шума и сжимается.`,
    de: `Bis zu ${VOICE_MAX_SECONDS}s. Die Aufnahme wird automatisch bereinigt und komprimiert.`,
    es: `Hasta ${VOICE_MAX_SECONDS}s. La grabación se limpia y comprime automáticamente.`,
    fr: `Jusqu'à ${VOICE_MAX_SECONDS}s. L'enregistrement est nettoyé et compressé automatiquement.`,
    pl: `Do ${VOICE_MAX_SECONDS}s. Nagranie jest automatycznie oczyszczane i kompresowane.`,
    ptBR: `Até ${VOICE_MAX_SECONDS}s. A gravação é limpa e compactada automaticamente.`,
    zh: `最长 ${VOICE_MAX_SECONDS} 秒。录音会自动降噪并压缩。`,
  },
  recordStart: { uk: "Записати", en: "Record", ru: "Записать", de: "Aufnehmen", es: "Grabar", fr: "Enregistrer", pl: "Nagraj", ptBR: "Gravar", zh: "录音" },
  recordStop: { uk: "Зупинити", en: "Stop", ru: "Остановить", de: "Stopp", es: "Detener", fr: "Arrêter", pl: "Zatrzymaj", ptBR: "Parar", zh: "停止" },
  recordUploading: { uk: "Завантаження…", en: "Uploading…", ru: "Загрузка…", de: "Wird hochgeladen…", es: "Subiendo…", fr: "Envoi…", pl: "Przesyłanie…", ptBR: "Enviando…", zh: "上传中…" },
  // 2026-08-30, live-testing feedback: "В голосовій візитці треба додати
  // можливість підвантажити аудіофайл."
  uploadAudioFile: { uk: "Завантажити файл", en: "Upload file", ru: "Загрузить файл", de: "Datei hochladen", es: "Subir archivo", fr: "Envoyer un fichier", pl: "Prześlij plik", ptBR: "Enviar arquivo", zh: "上传文件" },
  processingAudio: { uk: "Обробка звуку…", en: "Processing audio…", ru: "Обработка звука…", de: "Audio wird verarbeitet…", es: "Procesando audio…", fr: "Traitement audio…", pl: "Przetwarzanie dźwięku…", ptBR: "Processando áudio…", zh: "处理音频中…" },
  recordFailed: { uk: "Не вдалося записати або завантажити", en: "Couldn't record or upload", ru: "Не удалось записать или загрузить", de: "Aufnahme oder Upload fehlgeschlagen", es: "No se pudo grabar o subir", fr: "Échec de l'enregistrement ou de l'envoi", pl: "Nie udało się nagrać lub przesłać", ptBR: "Não foi possível gravar ou enviar", zh: "录音或上传失败" },
  removeVoice: { uk: "Видалити запис", en: "Remove recording", ru: "Удалить запись", de: "Aufnahme entfernen", es: "Eliminar grabación", fr: "Supprimer l'enregistrement", pl: "Usuń nagranie", ptBR: "Remover gravação", zh: "删除录音" },
  micDenied: { uk: "Немає доступу до мікрофона", en: "Microphone access denied", ru: "Нет доступа к микрофону", de: "Kein Mikrofonzugriff", es: "Acceso al micrófono denegado", fr: "Accès au microphone refusé", pl: "Brak dostępu do mikrofonu", ptBR: "Acesso ao microfone negado", zh: "无法访问麦克风" },
  recordNotSupported: { uk: "Запис не підтримується цим браузером", en: "Recording isn't supported in this browser", ru: "Запись не поддерживается этим браузером", de: "Aufnahme wird von diesem Browser nicht unterstützt", es: "La grabación no es compatible con este navegador", fr: "L'enregistrement n'est pas pris en charge par ce navigateur", pl: "Nagrywanie nie jest obsługiwane w tej przeglądarce", ptBR: "A gravação não é compatível com este navegador", zh: "此浏览器不支持录音" },
  playVoice: { uk: "Відтворити", en: "Play", ru: "Воспроизвести", de: "Abspielen", es: "Reproducir", fr: "Lire", pl: "Odtwórz", ptBR: "Reproduzir", zh: "播放" },
  linkTitlePlaceholder: { uk: "Назва (необов'язково)", en: "Title (optional)", ru: "Название (необязательно)", de: "Titel (optional)", es: "Título (opcional)", fr: "Titre (facultatif)", pl: "Nazwa (opcjonalnie)", ptBR: "Título (opcional)", zh: "标题(可选)" },
  linkUrlPlaceholder: { uk: "https://…", en: "https://…", ru: "https://…", de: "https://…", es: "https://…", fr: "https://…", pl: "https://…", ptBR: "https://…", zh: "https://…" },
  addLink: { uk: "Додати посилання", en: "Add link", ru: "Добавить ссылку", de: "Link hinzufügen", es: "Añadir enlace", fr: "Ajouter un lien", pl: "Dodaj link", ptBR: "Adicionar link", zh: "添加链接" },
  companyNamePlaceholder: { uk: "Назва компанії", en: "Company name", ru: "Название компании", de: "Firmenname", es: "Nombre de la empresa", fr: "Nom de l'entreprise", pl: "Nazwa firmy", ptBR: "Nome da empresa", zh: "公司名称" },
  // 2026-08-30, live-testing feedback: "Подредактируй поля в «компании»,
  // должны быть только эти и нейминг должен совпадать" -- this key still
  // says "description" for historical reasons (matches the backend
  // field's own name, see ProfileInputCompanySchema.description's
  // comment in lib/a1/schemas.ts), but the visible label now matches the
  // mobile app's last field on this screen, "Додаткова інформація"/
  // "Additional info" -- confirmed via the mobile app's own screenshot,
  // both uk and en.
  companyDescriptionPlaceholder: { uk: "Додаткова інформація", en: "Additional info", ru: "Дополнительная информация", de: "Zusätzliche Informationen", es: "Información adicional", fr: "Informations complémentaires", pl: "Dodatkowe informacje", ptBR: "Informações adicionais", zh: "附加信息" },
  // 2026-08-30, live-testing feedback: "поменяй нейминг на 'сфера
  // діяльності'", then confirmed against the mobile app's own English
  // screenshot ("Sphere of activity") the same day -- both uk and en now
  // match the mobile app exactly.
  companyCategoryPlaceholder: { uk: "Сфера діяльності", en: "Sphere of activity", ru: "Отрасль", de: "Branche", es: "Industria", fr: "Secteur", pl: "Branża", ptBR: "Setor", zh: "行业" },
  companyCategoryEmpty: { uk: "Нічого не знайдено", en: "No matches", ru: "Ничего не найдено", de: "Keine Treffer", es: "Sin resultados", fr: "Aucun résultat", pl: "Brak wyników", ptBR: "Nenhum resultado", zh: "无匹配结果" },
  // 2026-08-30, live-testing feedback ("нейминг должен совпадать"),
  // confirmed against the mobile app's own screenshot: "Ваша посада в
  // компанії" / "Your position in company", not the shorter "Посада" /
  // "Role / title" this used to say.
  companyPositionTitlePlaceholder: { uk: "Ваша посада в компанії", en: "Your position in company", ru: "Ваша должность в компании", de: "Ihre Position im Unternehmen", es: "Tu puesto en la empresa", fr: "Votre poste dans l'entreprise", pl: "Twoje stanowisko w firmie", ptBR: "Seu cargo na empresa", zh: "您在公司的职位" },
  // 2026-08-30, live-testing feedback: briefly renamed to From/To, then
  // reverted the same day after follow-up screenshots showed the mobile
  // app's own "Start"/"End" labels in more detail (an expanding calendar
  // widget under each) -- asked whether to build that calendar too or
  // just keep plain text fields under the mobile app's actual naming;
  // answer was text fields, Start/End. Matching the mobile app's own
  // apparently-never-localized literal English wording, same reasoning
  // as this file's other "match the mobile app" renames today.
  companyPositionStartPlaceholder: { uk: "Start", en: "Start", ru: "Start", de: "Start", es: "Start", fr: "Start", pl: "Start", ptBR: "Start", zh: "Start" },
  companyPositionEndPlaceholder: { uk: "End", en: "End", ru: "End", de: "End", es: "End", fr: "End", pl: "End", ptBR: "End", zh: "End" },
  // 2026-08-30, live-testing feedback: "отдельная кнопка 'present' которая
  // будет показывать, что до сейчас" -- see PRESENT_SENTINEL's own
  // comment for how this toggle is represented in positionEnd.
  companyPresent: { uk: "Дотепер", en: "Present", ru: "По наст. время", de: "Aktuell", es: "Actual", fr: "Actuel", pl: "Obecnie", ptBR: "Atual", zh: "至今" },
  // 2026-08-30, live-testing feedback ("нейминг должен совпадать"): back
  // to the full "Кількість співробітників"/"Number of employees" per the
  // mobile app's own screenshot -- the 2026-08-30 "К-сть співроб." shortening
  // above was only needed because this used to share a cramped
  // grid-cols-3 row with Turnover/Founded (both removed just now, see
  // this company block's own comment, since neither exists in the
  // mobile app's form); alone in its own full-width row, the full
  // phrasing fits fine.
  companyEmployeesPlaceholder: { uk: "Кількість співробітників", en: "Number of employees", ru: "Количество сотрудников", de: "Anzahl der Mitarbeiter", es: "Número de empleados", fr: "Nombre d'employés", pl: "Liczba pracowników", ptBR: "Número de funcionários", zh: "员工人数" },
  // 2026-08-30, live-testing feedback ("Назва посилання 2 поля поломались,
  // должно быть просто 'посилання'"): this used to be two fields (a link
  // title + a URL) — collapsed to the single field below. `linkTitle`
  // itself is NOT removed from EditableCompany/handleSave: an existing
  // company's title (if the mobile app or an earlier save ever set one)
  // still round-trips unedited instead of being silently wiped, it's just
  // no longer exposed as its own input here.
  companyLinkUrlPlaceholder: { uk: "Посилання", en: "Link", ru: "Ссылка", de: "Link", es: "Enlace", fr: "Lien", pl: "Link", ptBR: "Link", zh: "链接" },
  addCompany: { uk: "Додати компанію", en: "Add company", ru: "Добавить компанию", de: "Unternehmen hinzufügen", es: "Añadir empresa", fr: "Ajouter une entreprise", pl: "Dodaj firmę", ptBR: "Adicionar empresa", zh: "添加公司" },
  companyUntitled: { uk: "Без назви", en: "Untitled company", ru: "Без названия", de: "Ohne Namen", es: "Sin nombre", fr: "Sans nom", pl: "Bez nazwy", ptBR: "Sem nome", zh: "未命名公司" },
  educationPlaceholder: { uk: "Навчальний заклад", en: "School or university", ru: "Учебное заведение", de: "Bildungseinrichtung", es: "Centro educativo", fr: "Établissement scolaire", pl: "Placówka edukacyjna", ptBR: "Instituição de ensino", zh: "教育机构" },
  addEducation: { uk: "Додати освіту", en: "Add education", ru: "Добавить образование", de: "Ausbildung hinzufügen", es: "Añadir educación", fr: "Ajouter une formation", pl: "Dodaj edukację", ptBR: "Adicionar educação", zh: "添加教育经历" },
  skillNamePlaceholder: { uk: "Навичка", en: "Skill", ru: "Навык", de: "Fähigkeit", es: "Habilidad", fr: "Compétence", pl: "Umiejętność", ptBR: "Habilidade", zh: "技能" },
  skillLevelLabel: { uk: "Рівень", en: "Level", ru: "Уровень", de: "Niveau", es: "Nivel", fr: "Niveau", pl: "Poziom", ptBR: "Nível", zh: "水平" },
  addSkill: { uk: "Додати навичку", en: "Add skill", ru: "Добавить навык", de: "Fähigkeit hinzufügen", es: "Añadir habilidad", fr: "Ajouter une compétence", pl: "Dodaj umiejętność", ptBR: "Adicionar habilidade", zh: "添加技能" },
  languagePlaceholder: { uk: "Пошук мови", en: "Search languages", ru: "Поиск языка", de: "Sprache suchen", es: "Buscar idioma", fr: "Rechercher une langue", pl: "Szukaj języka", ptBR: "Buscar idioma", zh: "搜索语言" },
  languageLevelLabel: { uk: "Рівень", en: "Level", ru: "Уровень", de: "Niveau", es: "Nivel", fr: "Niveau", pl: "Poziom", ptBR: "Nível", zh: "水平" },
  levelBeginner: { uk: "Початковий", en: "Beginner", ru: "Начальный", de: "Anfänger", es: "Principiante", fr: "Débutant", pl: "Początkujący", ptBR: "Iniciante", zh: "初级" },
  levelElementary: { uk: "Базовий", en: "Elementary", ru: "Базовый", de: "Grundkenntnisse", es: "Elemental", fr: "Élémentaire", pl: "Podstawowy", ptBR: "Elementar", zh: "基础" },
  levelIntermediate: { uk: "Середній", en: "Intermediate", ru: "Средний", de: "Mittelstufe", es: "Intermedio", fr: "Intermédiaire", pl: "Średnio zaawansowany", ptBR: "Intermediário", zh: "中级" },
  levelAdvanced: { uk: "Просунутий", en: "Advanced", ru: "Продвинутый", de: "Fortgeschritten", es: "Avanzado", fr: "Avancé", pl: "Zaawansowany", ptBR: "Avançado", zh: "高级" },
  levelNative: { uk: "Рідна", en: "Native", ru: "Родной", de: "Muttersprache", es: "Nativo", fr: "Langue maternelle", pl: "Ojczysty", ptBR: "Nativo", zh: "母语" },
  addLanguage: { uk: "Додати мову", en: "Add language", ru: "Добавить язык", de: "Sprache hinzufügen", es: "Añadir idioma", fr: "Ajouter une langue", pl: "Dodaj język", ptBR: "Adicionar idioma", zh: "添加语言" },
  favoriteBooksLabel: { uk: "Улюблені книги", en: "Favorite books", ru: "Любимые книги", de: "Lieblingsbücher", es: "Libros favoritos", fr: "Livres préférés", pl: "Ulubione książki", ptBR: "Livros favoritos", zh: "喜爱的书籍" },
  favoriteMoviesLabel: { uk: "Улюблені фільми", en: "Favorite movies", ru: "Любимые фильмы", de: "Lieblingsfilme", es: "Películas favoritas", fr: "Films préférés", pl: "Ulubione filmy", ptBR: "Filmes favoritos", zh: "喜爱的电影" },
  favoriteGamesLabel: { uk: "Улюблені ігри", en: "Favorite games", ru: "Любимые игры", de: "Lieblingsspiele", es: "Juegos favoritos", fr: "Jeux préférés", pl: "Ulubione gry", ptBR: "Jogos favoritos", zh: "喜爱的游戏" },
  titlePlaceholder: { uk: "Назва", en: "Title", ru: "Название", de: "Titel", es: "Título", fr: "Titre", pl: "Tytuł", ptBR: "Título", zh: "标题" },
  authorPlaceholder: { uk: "Автор (необов'язково)", en: "Author (optional)", ru: "Автор (необязательно)", de: "Autor (optional)", es: "Autor (opcional)", fr: "Auteur (facultatif)", pl: "Autor (opcjonalnie)", ptBR: "Autor (opcional)", zh: "作者(可选)" },
  addItem: { uk: "Додати", en: "Add", ru: "Добавить", de: "Hinzufügen", es: "Añadir", fr: "Ajouter", pl: "Dodaj", ptBR: "Adicionar", zh: "添加" },
  addAria: { uk: "Додати", en: "Add", ru: "Добавить", de: "Hinzufügen", es: "Añadir", fr: "Ajouter", pl: "Dodaj", ptBR: "Adicionar", zh: "添加" },
  removeAria: { uk: "Видалити", en: "Remove", ru: "Удалить", de: "Entfernen", es: "Eliminar", fr: "Supprimer", pl: "Usuń", ptBR: "Remover", zh: "删除" },
  loadFailed: {
    uk: "Не вдалося завантажити профіль для редагування.", en: "Couldn't load your profile for editing.",
    ru: "Не удалось загрузить профиль для редактирования.", de: "Profil konnte nicht zum Bearbeiten geladen werden.",
    es: "No se pudo cargar tu perfil para editar.", fr: "Impossible de charger le profil à modifier.",
    pl: "Nie udało się wczytać profilu do edycji.", ptBR: "Não foi possível carregar o perfil para edição.", zh: "无法加载资料以进行编辑。",
  },
};

function t(key: StringKey, lang: Locale): string {
  return STRINGS[key][lang];
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

// ---------------------------------------------------------------------------
// Shared visual classes — copied from components/post-editor.tsx so this
// dialog reads as the same design language.
// ---------------------------------------------------------------------------
const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/30 dark:border-neutral-700 dark:bg-black dark:text-neutral-100";
const labelClass = "text-xs font-medium text-neutral-500 dark:text-neutral-400";
const pillClass = (active: boolean) =>
  "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
  (active
    ? "border-accent bg-accent/10 text-accent"
    : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600");

function CloseIcon({ className }: { className?: string } = {}) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={"h-4 w-4 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500 " + (open ? "rotate-180" : "")}>
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Spinner({ className }: { className?: string }) {
  return (
    <svg className={"animate-spin " + (className ?? "h-4 w-4")} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M9 22h6" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
    </svg>
  );
}
function StopSquareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72c0 .84.93 1.36 1.65.92l10.57-6.86a1.06 1.06 0 0 0 0-1.84L9.65 4.22C8.93 3.78 8 4.3 8 5.14Z" />
    </svg>
  );
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

// 2026-08-31, live repro of "не сохраняется профиль" (the same session
// that found handleSave's `flags` bug below): account.updateProfile
// round-trips `dob` as a full ISO datetime ("1995-12-01T00:00:00.000Z"),
// confirmed against a throwaway test account, even though a save only
// ever sends the bare "YYYY-MM-DD" an `<input type="date">` produces.
// That mismatch made a previously-saved birth date silently render as an
// EMPTY field on reopen -- a native date input rejects anything that
// isn't exactly YYYY-MM-DD and just shows blank, no error -- which reads
// exactly like "my date of birth didn't save" even though it did. Slicing
// to the first 10 characters is a no-op for an already-bare date string,
// so this is safe either way the backend happens to answer.
function toDateInputValue(dob: string | null): string {
  return dob ? dob.slice(0, 10) : "";
}

// DOB needs real day precision (unlike Companies' From/To -- see
// parseYearMonth's own comment for why those only need month+year), so
// this is its own parse/build pair rather than reusing that one.
function parseFullDate(value: string): { year: string; month: string; day: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? { year: m[1]!, month: m[2]!, day: m[3]! } : { year: "", month: "", day: "" };
}
function buildFullDate(year: string, month: string, day: string): string {
  return year && month && day ? `${year}-${month}-${day}` : "";
}
const DOB_DAY_OPTIONS: string[] = Array.from({ length: 31 }, (_, i) => pad2(i + 1));
// A century back from this year -- generous enough for any real
// visitor's birth year without needing to bound it more precisely than
// the native date input already didn't.
const DOB_YEAR_OPTIONS: string[] = (() => {
  const max = new Date().getFullYear();
  const years: string[] = [];
  for (let y = max; y >= max - 100; y--) years.push(String(y));
  return years;
})();

// 2026-08-31, live-testing feedback: the Companies "From"/"To" dates used
// to be a native `<input type="date">` (matching the DOB field), but even
// after the min-w-0 overflow fix (see the grid wrapper's own comment a
// few lines below) Aleksandr's actual phone still showed the two fields
// wildly unequal in width/height -- native date-input chrome renders
// differently enough across browsers/OSes that we can't reliably pin its
// box to match a plain text input's, no matter how much CSS is thrown at
// it (same root cause as the DOB field's own "странная" sizing, filed as
// a separate note there). His fix: "раздели это поле, сделай двумя
// просто селекторами, типа равносценными по ширине" -- split each date
// into two plain <select> elements (month, year) instead, which render
// with completely ordinary, predictable box sizing everywhere. Nobody
// picks an exact DAY for "started working here" anyway, so month+year is
// no loss of precision that matters. Storage format is unchanged -- still
// the same plain "YYYY-MM-DD" string (day pinned to "01", which nothing
// downstream reads) so handleSave/PRESENT_SENTINEL/isPositionOngoing all
// keep working exactly as before; only the editor's own inputs change.
function parseYearMonth(value: string): { year: string; month: string } {
  const m = /^(\d{4})-(\d{2})/.exec(value);
  return m ? { year: m[1]!, month: m[2]! } : { year: "", month: "" };
}
function buildYearMonth(year: string, month: string): string {
  return year && month ? `${year}-${month}-01` : "";
}
// A reasonable career span -- 1960 through next year (someone entering a
// role that starts shortly) -- rather than trying to bound it any more
// precisely than the native date input already didn't.
function careerYearOptions(): string[] {
  const max = new Date().getFullYear() + 1;
  const years: string[] = [];
  for (let y = max; y >= 1960; y--) years.push(String(y));
  return years;
}
// Localized month abbreviations via Intl rather than hand-translating 12
// months across 9 locales -- same approach this file already uses for
// language display names (see languageDisplayNames below).
function monthSelectOptions(lang: Locale): { value: string; label: string }[] {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat(LOCALE_TAG[lang], { month: "short" });
  } catch {
    fmt = new Intl.DateTimeFormat("en", { month: "short" });
  }
  return Array.from({ length: 12 }, (_, i) => {
    const label = fmt.format(new Date(2000, i, 1));
    return { value: pad2(i + 1), label: label.charAt(0).toUpperCase() + label.slice(1) };
  });
}

// 2026-08-31, live-testing feedback ("Показывай ошибку если нет
// расширения"): the Links section's URL field (and each company's own
// link field) took any plain text at all, including something with no
// domain in it whatsoever (a live screenshot showed the literal word
// "Link" typed straight in). This is deliberately loose, not a strict
// RFC 3986 check -- it exists to catch "clearly not a URL" (no dot, no
// host) rather than to reject every unusual-but-real domain. A bare
// `new URL()` call alone isn't enough: `new URL("https://Link")` parses
// fine (hostname "link", zero dots) since the URL spec doesn't require a
// TLD, which is exactly the case this was written to catch -- so the
// hostname is additionally required to contain a dot, with a final
// label that's letters-only and at least two characters (an actual
// extension, not just any two characters after a dot).
//
// 2026-08-31, follow-up: this definition went missing from the version
// that reached origin/main -- handleSave/JSX below already referenced
// isPlausibleUrl (STRINGS.saveFailedInvalidLink, invalidLinkIds, etc.
// all shipped), but the function itself never landed, which meant every
// profile save was throwing "isPlausibleUrl is not defined" in
// production. Restoring it here.
function isPlausibleUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true; // empty is fine -- these fields are optional
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  let hostname: string;
  try {
    hostname = new URL(candidate).hostname;
  } catch {
    return false;
  }
  if (!hostname) return false;
  const labels = hostname.split(".");
  // 2026-08-31: labels[...] types as string | undefined under this
  // project's tsconfig (noUncheckedIndexedAccess) even though the guard
  // below (labels.length >= 2) makes it unreachable as undefined in
  // practice -- TS doesn't narrow across the two statements. This one
  // line broke `npm run build` on Vercel for every commit since this
  // function was restored (4bb9463) -- every push since then silently
  // failed to deploy while looking fine locally/in review. The ?? "" is
  // purely to satisfy the type; an empty string still correctly fails
  // the regex test below either way.
  const tld = labels[labels.length - 1] ?? "";
  return labels.length >= 2 && /^[a-zA-Z]{2,}$/.test(tld);
}

// Same helper components/post-editor.tsx's handleFileSelected() uses, for
// the same reason: a 401 whose refresh attempt also failed converts to
// this well-known message server-side (lib/a1/visitor-call.ts), and every
// caller should react to it by sending the visitor back to sign in
// instead of showing a generic upload/save error.
function isNotSignedIn(data: unknown): boolean {
  return typeof data === "object" && data !== null && (data as { message?: unknown }).message === "not_signed_in";
}

// Verbatim from components/post-editor.tsx (2026-08-29 round 2's own
// header comment explains the numbers): resize to a 1600px long edge,
// re-encode as JPEG, step quality down until under ~280KB. Falls back to
// the original file on any failure.
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

// Preview URL for a MediaDocument the profile already has (loaded from
// the bootstrap route), same inline route + query-string shape
// components/post-editor.tsx already uses for a post's existing media
// (app/api/media/[docId]/route.ts's own `size` param defaults to
// "size-photo" when omitted, which lib/a1/user-mappers.ts's
// buildMediaProxyUrl() already relies on for the voice intro too — see
// that file's own comment on why an audio doc gets the same param).
function mediaUrl(doc: MediaDocument): string {
  return `/api/media/${doc._id}?ref=${encodeURIComponent(doc.fileReference)}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

// ---------------------------------------------------------------------------
// Collapsible section wrapper — every field group below is one of these.
// ---------------------------------------------------------------------------
function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-neutral-100 py-3 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-neutral-900 dark:text-neutral-50"
      >
        {title}
        <ChevronIcon open={open} />
      </button>
      {open && <div className="mt-3 flex flex-col gap-3">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local editable shapes — mirrors of the read-side EditableProfile's own
// array item shapes, plus a client-only `id` for stable React keys and a
// couple of fields kept as strings (numbers-as-typed, parsed on save)
// so a half-typed number never fights the input's own cursor.
// ---------------------------------------------------------------------------
type EditableLink = { id: string; title: string; url: string };
type EditableCompany = {
  id: string;
  name: string;
  description: string;
  positionTitle: string;
  positionStart: string;
  positionEnd: string;
  employeesCount: string;
  category: Category | null;
  turnover: string;
  est: string;
  linkTitle: string;
  linkUrl: string;
};
type EditableSkill = { id: string; value: string; level: number };
type EditableLanguage = { id: string; value: string; level: number };
type EditableBook = { id: string; title: string; author: string };
type EditableTitleItem = { id: string; title: string };
type EditableLocation = { id: number; label: string };

type Bootstrap = {
  profile: EditableProfile;
  companyCategories: Category[];
  hobbyGroups: { group: string; items: { value: number; text: string }[] }[];
  workInterests: Category[];
  workStylePreferences: WorkStylePreferencesDataset;
};

export function ProfileEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  // 2026-08-31, live report ("После сохранения профиля -- страница не
  // найдена"): passes the NEW username when this save actually changed
  // it, so the caller (components/edit-profile-button.tsx) can navigate
  // there instead of refreshing the current (now-stale) `/u/oldUsername`
  // route -- see that file's own onSaved comment for the full story.
  onSaved: (newUsername?: string) => void;
}) {
  const lang = useActiveLocale();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);

  const [saving, setSaving] = useState(false);
  // Holds which error string to show, or null for "no error" — a plain
  // boolean stopped being enough once handleSave gained a second,
  // more specific failure message (saveFailedCategoryRequired below).
  const [saveErrorKey, setSaveErrorKey] = useState<StringKey | null>(null);
  // Client-only ids of company rows with content but no category picked —
  // see handleSave and STRINGS.saveFailedCategoryRequired's own comment.
  const [invalidCompanyIds, setInvalidCompanyIds] = useState<Set<string>>(new Set());
  // Same idea, for URL fields that don't look like a real link — see
  // handleSave and isPlausibleUrl()/STRINGS.saveFailedInvalidLink. Two
  // separate sets since a link and a company are different row types
  // with different ids (a company can be flagged for a bad category AND
  // a bad link at once, so this can't reuse invalidCompanyIds).
  const [invalidLinkIds, setInvalidLinkIds] = useState<Set<string>>(new Set());
  const [invalidCompanyLinkIds, setInvalidCompanyLinkIds] = useState<Set<string>>(new Set());
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  // ---- basic info ----
  const [username, setUsername] = useState("");
  // 2026-08-30/31, live-testing feedback: phone/DOB, each hideable from
  // the public profile via lib/a1/user-flags.ts's SHOW_PHONE_NUMBER/
  // SHOW_DOB bits for the READ side. For WRITE, account.updateProfile
  // takes its own plain `showPhoneNumber`/`showDob` booleans (see
  // ProfileInputSchema's own comment) — no bitmask read-modify-write
  // needed, so no raw flags int is kept in state any more.
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dob, setDob] = useState("");
  const [showPhone, setShowPhone] = useState(false);
  const [showDob, setShowDob] = useState(false);
  // 2026-08-30, live-testing feedback ("не сохраняется профиль"):
  // handleSave used to send username/phoneNumber/dob unconditionally on
  // every save, even when the visitor never touched them. Confirmed
  // suspect, not confirmed live (no network access to the real API this
  // session): on the account this was reported against, `username`
  // bootstraps to a long backend-GENERATED value (e.g.
  // "a1_149785988204331011") — resubmitting that exact string as a
  // "change" on every save is new behavior this session added (the
  // field didn't exist before), and a manually-settable username field
  // very plausibly enforces stricter rules (max length chief among
  // them) than whatever internal process generated that default. These
  // refs capture the bootstrapped originals so handleSave can send each
  // of the three only when it actually differs from what the visitor
  // started with — never resending an untouched, possibly-invalid
  // system default back at the one endpoint that validates it as a
  // fresh user submission.
  const originalUsernameRef = useRef("");
  const originalPhoneRef = useRef("");
  const originalDobRef = useRef("");
  // Same "only send what actually changed" reasoning as the three refs
  // above, applied to the showPhoneNumber/showDob booleans (2026-08-31
  // fix — see ProfileInputSchema's comment on those two fields).
  const originalShowPhoneRef = useRef(false);
  const originalShowDobRef = useRef(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [profileTitle, setProfileTitle] = useState("");
  const [occupation, setOccupation] = useState<OccupationValue | "">("");
  const [expertise, setExpertise] = useState("");
  const [location, setLocation] = useState<EditableLocation | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationResults, setLocationResults] = useState<EditableLocation[]>([]);
  const [locationPending, setLocationPending] = useState(false);
  const [locationSearched, setLocationSearched] = useState(false);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationRequestIdRef = useRef(0);

  // ---- photos ----
  const [photos, setPhotos] = useState<MediaDocument[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  // 2026-08-30, live-testing feedback ("При подгрузке фото должен
  // открываться редактор с центрированием"): the file picked from
  // photoInputRef used to go straight into the upload pipeline. Now it's
  // held here until the crop step (see PhotoCropModal below) produces
  // the actual cropped File to upload -- null means the modal isn't
  // showing.
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const voiceFileInputRef = useRef<HTMLInputElement>(null);

  // ---- voice intro ----
  const [voiceDoc, setVoiceDoc] = useState<MediaDocument | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voiceUploading, setVoiceUploading] = useState(false);
  // 2026-08-30, live-testing feedback: "В голосовій візитці треба додати
  // можливість підвантажити аудіофайл, і теж його стискати й обробляти" —
  // a separate state from voiceUploading since this phase (decode ->
  // offline-render through the SAME highpass+compressor graph
  // startRecording uses -> real-time re-encode) happens BEFORE
  // uploadVoice()'s own upload phase even starts, and can itself take as
  // long as the clip's duration (see handleVoiceFileSelected below).
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- CRUD lists ----
  const [links, setLinks] = useState<EditableLink[]>([]);
  const [companies, setCompanies] = useState<EditableCompany[]>([]);
  const [education, setEducation] = useState<{ id: string; value: string }[]>([]);
  const [skills, setSkills] = useState<EditableSkill[]>([]);
  const [languages, setLanguages] = useState<EditableLanguage[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<EditableBook[]>([]);
  const [favoriteMovies, setFavoriteMovies] = useState<EditableTitleItem[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<EditableTitleItem[]>([]);

  // ---- multi-select sets ----
  const [selectedHobbies, setSelectedHobbies] = useState<Set<number>>(new Set());
  const [selectedWorkInterests, setSelectedWorkInterests] = useState<Set<number>>(new Set());
  const [workStylePrefs, setWorkStylePrefs] = useState<Record<string, Set<number>>>({});

  // Company-category searchable picker (per-row open state keyed by
  // company id, same combobox pattern app/onboarding/profile/profile-
  // setup-form.tsx uses for this exact same dataset).
  const [openCategoryRow, setOpenCategoryRow] = useState<string | null>(null);
  const [categoryQuery, setCategoryQuery] = useState("");

  // Language searchable picker.
  const [languagePickerOpen, setLanguagePickerOpen] = useState<string | null>(null);
  const [languageQuery, setLanguageQuery] = useState("");

  function markDirty() {
    setDirty(true);
  }

  // -------------------------------------------------------------------
  // Bootstrap
  // -------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/profile-editor/bootstrap")
      .then((r) => r.json())
      .then((data: { ok: boolean; message?: string } & Partial<Bootstrap>) => {
        if (cancelled) return;
        if (!data.ok || !data.profile) {
          if (isNotSignedIn(data)) {
            window.location.href = "/sign-in?reason=edit-profile";
            return;
          }
          setLoadError(true);
          setLoading(false);
          return;
        }
        const p = data.profile;
        setUsername(p.username ?? "");
        setPhoneNumber(p.phoneNumber ?? "");
        setDob(toDateInputValue(p.dob));
        // 2026-08-31: this called setRawFlags(p.flags), a setter for a
        // rawFlags state variable that this file's own 2026-08-30/31
        // comment above (on the phoneNumber/dob state block) says was
        // deliberately removed -- flags are read directly into
        // showPhone/showDob via canShowPhone/canShowDob just below,
        // nothing else in this file reads a rawFlags state. The setter
        // call was dead code left behind by that removal; it referenced
        // a name that no longer exists, which is what broke `npm run
        // build` (Vercel: "Cannot find name setRawFlags") on every
        // commit since whichever push removed the state declaration.
        originalUsernameRef.current = p.username ?? "";
        originalPhoneRef.current = p.phoneNumber ?? "";
        originalDobRef.current = toDateInputValue(p.dob);
        setShowPhone(canShowPhone(p.flags));
        setShowDob(canShowDob(p.flags));
        setFirstName(p.firstName);
        setLastName(p.lastName);
        setBio(p.bio);
        setProfileTitle(p.profileTitle ?? "");
        setOccupation(OCCUPATION_VALUES.includes(p.occupation as OccupationValue) ? (p.occupation as OccupationValue) : "");
        setExpertise(p.expertise ?? "");
        setLocation(
          p.location
            ? { id: p.location._id, label: [p.location.displayName, p.location.country].filter(Boolean).join(", ") || p.location.displayName }
            : null,
        );
        setPhotos(p.photos);
        setVoiceDoc(p.voiceIntroduction);
        setLinks(p.links.map((l) => ({ id: newId(), title: l.title, url: l.url })));
        const companyCategories = data.companyCategories ?? [];
        setCompanies(
          p.companies.map((c) => {
            // A plain `c.category != null ? companyCategories.find(cat =>
            // cat.value === c.category) : null` loses TS's narrowing of
            // c.category the moment it's read inside the nested .find()
            // callback (a fresh function scope) -- capturing it into its
            // own local first keeps the null-check meaningful instead of
            // silently falling back to `Category | null | undefined`.
            const categoryId = c.category;
            const category = categoryId != null ? (companyCategories.find((cat) => cat.value === categoryId) ?? null) : null;
            return {
              id: newId(),
              name: c.name,
              description: c.description ?? "",
              positionTitle: c.position?.description ?? "",
              // 2026-08-31, live-testing feedback ("Тут надо календарь
              // поставить такой же как в ДР" -- switching these two to
              // `type="date"` below, same as DOB): reuse toDateInputValue
              // here for the exact same reason DOB needed it (this file's
              // own comment on that helper) -- if the backend ever hands
              // back a full ISO timestamp rather than a bare date, a
              // native date input silently renders blank on anything that
              // isn't exactly YYYY-MM-DD, which reads as "my dates didn't
              // save" even though they did.
              positionStart: toDateInputValue(c.position?.start ?? null),
              positionEnd: toDateInputValue(c.position?.end ?? null),
              employeesCount: c.employeesCount != null ? String(c.employeesCount) : "",
              category,
              turnover: "",
              est: c.est != null ? String(c.est) : "",
              linkTitle: c.link?.title ?? "",
              linkUrl: c.link?.url ?? "",
            };
          }),
        );
        setEducation(p.education.map((value) => ({ id: newId(), value })));
        setSkills(p.skills.map((s) => ({ id: newId(), value: s.value, level: s.level })));
        setLanguages(p.languages.map((l) => ({ id: newId(), value: l.value, level: l.level })));
        setFavoriteBooks(p.favoriteBooks.map((b) => ({ id: newId(), title: b.title, author: b.author })));
        setFavoriteMovies(p.favoriteMovies.map((m) => ({ id: newId(), title: m.title })));
        setFavoriteGames(p.favoriteGames.map((g) => ({ id: newId(), title: g.title })));
        setSelectedHobbies(new Set(p.hobbies));
        setSelectedWorkInterests(new Set(p.workInterests));
        const wsp: Record<string, Set<number>> = {};
        for (const key of Object.keys(WORK_STYLE_DATASET_KEYS) as (keyof typeof WORK_STYLE_DATASET_KEYS)[]) {
          wsp[key] = new Set(p.workStylePreferences[key]);
        }
        setWorkStylePrefs(wsp);
        setBootstrap({
          profile: p,
          companyCategories,
          hobbyGroups: data.hobbyGroups ?? [],
          workInterests: data.workInterests ?? [],
          workStylePreferences: data.workStylePreferences as WorkStylePreferencesDataset,
        });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Body-scroll lock while open, same convention as post-editor.tsx.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Stop any in-progress recording / free the mic if the dialog unmounts
  // mid-recording (closed, navigated away, etc.) — otherwise the mic
  // stream and the audio graph nodes leak.
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  function requestClose() {
    if (dirty && !saving) {
      setConfirmCloseOpen(true);
      return;
    }
    onClose();
  }

  // -------------------------------------------------------------------
  // Location search — same debounced-fetch shape as components/post-
  // editor.tsx's own searchLocationsClient / onLocationQueryChange.
  // -------------------------------------------------------------------
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
      const res = await authFetch(`/api/locations?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (requestId === locationRequestIdRef.current) {
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

  // -------------------------------------------------------------------
  // Photos
  // -------------------------------------------------------------------
  // 2026-08-30, live-testing feedback ("При подгрузке фото должен
  // открываться редактор с центрированием"): this used to kick off the
  // upload pipeline directly. Now it just validates the pick and hands
  // the raw file to PhotoCropModal -- the actual upload (below, in
  // uploadCroppedPhoto) only runs once the visitor confirms a crop.
  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (photos.length >= MAX_PHOTOS) {
      setPhotoError(t("photoTooMany", lang));
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setPhotoError(t("photoTooBig", lang));
      return;
    }
    setPhotoError(null);
    setPendingPhotoFile(file);
  }

  async function uploadCroppedPhoto(cropped: File) {
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      const compressed = await compressImage(cropped);
      const createRes = await authFetch("/api/upload/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimetype: compressed.type || "application/octet-stream", bytes: compressed.size }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.ok || !createData.result?.url) {
        if (isNotSignedIn(createData)) {
          window.location.href = "/sign-in?reason=edit-profile";
          return;
        }
        // Aleksandr, 2026-09-02: same 20MB/day-per-user quota the native
        // app enforces (app/api/upload/create/route.ts) -- shown as an
        // actual reason instead of the generic upload-failed message.
        if (createData?.message === "quota_exceeded" && createData.usage) {
          const usage = createData.usage as { usedBytes: number; limitBytes: number; resetAt: number };
          const resetsIn = formatRelativeTime(new Date(usage.resetAt * 1000), lang);
          setPhotoError(`${t("photoUploadQuotaExceeded", lang)} (${formatBytes(usage.usedBytes)} / ${formatBytes(usage.limitBytes)}, ${resetsIn})`);
        } else {
          setPhotoError(t("photoUploadFailed", lang));
        }
        setPhotoUploading(false);
        return;
      }
      const { id, url, fields } = createData.result as { id: string; url: string; fields: Record<string, string> };
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value);
      formData.append("file", compressed);
      const uploadRes = await fetch(url, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        setPhotoError(t("photoUploadFailed", lang));
        setPhotoUploading(false);
        return;
      }
      const confirmRes = await authFetch("/api/upload/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok || !confirmData.ok) {
        if (isNotSignedIn(confirmData)) {
          window.location.href = "/sign-in?reason=edit-profile";
          return;
        }
        setPhotoError(t("photoUploadFailed", lang));
        setPhotoUploading(false);
        return;
      }
      setPhotos((prev) => [...prev, confirmData.media as MediaDocument]);
      markDirty();
      // Only close the crop modal once the upload actually succeeded --
      // on failure it stays open (with photoError set above) so the
      // visitor can just retry the same crop instead of re-picking and
      // re-adjusting the file from scratch.
      setPendingPhotoFile(null);
    } catch {
      setPhotoError(t("photoUploadFailed", lang));
    } finally {
      setPhotoUploading(false);
    }
  }
  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  }

  // -------------------------------------------------------------------
  // Voice intro — record through a live cleanup/compression graph, then
  // upload through the exact same create/confirm flow as a photo.
  // -------------------------------------------------------------------
  async function startRecording() {
    setVoiceError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError(t("recordNotSupported", lang));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // The actual "cleanup + compression" graph: a highpass filter
      // strips low-frequency rumble/handling noise below speech range,
      // then a DynamicsCompressorNode evens out loud/quiet parts
      // (normalizes level, gently gates very quiet background noise
      // between words) — both applied live, before MediaRecorder ever
      // sees the signal, so the recorded file is already cleaned up,
      // not just re-encoded smaller.
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 100;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -28;
      compressor.knee.value = 24;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      const dest = ctx.createMediaStreamDestination();
      source.connect(highpass);
      highpass.connect(compressor);
      compressor.connect(dest);

      // File-size "compression" in the literal sense: a capped opus
      // bitrate (64kbps) instead of whatever a browser's own default
      // would pick, same spirit as compressImage()'s JPEG-quality cap
      // above, just for audio.
      const mimeType = VOICE_MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = mimeType
        ? new MediaRecorder(dest.stream, { mimeType, audioBitsPerSecond: VOICE_BITRATE })
        : new MediaRecorder(dest.stream);
      recordChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((tr) => tr.stop());
        ctx.close().catch(() => {});
        micStreamRef.current = null;
        audioCtxRef.current = null;
        void uploadVoice(blob, recorder.mimeType || "audio/webm");
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          const next = s + 1;
          if (next >= VOICE_MAX_SECONDS) stopRecording();
          return next;
        });
      }, 1000);
    } catch {
      setVoiceError(t("micDenied", lang));
    }
  }

  function stopRecording() {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
  }

  // 2026-08-30, live-testing feedback: "В голосовій візитці треба додати
  // можливість підвантажити аудіофайл, і теж його стискати й обробляти."
  // Runs an uploaded file through the exact same "cleanup + compression"
  // signal chain startRecording() builds for the live mic (highpass ->
  // DynamicsCompressor), then re-encodes it through the same capped-
  // bitrate MediaRecorder path — there is no way to get a browser's
  // MediaRecorder to encode a plain AudioBuffer directly, so this plays
  // the decoded file back in real time into a MediaStreamDestination and
  // records THAT, same mechanism as the live-mic path, just fed by a
  // BufferSourceNode instead of getUserMedia. That means processing one
  // takes as long as the clip itself (up to VOICE_MAX_SECONDS) — shown to
  // the visitor via voiceProcessing rather than pretending it's instant.
  async function handleVoiceFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setVoiceError(null);
    if (typeof MediaRecorder === "undefined" || typeof AudioContext === "undefined") {
      setVoiceError(t("recordNotSupported", lang));
      return;
    }
    setVoiceProcessing(true);
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const arrayBuffer = await file.arrayBuffer();
      const decodeCtx = new AudioCtx();
      let decoded: AudioBuffer;
      try {
        decoded = await decodeCtx.decodeAudioData(arrayBuffer);
      } finally {
        void decodeCtx.close().catch(() => {});
      }

      const ctx = new AudioCtx();
      // Cap at VOICE_MAX_SECONDS, same limit startRecording() enforces
      // live via its own interval timer — a long uploaded file is
      // trimmed rather than rejected outright.
      const maxSamples = Math.min(decoded.length, Math.floor(VOICE_MAX_SECONDS * decoded.sampleRate));
      let bufferToPlay = decoded;
      if (maxSamples < decoded.length) {
        const trimmed = ctx.createBuffer(decoded.numberOfChannels, maxSamples, decoded.sampleRate);
        for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
          trimmed.copyToChannel(decoded.getChannelData(ch).subarray(0, maxSamples), ch);
        }
        bufferToPlay = trimmed;
      }

      const source = ctx.createBufferSource();
      source.buffer = bufferToPlay;
      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 100;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -28;
      compressor.knee.value = 24;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      const dest = ctx.createMediaStreamDestination();
      source.connect(highpass);
      highpass.connect(compressor);
      compressor.connect(dest);

      const mimeType = VOICE_MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = mimeType
        ? new MediaRecorder(dest.stream, { mimeType, audioBitsPerSecond: VOICE_BITRATE })
        : new MediaRecorder(dest.stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        void ctx.close().catch(() => {});
        setVoiceProcessing(false);
        void uploadVoice(blob, recorder.mimeType || "audio/webm");
      };
      source.onended = () => recorder.stop();
      recorder.start();
      source.start();
    } catch {
      setVoiceProcessing(false);
      setVoiceError(t("recordFailed", lang));
    }
  }

  async function uploadVoice(blob: Blob, mimeType: string) {
    setVoiceUploading(true);
    try {
      const ext = mimeType.includes("mp4") ? "m4a" : "webm";
      const file = new File([blob], `voice-intro.${ext}`, { type: mimeType });
      const createRes = await authFetch("/api/upload/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimetype: file.type || "application/octet-stream", bytes: file.size }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.ok || !createData.result?.url) {
        if (isNotSignedIn(createData)) {
          window.location.href = "/sign-in?reason=edit-profile";
          return;
        }
        // Aleksandr, 2026-09-02: same 20MB/day-per-user quota (see
        // uploadCroppedPhoto's own comment above) -- a quota lockout
        // isn't a recording problem, so it gets its own message instead
        // of the generic "couldn't record or upload".
        if (createData?.message === "quota_exceeded" && createData.usage) {
          const usage = createData.usage as { usedBytes: number; limitBytes: number; resetAt: number };
          const resetsIn = formatRelativeTime(new Date(usage.resetAt * 1000), lang);
          setVoiceError(`${t("photoUploadQuotaExceeded", lang)} (${formatBytes(usage.usedBytes)} / ${formatBytes(usage.limitBytes)}, ${resetsIn})`);
        } else {
          setVoiceError(t("recordFailed", lang));
        }
        return;
      }
      const { id, url, fields } = createData.result as { id: string; url: string; fields: Record<string, string> };
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value);
      formData.append("file", file);
      const uploadRes = await fetch(url, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        setVoiceError(t("recordFailed", lang));
        return;
      }
      const confirmRes = await authFetch("/api/upload/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok || !confirmData.ok) {
        if (isNotSignedIn(confirmData)) {
          window.location.href = "/sign-in?reason=edit-profile";
          return;
        }
        setVoiceError(t("recordFailed", lang));
        return;
      }
      setVoiceDoc(confirmData.media as MediaDocument);
      setVoicePreviewUrl(URL.createObjectURL(blob));
      markDirty();
    } catch {
      setVoiceError(t("recordFailed", lang));
    } finally {
      setVoiceUploading(false);
    }
  }

  function removeVoice() {
    setVoiceDoc(null);
    setVoicePreviewUrl(null);
    markDirty();
  }

  // -------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------
  async function handleSave() {
    if (saving) return;
    setSaveErrorKey(null);
    setInvalidCompanyIds(new Set());
    setInvalidLinkIds(new Set());
    setInvalidCompanyLinkIds(new Set());

    // A company row counts as "touched" the moment ANY of its fields has
    // something in it — including just a selected category, matching how
    // app/api/account/update-profile/route.ts's own confirmed-working
    // category-only entry looks (name/description left blank on purpose).
    const touchedCompanies = companies.filter(
      (c) =>
        c.name.trim() !== "" ||
        c.description.trim() !== "" ||
        c.positionTitle.trim() !== "" ||
        c.positionStart.trim() !== "" ||
        c.positionEnd.trim() !== "" ||
        c.employeesCount.trim() !== "" ||
        c.turnover.trim() !== "" ||
        c.est.trim() !== "" ||
        c.linkUrl.trim() !== "" ||
        c.category !== null,
    );
    // CONFIRMED (app/api/account/update-profile/route.ts's own header
    // comment, live 400s from 2026-08-29): the backend's Company shape
    // accepts every sub-field empty/null EXCEPT category, which must be a
    // real value the moment a company entry is sent at all. A row with
    // anything else typed in but no category picked used to go out as
    // `category: null` and fail the WHOLE profile save with no
    // field-level indication of why — this is the most likely explanation
    // for "почему-то не вышло сохранить" after a long edit session. Block
    // the save client-side instead of round-tripping to find out again.
    const missingCategory = touchedCompanies.filter((c) => c.category === null);
    if (missingCategory.length > 0) {
      setInvalidCompanyIds(new Set(missingCategory.map((c) => c.id)));
      setSaveErrorKey("saveFailedCategoryRequired");
      return;
    }

    // 2026-08-31, live-testing feedback ("Показывай ошибку если нет
    // расширения"): same "block + highlight, don't round-trip to the
    // backend to find out" pattern as the category check just above,
    // for URL fields that don't look like a real link (isPlausibleUrl's
    // own comment). Checked after the category block, not before —
    // category is the one that used to break the ENTIRE save, so it
    // stays the higher-priority error to surface first.
    const badLinks = links.filter((l) => !isPlausibleUrl(l.url));
    const badCompanyLinks = touchedCompanies.filter((c) => !isPlausibleUrl(c.linkUrl));
    if (badLinks.length > 0 || badCompanyLinks.length > 0) {
      setInvalidLinkIds(new Set(badLinks.map((l) => l.id)));
      setInvalidCompanyLinkIds(new Set(badCompanyLinks.map((c) => c.id)));
      setSaveErrorKey("saveFailedInvalidLink");
      return;
    }

    setSaving(true);

    const companiesPayload = touchedCompanies
      .map((c) => {
        const hasPosition = c.positionTitle.trim() !== "" || c.positionStart.trim() !== "" || c.positionEnd.trim() !== "";
        const employeesCount = c.employeesCount.trim() ? Math.max(0, Math.trunc(Number(c.employeesCount)) || 0) : 0;
        const turnover = c.turnover.trim() ? Number(c.turnover) : null;
        const est = c.est.trim() ? Number(c.est) : null;
        // 2026-08-31, live-testing ("протестируй edge cases"): the
        // backend's Company.position.end is a real ISO-8601 date field —
        // confirmed live it rejects the literal string PRESENT_SENTINEL
        // ("Present") outright ("'companies.0.position.end' Invalid
        // date_iso8601 format."), which fails the WHOLE profile save, not
        // just this one field, the same class of bug as the `flags` fix
        // above. The backend has no separate "still ongoing" boolean
        // (UserCompanyPositionSchema only has description/start/end), so
        // `end: null` IS how "no end date" — i.e. still working there —
        // is represented; the "Present" pill is a purely local-state
        // sentinel that must never reach the wire as text. One accepted
        // cost: since the backend can't tell "explicitly marked ongoing"
        // apart from "end date just never set", the Present pill won't
        // re-highlight itself after a reload — re-toggle it if needed.
        const trimmedEnd = c.positionEnd.trim();
        const isOngoing = trimmedEnd.toLowerCase() === PRESENT_SENTINEL.toLowerCase();
        return {
          name: c.name.trim(),
          description: c.description.trim() || null,
          position: hasPosition
            ? { description: c.positionTitle.trim() || null, start: c.positionStart.trim() || null, end: isOngoing ? null : trimmedEnd || null }
            : null,
          turnover: Number.isFinite(turnover) ? turnover : null,
          employeesCount,
          category: c.category ? c.category.value : null,
          link: c.linkUrl.trim() ? { title: c.linkTitle.trim(), url: c.linkUrl.trim() } : null,
          est: est !== null && Number.isFinite(est) ? est : null,
        };
      });

    const workStylePreferences: Record<string, number[]> = {};
    for (const key of Object.keys(WORK_STYLE_DATASET_KEYS)) {
      workStylePreferences[key] = Array.from(workStylePrefs[key] ?? []);
    }

    const body: Record<string, unknown> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      expertise: expertise.trim(),
      bio,
      // Backend contract fix, 2026-08-31 (live "'profileTitle' must be
      // of type object" 502 -- see lib/a1/schemas.ts's ProfileTitleSchema
      // comment for the full evidence): account.updateProfile wants this
      // as {object:"empty"} or {object:"profile-title", text}, never a
      // bare string/null.
      profileTitle: profileTitle.trim()
        ? { object: "profile-title" as const, text: profileTitle.trim() }
        : { object: "empty" as const },
      location: location ? location.id : null,
      photos: photos.map((p) => ({ fileReference: p.fileReference })),
      voiceIntroduction: voiceDoc ? { fileReference: voiceDoc.fileReference } : null,
      links: links.filter((l) => l.url.trim() !== "").map((l) => ({ title: l.title.trim(), url: l.url.trim() })),
      companies: companiesPayload,
      education: education.map((e) => e.value.trim()).filter(Boolean),
      skills: skills.filter((s) => s.value.trim() !== "").map((s) => ({ value: s.value.trim(), level: s.level })),
      languages: languages.filter((l) => l.value.trim() !== "").map((l) => ({ value: l.value.trim(), level: l.level })),
      hobbies: Array.from(selectedHobbies),
      workInterests: Array.from(selectedWorkInterests),
      favoriteBooks: favoriteBooks.filter((b) => b.title.trim() !== "").map((b) => ({ title: b.title.trim(), author: b.author.trim() })),
      favoriteMovies: favoriteMovies.filter((m) => m.title.trim() !== "").map((m) => ({ title: m.title.trim() })),
      favoriteGames: favoriteGames.filter((g) => g.title.trim() !== "").map((g) => ({ title: g.title.trim() })),
      workStylePreferences,
    };
    if (occupation) body.occupation = occupation;
    // Schema-required min(1) if present at all (see ProfileInputSchema's
    // own comment) — omit entirely rather than send "" and fail the
    // whole save the same way an empty occupation would.
    //
    // 2026-08-30, live-testing feedback ("не сохраняется профиль"):
    // username/phoneNumber/dob now only go in the payload when they
    // actually differ from what bootstrap loaded (see
    // originalUsernameRef's own comment near the state declarations for
    // why) — matching account.updateProfile's own documented contract
    // ("no fields required -- send only what changed", per
    // app/api/account/whoami/route.ts's comment) instead of resending
    // an untouched, possibly backend-generated value as if the visitor
    // had just typed it.
    const trimmedUsername = username.trim();
    if (trimmedUsername && trimmedUsername !== originalUsernameRef.current) {
      body.username = trimmedUsername;
    }
    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone !== originalPhoneRef.current) {
      body.phoneNumber = trimmedPhone || null;
    }
    const trimmedDob = dob.trim();
    if (trimmedDob !== originalDobRef.current) {
      body.dob = trimmedDob || null;
    }
    // 2026-08-31, live repro of "не сохраняется профиль" (screenshot:
    // "Couldn't save. Please try again." the moment either "Show on
    // profile" pill was touched): account.updateProfile does NOT accept
    // `flags` at all -- confirmed live against a throwaway test account,
    // the real backend error is "root has unknown property 'flags'".
    // That's a full-request rejection, not a per-field one, so touching
    // either pill used to fail the ENTIRE save (every other section too,
    // not just phone/dob visibility) with no indication of why beyond
    // the generic saveFailed copy. The read side (EditableProfileSchema.
    // flags, canShowPhone/canShowDob) and the two pills stay as they are
    // -- they still reflect whatever the account's real flags are -- but
    // this dialog no longer has a confirmed way to WRITE that bitmask,
    // so it must not try. Clicking a pill still updates local state
    // (showPhone/showDob) for a coherent-looking dialog, it just isn't
    // persisted yet; that's a known gap, not a silent data loss, since
    // nothing here previously worked either (see the SHOW_PHONE_NUMBER/
    // SHOW_DOB comment near the state declarations: "never round-tripped
    // through a real save" until this same live test disproved it).

    try {
      const res = await authFetch("/api/account/profile-editor/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        if (isNotSignedIn(data)) {
          window.location.href = "/sign-in?reason=edit-profile";
          return;
        }
        // 2026-08-30, live-testing feedback ("не сохраняется профиль"):
        // the route already forwards the real API's error detail as
        // `data.detail` (app/api/account/profile-editor/update/route.ts),
        // but nothing surfaced it anywhere -- the user only ever saw the
        // generic saveFailed copy below, with no way for either of us to
        // tell WHICH field the backend actually rejected. Logging it
        // doesn't fix the underlying cause on its own, but the next
        // report of this can now come with real diagnostic detail from
        // the browser console instead of another guess.
        console.error("[profile-editor] save failed:", data.message, data.detail);
        setSaveErrorKey("saveFailed");
        setSaving(false);
        return;
      }
      setDirty(false);
      // Only pass a username when this save actually changed it (i.e. it
      // was included in `body` above) -- an unrelated save (bio, photos,
      // etc.) must not trigger a navigation.
      onSaved(typeof body.username === "string" ? body.username : undefined);
    } catch {
      setSaveErrorKey("saveFailed");
      setSaving(false);
    }
  }

  const filteredCompanyCategories = useMemo(() => {
    const categories = bootstrap?.companyCategories ?? [];
    const q = categoryQuery.trim().toLowerCase();
    // 2026-08-30: now that the dropdown displays translateCompanyCategory's
    // Ukrainian text (see this file's own companyCategoryPlaceholder
    // comment), matching only against the backend's raw English `c.text`
    // would silently break search for anyone typing what they actually
    // see on screen -- e.g. typing "будів" would no longer find
    // "Будівництво" (displayed) / "Construction" (raw). Match against
    // both so search keeps working regardless of which one the visitor
    // typed.
    const list = q
      ? categories.filter((c) => c.text.toLowerCase().includes(q) || translateCompanyCategory(c.text, lang).toLowerCase().includes(q))
      : categories;
    const itIndex = list.findIndex((c) => c.text.replace(/[^a-zA-Z]/g, "").toUpperCase() === "IT");
    return (itIndex > 0 ? [list[itIndex]!, ...list.slice(0, itIndex), ...list.slice(itIndex + 1)] : list).slice(0, 50);
  }, [bootstrap, categoryQuery, lang]);

  // Companies From/To month+year selects (see parseYearMonth's own
  // comment) -- computed once per render rather than inside each
  // company's own JSX block below, since every company shares the same
  // option lists.
  const companyMonthOptions = useMemo(() => monthSelectOptions(lang), [lang]);
  const companyYearOptions = useMemo(() => careerYearOptions(), []);

  const languageDisplayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([LOCALE_TAG[lang]], { type: "language" });
    } catch {
      return null;
    }
  }, [lang]);
  function languageName(code: string): string {
    try {
      const name = languageDisplayNames?.of(code.toLowerCase());
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : code.toUpperCase();
    } catch {
      return code.toUpperCase();
    }
  }
  const languageOptions = useMemo(() => {
    const q = languageQuery.trim().toLowerCase();
    const list = COMMON_LANGUAGE_CODES.map((code) => ({ code, name: languageName(code) }));
    if (!q) return list.slice(0, 30);
    const filtered = list.filter((l) => l.name.toLowerCase().includes(q) || l.code.includes(q));
    // Exact typed code always available even if it's outside the curated list.
    if (filtered.length === 0 && /^[a-z]{2,3}$/i.test(q)) return [{ code: q, name: languageName(q) }];
    return filtered.slice(0, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageQuery, lang]);
  const LEVEL_LABELS: [StringKey, StringKey, StringKey, StringKey, StringKey] = [
    "levelBeginner", "levelElementary", "levelIntermediate", "levelAdvanced", "levelNative",
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
        <Spinner className="h-8 w-8 text-white" />
      </div>
    );
  }

  if (loadError || !bootstrap) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-xl dark:bg-neutral-900">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{t("loadFailed", lang)}</p>
          <button type="button" onClick={onClose} className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
            {t("close", lang)}
          </button>
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
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{t("dialogTitle", lang)}</h2>
          {/* 2026-08-30, live-testing feedback: "При наведенні додай легку
              анімацію, поверни хрестик на 90 градусів." */}
          <button type="button" onClick={requestClose} aria-label={t("close", lang)} className="group text-neutral-400 transition hover:text-neutral-900 dark:hover:text-neutral-50">
            <CloseIcon className="transition-transform duration-200 ease-out group-hover:rotate-90" />
          </button>
        </div>

        {confirmCloseOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmCloseOpen(false)}>
            <div role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{t("closeConfirmTitle", lang)}</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t("closeConfirmBody", lang)}</p>
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" onClick={() => setConfirmCloseOpen(false)} className="rounded-full bg-accent py-2.5 text-sm font-bold tracking-wide text-white transition hover:opacity-90">
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

        <div className="relative flex-1 overflow-y-auto px-5 py-1" onChange={markDirty}>
          {/* ---------------- Voice intro ---------------- */}
          {/* 2026-08-30, live-testing feedback: "Голосова візитка поставь
              наверх, це крута фіча" — moved to the very first section in
              the dialog (was between Photos and Links). defaultOpen now
              lives here instead of on Basic info, since this is the
              section being led with. */}
          <Section title={t("sectionVoice", lang)} defaultOpen>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{t("voiceHint", lang)}</p>
            <div className="flex items-center gap-3">
              {voiceDoc ? (
                <>
                  {/* 2026-08-31, live-testing feedback ("Сделай аудио
                      почти на всю ширину, + иконка удаления. Будет
                      удобнее... Отцентрируй иконку удаления относительно
                      аудиополя"): the old `max-w-[220px]` capped the
                      native player to a narrow strip with most of the
                      dialog's width sitting empty next to it. `min-w-0`
                      (not just `flex-1`) is what actually lets it fill
                      that space -- without it a flex item's default
                      min-width is its content's natural size, which can
                      still refuse to shrink/grow as expected in some
                      browsers. The trash button's own height dropped
                      from h-8 to h-9 to exactly match the audio
                      element's, so `items-center` on this row centers
                      them on the same line instead of two different-
                      height boxes that only looked aligned by
                      coincidence. */}
                  <audio
                    controls
                    src={voicePreviewUrl ?? mediaUrl(voiceDoc)}
                    className="h-9 min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={removeVoice}
                    aria-label={t("removeVoice", lang)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    <TrashIcon />
                  </button>
                </>
              ) : isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <StopSquareIcon />
                  {t("recordStop", lang)} · {formatSeconds(recordSeconds)}
                </button>
              ) : voiceUploading ? (
                <span className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                  <Spinner className="h-4 w-4" /> {t("recordUploading", lang)}
                </span>
              ) : voiceProcessing ? (
                <span className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                  <Spinner className="h-4 w-4" /> {t("processingAudio", lang)}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <MicIcon />
                    {t("recordStart", lang)}
                  </button>
                  {/* 2026-08-30, live-testing feedback: "В голосовій
                      візитці треба додати можливість підвантажити
                      аудіофайл, і теж його стискати й обробляти" — runs
                      the same cleanup+compression chain as a live
                      recording, see handleVoiceFileSelected's own
                      comment. */}
                  <button
                    type="button"
                    onClick={() => voiceFileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-full border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                  >
                    <UploadIcon />
                    {t("uploadAudioFile", lang)}
                  </button>
                  <input ref={voiceFileInputRef} type="file" accept="audio/*" onChange={handleVoiceFileSelected} className="hidden" />
                </>
              )}
            </div>
            {voiceError && <p className="text-sm text-red-600 dark:text-red-400">{voiceError}</p>}
          </Section>

          {/* ---------------- Basic info ---------------- */}
          <Section title={t("sectionBasic", lang)}>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>{t("usernameLabel", lang)}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); markDirty(); }}
                placeholder={t("usernamePlaceholder", lang)}
                className={inputClass}
              />
            </div>

            {/* 2026-08-30/31, live-testing feedback: phone/DOB, each
                hideable from the public profile — see
                ProfileInputSchema's showPhoneNumber/showDob comment for
                why this sends its own two plain booleans on save rather
                than a flags bitmask. */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>{t("phoneLabel", lang)}</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value); markDirty(); }}
                  placeholder={t("phonePlaceholder", lang)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => { setShowPhone((v) => !v); markDirty(); }}
                  aria-pressed={showPhone}
                  className={pillClass(showPhone) + " self-start"}
                >
                  {t("showOnProfile", lang)}
                </button>
              </div>
              {/* 2026-08-31: the min-w-0 fix below (mobile screenshot:
                  "Верстка даты рождения уехала") only patched the
                  overflow, not the underlying cause -- Aleksandr's
                  actual phone still rendered this field visibly taller
                  and wider than the Phone field next to it ("поле
                  телефон и дата рождения — тоже разные по ширине и по
                  высоте. Дата рождения слишком высокая и широкая...
                  сделай таким же, как телефон"): a native
                  `<input type="date">`'s box (segmented day/month/year,
                  its own font metrics and padding) just isn't something
                  CSS can reliably pin to match a plain text input's
                  across browsers -- same root cause as the Companies
                  From/To dates a bit below (see parseFullDate's own
                  comment), which got the same treatment: three plain
                  <select>s (day/month/year) using the exact same
                  `inputClass` as the Phone input, so the two fields are
                  now sized by identical CSS instead of one native
                  control's own opinion about its size. */}
              <div className="flex min-w-0 flex-col gap-1.5">
                <label className={labelClass}>{t("dobLabel", lang)}</label>
                <div className="grid grid-cols-[1fr_1fr_1.3fr] gap-1">
                  {/* appearance-none on all three: without it, this
                      environment's dark mode rendered the closed
                      select's own text using the browser's native
                      widget color instead of the CSS `color` we set --
                      invisible-looking (near-white text painted by the
                      native control anyway, just apparently on a
                      near-matching background in this rendering path),
                      confirmed by toggling appearance-none on/off on a
                      live copy of this exact markup and watching the
                      text appear/disappear. Custom-styling around it
                      entirely sidesteps relying on the native widget's
                      own color decisions, same reasoning as moving off
                      type="date" in the first place. */}
                  <select
                    value={parseFullDate(dob).day}
                    onChange={(e) => {
                      const { year, month } = parseFullDate(dob);
                      setDob(buildFullDate(year || String(new Date().getFullYear() - 25), month || "01", e.target.value));
                      markDirty();
                    }}
                    aria-label={t("dobLabel", lang)}
                    className={inputClass + " min-w-0 appearance-none px-1 text-xs"}
                  >
                    <option value="">—</option>
                    {DOB_DAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    value={parseFullDate(dob).month}
                    onChange={(e) => {
                      const { year, day } = parseFullDate(dob);
                      setDob(buildFullDate(year || String(new Date().getFullYear() - 25), e.target.value, day || "01"));
                      markDirty();
                    }}
                    aria-label={t("dobLabel", lang)}
                    className={inputClass + " min-w-0 appearance-none px-1 text-xs"}
                  >
                    <option value="">—</option>
                    {companyMonthOptions.map((m) => (
                      <option key={m.value} value={m.value}>{m.value}</option>
                    ))}
                  </select>
                  <select
                    value={parseFullDate(dob).year}
                    onChange={(e) => {
                      const { month, day } = parseFullDate(dob);
                      setDob(buildFullDate(e.target.value, month || "01", day || "01"));
                      markDirty();
                    }}
                    aria-label={t("dobLabel", lang)}
                    className={inputClass + " min-w-0 appearance-none px-1 text-xs"}
                  >
                    <option value="">—</option>
                    {DOB_YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowDob((v) => !v); markDirty(); }}
                  aria-pressed={showDob}
                  className={pillClass(showDob) + " self-start"}
                >
                  {t("showOnProfile", lang)}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>{t("firstNameLabel", lang)}</label>
                <input type="text" value={firstName} onChange={(e) => { setFirstName(e.target.value); markDirty(); }} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>{t("lastNameLabel", lang)}</label>
                <input type="text" value={lastName} onChange={(e) => { setLastName(e.target.value); markDirty(); }} className={inputClass} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>{t("bioLabel", lang)}</label>
              <textarea
                value={bio}
                onChange={(e) => { setBio(e.target.value); markDirty(); }}
                placeholder={t("bioPlaceholder", lang)}
                rows={3}
                className={inputClass + " resize-none"}
              />
            </div>

            {/* 2026-08-31: dropped this field from the editor entirely --
                Aleksandr, on being told profileTitle is a real backend
                field (confirmed against aone-api-private's own
                UserService.ts/UserModel.d.ts, see lib/a1/schemas.ts's
                ProfileTitleSchema comment) with no equivalent screen in
                the mobile app: "убери это поле из веб-редактора, раз в
                мобилке его нет и это может путать". `profileTitle`
                state/load/save are all left exactly as they were --
                still loaded from the account on open and resent
                unchanged on save -- so an existing value (e.g. the
                "Frontend dev" line under the name on the public profile)
                is neither editable here any more nor silently wiped by
                a save from this dialog. */}

            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("occupationLabel", lang)}</span>
              <div className="grid grid-cols-3 gap-2">
                {OCCUPATION_VALUES.map((value) => {
                  const selected = occupation === value;
                  const label = OCCUPATION_LABELS[value]?.[lang] ?? value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setOccupation(value); markDirty(); }}
                      aria-pressed={selected}
                      className={
                        "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-medium transition " +
                        (selected
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600")
                      }
                    >
                      <OccupationIcon occupation={value} size={36} background />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>{t("expertiseLabel", lang)}</label>
              <input
                type="text"
                value={expertise}
                onChange={(e) => { setExpertise(e.target.value); markDirty(); }}
                placeholder={t("expertisePlaceholder", lang)}
                className={inputClass}
              />
            </div>

            <div className="relative flex flex-col gap-1.5">
              <label className={labelClass}>{t("locationLabel", lang)}</label>
              <div className="relative">
                <input
                  type="text"
                  value={locationOpen ? locationQuery : (location?.label ?? "")}
                  onFocus={() => {
                    setLocationOpen(true);
                    setLocationQuery("");
                  }}
                  onChange={(e) => onLocationQueryChange(e.target.value)}
                  onBlur={() => setTimeout(() => setLocationOpen(false), 120)}
                  placeholder={t("locationPlaceholder", lang)}
                  className={inputClass + " pr-9"}
                  autoComplete="off"
                />
                {locationPending && <Spinner className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />}
              </div>
              {locationOpen && locationQuery.trim().length >= 2 && (
                <div className="absolute top-full z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                  {locationPending && <div className="px-4 py-2 text-sm text-neutral-400">{t("locationSearching", lang)}</div>}
                  {!locationPending && locationSearched && locationResults.length === 0 && (
                    <div className="px-4 py-2 text-sm text-neutral-400">{t("locationEmpty", lang)}</div>
                  )}
                  {locationResults.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setLocation(loc);
                        setLocationOpen(false);
                        markDirty();
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>
              )}
              {location && (
                <button
                  type="button"
                  onClick={() => { setLocation(null); markDirty(); }}
                  className="self-start text-xs font-medium text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline dark:hover:text-neutral-300"
                >
                  {t("locationClear", lang)}
                </button>
              )}
            </div>
          </Section>

          {/* ---------------- Photos ---------------- */}
          <Section title={t("sectionPhotos", lang)}>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{t("photoHint", lang)}</p>
            <div className="flex flex-wrap gap-2">
              {photos.map((doc, i) => (
                <div key={doc._id + i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(doc)} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute bottom-0.5 left-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">★</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={t("removeAria", lang)}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-600 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-500"
                >
                  {photoUploading ? <Spinner className="h-5 w-5" /> : <PlusIcon />}
                </button>
              )}
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelected} className="hidden" />
            {/* Error shown here too (not just inside the crop modal)
                since photoTooMany/photoTooBig can fire before the modal
                ever opens (handlePhotoSelected returns early, before
                setPendingPhotoFile). */}
            {photoError && !pendingPhotoFile && <p className="text-sm text-red-600 dark:text-red-400">{photoError}</p>}
            {pendingPhotoFile && (
              <PhotoCropModal
                file={pendingPhotoFile}
                lang={lang}
                confirming={photoUploading}
                error={photoError}
                onCancel={() => {
                  if (photoUploading) return;
                  setPendingPhotoFile(null);
                  setPhotoError(null);
                }}
                onConfirm={uploadCroppedPhoto}
              />
            )}
          </Section>

          {/* ---------------- Links ---------------- */}
          <Section title={t("sectionLinks", lang)}>
            {links.map((link) => (
              <div key={link.id} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={link.title}
                  onChange={(e) => { setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, title: e.target.value } : l))); markDirty(); }}
                  placeholder={t("linkTitlePlaceholder", lang)}
                  className={inputClass + " flex-1 basis-0"}
                />
                <input
                  type="text"
                  value={link.url}
                  onChange={(e) => { setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, url: e.target.value } : l))); markDirty(); }}
                  placeholder={t("linkUrlPlaceholder", lang)}
                  className={inputClass + " flex-1 basis-0" + (invalidLinkIds.has(link.id) ? " border-red-500 focus:border-red-500 dark:border-red-500" : "")}
                />
                <button type="button" onClick={() => { setLinks((prev) => prev.filter((l) => l.id !== link.id)); markDirty(); }} aria-label={t("removeAria", lang)} className="shrink-0 text-neutral-400 hover:text-red-600">
                  <TrashIcon />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLinks((prev) => [...prev, { id: newId(), title: "", url: "" }])}
              className="flex items-center gap-1.5 self-start rounded-xl border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <PlusIcon /> {t("addLink", lang)}
            </button>
          </Section>

          {/* ---------------- Companies ---------------- */}
          <Section title={t("sectionCompanies", lang)}>
            {companies.map((company) => (
              <div key={company.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    {company.name.trim() || t("companyUntitled", lang)}
                  </span>
                  <button type="button" onClick={() => { setCompanies((prev) => prev.filter((c) => c.id !== company.id)); markDirty(); }} aria-label={t("removeAria", lang)} className="text-neutral-400 hover:text-red-600">
                    <TrashIcon />
                  </button>
                </div>
                {/* 2026-08-30, live-testing feedback: "Подредактируй поля в
                    «компании», должны быть только эти и нейминг должен
                    совпадать" -- attached screenshots of the mobile app's
                    own "Додати компанію"/"Add Company" screen: Company
                    name, Start, End (+ a "Present" toggle), Sphere of
                    activity, Your position in company, Number of
                    employees, Link, Additional info -- 8 fields, in that
                    order. Reordered to match and dropped Turnover/Founded
                    year below, which don't exist anywhere in the mobile
                    app's UI (ProfileInputCompanySchema still accepts both
                    -- turnover as a required-but-nullable key, est as
                    fully optional -- so removing their inputs and always
                    sending null for them, same as the mobile client
                    presumably already does, is safe; see this file's
                    Company type/handleSave's own comment on that schema
                    for the "every key must still be present" constraint
                    that's why turnover isn't simply deleted from the
                    payload-building code below).
                    2026-08-30 follow-up ("Надо время в компании полями
                    'from', 'to' и отдельная кнопка 'present'"): Start/End
                    renamed to From/To, and the "Present" toggle IS now
                    implemented below (superseding the "not replicating"
                    note this comment used to have) -- see
                    isPositionOngoing's own comment just below for how
                    it's represented without a dedicated backend field. */}
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => { setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, name: e.target.value } : c))); markDirty(); }}
                  placeholder={t("companyNamePlaceholder", lang)}
                  className={inputClass}
                />
                {(() => {
                  // ProfileInputPositionSchema.end is just a plain
                  // nullable string -- there's no dedicated "is this
                  // ongoing" boolean anywhere in the backend shape (see
                  // lib/a1/schemas.ts). Rather than inventing a new
                  // client-only field that handleSave would then have to
                  // remember to translate back into *something* on save,
                  // "Present" reuses the same positionEnd string field as
                  // a sentinel value: pressing the toggle just writes the
                  // literal English word "Present" into it (always
                  // English, regardless of UI language -- it's a stored
                  // data value now, not display text, same as how a
                  // visitor could always free-type the word "present"
                  // into this field even before this toggle existed). The
                  // input itself shows the properly localized word while
                  // that sentinel is active, and disables editing so it
                  // can't drift out of sync with the toggle.
                  // Case-insensitive: an existing company loaded from the
                  // backend (set from the mobile app, or a visitor who
                  // free-typed the word before this toggle existed) could
                  // plausibly have "present"/"PRESENT" rather than this
                  // component's own exact "Present" casing.
                  const isPositionOngoing = company.positionEnd.trim().toLowerCase() === PRESENT_SENTINEL.toLowerCase();
                  return (
                    <>
                      {/* 2026-08-31: went through THREE shapes in one day
                          -- free-text, then a native type="date" picker
                          ("Тут надо календарь поставить такой же как в
                          ДР"), and now these month+year select pairs
                          (parseYearMonth's own comment above has the
                          full story on why the date-input attempt got
                          replaced). Each row is one date; month and year
                          are two ordinary <select>s the same width via
                          grid-cols-2, so there's no native-control sizing
                          left to fight. The End row goes blank+disabled
                          while "Present" is on, same as before. */}
                      <div className="flex flex-col gap-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={parseYearMonth(company.positionStart).month}
                            onChange={(e) => {
                              const { year } = parseYearMonth(company.positionStart);
                              const nextYear = year || String(new Date().getFullYear());
                              setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, positionStart: buildYearMonth(nextYear, e.target.value) } : c)));
                              markDirty();
                            }}
                            aria-label={t("companyPositionStartPlaceholder", lang)}
                            className={inputClass + " appearance-none"}
                          >
                            <option value="">—</option>
                            {companyMonthOptions.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                          <select
                            value={parseYearMonth(company.positionStart).year}
                            onChange={(e) => {
                              const { month } = parseYearMonth(company.positionStart);
                              setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, positionStart: buildYearMonth(e.target.value, month || "01") } : c)));
                              markDirty();
                            }}
                            aria-label={t("companyPositionStartPlaceholder", lang)}
                            className={inputClass + " appearance-none"}
                          >
                            <option value="">—</option>
                            {companyYearOptions.map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={isPositionOngoing ? "" : parseYearMonth(company.positionEnd).month}
                            onChange={(e) => {
                              const { year } = parseYearMonth(company.positionEnd);
                              const nextYear = year || String(new Date().getFullYear());
                              setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, positionEnd: buildYearMonth(nextYear, e.target.value) } : c)));
                              markDirty();
                            }}
                            disabled={isPositionOngoing}
                            aria-label={t("companyPositionEndPlaceholder", lang)}
                            className={inputClass + " appearance-none" + (isPositionOngoing ? " opacity-60" : "")}
                          >
                            <option value="">—</option>
                            {companyMonthOptions.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                          <select
                            value={isPositionOngoing ? "" : parseYearMonth(company.positionEnd).year}
                            onChange={(e) => {
                              const { month } = parseYearMonth(company.positionEnd);
                              setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, positionEnd: buildYearMonth(e.target.value, month || "01") } : c)));
                              markDirty();
                            }}
                            disabled={isPositionOngoing}
                            aria-label={t("companyPositionEndPlaceholder", lang)}
                            className={inputClass + " appearance-none" + (isPositionOngoing ? " opacity-60" : "")}
                          >
                            <option value="">—</option>
                            {companyYearOptions.map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCompanies((prev) =>
                            prev.map((c) => (c.id === company.id ? { ...c, positionEnd: isPositionOngoing ? "" : PRESENT_SENTINEL } : c)),
                          );
                          markDirty();
                        }}
                        aria-pressed={isPositionOngoing}
                        className={pillClass(isPositionOngoing) + " self-start"}
                      >
                        {t("companyPresent", lang)}
                      </button>
                    </>
                  );
                })()}
                <div className="relative">
                  <input
                    type="text"
                    value={openCategoryRow === company.id ? categoryQuery : (company.category ? translateCompanyCategory(company.category.text, lang) : "")}
                    onFocus={() => {
                      setOpenCategoryRow(company.id);
                      setCategoryQuery("");
                    }}
                    onChange={(e) => setCategoryQuery(e.target.value)}
                    onBlur={() => setTimeout(() => setOpenCategoryRow((cur) => (cur === company.id ? null : cur)), 120)}
                    placeholder={t("companyCategoryPlaceholder", lang) + " *"}
                    className={inputClass + (invalidCompanyIds.has(company.id) ? " border-red-500 focus:border-red-500 dark:border-red-500" : "")}
                    autoComplete="off"
                  />
                  {openCategoryRow === company.id && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                      {filteredCompanyCategories.length === 0 && <div className="px-4 py-2 text-sm text-neutral-400">{t("companyCategoryEmpty", lang)}</div>}
                      {filteredCompanyCategories.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCompanies((prev) => prev.map((row) => (row.id === company.id ? { ...row, category: c } : row)));
                            setOpenCategoryRow(null);
                            setInvalidCompanyIds((prev) => {
                              if (!prev.has(company.id)) return prev;
                              const next = new Set(prev);
                              next.delete(company.id);
                              return next;
                            });
                            markDirty();
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        >
                          {translateCompanyCategory(c.text, lang)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={company.positionTitle}
                  onChange={(e) => { setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, positionTitle: e.target.value } : c))); markDirty(); }}
                  placeholder={t("companyPositionTitlePlaceholder", lang)}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  value={company.employeesCount}
                  onChange={(e) => { setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, employeesCount: e.target.value } : c))); markDirty(); }}
                  placeholder={t("companyEmployeesPlaceholder", lang)}
                  className={inputClass}
                />
                <input
                  type="text"
                  value={company.linkUrl}
                  onChange={(e) => { setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, linkUrl: e.target.value } : c))); markDirty(); }}
                  placeholder={t("companyLinkUrlPlaceholder", lang)}
                  className={inputClass + (invalidCompanyLinkIds.has(company.id) ? " border-red-500 focus:border-red-500 dark:border-red-500" : "")}
                />
                <textarea
                  value={company.description}
                  onChange={(e) => { setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, description: e.target.value } : c))); markDirty(); }}
                  placeholder={t("companyDescriptionPlaceholder", lang)}
                  rows={2}
                  className={inputClass + " resize-none"}
                />
              </div>
            ))}
            {companies.length < MAX_COMPANIES && (
              <button
                type="button"
                onClick={() =>
                  setCompanies((prev) => [
                    ...prev,
                    { id: newId(), name: "", description: "", positionTitle: "", positionStart: "", positionEnd: "", employeesCount: "", category: null, turnover: "", est: "", linkTitle: "", linkUrl: "" },
                  ])
                }
                className="flex items-center gap-1.5 self-start rounded-xl border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                <PlusIcon /> {t("addCompany", lang)}
              </button>
            )}
          </Section>

          {/* ---------------- Education ---------------- */}
          <Section title={t("sectionEducation", lang)}>
            {education.map((row) => (
              <div key={row.id} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => { setEducation((prev) => prev.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r))); markDirty(); }}
                  placeholder={t("educationPlaceholder", lang)}
                  className={inputClass}
                />
                <button type="button" onClick={() => { setEducation((prev) => prev.filter((r) => r.id !== row.id)); markDirty(); }} aria-label={t("removeAria", lang)} className="shrink-0 text-neutral-400 hover:text-red-600">
                  <TrashIcon />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setEducation((prev) => [...prev, { id: newId(), value: "" }])}
              className="flex items-center gap-1.5 self-start rounded-xl border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <PlusIcon /> {t("addEducation", lang)}
            </button>
          </Section>

          {/* ---------------- Skills ---------------- */}
          <Section title={t("sectionSkills", lang)}>
            {skills.map((skill) => (
              <div key={skill.id} className="flex flex-col gap-1 rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-800">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={skill.value}
                    onChange={(e) => { setSkills((prev) => prev.map((s) => (s.id === skill.id ? { ...s, value: e.target.value } : s))); markDirty(); }}
                    placeholder={t("skillNamePlaceholder", lang)}
                    className={inputClass}
                  />
                  <button type="button" onClick={() => { setSkills((prev) => prev.filter((s) => s.id !== skill.id)); markDirty(); }} aria-label={t("removeAria", lang)} className="shrink-0 text-neutral-400 hover:text-red-600">
                    <TrashIcon />
                  </button>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <span className={labelClass}>{t("skillLevelLabel", lang)}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={skill.level}
                    onChange={(e) => { setSkills((prev) => prev.map((s) => (s.id === skill.id ? { ...s, level: Number(e.target.value) } : s))); markDirty(); }}
                    className="flex-1 accent-accent"
                  />
                  <span className="w-8 text-right text-xs text-neutral-500 dark:text-neutral-400">{skill.level}%</span>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSkills((prev) => [...prev, { id: newId(), value: "", level: 50 }])}
              className="flex items-center gap-1.5 self-start rounded-xl border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <PlusIcon /> {t("addSkill", lang)}
            </button>
          </Section>

          {/* ---------------- Languages ---------------- */}
          <Section title={t("sectionLanguages", lang)}>
            {languages.map((entry) => (
              <div key={entry.id} className="flex items-center gap-1.5">
                {/* 2026-08-30, live-testing feedback ("Криво в выборе
                    языка"): a flex item's default min-width is `auto`,
                    which for a <select> resolves to the width its widest
                    <option> text needs to render (here, "Intermediate"),
                    NOT 0 -- so despite the level <select> below having an
                    explicit `w-28`, the browser was still growing it past
                    that to fit "Intermediate", stealing width from this
                    sibling. Two knock-on effects, both visible in the
                    screenshot at once: this name-input got squeezed down
                    to almost nothing, and the language dropdown below it
                    (w-full, relative to this now-tiny wrapper) rendered
                    as a sliver too narrow to show more than 2-3 letters
                    of each language name, with the real Hobbies/Work
                    interests/Favorites section headers showing through
                    the space it should have covered. `min-w-0` here
                    (flex items only shrink to their min-width, not
                    automatically to 0) is what actually lets `flex-1`
                    win the width back. */}
                <div className="relative min-w-0 flex-1">
                  <input
                    type="text"
                    value={languagePickerOpen === entry.id ? languageQuery : (entry.value ? languageName(entry.value) : "")}
                    onFocus={() => {
                      setLanguagePickerOpen(entry.id);
                      setLanguageQuery("");
                    }}
                    onChange={(e) => setLanguageQuery(e.target.value)}
                    onBlur={() => setTimeout(() => setLanguagePickerOpen((cur) => (cur === entry.id ? null : cur)), 120)}
                    placeholder={t("languagePlaceholder", lang)}
                    className={inputClass}
                    autoComplete="off"
                  />
                  {languagePickerOpen === entry.id && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                      {languageOptions.map((opt) => (
                        <button
                          key={opt.code}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setLanguages((prev) => prev.map((l) => (l.id === entry.id ? { ...l, value: opt.code } : l)));
                            setLanguagePickerOpen(null);
                            markDirty();
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        >
                          {opt.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={entry.level}
                  onChange={(e) => { setLanguages((prev) => prev.map((l) => (l.id === entry.id ? { ...l, level: Number(e.target.value) } : l))); markDirty(); }}
                  // 2026-08-30, live-testing feedback ("Мови: надо полечить
                  // поле по ширине, дати більше місця для назви мови") —
                  // this used to reserve a fixed 144px (w-36) for the level
                  // dropdown, squeezing the language-name input next to it.
                  // Narrowed to 108px (w-27 doesn't exist in the default
                  // scale, using w-28) and dropped to text-xs so the level
                  // words still fit without stealing width the name needs.
                  //
                  // 2026-08-30 follow-up ("Криво в выборе языка"): w-28
                  // alone wasn't enough -- a <select>'s default flex
                  // min-width is its widest <option> text ("Intermediate"
                  // here), which can exceed 112px and force this wider
                  // than w-28 says, at the sibling name-input's expense
                  // (see that div's own comment for the full chain).
                  // min-w-0 was believed to fix that but didn't -- 2026-
                  // 08-31 live re-test (Aleksandr: "Мови до сих пор не
                  // полечины") found the REAL cause with getComputedStyle
                  // on the live page: this select's rendered width was
                  // 571px, not 112px. `inputClass` itself starts with
                  // `w-full`, and Tailwind's generated stylesheet happens
                  // to emit `.w-full` AFTER `.w-28` -- so `w-full` wins
                  // the cascade regardless of class-list order (min-w-0
                  // only bounds flex-shrink, it can't resolve a same-
                  // specificity `width` conflict). `!w-28` (Tailwind's
                  // important-modifier) is what actually forces this to
                  // 112px now, confirmed against the same live account.
                  className={inputClass + " !w-28 min-w-0 shrink-0 px-2 text-xs"}
                >
                  {LEVEL_LABELS.map((key, i) => (
                    <option key={key} value={i}>
                      {t(key, lang)}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => { setLanguages((prev) => prev.filter((l) => l.id !== entry.id)); markDirty(); }} aria-label={t("removeAria", lang)} className="shrink-0 text-neutral-400 hover:text-red-600">
                  <TrashIcon />
                </button>
              </div>
            ))}
            {languages.length < MAX_LANGUAGES && (
              <button
                type="button"
                onClick={() => setLanguages((prev) => [...prev, { id: newId(), value: "", level: 2 }])}
                className="flex items-center gap-1.5 self-start rounded-xl border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                <PlusIcon /> {t("addLanguage", lang)}
              </button>
            )}
          </Section>

          {/* ---------------- Hobbies ---------------- */}
          {/* 2026-08-30, live-testing feedback: "Хоби до 5" — the counter
              in the title mirrors how MAX_PHOTOS' limit is communicated
              via photoHint elsewhere in this dialog. */}
          <Section title={`${t("sectionHobbies", lang)} (${selectedHobbies.size}/${MAX_HOBBIES})`}>
            {bootstrap.hobbyGroups.map((group) => (
              <div key={group.group} className="flex flex-col gap-1.5">
                {group.group && <span className={labelClass}>{translateHobbyGroup(group.group, lang)}</span>}
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => {
                    const active = selectedHobbies.has(item.value);
                    const atLimit = !active && selectedHobbies.size >= MAX_HOBBIES;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        disabled={atLimit}
                        onClick={() => {
                          setSelectedHobbies((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.value)) next.delete(item.value);
                            else if (next.size < MAX_HOBBIES) next.add(item.value);
                            return next;
                          });
                          markDirty();
                        }}
                        aria-pressed={active}
                        className={pillClass(active) + (atLimit ? " cursor-not-allowed opacity-40" : "")}
                      >
                        {translateHobbyItem(group.group, item.text, lang)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </Section>

          {/* ---------------- Work interests ---------------- */}
          <Section title={t("sectionInterests", lang)}>
            <div className="flex flex-wrap gap-1.5">
              {bootstrap.workInterests.map((item) => {
                const active = selectedWorkInterests.has(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setSelectedWorkInterests((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.value)) next.delete(item.value);
                        else next.add(item.value);
                        return next;
                      });
                      markDirty();
                    }}
                    aria-pressed={active}
                    className={pillClass(active)}
                  >
                    {translateWorkInterest(item.text, lang)}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ---------------- Favorites ---------------- */}
          <Section title={t("sectionFavorites", lang)}>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("favoriteBooksLabel", lang)}</span>
              {favoriteBooks.map((book) => (
                <div key={book.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={book.title}
                    onChange={(e) => { setFavoriteBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, title: e.target.value } : b))); markDirty(); }}
                    placeholder={t("titlePlaceholder", lang)}
                    className={inputClass + " flex-1 basis-0"}
                  />
                  <input
                    type="text"
                    value={book.author}
                    onChange={(e) => { setFavoriteBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, author: e.target.value } : b))); markDirty(); }}
                    placeholder={t("authorPlaceholder", lang)}
                    className={inputClass + " flex-1 basis-0"}
                  />
                  <button type="button" onClick={() => { setFavoriteBooks((prev) => prev.filter((b) => b.id !== book.id)); markDirty(); }} aria-label={t("removeAria", lang)} className="shrink-0 text-neutral-400 hover:text-red-600">
                    <TrashIcon />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFavoriteBooks((prev) => [...prev, { id: newId(), title: "", author: "" }])}
                className="flex items-center gap-1.5 self-start rounded-xl border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                <PlusIcon /> {t("addItem", lang)}
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("favoriteMoviesLabel", lang)}</span>
              {favoriteMovies.map((movie) => (
                <div key={movie.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={movie.title}
                    onChange={(e) => { setFavoriteMovies((prev) => prev.map((m) => (m.id === movie.id ? { ...m, title: e.target.value } : m))); markDirty(); }}
                    placeholder={t("titlePlaceholder", lang)}
                    className={inputClass}
                  />
                  <button type="button" onClick={() => { setFavoriteMovies((prev) => prev.filter((m) => m.id !== movie.id)); markDirty(); }} aria-label={t("removeAria", lang)} className="shrink-0 text-neutral-400 hover:text-red-600">
                    <TrashIcon />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFavoriteMovies((prev) => [...prev, { id: newId(), title: "" }])}
                className="flex items-center gap-1.5 self-start rounded-xl border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                <PlusIcon /> {t("addItem", lang)}
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("favoriteGamesLabel", lang)}</span>
              {favoriteGames.map((game) => (
                <div key={game.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={game.title}
                    onChange={(e) => { setFavoriteGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, title: e.target.value } : g))); markDirty(); }}
                    placeholder={t("titlePlaceholder", lang)}
                    className={inputClass}
                  />
                  <button type="button" onClick={() => { setFavoriteGames((prev) => prev.filter((g) => g.id !== game.id)); markDirty(); }} aria-label={t("removeAria", lang)} className="shrink-0 text-neutral-400 hover:text-red-600">
                    <TrashIcon />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFavoriteGames((prev) => [...prev, { id: newId(), title: "" }])}
                className="flex items-center gap-1.5 self-start rounded-xl border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                <PlusIcon /> {t("addItem", lang)}
              </button>
            </div>
          </Section>

          {/* ---------------- Work style preferences ---------------- */}
          <Section title={t("sectionWorkStyle", lang)}>
            {WORK_STYLE_PREFERENCE_SECTIONS.map((section) => {
              const datasetKey = WORK_STYLE_DATASET_KEYS[section.key];
              const options = bootstrap.workStylePreferences[datasetKey] ?? [];
              if (options.length === 0) return null;
              const selected = workStylePrefs[section.key] ?? new Set<number>();
              return (
                <div key={section.key} className="flex flex-col gap-1.5">
                  <span className={labelClass}>{section[lang]}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {options.map((opt) => {
                      const active = selected.has(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setWorkStylePrefs((prev) => {
                              const nextSet = new Set(prev[section.key] ?? []);
                              if (nextSet.has(opt.value)) nextSet.delete(opt.value);
                              else nextSet.add(opt.value);
                              return { ...prev, [section.key]: nextSet };
                            });
                            markDirty();
                          }}
                          aria-pressed={active}
                          className={pillClass(active)}
                        >
                          {translateWorkStyleOption(datasetKey, opt.text, lang)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Section>
        </div>

        <div className="border-t border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
          {saveErrorKey && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{t(saveErrorKey, lang)}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full bg-accent py-3 text-sm font-bold tracking-wide text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="h-4 w-4 text-white" /> {t("saving", lang)}
              </span>
            ) : (
              t("save", lang)
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
