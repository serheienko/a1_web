// components/post-viewer-menu.tsx
//
// 2026-09-01 (Aleksandr, from the mobile app's post-detail action
// sheet: "сделаем так же, как в приложении... снизу сразу под
// аватаром і ім'ям дві кнопки. Одна поки просто буде заглушкою... А
// справа три точки"): the viewer-facing counterpart to
// components/post-owner-menu.tsx — that one renders only on YOUR OWN
// post (Edit/Delete); this one renders only when a signed-in visitor
// is looking at SOMEONE ELSE's post. Two pieces, matching the mobile
// screenshot layout exactly:
//
//   [ Повідомлення ]  [ ••• ]
//
// 2026-09-02 (Aleksandr: "Сделай функциональной кнопку 'сообщения' из
// страниц постов"): Left is no longer a stub -- openChat() below
// mirrors components/profile-action-row.tsx's own openChat() exactly
// (same POST /api/chats/open, same flash-red-on-failure convention),
// scoped to this post's authorUserId instead of a profile page's own
// profileUserId.
// The "•••" opens a dropdown with, in this exact order (Поскаржитись
// deliberately excluded — "це попозже"):
//   - Додати контакт        — functional (contacts.addContact, already
//                              live in components/add-contact-button.tsx;
//                              this file reimplements the same toggle
//                              inline as a text ROW instead of that
//                              file's icon-only badge, since the two
//                              don't share a layout to factor into one
//                              component without more ceremony than a
//                              ~40-line status machine is worth)
//   - Поділитися контактом   — stub (real chat-drop later)
//   - Зберегти пост          — functional (favorites.addFavorites /
//                              deleteFavorites — see app/api/favorites/
//                              */route.ts; same shared favorites system
//                              a future "Saved users" feature reuses)
//   - Поділитися дописом     — partially functional: does the ONE thing
//                              that's real today (native share sheet if
//                              the browser has one, else copy the link)
//                              since there's no in-app chat drop to
//                              branch to yet either — no submenu until
//                              there's a second real option to pick.
//
// Explicitly no visual distinction between the functional rows and the
// two stubs (Aleksandr: "нет") — every row looks equally live; only the
// click behavior differs.
//
// Visibility gate mirrors components/add-contact-button.tsx's own
// (not this component's sibling post-owner-menu.tsx, which uses a
// separate /api/posts/mine roundtrip): a lightweight /api/account/
// whoami check, shown only when the visitor is signed in AND their own
// username differs from the post author's. Every authenticated fetch in
// this file goes through lib/auth-fetch.ts's authFetch(), not the bare
// fetch() — this same detail page also mounts components/avatar-menu.tsx
// (its own whoami call) and components/post-owner-menu.tsx (its own
// posts/mine call) at the same time, and authFetch is exactly what
// keeps a pile of concurrent authenticated requests here from racing
// each other's session-refresh the way app/contacts/page.tsx once did
// (see lib/auth-fetch.ts's own header comment for the full story).
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { ApplyQuestionsModal } from "@/components/apply-questions-modal";
import type { WebApplyQuestion } from "@/types/web-post";
import { ReportModal } from "@/components/report-modal";
import type { Contact } from "@/lib/a1/schemas";
import { LottiePlayer } from "@/components/lottie-player";
import { InlineAuthForm } from "@/components/inline-auth-form";
import { useCloseOnScroll } from "@/lib/use-close-on-scroll";
import { useBackdropDismiss } from "@/lib/use-backdrop-dismiss";
import { useHoverPanel } from "@/lib/use-hover-panel";
// 2026-09-13: оба пункта «поділитися» ниже раньше были заглушками --
// теперь открывают общее окно выбора получателя (внутри чатов) с
// кнопкой «вовне» на месте прежнего системного меню.
import { ShareTargetModal, type ShareTarget } from "@/components/share-target-modal";
// 2026-09-13 (Александр: "При закрепе... пусть она трансформируется в
// более маленькую по ширине... И слева мы напишем Junior Manual QA,
// покажем аватарку, покажем BroTrades") -- прилипшая строка уезжает из
// контекста: заголовок вакансии и компания остаются выше и не видны.
// Поэтому в прилипшем виде строка показывает их сама.
import Link from "next/link";
import { profileHref } from "@/lib/profile-href";
import { CachedAvatar } from "@/components/cached-avatar";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { pickDefaultCatAvatar } from "@/lib/avatars";

