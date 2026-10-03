// lib/a1/group-threads.ts
//
// Темы (треды) в группах на сайте (волна 3, 2026-10-03). Тема -- это
// отдельный чат под одним сообщением группы: флаг THREAD у чата,
// `Chat.thread = { chat, message }` говорит, где он висит, а у
// корневого сообщения есть `Message.thread = { chat, replies,
// lastReplyAt, repliers[] }` со счётчиками (подтверждено живым
// запросом к api.a1appp.com и thread_support.dart приложения).
// Переводы взяты из приложения (uk/ru/en, ключи thread*), для остальных
// языков написаны по тем же смыслам.
import type { GroupLang } from "@/lib/a1/group-chat";

export type MessageThreadInfo = {
  chatId: string;
  replies: number;
  repliers: string[];
  lastReplyAt: string | null;
};

/** `message.thread` из ответа бэкенда -- или null, если темы нет. */
export function messageThread(msg: unknown): MessageThreadInfo | null {
  if (!msg || typeof msg !== "object") return null;
  const t = (msg as { thread?: unknown }).thread;
  if (!t || typeof t !== "object") return null;
  const o = t as Record<string, unknown>;
  const chatId = typeof o.chat === "string" ? o.chat : "";
  if (!chatId) return null;
  return {
    chatId,
    replies: typeof o.replies === "number" && o.replies > 0 ? o.replies : 0,
    repliers: Array.isArray(o.repliers) ? o.repliers.filter((x): x is string => typeof x === "string") : [],
    lastReplyAt: typeof o.lastReplyAt === "string" ? o.lastReplyAt : null,
  };
}

/** Корневое сообщение темы в упрощённом виде для заголовка и карточки. */
export type ThreadRoot = {
  fromId: string | null;
  text: string;
  kind: "text" | "photo" | "voice" | "file";
  date: string | null;
};

/** Разбирает сырое сообщение бэкенда в ThreadRoot. */
export function threadRootFrom(raw: unknown): ThreadRoot | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const ents = Array.isArray(m.entities) ? (m.entities as Array<Record<string, unknown>>) : [];
  const text = ents
    .map((e) => (typeof e.text === "string" ? e.text : ""))
    .join("")
    .trim();
  const media = Array.isArray(m.media) ? (m.media as Array<Record<string, unknown>>) : [];
  let kind: ThreadRoot["kind"] = "text";
  const doc = media[0];
  if (doc) {
    const mime = typeof doc.mimetype === "string" ? doc.mimetype : "";
    const attrs = Array.isArray(doc.attributes) ? (doc.attributes as Array<Record<string, unknown>>) : [];
    if (mime.startsWith("image/")) kind = "photo";
    else if (attrs.some((a) => a.object === "attribute-audio" && a.voice === true)) kind = "voice";
    else kind = "file";
  }
  const from = m.peerFrom && typeof m.peerFrom === "object" ? (m.peerFrom as Record<string, unknown>) : null;
  return {
    fromId: from && from.object === "peer-user" && typeof from.user === "string" ? from.user : null,
    text,
    kind,
    date: typeof m.date === "string" ? m.date : null,
  };
}

type Forms = Record<string, string>;

const COMMENTS: Record<GroupLang, Forms> = {
  uk: { one: "{n} коментар", few: "{n} коментарі", many: "{n} коментарів", other: "{n} коментарів" },
  ru: { one: "{n} комментарий", few: "{n} комментария", many: "{n} комментариев", other: "{n} комментариев" },
  en: { one: "{n} comment", other: "{n} comments" },
  de: { one: "{n} Kommentar", other: "{n} Kommentare" },
  es: { one: "{n} comentario", many: "{n} comentarios", other: "{n} comentarios" },
  fr: { one: "{n} commentaire", many: "{n} commentaires", other: "{n} commentaires" },
  pl: { one: "{n} komentarz", few: "{n} komentarze", many: "{n} komentarzy", other: "{n} komentarza" },
  ptBR: { one: "{n} comentário", many: "{n} comentários", other: "{n} comentários" },
  zh: { other: "{n} 条评论" },
};

