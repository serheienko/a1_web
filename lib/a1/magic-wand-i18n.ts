// lib/a1/magic-wand-i18n.ts
//
// Строки панели Magic Wand на сайте (волна 5, 2026-10-03). Взяты из
// локализаций приложения (app_*.arb, ключи magicWand*, названия полей
// профиля); «Применить / Отправить / Сбросить» -- подписи для кнопок,
// которые в приложении нарисованы иконками.
import type { GroupLang } from "@/lib/a1/group-chat";

export type MagicWandStr = "fieldName" | "fieldBio" | "fieldIndustry" | "fieldEducation" | "fieldCompanies" | "fieldHobbies" | "fieldSkills" | "fieldLanguages" | "fieldLocation" | "cancel" | "title" | "placeholder" | "addMore" | "levels" | "filled" | "failed" | "filledHint" | "transcribing" | "reading" | "apply" | "send" | "clear";

const STR: Record<MagicWandStr, Record<GroupLang, string>> = {
  "fieldName": {
    "uk": "Ім'я",
    "ru": "Имя",
    "en": "Name",
    "de": "Name",
    "es": "Nombre",
    "fr": "Nom",
    "pl": "Imię",
    "ptBR": "Nome",
    "zh": "姓名"
  },
  "fieldBio": {
    "uk": "Професійна роль",
    "ru": "Профессиональная роль",
    "en": "Professional Bio",
    "de": "Berufliche Bio",
    "es": "Bio profesional",
    "fr": "Bio professionnelle",
    "pl": "Bio zawodowe",
    "ptBR": "Bio profissional",
    "zh": "必填项"
  },
  "fieldIndustry": {
    "uk": "Галузь",
    "ru": "Отрасль",
    "en": "Industry",
    "de": "Branche",
    "es": "Industria",
    "fr": "Secteur",
    "pl": "Branża",
    "ptBR": "Setor",
    "zh": "行业"
  },
  "fieldEducation": {
    "uk": "Освіта",
    "ru": "Образование",
    "en": "Education",
    "de": "Ausbildung",
    "es": "Formación",
    "fr": "Formation",
    "pl": "Wykształcenie",
    "ptBR": "Formação",
    "zh": "教育背景"
  },
  "fieldCompanies": {
    "uk": "Компанії",
    "ru": "Компании",
    "en": "Companies",
    "de": "Unternehmen",
    "es": "Empresas",
    "fr": "Entreprises",
    "pl": "Firmy",
    "ptBR": "Empresas",
    "zh": "公司"
  },
  "fieldHobbies": {
    "uk": "Хобі",
    "ru": "Хобби",
    "en": "Hobbies",
    "de": "Hobbys",
    "es": "Aficiones",
    "fr": "Loisirs",
    "pl": "Hobby",
    "ptBR": "Hobbies",
    "zh": "爱好"
  },
  "fieldSkills": {
    "uk": "Навички",
    "ru": "Навыки",
    "en": "Skills",
    "de": "Skills",
    "es": "Habilidades",
    "fr": "Compétences",
    "pl": "Umiejętności",
    "ptBR": "Habilidades",
    "zh": "技能"
  },
  "fieldLanguages": {
    "uk": "Мови",
    "ru": "Языки",
    "en": "Languages",
    "de": "Sprachen",
    "es": "Idiomas",
    "fr": "Langues",
    "pl": "Języki",
    "ptBR": "Idiomas",
    "zh": "语言"
  },
  "fieldLocation": {
    "uk": "Локація",
    "ru": "Локация",
    "en": "Location",
    "de": "Ort",
    "es": "Ubicación",
    "fr": "Lieu",
    "pl": "Lokalizacja",
    "ptBR": "Localização",
    "zh": "位置"
  },
  "cancel": {
    "uk": "Скасувати",
    "ru": "Отмена",
    "en": "Cancel",
    "de": "Abbrechen",
    "es": "Cancelar",
    "fr": "Annuler",
    "pl": "Anuluj",
    "ptBR": "Cancelar",
    "zh": "取消"
  },
  "title": {
    "uk": "Чарівна паличка",
    "ru": "Волшебная палочка",
    "en": "Magic Wand",
    "de": "Zauberstab",
    "es": "Varita mágica",
    "fr": "Baguette magique",
    "pl": "Magiczna różdżka",
    "ptBR": "Varinha mágica",
    "zh": "魔法棒"
  },
  "placeholder": {
    "uk": "Розкажіть про себе.\n\nМи розкладемо все по потрібних полях профілю.",
    "ru": "Расскажите о себе.\n\nМы разложим всё по нужным полям профиля.",
    "en": "Tell us about yourself.\n\nWe’ll put your details in the right profile fields.",
    "de": "Tell us about yourself.\n\nWe’ll put your details in the right profile fields.",
    "es": "Tell us about yourself.\n\nWe’ll put your details in the right profile fields.",
    "fr": "Tell us about yourself.\n\nWe’ll put your details in the right profile fields.",
    "pl": "Tell us about yourself.\n\nWe’ll put your details in the right profile fields.",
    "ptBR": "Tell us about yourself.\n\nWe’ll put your details in the right profile fields.",
    "zh": "介绍一下你自己。\n\n我们会把信息填到对应的资料栏里。"
  },
  "addMore": {
    "uk": "Додайте ще або натисніть сірий чип",
    "ru": "Добавьте ещё или нажмите серый чип",
    "en": "Add more or tap a gray chip",
    "de": "Add more or tap a gray chip",
    "es": "Add more or tap a gray chip",
    "fr": "Add more or tap a gray chip",
    "pl": "Add more or tap a gray chip",
    "ptBR": "Add more or tap a gray chip",
    "zh": "继续补充，或点击灰色标签"
  },
  "levels": {
    "uk": "(рів. 1-5)",
    "ru": "(ур. 1-5)",
    "en": "(lvl 1-5)",
    "de": "(lvl 1-5)",
    "es": "(lvl 1-5)",
    "fr": "(lvl 1-5)",
    "pl": "(lvl 1-5)",
    "ptBR": "(lvl 1-5)",
    "zh": "（1-5级）"
  },
  "filled": {
    "uk": "Заповнено {count} з {total}",
    "ru": "Заполнено {count} из {total}",
    "en": "Filled {count} of {total}",
    "de": "Filled {count} of {total}",
    "es": "Filled {count} of {total}",
    "fr": "Filled {count} of {total}",
    "pl": "Filled {count} of {total}",
    "ptBR": "Filled {count} of {total}",
    "zh": "已填写 {count}/{total}"
  },
  "failed": {
    "uk": "Magic Wand не зміг це розібрати. Спробуйте ще раз.",
    "ru": "Magic Wand не смог это разобрать. Попробуйте ещё раз.",
    "en": "Magic Wand couldn’t read that. Try again.",
    "de": "Magic Wand couldn’t read that. Try again.",
    "es": "Magic Wand couldn’t read that. Try again.",
    "fr": "Magic Wand couldn’t read that. Try again.",
    "pl": "Magic Wand couldn’t read that. Try again.",
    "ptBR": "Magic Wand couldn’t read that. Try again.",
    "zh": "Magic Wand 没能读懂，请再试一次。"
  },
  "filledHint": {
    "uk": "Перевірте поля й натисніть «Зберегти».",
    "ru": "Проверьте поля и нажмите «Сохранить».",
    "en": "Check the fields and tap Save.",
    "de": "Prüfe die Felder und tippe auf Speichern.",
    "es": "Revisa los campos y toca Guardar.",
    "fr": "Vérifiez les champs et touchez Enregistrer.",
    "pl": "Sprawdź pola i stuknij Zapisz.",
    "ptBR": "Confira os campos e toque em Salvar.",
    "zh": "请检查各项内容，然后点按“保存”。"
  },
  "transcribing": {
    "uk": "Транскрибування…",
    "ru": "Расшифровываю…",
    "en": "Transcribing…",
    "de": "Wird transkribiert…",
    "es": "Transcribiendo…",
    "fr": "Transcription…",
    "pl": "Transkrypcja…",
    "ptBR": "Transcrevendo…",
    "zh": "正在转写…"
  },
  "reading": {
    "uk": "Читаю…",
    "ru": "Читаю…",
    "en": "Reading…",
    "de": "Ich lese…",
    "es": "Leyendo…",
    "fr": "Lecture…",
    "pl": "Czytam…",
    "ptBR": "Lendo…",
    "zh": "正在阅读…"
  },
  "apply": {
    "uk": "Застосувати",
    "ru": "Применить",
    "en": "Apply",
    "de": "Anwenden",
    "es": "Aplicar",
    "fr": "Appliquer",
    "pl": "Zastosuj",
    "ptBR": "Aplicar",
    "zh": "应用"
  },
  "send": {
    "uk": "Надіслати",
    "ru": "Отправить",
    "en": "Send",
    "de": "Senden",
    "es": "Enviar",
    "fr": "Envoyer",
    "pl": "Wyślij",
    "ptBR": "Enviar",
    "zh": "发送"
  },
  "clear": {
    "uk": "Скинути",
    "ru": "Сбросить",
    "en": "Clear",
    "de": "Zurücksetzen",
    "es": "Quitar",
    "fr": "Retirer",
    "pl": "Usuń",
    "ptBR": "Remover",
    "zh": "清除"
  }
};

export function magicWandText(lang: GroupLang, key: MagicWandStr, vars?: Record<string, string | number>): string {
  const row = STR[key];
  let s = (row && (row[lang] || row.en)) || "";
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split("{" + k + "}").join(String(v));
  return s;
}