type StringKey =
  | "message"
  | "apply"
  | "menuLabel"
  | "addContact"
  | "removeContact"
  | "shareContact"
  | "savePost"
  | "unsavePost"
  | "sharePost"
  | "linkCopied"
  | "actionFailed"
  | "authPromptTitle"
  | "authPromptBody"
  | "applyPromptTitle"
  | "applyPromptBody"
  | "signInCta"
  | "cancel"
  | "thanksTitle"
  | "thanksBody"
  | "thanksOk"
  | "applyMessage"
  | "report";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  message: { uk: "Повідомлення", en: "Message", ru: "Сообщение", de: "Nachricht", es: "Mensaje", fr: "Message", pl: "Wiadomość", ptBR: "Mensagem", zh: "消息" },
  // 2026-09-09 (Aleksandr: "все посты которые мы парсим должны иметь
  // кнопку Apply, вместо Message... при первом apply пока компания еще
  // не забрала акк, мы показываем пользователь попап") — shown instead
  // of "message" whenever authorUnclaimed is true (see this file's own
  // openChat()/thanksOpen below for the actual behavior swap).
  report: { uk: "Поскаржитись", en: "Report", ru: "Пожаловаться", de: "Melden", es: "Denunciar", fr: "Signaler", pl: "Zgłoś", ptBR: "Denunciar", zh: "举报" },
  apply: { uk: "Відгукнутися", en: "Apply", ru: "Откликнуться", de: "Bewerben", es: "Postularme", fr: "Postuler", pl: "Aplikuj", ptBR: "Candidatar-se", zh: "申请" },
  // 2026-09-11 (Aleksandr: "Я сам рандомно откликнусь и хочу посмотреть
  // что отклик пришел") — the actual TEXT of the application message
  // this button now sends. Until today the unclaimed-company branch of
  // openChat() below only called /api/chats/open and showed the
  // thank-you popup; that route deliberately does NOT create anything
  // (see its own header: this backend has no "pre-create an empty
  // personal chat" method at all — a personal chat is resolved-or-
  // created by chat-server only when a message is actually SENT to a
  // peer-user peer). So every "application" so far left literally no
  // trace on the company's account: no chat, no message, nothing for
  // the company to find once it claims the account, and nothing for
  // /admin/applications to list. One real messages.send fixes all of
  // that at once — the message lands in the company account's own
  // inbox and is waiting there when the account is handed over.
  // {title} is the post's own title, {url} its public page.
  applyMessage: {
    uk: "Відгук на вакансію «{title}»\n{url}",
    en: "Application for “{title}”\n{url}",
    ru: "Отклик на вакансию «{title}»\n{url}",
    de: "Bewerbung auf „{title}“\n{url}",
    es: "Candidatura para «{title}»\n{url}",
    fr: "Candidature pour « {title} »\n{url}",
    pl: "Aplikacja na „{title}”\n{url}",
    ptBR: "Candidatura para “{title}”\n{url}",
    zh: "应聘「{title}」\n{url}",
  },
  menuLabel: { uk: "Дії", en: "Actions", ru: "Действия", de: "Aktionen", es: "Acciones", fr: "Actions", pl: "Działania", ptBR: "Ações", zh: "操作" },
  addContact: { uk: "Додати контакт", en: "Add contact", ru: "Добавить контакт", de: "Kontakt hinzufügen", es: "Añadir contacto", fr: "Ajouter un contact", pl: "Dodaj kontakt", ptBR: "Adicionar contato", zh: "添加联系人" },
  removeContact: { uk: "Прибрати з контактів", en: "Remove from contacts", ru: "Убрать из контактов", de: "Aus Kontakten entfernen", es: "Quitar de contactos", fr: "Retirer des contacts", pl: "Usuń z kontaktów", ptBR: "Remover dos contatos", zh: "从联系人中移除" },
  shareContact: { uk: "Поділитися контактом", en: "Share contact", ru: "Поделиться контактом", de: "Kontakt teilen", es: "Compartir contacto", fr: "Partager le contact", pl: "Udostępnij kontakt", ptBR: "Compartilhar contato", zh: "分享联系人" },
  savePost: { uk: "Зберегти допис", en: "Save post", ru: "Сохранить публикацию", de: "Beitrag speichern", es: "Guardar publicación", fr: "Enregistrer la publication", pl: "Zapisz post", ptBR: "Salvar publicação", zh: "保存帖子" },
  unsavePost: { uk: "Прибрати зі збережених", en: "Remove from saved", ru: "Убрать из сохранённых", de: "Aus Gespeichertem entfernen", es: "Quitar de guardados", fr: "Retirer des enregistrés", pl: "Usuń z zapisanych", ptBR: "Remover dos salvos", zh: "从已保存中移除" },
  sharePost: { uk: "Поділитися дописом", en: "Share post", ru: "Поделиться публикацией", de: "Beitrag teilen", es: "Compartir publicación", fr: "Partager la publication", pl: "Udostępnij post", ptBR: "Compartilhar publicação", zh: "分享帖子" },
  linkCopied: { uk: "Посилання скопійовано", en: "Link copied", ru: "Ссылка скопирована", de: "Link kopiert", es: "Enlace copiado", fr: "Lien copié", pl: "Link skopiowany", ptBR: "Link copiado", zh: "链接已复制" },
  actionFailed: { uk: "Не вдалося. Спробуйте ще раз", en: "Failed — try again", ru: "Не удалось. Попробуйте ещё раз", de: "Fehlgeschlagen — erneut versuchen", es: "Error — inténtalo de nuevo", fr: "Échec — réessayez", pl: "Nie udało się — spróbuj ponownie", ptBR: "Falhou — tente novamente", zh: "失败，请重试" },
  // 2026-09-02 (Aleksandr: "в сами посты надо тоже добавить те же самые
  // кнопки, которые есть в залогиненом состоянии и там показывать такой
  // же попап при нажатии") -- same in-place popup as components/
  // profile-action-row.tsx's own authPromptTitle/Body/signInCta/cancel,
  // shown instead of performing the real action when a signed-out
  // visitor taps Message / Add contact / Save post.
  authPromptTitle: {
    uk: "Увійдіть, щоб продовжити", en: "Sign in to continue", ru: "Войдите, чтобы продолжить",
    de: "Melden Sie sich an, um fortzufahren", es: "Inicia sesión para continuar", fr: "Connectez-vous pour continuer",
    pl: "Zaloguj się, aby kontynuować", ptBR: "Entre para continuar", zh: "登录以继续",
  },
  authPromptBody: {
    uk: "Зареєструйтесь або увійдіть, щоб написати повідомлення, додати в контакти чи зберегти допис.",
    en: "Sign up or sign in to message, add to contacts, or save this post.",
    ru: "Зарегистрируйтесь или войдите, чтобы написать сообщение, добавить в контакты или сохранить публикацию.",
    de: "Registrieren oder anmelden, um zu schreiben, zu Kontakten hinzuzufügen oder zu speichern.",
    es: "Regístrate o inicia sesión para enviar mensajes, añadir a contactos o guardar esta publicación.",
    fr: "Inscrivez-vous ou connectez-vous pour envoyer un message, ajouter aux contacts ou enregistrer cette publication.",
    pl: "Zarejestruj się lub zaloguj, aby napisać wiadomość, dodać do kontaktów lub zapisać post.",
    ptBR: "Cadastre-se ou entre para enviar mensagem, adicionar aos contatos ou salvar a publicação.",
    zh: "注册或登录即可发消息、添加联系人或保存此帖子。",
  },
  // 2026-09-11 (Aleksandr, phone screenshot of this popup on an imported
  // vacancy: the button says "Відгукнутися" but the popup offered to sign in
  // "to message, add to contacts, or save this post" — three things the
  // visitor did not ask for). For an unclaimed company's post the action IS
  // applying, so the popup says that and nothing else. The general wording
  // above still stands everywhere the button is "Message".
  applyPromptTitle: {
    uk: "Увійдіть, щоб відгукнутися", en: "Sign in to apply", ru: "Войдите, чтобы откликнуться",
    de: "Melden Sie sich an, um sich zu bewerben", es: "Inicia sesión para postularte",
    fr: "Connectez-vous pour postuler", pl: "Zaloguj się, aby aplikować",
    ptBR: "Entre para se candidatar", zh: "登录后即可申请",
  },
  applyPromptBody: {
    uk: "Зареєструйтесь або увійдіть, щоб надіслати відгук на цю вакансію.",
    en: "Sign up or sign in to send your application for this job.",
    ru: "Зарегистрируйтесь или войдите, чтобы отправить отклик на эту вакансию.",
    de: "Registrieren oder anmelden, um Ihre Bewerbung auf diese Stelle zu senden.",
    es: "Regístrate o inicia sesión para enviar tu candidatura a esta vacante.",
    fr: "Inscrivez-vous ou connectez-vous pour envoyer votre candidature à cette offre.",
    pl: "Zarejestruj się lub zaloguj, aby wysłać aplikację na to stanowisko.",
    ptBR: "Cadastre-se ou entre para enviar sua candidatura a esta vaga.",
    zh: "注册或登录即可投递这个职位的申请。",
  },
  signInCta: {
    uk: "Увійти або зареєструватися", en: "Sign in or sign up", ru: "Войти или зарегистрироваться",
    de: "Anmelden oder registrieren", es: "Iniciar sesión o registrarse", fr: "Se connecter ou s'inscrire",
    pl: "Zaloguj się lub zarejestruj", ptBR: "Entrar ou cadastrar-se", zh: "登录或注册",
  },
  cancel: {
    uk: "Скасувати", en: "Cancel", ru: "Отмена", de: "Abbrechen", es: "Cancelar",
    fr: "Annuler", pl: "Anuluj", ptBR: "Cancelar", zh: "取消",
  },
  // Same "спасибо, передали вашу заявку компании" popup Aleksandr asked
  // for — the click still goes through the real openChat() flow below
  // (so the message lands in the technical account's inbox, same as
  // any other chat), it's just this popup instead of a redirect into
  // /chats/[chatId], since there's no real company on the other end yet.
  thanksTitle: {
    uk: "Дякуємо!", en: "Thanks!", ru: "Спасибо!", de: "Danke!", es: "¡Gracias!",
    fr: "Merci !", pl: "Dziękujemy!", ptBR: "Obrigado!", zh: "谢谢！",
  },
  thanksBody: {
    uk: "Ваш відгук передано компанії.", en: "Your application has been passed to the company.",
    ru: "Ваш отклик передан компании.", de: "Ihre Bewerbung wurde an das Unternehmen weitergeleitet.",
    es: "Tu postulación ha sido enviada a la empresa.", fr: "Votre candidature a été transmise à l'entreprise.",
    pl: "Twoje zgłoszenie zostało przekazane firmie.", ptBR: "Sua candidatura foi enviada à empresa.",
    zh: "您的申请已转交给公司。",
  },
  thanksOk: {
    uk: "Гаразд", en: "OK", ru: "Хорошо", de: "OK", es: "Vale",
    fr: "OK", pl: "OK", ptBR: "OK", zh: "好的",
  },
};