const STR: Record<string, Record<GroupLang, string>> = {
  discussSeparately: {
    uk: "Обговорити окремо", ru: "Обсудить отдельно", en: "Discuss separately", de: "Separat besprechen",
    es: "Hablar por separado", fr: "Discuter à part", pl: "Omów osobno", ptBR: "Discutir separadamente", zh: "单独讨论",
  },
  topic: {
    uk: "Тема", ru: "Тема", en: "Topic", de: "Thema", es: "Tema", fr: "Sujet", pl: "Temat", ptBR: "Tópico", zh: "话题",
  },
  topics: {
    uk: "Теми", ru: "Темы", en: "Topics", de: "Themen", es: "Temas", fr: "Sujets", pl: "Tematy", ptBR: "Tópicos", zh: "话题",
  },
  startDiscussion: {
    uk: "Почати обговорення", ru: "Начать обсуждение", en: "Start a discussion", de: "Diskussion starten",
    es: "Iniciar una conversación", fr: "Démarrer une discussion", pl: "Rozpocznij dyskusję", ptBR: "Iniciar uma discussão", zh: "开始讨论",
  },
  discussionStarted: {
    uk: "Обговорення почалося", ru: "Обсуждение началось", en: "Discussion started", de: "Diskussion gestartet",
    es: "Conversación iniciada", fr: "Discussion démarrée", pl: "Dyskusja rozpoczęta", ptBR: "Discussão iniciada", zh: "讨论已开始",
  },
  newCount: {
    uk: "{n} нових", ru: "{n} новых", en: "{n} new", de: "{n} neu", es: "{n} nuevos", fr: "{n} nouveaux",
    pl: "{n} nowych", ptBR: "{n} novos", zh: "{n} 条新消息",
  },
  noTopics: {
    uk: "Тем поки немає", ru: "Тем пока нет", en: "No topics yet", de: "Noch keine Themen", es: "Aún no hay temas",
    fr: "Aucun sujet pour le moment", pl: "Na razie brak tematów", ptBR: "Ainda não há tópicos", zh: "暂无话题",
  },
  createFailed: {
    uk: "Не вдалося відкрити тему", ru: "Не удалось открыть тему", en: "Couldn't open the topic", de: "Thema konnte nicht geöffnet werden",
    es: "No se pudo abrir el tema", fr: "Impossible d'ouvrir le sujet", pl: "Nie udało się otworzyć tematu", ptBR: "Não foi possível abrir o tópico", zh: "无法打开话题",
  },
  photo: {
    uk: "Фото", ru: "Фото", en: "Photo", de: "Foto", es: "Foto", fr: "Photo", pl: "Zdjęcie", ptBR: "Foto", zh: "照片",
  },
  voice: {
    uk: "Голосове повідомлення", ru: "Голосовое сообщение", en: "Voice message", de: "Sprachnachricht",
    es: "Mensaje de voz", fr: "Message vocal", pl: "Wiadomość głosowa", ptBR: "Mensagem de voz", zh: "语音消息",
  },
  file: {
    uk: "Файл", ru: "Файл", en: "File", de: "Datei", es: "Archivo", fr: "Fichier", pl: "Plik", ptBR: "Arquivo", zh: "文件",
  },
  openTopic: {
    uk: "Відкрити тему", ru: "Открыть тему", en: "Open topic", de: "Thema öffnen", es: "Abrir tema",
    fr: "Ouvrir le sujet", pl: "Otwórz temat", ptBR: "Abrir tópico", zh: "打开话题",
  },
};

export type ThreadUiKey = keyof typeof STR;

export function threadText(lang: GroupLang, key: ThreadUiKey, n?: number): string {
  const row = STR[key];
  const s = (row && (row[lang] || row.en)) || "";
  return n === undefined ? s : s.split("{n}").join(String(n));
}

export function commentsText(lang: GroupLang, n: number): string {
  const forms = COMMENTS[lang] || COMMENTS.en;
  const tag = lang === "ptBR" ? "pt-BR" : lang;
  let cat = "other";
  try {
    cat = new Intl.PluralRules(tag).select(n);
  } catch {
    /* other */
  }
  const tpl = forms[cat] || forms.other || "{n}";
  return tpl.split("{n}").join(String(n));
}

/** Короткая подпись корня: текст без служебных пробелов или «Фото» и т. п. */
export function rootPreview(lang: GroupLang, root: ThreadRoot | null): string {
  if (!root) return "";
  if (root.text) return root.text;
  if (root.kind === "photo") return threadText(lang, "photo");
  if (root.kind === "voice") return threadText(lang, "voice");
  if (root.kind === "file") return threadText(lang, "file");
  return "";
}

/** Название темы: первая непустая строка корня, не длиннее ~40 знаков. */
export function topicTitle(lang: GroupLang, root: ThreadRoot | null): string {
  const first =
    rootPreview(lang, root)
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
  if (!first) return threadText(lang, "topic");
  return first.length > 40 ? first.slice(0, 40).trimEnd() + "…" : first;
}

/** Непрочитанные в чате: последнее сообщение после моей отметки прочтения. */
export function unreadInChat(chat: { lastMessage?: unknown; participants?: unknown }, myUserId: string | null): number {
  if (!myUserId) return 0;
  const last = lastMessageId(chat.lastMessage);
  const parts = Array.isArray(chat.participants) ? (chat.participants as Array<Record<string, unknown>>) : [];
  const me = parts.find((p) => p.object === "peer-user" && p.user === myUserId);
  const rea = me && typeof me.reaMaxId === "number" ? me.reaMaxId : 0;
  return last > rea ? last - rea : 0;
}

/** id последнего сообщения чата: схема отдаёт его строкой, сырой ответ -- числом, а бывает и целым сообщением. */
export function lastMessageId(lm: unknown): number {
  if (typeof lm === "number") return lm;
  if (typeof lm === "string") return Number(lm) || 0;
  if (lm && typeof lm === "object" && "_id" in lm) return Number((lm as { _id: unknown })._id) || 0;
  return 0;
}
