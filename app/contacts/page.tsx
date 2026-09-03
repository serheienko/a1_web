// app/contacts/page.tsx — "contact book" (Aleksandr, 2026-08-31: "давай
// где-то что-то накидаешь... где-то у нас какую-то контактную книгу. Но
// я пока не сильно знаю UI, где и как это расположить").
//
// 2026-09-01: briefly grew a 3-tab switcher (Контакти/Збережені пости/
// Збережені користувачі) here, then Aleksandr redirected it twice more
// the same day: "Контакты я имею ввиду именно в модалке, которая
// всплывает после наведения на аватар" ... "В самих контактах должны
// быть только контакты" ... "Отсюда убери табы, только список
// контактов" (tabs moved into components/avatar-menu.tsx's own
// hover/tap panel, embedded directly), then finally "мы в самой
// модалке ничего не отображаем... My Activity откроет одну страницу"
// (tabs moved back out, this time to their own page — app/my-activity/
// page.tsx). This page has stayed a single, tab-less contacts list
// through all of that. Kept as its own route regardless (not folded
// away) since it's still a real, linkable page — just never where the
// saved-posts/saved-users tabs live.
//
// Explicitly a rough first pass per his own framing ("накидаешь, потом
// пересделаем") — both the page's own layout AND its entry point
// (components/avatar-menu.tsx's "Контакти" row) are placeholders to
// react to live, not a settled design.
//
// Client component, not a server one: unlike every feed/profile page in
// this app, a contact list is inherently visitor-specific (it's "my"
// contacts, no ISR-cacheable public version exists) and needs the
// visitor's own session cookie — same reasoning components/edit-profile-
// button.tsx's whoami call documents for why that's a client-side
// concern here, not a server one.
//
// Each Contact (lib/a1/schemas.ts's ContactSchema) only ever carries
// firstName/lastName/phone — no photo, and only a raw `user` id, not a
// username. 2026-08-31, live-testing feedback ("Арина в контактах
// сохраняется почему то с другим аватаром"): app/api/contacts/list/
// route.ts now separately resolves every platform-linked contact's real
// profile (contacts.search's own `users` array, confirmed live against
// aone-api-private's source — see that route's comment) and returns it
// here as `contactUsers`, keyed by user id. A contact with no match
// there (a phone-book entry with no linked user, or a linked account
// that no longer resolves) falls back to the same generated
// pickDefaultCatAvatar placeholder as before.
//
// 2026-09-01 (Aleksandr: "добавь кнопку 'написать'... не текст, а
// просто напротив имени добавь иконку чатов и раздели на 2 нажатия:
// аватар и определенная ширина поля - переход на акк, а чат иконка -
// открыть чат"): each row is now two separate click targets inside the
// same highlighted pill (he explicitly likes the current hover/select
// styling as-is, so that stays on the OUTER row -- only the inner
// structure splits). The chat icon only appears for a platform-linked
// contact (contact.user set) -- a phone-book-only entry has no account
// to message. It calls the new POST /api/chats/open (finds an existing
// personal chat with that user, or creates one -- see that route's own
// comment for exactly how uncertain the "creates one" half still is)
// and navigates to the resulting /chats/<id>. Failure flashes the icon
// red for ~2s, same flashError() convention components/profile-action-
// row.tsx already uses for its own contact/save-toggle buttons.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { profileHref } from "@/lib/profile-href";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { T, LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import type { Contact } from "@/lib/a1/schemas";
import { authFetch } from "@/lib/auth-fetch";
import { SearchIcon } from "@/components/search-icon";
import { GLASS } from "@/lib/glass";

type LoadState = "loading" | "signed-out" | "error" | "ready";

type ContactUserSummary = {
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  // See app/api/contacts/list/route.ts's own ContactUserSummary comment
  // -- a real per-avatar blur preview, computed server-side there.
  avatarBlurDataUrl: string | null;
};

// Same speech-bubble glyph as components/avatar-menu.tsx's ChatsIcon /
// components/chats-fab.tsx's ChatsIcon, just this row's own icon size.
function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-chat-wiggle" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 20l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function contactName(contact: Contact, linkedUser: ContactUserSummary | undefined): string {
  if (linkedUser?.fullName) return linkedUser.fullName;
  const name = `${contact.firstName} ${contact.lastName}`.trim();
  if (name) return name;
  if (contact.phone) return contact.phone;
  return "—";
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

