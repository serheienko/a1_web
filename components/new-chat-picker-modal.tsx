"use client";

// components/new-chat-picker-modal.tsx
//
// 2026-09-04 (Aleksandr: "Поставь кстати в чатах кнопку создания поста
// и кнопку для создания чата. При ее нажатии должен всплывать попап с
// выбором контактов и поиском, нажатие на контакт сразу открывает
// чат") -- app/chats/page.tsx's own header gained two buttons; this is
// the popup the "new chat" one opens.
//
// Deliberately its own small self-contained widget rather than a
// shared import from app/contacts/page.tsx, same "self-contained
// widget" convention this codebase already uses repeatedly (see e.g.
// components/chats-flyout.tsx/components/mini-chat-window.tsx's own
// header comments on that) -- the contacts PAGE has its own concerns
// (a route, a profile-link split target, tabs history) this popup has
// no business sharing. What's reused instead is the exact same
// contacts-list fetch (/api/contacts/list) and chat-open flow (POST
// /api/chats/open -> navigate to /chats/<id>) that page already proved
// out, just with every row being ONE click target straight into the
// chat -- no separate profile-link vs. chat-icon split, since this
// popup's only job is "start a chat", per his own spec above.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { T, type Locale } from "@/components/t";
import type { Contact } from "@/lib/a1/schemas";
import { authFetch } from "@/lib/auth-fetch";
import { SearchIcon } from "@/components/search-icon";

type LoadState = "loading" | "signed-out" | "error" | "ready";

// Mirrors app/api/contacts/list/route.ts's own response shape --
// see app/contacts/page.tsx's identical local type for the full
// provenance comment.
type ContactUserSummary = {
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  avatarBlurDataUrl: string | null;
};

const SEARCH_PLACEHOLDER_STRINGS: Record<Locale, string> = {
  uk: "Пошук", en: "Search", ru: "Поиск", de: "Suche", es: "Buscar",
  fr: "Rechercher", pl: "Szukaj", ptBR: "Pesquisar", zh: "搜索",
};

const TITLE_STRINGS: Record<Locale, string> = {
  uk: "Новий чат", en: "New chat", ru: "Новый чат", de: "Neuer Chat", es: "Nuevo chat",
  fr: "Nouveau chat", pl: "Nowy czat", ptBR: "Nova conversa", zh: "新聊天",
};

const NO_LINKED_CONTACTS_STRINGS: Record<Locale, string> = {
  uk: "Жоден контакт ще не приєднався до A1", en: "None of your contacts are on A1 yet",
  ru: "Никто из контактов ещё не в A1", de: "Noch niemand aus deinen Kontakten ist bei A1",
  es: "Ninguno de tus contactos está en A1 todavía", fr: "Aucun de vos contacts n'est encore sur A1",
  pl: "Nikt z Twoich kontaktów nie jest jeszcze na A1", ptBR: "Nenhum dos seus contatos está no A1 ainda",
  zh: "你的联系人中还没有人使用 A1",
};

const NO_RESULTS_STRINGS: Record<Locale, string> = {
  uk: "Нічого не знайдено", en: "No results found", ru: "Ничего не найдено",
  de: "Keine Ergebnisse gefunden", es: "No se encontraron resultados", fr: "Aucun résultat trouvé",
  pl: "Nie znaleziono wyników", ptBR: "Nenhum resultado encontrado", zh: "未找到结果",
};

const LOAD_FAILED_STRINGS: Record<Locale, string> = {
  uk: "Не вдалося завантажити контакти", en: "Couldn't load contacts", ru: "Не удалось загрузить контакты",
  de: "Kontakte konnten nicht geladen werden", es: "No se pudieron cargar los contactos",
  fr: "Impossible de charger les contacts", pl: "Nie udało się załadować kontaktów",
  ptBR: "Não foi possível carregar os contatos", zh: "无法加载联系人",
};