function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

type ToggleStatus = "loading" | "idle" | "on" | "busy" | "error";

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-chat-wiggle" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 animate-dots-bounce" aria-hidden="true">
      <circle cx="4" cy="10" r="1.7" />
      <circle cx="10" cy="10" r="1.7" />
      <circle cx="16" cy="10" r="1.7" />
    </svg>
  );
}

// 2026-09-01 (Aleksandr, dropdown screenshot: "Добавь соответствующие
// иконки левой стороны в эту модалку") — one small leading icon per
// row, same stroke-based style as MessageIcon above. Contact and save
// each swap between two variants to reflect on/off state, matching
// their label swap (add/remove, save/unsave) just above.
function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-person-hop" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

function UserMinusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-person-hop" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 11h-6" />
    </svg>
  );
}

function ContactCardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-share-lift" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="12" r="2" />
      <path d="M14 10h4M14 14h4M5.5 16.3c.6-1 1.7-1.7 2.8-1.7" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-bookmark-swing" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BookmarkFilledIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 animate-bookmark-swing" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M4 21V4h11l-1 3h6l-1.5 4L20 15h-7l-1-3H4" />
    </svg>
  );
}

function SharePostIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-share-lift" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.6l6.8-3.2M8.6 13.4l6.8 3.2" />
    </svg>
  );
}