const SEARCH_PLACEHOLDER_STRINGS: Record<Locale, string> = {
  uk: "Пошук", en: "Search", ru: "Поиск", de: "Suche", es: "Buscar",
  fr: "Rechercher", pl: "Szukaj", ptBR: "Pesquisar", zh: "搜索",
};

export default function ContactsPage() {
  const lang = useActiveLocale();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<LoadState>("loading");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactUsers, setContactUsers] = useState<Record<string, ContactUserSummary>>({});
  const router = useRouter();
  const [openingChatFor, setOpeningChatFor] = useState<string | null>(null);
  const [chatErrorFor, setChatErrorFor] = useState<string | null>(null);

  async function openChat(userId: string, title?: string, avatarUrl?: string | null, username?: string | null) {
    if (openingChatFor) return;
    setOpeningChatFor(userId);
    try {
      const res = await authFetch("/api/chats/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && typeof data.chatId === "string") {
        // 2026-09-02: pass title/avatar through so the chat header (task
        // this excerpt, Aleksandr: "возле аватарки нет имени почему-то")
        // has something to show immediately instead of "--" -- same
        // ?title=&avatar= convention app/chats/page.tsx already builds
        // its own chat links with.
        const qs = new URLSearchParams();
        if (title) qs.set("title", title);
        if (avatarUrl) qs.set("avatar", avatarUrl);
        if (username) qs.set("username", username);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        router.push(`/chats/${data.chatId}${suffix}`);
        return;
      }
      throw new Error("open_failed");
    } catch {
      setChatErrorFor(userId);
      window.setTimeout(() => setChatErrorFor((v) => (v === userId ? null : v)), 2200);
    } finally {
      setOpeningChatFor(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    // authFetch, not a bare fetch: avatar-menu.tsx fires its own
    // whoami call on every page (including this one) at roughly the
    // same moment -- see lib/auth-fetch.ts for why racing two
    // authenticated fetches here could make this page (wrongly) look
    // signed-out after the access token expires.
    authFetch("/api/contacts/list")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setState("signed-out");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          setState("error");
          return;
        }
        setContacts(data.contacts ?? []);
        setContactUsers(data.contactUsers ?? {});
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedQuery = query.trim().toLowerCase();
  const filteredContacts = trimmedQuery
    ? contacts.filter((contact) => {
        const linkedUser = contact.user ? contactUsers[contact.user] : undefined;
        const name = contactName(contact, linkedUser).toLowerCase();
        const phone = (contact.phone ?? "").toLowerCase();
        return name.includes(trimmedQuery) || phone.includes(trimmedQuery);
      })
    : contacts;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-50">
        <T uk="Контакти" en="Contacts" ru="Контакты" de="Kontakte" es="Contactos" fr="Contacts" pl="Kontakty" ptBR="Contatos" zh="联系人" />
      </h1>

      {state === "ready" && contacts.length > 0 && (
        <div className="relative mt-4 shrink-0">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={SEARCH_PLACEHOLDER_STRINGS[lang]}
            aria-label={SEARCH_PLACEHOLDER_STRINGS[lang]}
            className={
              "w-full rounded-full py-2.5 pl-10 pr-4 text-[16px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:ring-2 focus:ring-accent/30 dark:text-white dark:placeholder:text-neutral-500 " +
              GLASS +
              " sm:border-0 sm:bg-white sm:shadow-none sm:backdrop-blur-none sm:backdrop-saturate-100 sm:dark:border-0 sm:dark:bg-neutral-900 sm:dark:shadow-none"
            }
          />
        </div>
      )}

      {state === "loading" && (
        // 2026-09-04 (Aleksandr: "Грузи контакты тоже с скелетоном") --
        // was a bare "Завантаження…" line; now the same animate-pulse
        // gray-block skeleton app/chats/page.tsx's own loading state
        // already uses, sized to this page's own 40px-avatar row
        // (h-10 w-10 above) instead of that page's 52px one.
        <div className="mt-6 flex flex-col gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-1.5" aria-hidden="true">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
              <div className="min-w-0 flex-1">
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {state === "signed-out" && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T
            uk="Увійдіть, щоб побачити свої контакти."
            en="Sign in to see your contacts."
            ru="Войдите, чтобы увидеть свои контакты."
            de="Melde dich an, um deine Kontakte zu sehen."
            es="Inicia sesión para ver tus contactos."
            fr="Connectez-vous pour voir vos contacts."
            pl="Zaloguj się, aby zobaczyć swoje kontakty."
            ptBR="Entre para ver seus contatos."
            zh="登录以查看您的联系人。"
          />
        </p>
      )}

      {state === "error" && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T
            uk="Не вдалося завантажити контакти."
            en="Couldn't load contacts."
            ru="Не удалось загрузить контакты."
            de="Kontakte konnten nicht geladen werden."
            es="No se pudieron cargar los contactos."
            fr="Impossible de charger les contacts."
            pl="Nie udało się załadować kontaktów."
            ptBR="Não foi possível carregar os contatos."
            zh="无法加载联系人。"
          />
        </p>
      )}

      {state === "ready" && contacts.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T
            uk="Поки немає жодного контакту. Додайте когось із профілю."
            en="No contacts yet. Add someone from their profile."
            ru="Пока нет ни одного контакта. Добавьте кого-нибудь с его профиля."
            de="Noch keine Kontakte. Füge jemanden über sein Profil hinzu."
            es="Aún no hay contactos. Añade a alguien desde su perfil."
            fr="Aucun contact pour l'instant. Ajoutez quelqu'un depuis son profil."
            pl="Brak kontaktów. Dodaj kogoś z jego profilu."
            ptBR="Ainda sem contatos. Adicione alguém pelo perfil dele."
            zh="暂无联系人。可在对方主页添加。"
          />
        </p>
      )}

      {state === "ready" && contacts.length > 0 && filteredContacts.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T
            uk="Нічого не знайдено"
            en="No results found"
            ru="Ничего не найдено"
            de="Keine Ergebnisse gefunden"
            es="No se encontraron resultados"
            fr="Aucun résultat trouvé"
            pl="Nie znaleziono wyników"
            ptBR="Nenhum resultado encontrado"
            zh="未找到结果"
          />
        </p>
      )}

      {state === "ready" && filteredContacts.length > 0 && (
        <div className="mt-6 flex flex-col gap-1">
          {filteredContacts.map((contact) => {
            const linkedUser = contact.user ? contactUsers[contact.user] : undefined;
            const avatarSrc = linkedUser?.avatarUrl ?? pickDefaultCatAvatar(contact._id);
            const profileBody = (
              <>
                <Image
                  src={avatarSrc}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                  placeholder="blur"
                  blurDataURL={linkedUser?.avatarBlurDataUrl ?? BLUR_DATA_URL}
                  unoptimized
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {contactName(contact, linkedUser)}
                  </div>
                  {contact.phone && <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">{contact.phone}</div>}
                </div>
              </>
            );
            const isOpeningThisChat = openingChatFor === contact.user;
            const chatErrored = chatErrorFor === contact.user;
            return (
              // Same hover/highlight styling this row always had --
              // Aleksandr: "строка выбора (подсветка) мне нравится как
              // сейчас" -- it just now wraps two separate click targets
              // instead of being one big Link itself.
              <div
                key={contact._id}
                className="flex items-center gap-1 rounded-xl px-2 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                {linkedUser?.username ? (
                  <Link
                    href={profileHref(linkedUser.username)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1.5"
                  >
                    {profileBody}
                  </Link>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-3 py-1.5">{profileBody}</div>
                )}
                {contact.user && (
                  <button
                    type="button"
                    onClick={() => openChat(contact.user!, contactName(contact, linkedUser), linkedUser?.avatarUrl, linkedUser?.username)}
                    disabled={isOpeningThisChat}
                    aria-label="Chat"
                    className={
                      "group flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-50 " +
                      (chatErrored
                        ? "text-red-500"
                        : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50")
                    }
                  >
                    <ChatIcon />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
