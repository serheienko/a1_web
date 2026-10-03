// lib/a1/chat-extras.ts
//
// Волна 4 (удобства чатов, 2026-10-03): флаги сообщений бэкенда и тексты на
// 9 языках, взятые из приложения (lib/l10n/app_*.arb) -- чтобы на сайте и в
// приложении кнопки читались одинаково.
//
// Флаги сообщения подтверждены живыми запросами к api.a1appp.com и
// conversation_detail_entity.dart приложения: SILENT=1<<2 («без звука»),
// COLLAPSED=1<<7 («згорнуте» -- длинный текст с «Показати повністю»),
// DELETED_FOR_ALL=1<<8 (удалено у всех -- плашка «Повідомлення видалено»;
// сервер при этом подменяет текст на английский «Message deleted»).
import type { GroupLang } from "@/lib/a1/group-chat";

export const MSG_FLAG_SILENT = 1 << 2;
export const MSG_FLAG_COLLAPSED = 1 << 7;
export const MSG_FLAG_DELETED_FOR_ALL = 1 << 8;
/** Какие флаги сайт вообще вправе отправлять вместе с сообщением. */
export const MSG_SEND_FLAGS_MASK = MSG_FLAG_SILENT | MSG_FLAG_COLLAPSED;

export function isDeletedForAll(flags: number | undefined | null): boolean {
  return ((flags ?? 0) & MSG_FLAG_DELETED_FOR_ALL) !== 0;
}
export function isCollapsedFlags(flags: number | undefined | null): boolean {
  return ((flags ?? 0) & MSG_FLAG_COLLAPSED) !== 0;
}

