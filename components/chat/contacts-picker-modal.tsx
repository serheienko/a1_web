// components/chat/contacts-picker-modal.tsx
//
// 2026-09-02, Aleksandr (native-app "Contacts" picker screenshots --
// alphabetically-grouped list with letter headers, a search field,
// avatar + name + phone per row): the picker behind the new "Contacts"
// row in the chat attach popover. Confirmed via the follow-up
// AskUserQuestion: screenshots are enough (no Figma needed) and contacts
// with no phone number are hidden from this list entirely (phoneNumber
// is required by the backend's own MessageInput.Media.Contact schema --
// a contact with none literally cannot be sent as one).
//
// Data source: GET /api/contacts/list (already existed for
// app/contacts/page.tsx's own "contact book" -- this picker is a second,
// smaller consumer of the exact same route, not a new backend call).
// That route already resolves phone-book contacts against their linked
// platform user (contacts.search's own joined `users` array) and now
// also returns occupation/expertise (2026-09-02 extension, this same
// pass) -- fetched once here and handed straight to
// components/chat/contact-message-card.tsx as that picked contact's
// `summary`, so the pending/optimistic bubble preview needs no separate
// round-trip (unlike a REAL sent message's card, which resolves its
// summary later via POST /api/users/summaries -- see app/chats/
// [chatId]/page.tsx's own comment on why those are two different
// fetches).
//
// Multi-pick, not single-tap-and-close: chat-server's own `contacts`
// array on messages.send allows up to 5 (app/api/chats/send/route.ts's
// SendInput), so tapping a row toggles it in/out of the parent's pending
// list (checkmark shown here) rather than immediately sending and
// closing -- closer to how the paperclip's own Photo/File flow already
// lets you queue more than one attachment before hitting Send.
"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { T, type Locale } from "@/components/t";
import type { Contact } from "@/lib/a1/schemas";
import type { ContactCardSummary } from "@/components/chat/contact-message-card";

export type PickedContact = {
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  summary: ContactCardSummary | null;
};

type ContactUserSummary = ContactCardSummary;

type LoadState = "loading" | "signed-out" | "error" | "ready";

type StringKey = "title" | "close" | "search" | "loading" | "loadFailed" | "empty" | "noResults";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: { uk: "Контакти", en: "Contacts", ru: "Контакты", de: "Kontakte", es: "Contactos", fr: "Contacts", pl: "Kontakty", ptBR: "Contatos", zh: "联系人" },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭" },
  search: { uk: "Пошук", en: "Search", ru: "Поиск", de: "Suche", es: "Buscar", fr: "Rechercher", pl: "Szukaj", ptBR: "Buscar", zh: "搜索" },
  loading: { uk: "Завантаження…", en: "Loading…", ru: "Загрузка…", de: "Wird geladen…", es: "Cargando…", fr: "Chargement…", pl: "Ładowanie…", ptBR: "Carregando…", zh: "加载中…" },
  loadFailed: { uk: "Не вдалося завантажити контакти", en: "Couldn't load contacts", ru: "Не удалось загрузить контакты", de: "Kontakte konnten nicht geladen werden", es: "No se pudieron cargar los contactos", fr: "Impossible de charger les contacts", pl: "Nie udało się wczytać kontaktów", ptBR: "Não foi possível carregar os contatos", zh: "无法加载联系人" },
  empty: { uk: "Немає контактів із номером телефону", en: "No contacts with a phone number", ru: "Нет контактов с номером телефона", de: "Keine Kontakte mit Telefonnummer", es: "No hay contactos con número de teléfono", fr: "Aucun contact avec un numéro de téléphone", pl: "Brak kontaktów z numerem telefonu", ptBR: "Nenhum contato com número de telefone", zh: "没有带电话号码的联系人" },
  noResults: { uk: "Нічого не знайдено", en: "Nothing found", ru: "Ничего не найдено", de: "Nichts gefunden", es: "No se encontró nada", fr: "Aucun résultat", pl: "Nic nie znaleziono", ptBR: "Nada encontrado", zh: "未找到任何内容" },
};

function t(key: StringKey, lang: Locale): string {
  return STRINGS[key][lang];
}

export function ContactsPickerModal({
  lang,
  pickedUserIds,
  onToggle,
  onClose,
}: {
  lang: Locale;
  pickedUserIds: Set<string>;
  onToggle: (contact: PickedContact) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactUsers, setContactUsers] = useState<Record<string, ContactUserSummary>>({});
  const [query, setQuery] = useState("");

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

  // Only platform-linked contacts with a phone survive -- see this
  // file's own header comment on why phone-less contacts are hidden
  // entirely rather than shown disabled.
  const sendable = useMemo(
    () => contacts.filter((c): c is Contact & { user: string; phone: string } => Boolean(c.user) && Boolean(c.phone)),
    [contacts],
  );

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? sendable.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(trimmed))
    : sendable;

  const groups = useMemo(() => {
    const sorted = [...filtered].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    );
    const byLetter = new Map<string, typeof sorted>();
    for (const c of sorted) {
      const letter = (c.firstName || c.lastName || "#").trim().charAt(0).toUpperCase() || "#";
      const bucket = byLetter.get(letter);
      if (bucket) bucket.push(c);
      else byLetter.set(letter, [c]);
    }
    return Array.from(byLetter.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-[min(32rem,80vh)] w-full max-w-sm flex-col rounded-2xl bg-white shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{t("title", lang)}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close", lang)}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
          >
            ×
          </button>
        </div>

        <div className="px-5 pb-3 pt-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search", lang)}
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-[14px] text-neutral-900 outline-none focus:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {state === "loading" && (
            <div className="flex items-center justify-center py-10 text-sm text-neutral-500 dark:text-neutral-400">
              {t("loading", lang)}
            </div>
          )}
          {state === "error" && (
            <div className="flex items-center justify-center py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {t("loadFailed", lang)}
            </div>
          )}
          {state === "ready" && groups.length === 0 && (
            <div className="flex items-center justify-center py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {sendable.length === 0 ? t("empty", lang) : t("noResults", lang)}
            </div>
          )}
          {state === "ready" &&
            groups.map(([letter, rows]) => (
              <div key={letter}>
                <div className="px-3 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  {letter}
                </div>
                {rows.map((c) => {
                  const userId = c.user as string;
                  const phone = c.phone as string;
                  const summary = contactUsers[userId] ?? null;
                  const picked = pickedUserIds.has(userId);
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() =>
                        onToggle({
                          userId,
                          firstName: c.firstName,
                          lastName: c.lastName,
                          phoneNumber: phone,
                          summary,
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- proxied/
                          generated avatar, not a next/image-configured remote host. */}
                      <img
                        src={summary?.avatarUrl ?? pickDefaultCatAvatar(userId)}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-medium text-neutral-900 dark:text-neutral-50">
                          {c.firstName} {c.lastName}
                        </div>
                        <div className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">{phone}</div>
                      </div>
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[12px] ${
                          picked
                            ? "border-[#335ef7] bg-[#335ef7] text-white dark:border-[#0c8ce9] dark:bg-[#0c8ce9]"
                            : "border-neutral-300 dark:border-neutral-600"
                        }`}
                      >
                        {picked && "✓"}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