function contactName(contact: Contact, linkedUser: ContactUserSummary | undefined): string {
  if (linkedUser?.fullName) return linkedUser.fullName;
  const name = `${contact.firstName} ${contact.lastName}`.trim();
  if (name) return name;
  if (contact.phone) return contact.phone;
  return "—";
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function NewChatPickerModal({ lang, onClose }: { lang: Locale; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<LoadState>("loading");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactUsers, setContactUsers] = useState<Record<string, ContactUserSummary>>({});
  const [openingChatFor, setOpeningChatFor] = useState<string | null>(null);
  const [chatErrorFor, setChatErrorFor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
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

  // Only a platform-linked contact (contact.user set) can actually be
  // messaged -- same constraint app/contacts/page.tsx's own chat icon
  // already gates on. Filtered out here entirely (rather than shown
  // disabled) since this popup's only purpose is starting a chat, so a
  // contact nothing can be done with has no reason to occupy a row.
  const linkedContacts = useMemo(() => contacts.filter((c) => c.user), [contacts]);

  const trimmedQuery = query.trim().toLowerCase();
  const filteredContacts = trimmedQuery
    ? linkedContacts.filter((contact) => {
        const linkedUser = contact.user ? contactUsers[contact.user] : undefined;
        const name = contactName(contact, linkedUser).toLowerCase();
        const phone = (contact.phone ?? "").toLowerCase();
        return name.includes(trimmedQuery) || phone.includes(trimmedQuery);
      })
    : linkedContacts;

  async function openChat(userId: string, title: string, avatarUrl: string | null, username: string | null) {
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
        const qs = new URLSearchParams();
        if (title) qs.set("title", title);
        if (avatarUrl) qs.set("avatar", avatarUrl);
        if (username) qs.set("username", username);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        onClose();
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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <h2 className="flex-1 text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{TITLE_STRINGS[lang]}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={TITLE_STRINGS[lang]}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-neutral-50"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="relative shrink-0">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={SEARCH_PLACEHOLDER_STRINGS[lang]}
            aria-label={SEARCH_PLACEHOLDER_STRINGS[lang]}
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-[14px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#335ef7] dark:border-[#2b2b2b] dark:bg-[#1c1c1e] dark:text-white"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {state === "loading" && (
            <div className="flex flex-col gap-1 py-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-1.5" aria-hidden="true">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
              ))}
            </div>
          )}

          {state === "error" && <p className="py-6 text-center text-[13px] text-neutral-500 dark:text-neutral-400">{LOAD_FAILED_STRINGS[lang]}</p>}

          {state === "signed-out" && <p className="py-6 text-center text-[13px] text-neutral-500 dark:text-neutral-400">{LOAD_FAILED_STRINGS[lang]}</p>}

          {state === "ready" && linkedContacts.length === 0 && (
            <p className="py-6 text-center text-[13px] text-neutral-500 dark:text-neutral-400">{NO_LINKED_CONTACTS_STRINGS[lang]}</p>
          )}

          {state === "ready" && linkedContacts.length > 0 && filteredContacts.length === 0 && (
            <p className="py-6 text-center text-[13px] text-neutral-500 dark:text-neutral-400">{NO_RESULTS_STRINGS[lang]}</p>
          )}

          {state === "ready" && filteredContacts.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {filteredContacts.map((contact) => {
                const linkedUser = contact.user ? contactUsers[contact.user] : undefined;
                const avatarSrc = linkedUser?.avatarUrl ?? pickDefaultCatAvatar(contact._id);
                const name = contactName(contact, linkedUser);
                const isOpeningThisChat = openingChatFor === contact.user;
                const chatErrored = chatErrorFor === contact.user;
                return (
                  <button
                    type="button"
                    key={contact._id}
                    disabled={isOpeningThisChat}
                    onClick={() => contact.user && void openChat(contact.user, name, linkedUser?.avatarUrl ?? null, linkedUser?.username ?? null)}
                    className={`flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition disabled:opacity-60 ${
                      chatErrored ? "bg-red-50 dark:bg-red-950/30" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
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
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium text-neutral-900 dark:text-neutral-50">{name}</div>
                      {contact.phone && <div className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">{contact.phone}</div>}
                    </div>
                    {isOpeningThisChat && (
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 animate-spin text-neutral-400" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
                        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