const EXTRA = {
 "savedMessages": {
  "uk": "Збережене",
  "ru": "Избранное",
  "en": "Saved Messages",
  "de": "Gespeichert",
  "es": "Mensajes guardados",
  "fr": "Messages enregistrés",
  "pl": "Zapisane",
  "ptBR": "Mensagens salvas",
  "zh": "收藏夹"
 },
 "sendWithoutSound": {
  "uk": "Надіслати без звуку",
  "ru": "Отправить без звука",
  "en": "Send Without Sound",
  "de": "Ohne Ton senden",
  "es": "Enviar sin sonido",
  "fr": "Envoyer sans son",
  "pl": "Wyślij bez dźwięku",
  "ptBR": "Enviar sem som",
  "zh": "静音发送"
 },
 "scheduleMessage": {
  "uk": "Запланувати повідомлення",
  "ru": "Запланировать сообщение",
  "en": "Schedule Message",
  "de": "Nachricht planen",
  "es": "Programar mensaje",
  "fr": "Programmer le message",
  "pl": "Zaplanuj wiadomość",
  "ptBR": "Agendar mensagem",
  "zh": "定时发送"
 },
 "sendCollapsed": {
  "uk": "Надіслати згорнутим",
  "ru": "Отправить свёрнутым",
  "en": "Send Collapsed",
  "de": "Eingeklappt senden",
  "es": "Enviar contraído",
  "fr": "Envoyer replié",
  "pl": "Wyślij zwinięte",
  "ptBR": "Enviar recolhido",
  "zh": "折叠发送"
 },
 "showMore": {
  "uk": "Показати повністю",
  "ru": "Показать полностью",
  "en": "Show more",
  "de": "Mehr anzeigen",
  "es": "Ver más",
  "fr": "Voir plus",
  "pl": "Pokaż więcej",
  "ptBR": "Ver mais",
  "zh": "显示全部"
 },
 "chatPreviewMarkAsRead": {
  "uk": "Позначити прочитаним",
  "ru": "Отметить прочитанным",
  "en": "Mark as Read",
  "de": "Als gelesen markieren",
  "es": "Marcar como leído",
  "fr": "Marquer comme lu",
  "pl": "Oznacz jako przeczytane",
  "ptBR": "Marcar como lida",
  "zh": "标为已读"
 },
 "chatPreviewMarkAsUnread": {
  "uk": "Позначити непрочитаним",
  "ru": "Отметить непрочитанным",
  "en": "Mark as Unread",
  "de": "Als ungelesen markieren",
  "es": "Marcar como no leído",
  "fr": "Marquer comme non lu",
  "pl": "Oznacz jako nieprzeczytane",
  "ptBR": "Marcar como não lida",
  "zh": "标为未读"
 },
 "messageDeleted": {
  "uk": "Повідомлення видалено",
  "ru": "Сообщение удалено",
  "en": "Message deleted",
  "de": "Nachricht gelöscht",
  "es": "Mensaje eliminado",
  "fr": "Message supprimé",
  "pl": "Wiadomość usunięta",
  "ptBR": "Mensagem apagada",
  "zh": "消息已删除"
 },
 "messageDeletedByYou": {
  "uk": "Ви видалили повідомлення",
  "ru": "Вы удалили сообщение",
  "en": "You deleted this message",
  "de": "Du hast diese Nachricht gelöscht",
  "es": "Eliminaste este mensaje",
  "fr": "Vous avez supprimé ce message",
  "pl": "Usunięto tę wiadomość",
  "ptBR": "Você apagou esta mensagem",
  "zh": "你删除了这条消息"
 },
 "rescheduleMessage": {
  "uk": "Змінити час",
  "ru": "Изменить время",
  "en": "Reschedule",
  "de": "Zeit ändern",
  "es": "Cambiar hora",
  "fr": "Modifier l'heure",
  "pl": "Zmień godzinę",
  "ptBR": "Alterar horário",
  "zh": "更改时间"
 },
 "scheduledMessagesTitle": {
  "uk": "Заплановані повідомлення",
  "ru": "Запланированные сообщения",
  "en": "Scheduled Messages",
  "de": "Geplante Nachrichten",
  "es": "Mensajes programados",
  "fr": "Messages programmés",
  "pl": "Zaplanowane wiadomości",
  "ptBR": "Mensagens agendadas",
  "zh": "定时消息"
 },
 "editContactTitle": {
  "uk": "Змінити контакт",
  "ru": "Изменить контакт",
  "en": "Edit contact",
  "de": "Kontakt bearbeiten",
  "es": "Editar contacto",
  "fr": "Modifier le contact",
  "pl": "Edytuj kontakt",
  "ptBR": "Editar contato",
  "zh": "编辑联系人"
 },
 "contactNotesHint": {
  "uk": "Додати нотатки",
  "ru": "Добавить заметки",
  "en": "Add notes",
  "de": "Notizen hinzufügen",
  "es": "Añadir notas",
  "fr": "Ajouter des notes",
  "pl": "Dodaj notatki",
  "ptBR": "Adicionar notas",
  "zh": "添加备注"
 },
 "contactNotesFooter": {
  "uk": "Нотатки бачите тільки ви.",
  "ru": "Заметки видите только вы.",
  "en": "Notes are only visible to you.",
  "de": "Notizen sind nur für dich sichtbar.",
  "es": "Las notas solo las ves tú.",
  "fr": "Les notes ne sont visibles que par vous.",
  "pl": "Notatki widzisz tylko ty.",
  "ptBR": "As notas só são visíveis para você.",
  "zh": "备注仅您自己可见。"
 },
 "messageSavedToSavedMessages": {
  "uk": "Повідомлення збережено в Збережене",
  "ru": "Сообщение сохранено в Избранное",
  "en": "Message saved to Saved Messages",
  "de": "Nachricht in Gespeichert gesichert",
  "es": "Mensaje guardado en Mensajes guardados",
  "fr": "Message enregistré dans Messages enregistrés",
  "pl": "Wiadomość zapisana w Zapisane",
  "ptBR": "Mensagem salva em Mensagens salvas",
  "zh": "消息已保存到收藏夹"
 }
} as const;

export type ExtraKey = keyof typeof EXTRA;

export function extraText(lang: GroupLang, key: ExtraKey): string {
  const row = EXTRA[key] as Record<string, string>;
  return row[lang] || row.en || "";
}

/** «Збережене» -- чат с самим собой: единственный участник это я. */
export function isSavedChatParticipants(participants: unknown, myUserId: string | null): boolean {
  if (!myUserId || !Array.isArray(participants) || participants.length === 0) return false;
  return (participants as Array<Record<string, unknown>>).every((p) => p && p.user === myUserId);
}

/** Текст считается «длинным» (можно отправить свёрнутым): >= 6 строк при ширине ~34 знака. */
export function isLongForCollapse(text: string): boolean {
  const t = text.trim();
  if (t.length < 120) return false;
  let lines = 0;
  for (const part of t.split("\n")) lines += Math.max(1, Math.ceil(part.length / 34));
  return lines >= 6;
}