export function PostViewerMenu({
  postId,
  authorUserId,
  authorUsername,
  authorName,
  authorAvatarUrl,
  authorUnclaimed,
  applyQuestions,
  shareUrl,
  shareTitle,
}: {
  postId: string;
  authorUserId: string | null;
  authorUsername: string | null;
  // 2026-09-02: passed through to /chats/[chatId]'s own ?title=&avatar=
  // query params on openChat() below, same as components/profile-
  // action-row.tsx's own avatarUrl prop -- the chat header needs the
  // POST AUTHOR's name/avatar, which isn't the same thing as this
  // component's existing shareTitle (the post's own title).
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  // 2026-09-09: post.author.unclaimed (types/web-post.ts) -- true for a
  // parser-imported company account nobody has claimed yet. Swaps the
  // "Message" button to "Apply" and, on click, shows a thank-you popup
  // instead of opening the chat. Defaults to false so every caller that
  // hasn't been updated yet (there are none left, but belt and suspenders)
  // keeps today's behavior.
  authorUnclaimed?: boolean;
  // 17.09.2026: вопросы к отклику (post.applyQuestions). Если они есть,
  // кнопка открывает окно с вопросами вместо того, чтобы отправлять
  // шаблонный текст мимо них -- components/apply-questions-modal.tsx.
  applyQuestions?: WebApplyQuestion[];
  shareUrl: string;
  shareTitle: string;
}) {
  const lang = useActiveLocale();
  const router = useRouter();

  // Прилипла ли строка прямо сейчас.
  //
  // 2026-09-13, третья попытка, и обе прошлые стоит помнить.
  //
  // Первая: подписка стояла в эффекте с пустыми зависимостями и брала
  // строку через useRef. На первом рендере viewerStatus ещё "loading",
  // компонент возвращает null, строки нет, ref пустой -- подписка молча
  // не вставала («Че то ниче не появилось»).
  //
  // Вторая: сравнивали верх строки с высотой шапки, взятой из
  // --site-nav-h. На телефоне это и сломалось (Александр, видео с
  // iPhone: "Тут откат по анимациям когда поднимаешь наверх на мобе,
  // надо фиксануть красиво, чтобы не прыгало"): у шапки есть отступ под
  // «чёлку» (env(safe-area-inset-top)), и Safari меняет его на ходу,
  // пока прячет и показывает свою панель. Высота шапки при этом гуляет,
  // а вместе с ней и порог -- строка успевала десять раз решить, что
  // она то прилипла, то нет, и анимация каждый раз начиналась заново.
  //
  // Теперь без высоты шапки вообще. Прямо перед строкой стоит невидимая
  // метка нулевой высоты. Пока строка в обычном потоке, они на одной
  // линии. Как только sticky её поймал, метка продолжает уезжать вверх,
  // а строка остаётся -- разница между ними и есть признак «прилипла».
  // Ни отступы, ни панель браузера на это не влияют. Отступ сверху
  // (mt-4) перенесён на метку, чтобы в обычном состоянии разница была
  // ровно нулевой.
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!rowEl || !sentinelEl) return;
    let frame = 0;
    function read() {
      frame = 0;
      if (!rowEl || !sentinelEl) return;
      // 4px запаса -- дробные значения при плавной прокрутке не должны
      // считаться прилипанием.
      setStuck(rowEl.getBoundingClientRect().top - sentinelEl.getBoundingClientRect().top > 4);
    }
    function onScroll() {
      // Один замер на кадр: иначе на каждый тик прокрутки мы дёргаем
      // раскладку, и на телефоне это само по себе заметно.
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    }
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [rowEl, sentinelEl]);
  // 2026-09-02: was a single `visible` boolean gated on "signed in AND
  // viewing someone else's post" -- now a state machine so a signed-out
  // visitor still sees the row (per Aleksandr's request, same treatment
  // as components/profile-action-row.tsx already got), just with real
  // actions gated behind the authPromptOpen popup below instead of the
  // fetches that only make sense for "other".
  const [viewerStatus, setViewerStatus] = useState<"loading" | "self" | "other" | "anon" | "error">("loading");
  const [open, setOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  // 2026-09-02 (Aleksandr: "все логины должны после залогинювання
  // оставаться на той странице на которой ты был... тут тоже не уводи
  // человека на отдельную страницу, показывай регистрацію/логін прям
  // там модалкою") -- expands this same centered dialog into components/
  // inline-auth-form.tsx's real form in place, mirroring components/
  // fab-auth-prompt.tsx's own expand-in-place pattern. Reset back to
  // the short pitch every time the dialog closes, same reasoning as
  // that file's own comment.
  const [authFormExpanded, setAuthFormExpanded] = useState(false);
  useEffect(() => {
    if (!authPromptOpen) setAuthFormExpanded(false);
  }, [authPromptOpen]);

  // 2026-09-14 (Александр: «сделай чтобы модалка пряталась при скролле
  // на мобиле»). Выключено, пока открыта форма входа: мобильная
  // клавиатура сама двигает вьюпорт -- см. lib/use-close-on-scroll.ts.
  useCloseOnScroll(authPromptOpen && !authFormExpanded, () => setAuthPromptOpen(false));
  // Закрытие по тыку мимо окна -- только если жест и начался, и
  // закончился на подложке (см. lib/use-backdrop-dismiss.ts).
  const authBackdrop = useBackdropDismiss(() => setAuthPromptOpen(false));
  const [openingChat, setOpeningChat] = useState(false);
  const [chatErrored, setChatErrored] = useState(false);
  // 2026-09-09: shown instead of navigating into the chat when the click
  // succeeded but authorUnclaimed is true — see openChat() below.
  const [thanksOpen, setThanksOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // 2026-09-02 (Aleksandr: "И сюда, на сообщение и °°°" -- same hover-
  // appear effect asked for on components/chats-fab.tsx/components/
  // create-post-fab.tsx's own FABs) -- the "•••" dropdown opens on
  // hover the same way components/settings-menu.tsx's own trigger now
  // does; it's a plain (non-portaled) DOM descendant of the wrapping
  // `relative` div below, so one pair of handlers on that wrapper
  // covers trigger+panel both. `z-40` on that wrapper matters, not just
  // decoration: without it, this dropdown's own full-viewport backdrop
  // (z-30 below) would paint ABOVE the trigger once open (a `position:
  // fixed, z-index:30` element always outranks a merely-`relative`,
  // z-index:auto one in the same stacking context, regardless of DOM
  // order) -- the same open/close flicker loop live-testing caught on
  // components/fab-auth-prompt.tsx (see that file's own comment for the
  // full mechanism). z-40 puts the trigger back on top of its own
  // backdrop, same fix, same reason.
  //
  // 2026-09-02 follow-up, live screen recording (Aleksandr: "давай
  // уберём всплывание попапа при наведении на поведомлення... пусть
  // оно лучше кликом всё-таки срабатывает"): the Message button's own
  // hover-to-open-authPromptOpen wiring is REMOVED here per that
  // request -- it's click-only again, same as before this session's
  // hover pass (openChat() below still opens this same authPromptOpen
  // popup for an anon visitor, just never from a hover).
  const dotsWrapperRef = useRef<HTMLDivElement>(null);
  const dotsPanelRef = useRef<HTMLDivElement>(null);
  const {
    handleMouseEnter: handleDotsMouseEnter,
    handleMouseLeave: handleDotsMouseLeave,
    isRecentHoverOpen: isDotsRecentHoverOpen,
  } = useHoverPanel(open, setOpen, [{ trigger: dotsWrapperRef, panel: dotsPanelRef }]);

  // Contact toggle — same shape as components/add-contact-button.tsx's
  // status machine, reimplemented here as a text row (see this file's
  // header comment for why it's not shared as one component).
  const [contactStatus, setContactStatus] = useState<ToggleStatus>("loading");
  const [contactId, setContactId] = useState<string | null>(null);

  // Save-post toggle — same shape, backed by the favorites API instead
  // of contacts.
  const [saveStatus, setSaveStatus] = useState<ToggleStatus>("loading");

  // Что именно сейчас расшаривают, null -- окно закрыто. Одно окно на
  // оба пункта меню: отличается только содержимым, не выбором
  // получателя.
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/account/whoami")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setViewerStatus("anon");
          return;
        }
        setViewerStatus(data.username && data.username === authorUsername ? "self" : "other");
      })
      .catch(() => {
        if (!cancelled) setViewerStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [authorUsername]);

  useEffect(() => {
    if (!authorUserId || viewerStatus !== "other") {
      setContactStatus("idle");
      return;
    }
    let cancelled = false;
    authFetch("/api/contacts/list")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setContactStatus("idle");
          return;
        }
        const existing = (data.contacts as Contact[] | undefined)?.find((c) => c.user === authorUserId);
        if (existing) {
          setContactId(existing._id);
          setContactStatus("on");
        } else {
          setContactStatus("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setContactStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [authorUserId, viewerStatus]);

  useEffect(() => {
    if (viewerStatus !== "other") {
      setSaveStatus("idle");
      return;
    }
    let cancelled = false;
    authFetch("/api/favorites/list")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setSaveStatus("idle");
          return;
        }
        setSaveStatus((data.postIds as string[] | undefined)?.includes(postId) ? "on" : "idle");
      })
      .catch(() => {
        if (!cancelled) setSaveStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [postId, viewerStatus]);

  if (viewerStatus === "loading" || viewerStatus === "self" || viewerStatus === "error") {
    return null;
  }
  const isAnon = viewerStatus === "anon";
  // Окно с вопросами к отклику: открывается вместо openChat(), когда у
  // поста есть вопросы и смотрящий вошёл в аккаунт.
  const hasApplyQuestions = (applyQuestions?.length ?? 0) > 0;

  // 2026-09-02 (Aleksandr: "Сделай функциональной кнопку 'сообщения' из
  // страниц постов") -- same POST /api/chats/open + flash-red-on-
  // failure pattern components/profile-action-row.tsx's own openChat()
  // already uses, scoped to authorUserId instead of profileUserId.
  async function openChat() {
    if (isAnon) {
      setAuthPromptOpen(true);
      return;
    }
    if (openingChat || !authorUserId) return;
    if (hasApplyQuestions) {
      // Отклик на вакансию с вопросами -- сначала ответы, отправка уже
      // внутри окна (оно само зовёт /api/chats/open + /api/chats/send).
      setApplyOpen(true);
      return;
    }
    setOpeningChat(true);
    try {
      const res = await authFetch("/api/chats/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authorUserId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && typeof data.chatId === "string") {
        // 2026-09-11: an unclaimed company's "Apply" now SENDS a real
        // message instead of only resolving a chat id and showing the
        // popup — see STRINGS.applyMessage above for why that was not
        // enough (no chat exists until a message goes out, so nothing
        // ever arrived). `data.chatId` here is either a real chat id or
        // the `u_<userId>` sentinel; /api/chats/send resolves both via
        // peerForRouteParam, and for the sentinel chat-server creates
        // the personal chat as part of this same send. The thank-you
        // popup is only shown after the send actually succeeded — a
        // failed send flashes the same red "try again" state every
        // other action here uses, rather than telling the visitor their
        // application went through when it did not.
        if (authorUnclaimed) {
          const text = STRINGS.applyMessage[lang]
            .replace("{title}", shareTitle)
            .replace("{url}", shareUrl);
          const sent = await authFetch("/api/chats/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId: data.chatId, text }),
          });
          const sentData = await sent.json().catch(() => null);
          if (!sentData?.ok) throw new Error("apply_failed");
          setThanksOpen(true);
          return;
        }
        const qs = new URLSearchParams();
        if (authorName) qs.set("title", authorName);
        if (authorAvatarUrl) qs.set("avatar", authorAvatarUrl);
        if (authorUsername) qs.set("username", authorUsername);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        router.push(`/chats/${data.chatId}${suffix}`);
        return;
      }
      throw new Error("open_failed");
    } catch {
      setChatErrored(true);
      window.setTimeout(() => setChatErrored(false), 2200);
    } finally {
      setOpeningChat(false);
    }
  }

  async function toggleContact() {
    if (isAnon) {
      setAuthPromptOpen(true);
      return;
    }
    if (contactStatus === "busy" || !authorUserId) return;
    if (contactStatus === "on") {
      if (!contactId) return;
      setContactStatus("busy");
      try {
        const res = await authFetch("/api/contacts/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId }),
        });
        const data = await res.json().catch(() => null);
        if (data?.ok) {
          setContactId(null);
          setContactStatus("idle");
        } else {
          setContactStatus("error");
        }
      } catch {
        setContactStatus("error");
      }
      return;
    }
    setContactStatus("busy");
    try {
      const res = await authFetch("/api/contacts/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authorUserId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setContactId(data.contact?._id ?? null);
        setContactStatus("on");
      } else {
        setContactStatus("error");
      }
    } catch {
      setContactStatus("error");
    }
  }

  async function toggleSave() {
    if (isAnon) {
      setAuthPromptOpen(true);
      return;
    }
    if (saveStatus === "busy") return;
    const wasOn = saveStatus === "on";
    setSaveStatus("busy");
    try {
      const res = await authFetch(wasOn ? "/api/favorites/remove" : "/api/favorites/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId }),
      });
      const data = await res.json().catch(() => null);
      setSaveStatus(data?.ok ? (wasOn ? "idle" : "on") : "error");
    } catch {
      setSaveStatus("error");
    }
  }

  /** Абсолютная ссылка на профиль автора -- запасной вариант для
   *  карточки контакта и то, чем делятся «вовне». */
  function authorProfileUrl(): string {
    const path = authorUsername ? `/u/${authorUsername}` : "";
    if (!path) return shareUrl;
    return typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  }


  const contactLabel =
    contactStatus === "error" ? STRINGS.actionFailed[lang] : contactStatus === "on" ? STRINGS.removeContact[lang] : STRINGS.addContact[lang];
  const saveLabel =
    saveStatus === "error" ? STRINGS.actionFailed[lang] : saveStatus === "on" ? STRINGS.unsavePost[lang] : STRINGS.savePost[lang];
  const contactIcon = contactStatus === "on" ? <UserMinusIcon /> : <UserPlusIcon />;
  const saveIcon = saveStatus === "on" ? <BookmarkFilledIcon /> : <BookmarkIcon />;

  return (
    <>
    {/* 2026-09-09 (Aleksandr, from a live screenshot: message + dots row
        should rise up and stick) -- on mobile only, once scrolling
        carries this row up to just under the sticky site nav, it
        detaches and stays there instead of continuing to scroll away
        with the avatar header above it; everything below (tags, post
        text, images) keeps scrolling underneath as normal. Reuses the
        same --site-nav-h var + background/blur treatment
        components/site-nav.tsx publishes and components/chat/voice-now-
        playing-bar.tsx already reuses the same way, so it sits flush
        under the real nav on every device instead of a guessed pixel
        offset. -mx-4/px-4 cancel out to fill the page own side padding
        so the sticky bar background reaches both edges while the
        buttons inside stay aligned with the rest of the content.
        2026-09-13 (Александр: "Еще давай кнопки «откликнуться» ··· тоже
        закрепим сверху при скролле, так же как на мобильном") -- раньше
        тут стоял набор sm:-классов, который на широком экране возвращал
        строку в обычный поток. Убрал: теперь она закрепляется одинаково
        на любом размере окна. Отступы -mx-4/px-4 совпадают с px-4 самой
        страницы (app/jobs/[slug]/page.tsx) и на десктопе тоже.

        z-40, а не z-20, и это не украшение (Александр, сразу следом:
        "После закрепов перестали работать кнопки из ··· они не реагируют
        вообще"). Прилипшая строка -- это собственный слой (sticky с
        z-index), и всё внутри неё, включая z-40 на обёртке "···" ниже,
        живёт ВНУТРИ этого слоя. Подложка меню (fixed inset-0 z-30)
        лежит в body, то есть снаружи, и при z-20 оказывалась ПОВЕРХ
        всей строки вместе с раскрытым меню: нажатия попадали в подложку,
        меню просто закрывалось. Ставим строке z-40 -- выше подложки и
        ниже самой шапки сайта (z-45), так что порядок остаётся прежним.
        До закрепа на десктопе строка была обычной, слоя не создавала,
        поэтому там всё работало.

2026-09-13, итог долгой серии попыток (Александр прислал четыре
        записи экрана подряд: «глючит пдзц», «Не работает», «Все равно
        трабла», «:(»). Ниже -- что выяснилось и почему сейчас на
        телефоне намеренно ничего не происходит.

        Что было настоящей причиной хотя бы раз:
        * ширина блока с контекстом менялась мгновенно, а проявление шло
          200 мс -- всё это время место занято, а содержимого не видно:
          «пустое место вместо кнопок». Это была моя ошибка, исправлена;
        * до того анимировалась сама ширина -- дорого на каждый кадр.

        Чего добиться не удалось: на последней записи полоса всё ещё
        двоится -- видно её и наверху, и на своём месте в потоке
        одновременно. Это уже не раскладка и не анимация, а отрисовка
        Safari на iOS. Попытка помочь ему отдельным слоем (translateZ +
        will-change) убрана: на sticky-элементе она в iOS сама по себе
        бывает источником таких призраков, а проверить я это не могу --
        живого iPhone у меня нет.

        Поэтому на телефоне блок с контекстом снова не показывается
        вовсе: полоса стоит неподвижно, кнопка во всю ширину, ничего не
        перестраивается -- призраку нечего копировать. На широком экране
        всё остаётся: контекст, плавное сжатие, ссылка и ховер. */}
    {/* Метка, по которой строка понимает, что прилипла -- см. эффект
        выше. Нулевой высоты, ничего не рисует; весь верхний отступ
        переехал сюда со строки, чтобы в обычном состоянии их верхние
        края совпадали. */}
    <div ref={setSentinelEl} aria-hidden="true" className="mt-4 h-0" />
    <div
      ref={setRowEl}
      className="sticky top-[var(--site-nav-h,64px)] z-40 -mx-4 flex items-center gap-2 bg-app px-4 pb-2 pt-3 dark:bg-black sm:bg-app/90 sm:backdrop-blur-xl dark:sm:bg-black/90"
    >
      {/* Контекст поста: аватарка, заголовок и автор. В обычном
          положении его не видно вовсе (max-width 0), в прилипшем он
          раскрывается, и кнопка «Відгукнутися» ужимается сама -- она
          так и осталась flex-1, поэтому переход получается плавным, без
          скачка. На узком экране места меньше, поэтому доля уже и
          вторая строка (название компании) не показывается. Доля и
          боковые поля кнопки на телефоне подобраны так, чтобы надпись
          «Відгукнутися» помещалась целиком: сокращается заголовок, а не
          действие -- проверено на 390px.

          2026-09-13 (Александр: "Сделай, чтобы в таком состоянии аватар
          и имя тоже нажимались и добавь какой-то ховер") -- весь блок
          стал ссылкой на профиль автора, ровно туда же, куда ведут его
          аватарка и имя в шапке страницы выше. Под курсором подсвечивается
          подложка, аватарка получает тонкий ободок, название компании
          подчёркивается.

          Пока строка не прилипла, блок свёрнут в ноль: убираем его и из
          обхода с клавиатуры, и из чтения читалкой, иначе получилась бы
          невидимая ссылка, на которую можно попасть табом. Когда
          прилипла -- это осмысленная ссылка, и прятать её от читалки уже
          неправильно. */}
      {(() => {
        const inner = (
          <>
            <CachedAvatar
              src={authorAvatarUrl || pickDefaultCatAvatar(authorUserId ?? shareTitle)}
              blurDataURL={BLUR_DATA_URL}
              size={64}
              className="h-8 w-8 shrink-0 rounded-full object-cover transition duration-200 group-hover/ctx:ring-2 group-hover/ctx:ring-neutral-300 dark:group-hover/ctx:ring-neutral-600"
            />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
                {shareTitle}
              </div>
              {authorName && (
                <div className="hidden truncate text-[12px] leading-tight text-neutral-500 transition-colors group-hover/ctx:text-neutral-900 group-hover/ctx:underline dark:text-neutral-400 dark:group-hover/ctx:text-neutral-50 sm:block">
                  {authorName}
                </div>
              )}
            </div>
          </>
        );

        // 2026-09-13 (Александр, запись экрана с iPhone: «Анимация
        // трансформации кнопки глючит пдзц на мобильном, надо
        // починить»). Раньше здесь анимировалась ШИРИНА (max-width).
        // Это самая дорогая анимация из возможных: на каждый кадр
        // браузер заново раскладывает строку, а на телефоне это
        // совпадает с прокруткой, которую Safari ведёт отдельно от
        // основного потока -- отсюда рывки.
        //
        // На телефоне теперь анимируется только прозрачность (её
        // браузер считает «бесплатной»), а ширина меняется мгновенно:
        // блок просто проявляется, кнопка сразу становится нужной
        // ширины. На широком экране (sm и выше) остаётся прежнее плавное
        // сжатие -- там оно не дёргается, и Александр просил именно его.
        // 2026-09-13, и вот теперь причина «пустого места вместо кнопок»
        // видна на кадре (Александр, третья запись): ширина у блока
        // менялась МГНОВЕННО, а прозрачность -- за 200 мс. Все эти 200
        // мс место под контекст уже занято, а самого контекста ещё не
        // видно: кнопка стоит сжатая, слева от неё пустота. Именно это и
        // попадало в записи.
        //
        // На телефоне убираю переход совсем: место и содержимое
        // появляются одним движением, промежуточного состояния больше
        // нет. На широком экране остаётся плавное сжатие -- там ширина и
        // прозрачность идут вместе, пустоты не возникает.
        const shared =
          "group/ctx hidden min-w-0 items-center gap-2 overflow-hidden rounded-xl sm:flex sm:transition-all sm:duration-200 sm:ease-out motion-reduce:transition-none " +
          (stuck ? "sm:max-w-[340px] sm:opacity-100" : "pointer-events-none sm:max-w-0 sm:opacity-0");

        if (!authorUsername) {
          return (
            <div aria-hidden="true" className={shared}>
              {inner}
            </div>
          );
        }

        return (
          <Link
            href={profileHref(authorUsername)}
            aria-hidden={!stuck}
            tabIndex={stuck ? undefined : -1}
            aria-label={authorName ?? shareTitle}
            className={shared + " cursor-pointer py-1 pl-1 pr-2 hover:bg-black/5 dark:hover:bg-white/10"}
          >
            {inner}
          </Link>
        );
      })()}

      <button
        type="button"
        onClick={openChat}
        disabled={openingChat}
        aria-label={chatErrored ? STRINGS.actionFailed[lang] : authorUnclaimed || hasApplyQuestions ? STRINGS.apply[lang] : STRINGS.message[lang]}
        className={
          chatErrored
            ? "group flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-default disabled:opacity-60"
            : "group flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/5 disabled:cursor-default disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
        }
      >
        <MessageIcon />
        {/* min-w-0 на кнопке и truncate здесь -- чтобы в прилипшем виде,
            когда слева появился контекст поста, надпись укорачивалась
            многоточием, а не переносилась на вторую строку и не ломала
            высоту всей полосы. */}
        <span className="truncate">
          {chatErrored ? STRINGS.actionFailed[lang] : authorUnclaimed || hasApplyQuestions ? STRINGS.apply[lang] : STRINGS.message[lang]}
        </span>
      </button>

      <div className="dots-trigger-group relative z-40 shrink-0" ref={dotsWrapperRef} onMouseEnter={handleDotsMouseEnter} onMouseLeave={handleDotsMouseLeave}>
        <button
          type="button"
          // lib/use-hover-panel.ts, 2026-09-04 entry: skip the toggle when
          // this click is the same tap that just hover-opened the panel
          // (iOS Safari's synthetic mouseenter-then-click on a first tap),
          // otherwise it flips straight back closed and needs a second tap.
          onClick={() => {
            if (isDotsRecentHoverOpen()) return;
            setOpen((v) => !v);
          }}
          aria-label={STRINGS.menuLabel[lang]}
          aria-expanded={open}
          className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
        >
          <DotsIcon />
        </button>

        {open && (
          <>
            {createPortal(
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />,
              document.body,
            )}
            <div
              ref={dotsPanelRef}
              className="animate-popover absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
            >
              {authorUserId && (
                <button
                  type="button"
                  onClick={toggleContact}
                  disabled={contactStatus === "busy" || contactStatus === "loading"}
                  className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-accent/10 hover:text-accent disabled:opacity-60 dark:text-neutral-300"
                >
                  {contactIcon}
                  {contactLabel}
                </button>
              )}
              {authorUserId && (
              <button
                type="button"
                // 2026-09-13: было заглушкой (закрывало меню и всё).
                // Теперь открывает тот же выбор получателя, что и «допис»
                // ниже. Отдельного экрана входа тут не нужно: окно само
                // покажет «увійдіть, щоб поділитися в чаті» и при этом
                // оставит рабочей кнопку «вовне» -- гостю тоже есть что
                // сделать, в отличие от прежнего поведения.
                onClick={() => {
                  setOpen(false);
                  if (!authorUserId) return;
                  setShareTarget({
                    kind: "contact",
                    userId: authorUserId,
                    name: authorName || shareTitle,
                    profileUrl: authorProfileUrl(),
                  });
                }}
                className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-accent/10 hover:text-accent dark:text-neutral-300"
              >
                <ContactCardIcon />
                {STRINGS.shareContact[lang]}
              </button>
              )}
              <button
                type="button"
                onClick={toggleSave}
                disabled={saveStatus === "busy" || saveStatus === "loading"}
                className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-accent/10 hover:text-accent disabled:opacity-60 dark:text-neutral-300"
              >
                {saveIcon}
                {saveLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShareTarget({ kind: "post", title: shareTitle, url: shareUrl });
                }}
                className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-accent/10 hover:text-accent dark:text-neutral-300"
              >
                <SharePostIcon />
                {STRINGS.sharePost[lang]}
              </button>
              {/* 17.09.2026: жалоба. В заголовке файла годом раньше
                  стояло «Поскаржитись deliberately excluded -- це
                  попозже»; «попозже» наступило, методы в API есть
                  (posts.report), см. app/api/report/route.ts. */}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (isAnon) {
                    setAuthPromptOpen(true);
                    return;
                  }
                  setReportOpen(true);
                }}
                className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <ReportIcon />
                {STRINGS.report[lang]}
              </button>
            </div>
          </>
        )}
      </div>
    </div>

    {authPromptOpen &&
      createPortal(
        <div
          className="animate-backdrop-in fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          {...authBackdrop}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className={
              "animate-modal-in max-h-[85vh] w-full overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-neutral-900 " +
              (authFormExpanded ? "max-w-sm p-6" : "max-w-xs p-5")
            }
          >
            {authFormExpanded ? (
              <InlineAuthForm lang={lang} compact />
            ) : (
              <>
                {/* Same cat-blink.json animation as components/profile-action-
                    row.tsx's identical popup -- see that file's comment for
                    the full "why". */}
                <div className="mb-3 flex justify-center">
                  <LottiePlayer src="/animations/cat-blink.json" size={64} />
                </div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  {authorUnclaimed ? STRINGS.applyPromptTitle[lang] : STRINGS.authPromptTitle[lang]}
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {authorUnclaimed ? STRINGS.applyPromptBody[lang] : STRINGS.authPromptBody[lang]}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthFormExpanded(true)}
                    className="rounded-full bg-accent py-2.5 text-sm font-bold tracking-wide text-white transition hover:opacity-90"
                  >
                    {STRINGS.signInCta[lang]}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}

    {reportOpen && <ReportModal kind="post" targetId={postId} onClose={() => setReportOpen(false)} />}

    {applyOpen && authorUserId && applyQuestions && applyQuestions.length > 0 && (
      <ApplyQuestionsModal
        postId={postId}
        questions={applyQuestions}
        authorUserId={authorUserId}
        onClose={() => setApplyOpen(false)}
        onSubmitted={() => {
          setApplyOpen(false);
          setThanksOpen(true);
        }}
      />
    )}

    {thanksOpen &&
      createPortal(
        <div
          className="animate-backdrop-in fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setThanksOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-in w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
          >
            <div className="mb-3 flex justify-center">
              <LottiePlayer src="/animations/cat-blink.json" size={64} />
            </div>
            <p className="text-center text-sm font-semibold text-neutral-900 dark:text-neutral-50">{STRINGS.thanksTitle[lang]}</p>
            <p className="mt-1 text-center text-xs text-neutral-500 dark:text-neutral-400">{STRINGS.thanksBody[lang]}</p>
            <button
              type="button"
              onClick={() => setThanksOpen(false)}
              className="mt-4 w-full rounded-full bg-accent py-2.5 text-sm font-bold tracking-wide text-white transition hover:opacity-90"
            >
              {STRINGS.thanksOk[lang]}
            </button>
          </div>
        </div>,
        document.body,
      )}

    {/* Портал, как и у попапов выше: это меню живёт внутри шапки
        страницы, у которой свой контекст наложения, и окно на весь
        экран из неё иначе оказалось бы под ней. */}
    {shareTarget &&
      createPortal(
        <ShareTargetModal lang={lang} target={shareTarget} onClose={() => setShareTarget(null)} />,
        document.body,
      )}
    </>
  );
}
