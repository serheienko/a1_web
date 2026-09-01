// components/contacts-panel.tsx
//
// 2026-09-01 (Aleksandr, after seeing app/contacts/page.tsx grow a
// 3-tab switcher: "Но! Контакты я имею ввиду именно в модалке, которая
// всплывает после наведения на аватар" ... "В самих контактах должны
// быть только контакты" ... "Отсюда убери табы, только список
// контактов"): the tabbed Контакти/Збережені пости/Збережені
// користувачі experience moved HERE, embedded directly in components/
// avatar-menu.tsx's hover/tap panel — app/contacts/page.tsx itself goes
// back to being a single, tab-less contacts list (see that file's own
// header comment). This is the extracted guts of what that page's tabs
// used to be: same three fetches (app/api/contacts/list, app/api/
// favorites/posts, app/api/favorites/users), same lazy-fetch-on-first-
// tab-switch behavior, restyled compact for a ~320px hover panel
// instead of a full page column.
//
// Tab switcher is a 3-column icon+label grid, NOT the pill switcher the
// page used to have — deliberately copied from this same dropdown's own
// Тема (Light/Dark/Auto) picker layout (components/avatar-menu.tsx) so
// it reads as one consistent panel rather than two different tab
// conventions stacked on top of each other. A horizontal pill switcher
// doesn't fit three labels this long (esp. "Збережені користувачі") in
// a panel this narrow without truncating; icon-on-top + wrapped label
// underneath does.
//
// `onNavigate` fires on every click that takes the visitor somewhere
// (a contact/user row, a saved post card) — components/avatar-menu.tsx
// passes its own `() => setOpen(false)` so the panel closes the same
// way every other row in it already does.
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { profileHref } from "@/lib/profile-href";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { T, LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { PostCard } from "@/components/post-card";
import type { Contact } from "@/lib/a1/schemas";
import type { WebPost } from "@/types/web-post";
import { authFetch } from "@/lib/auth-fetch";

type LoadState = "loading" | "signed-out" | "error" | "ready";
type Tab = "contacts" | "posts" | "users";

type ContactUserSummary = {
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  avatarBlurDataUrl: string | null;
};

// Matches app/api/favorites/users/route.ts's own SavedUser export --
// re-declared locally rather than imported, same reasoning components/
// load-more.tsx's own local RawFeedPost has (see that file).
type SavedUser = {
  id: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  avatarBlurDataUrl: string | null;
};

type RawSavedPost = Omit<WebPost, "publishedAt" | "updatedAt"> & {
  publishedAt: string;
  updatedAt: string | null;
};

function revivePostDates(post: RawSavedPost): WebPost {
  return {
    ...post,
    publishedAt: new Date(post.publishedAt),
    updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
  };
}

function contactName(contact: Contact, linkedUser: ContactUserSummary | undefined): string {
  if (linkedUser?.fullName) return linkedUser.fullName;
  const name = `${contact.firstName} ${contact.lastName}`.trim();
  if (name) return name;
  if (contact.phone) return contact.phone;
  return "—";
}

function ContactsTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21c0-4 3.1-6 7-6s7 2 7 6" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}

function SavedPostsTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SavedUsersTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <path d="M2 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <circle cx="17" cy="8" r="2.6" />
      <path d="M15.5 10.4c2.6.3 4.5 1.8 4.5 4.6" />
    </svg>
  );
}

const TAB_ORDER: Tab[] = ["contacts", "posts", "users"];

function tabLabel(tab: Tab, lang: Locale): string {
  const STRINGS: Record<Tab, Record<Locale, string>> = {
    contacts: {
      uk: "Контакти", en: "Contacts", ru: "Контакты", de: "Kontakte", es: "Contactos",
      fr: "Contacts", pl: "Kontakty", ptBR: "Contatos", zh: "联系人",
    },
    posts: {
      uk: "Збережені пости", en: "Saved posts", ru: "Сохранённые посты", de: "Gespeicherte Beiträge",
      es: "Publicaciones guardadas", fr: "Publications enregistrées", pl: "Zapisane posty",
      ptBR: "Publicações salvas", zh: "已保存帖子",
    },
    users: {
      uk: "Збережені користувачі", en: "Saved users", ru: "Сохранённые пользователи", de: "Gespeicherte Nutzer",
      es: "Usuarios guardados", fr: "Utilisateurs enregistrés", pl: "Zapisani użytkownicy",
      ptBR: "Usuários salvos", zh: "已保存用户",
    },
  };
  return STRINGS[tab][lang];
}

function tabIcon(tab: Tab) {
  if (tab === "contacts") return <ContactsTabIcon />;
  if (tab === "posts") return <SavedPostsTabIcon />;
  return <SavedUsersTabIcon />;
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

export function ContactsPanel({ onNavigate }: { onNavigate?: () => void }) {
  const lang = useActiveLocale();
  const [tab, setTab] = useState<Tab>("contacts");

  const [state, setState] = useState<LoadState>("loading");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactUsers, setContactUsers] = useState<Record<string, ContactUserSummary>>({});

  const [postsState, setPostsState] = useState<LoadState>("loading");
  const [posts, setPosts] = useState<WebPost[]>([]);
  const postsFetched = useRef(false);

  const [usersState, setUsersState] = useState<LoadState>("loading");
  const [savedUsers, setSavedUsers] = useState<SavedUser[]>([]);
  const usersFetched = useRef(false);

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

  useEffect(() => {
    if (tab !== "posts" || postsFetched.current) return;
    postsFetched.current = true;
    let cancelled = false;
    authFetch("/api/favorites/posts")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setPostsState("signed-out");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          setPostsState("error");
          return;
        }
        setPosts(((data.posts ?? []) as RawSavedPost[]).map(revivePostDates));
        setPostsState("ready");
      })
      .catch(() => {
        if (!cancelled) setPostsState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "users" || usersFetched.current) return;
    usersFetched.current = true;
    let cancelled = false;
    authFetch("/api/favorites/users")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setUsersState("signed-out");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          setUsersState("error");
          return;
        }
        setSavedUsers(data.users ?? []);
        setUsersState("ready");
      })
      .catch(() => {
        if (!cancelled) setUsersState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5 px-1">
        {TAB_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            title={tabLabel(t, lang)}
            className={
              "flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center text-[11px] leading-tight transition " +
              (tab === t
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800")
            }
          >
            {tabIcon(t)}
            <span>{tabLabel(t, lang)}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 max-h-60 overflow-y-auto" hidden={tab !== "contacts"}>
        {state === "loading" && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" />
          </p>
        )}

        {state === "signed-out" && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
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
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
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
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T
              uk="Поки немає жодного контакту."
              en="No contacts yet."
              ru="Пока нет ни одного контакта."
              de="Noch keine Kontakte."
              es="Aún no hay contactos."
              fr="Aucun contact pour l'instant."
              pl="Brak kontaktów."
              ptBR="Ainda sem contatos."
              zh="暂无联系人。"
            />
          </p>
        )}

        {state === "ready" && contacts.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {contacts.map((contact) => {
              const linkedUser = contact.user ? contactUsers[contact.user] : undefined;
              const avatarSrc = linkedUser?.avatarUrl ?? pickDefaultCatAvatar(contact._id);
              const row = (
                <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <Image
                    src={avatarSrc}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                    placeholder="blur"
                    blurDataURL={linkedUser?.avatarBlurDataUrl ?? BLUR_DATA_URL}
                    unoptimized
                  />
                  <div className="min-w-0 truncate text-sm text-neutral-900 dark:text-neutral-50">
                    {contactName(contact, linkedUser)}
                  </div>
                </div>
              );
              return linkedUser?.username ? (
                <Link key={contact._id} href={profileHref(linkedUser.username)} onClick={onNavigate}>
                  {row}
                </Link>
              ) : (
                <div key={contact._id}>{row}</div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-2 max-h-60 overflow-y-auto" hidden={tab !== "posts"}>
        {postsState === "loading" && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" />
          </p>
        )}

        {postsState === "signed-out" && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T
              uk="Увійдіть, щоб побачити збережені пости."
              en="Sign in to see your saved posts."
              ru="Войдите, чтобы увидеть сохранённые посты."
              de="Melde dich an, um gespeicherte Beiträge zu sehen."
              es="Inicia sesión para ver tus publicaciones guardadas."
              fr="Connectez-vous pour voir vos publications enregistrées."
              pl="Zaloguj się, aby zobaczyć zapisane posty."
              ptBR="Entre para ver suas publicações salvas."
              zh="登录以查看已保存的帖子。"
            />
          </p>
        )}

        {postsState === "error" && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T
              uk="Не вдалося завантажити збережені пости."
              en="Couldn't load saved posts."
              ru="Не удалось загрузить сохранённые посты."
              de="Gespeicherte Beiträge konnten nicht geladen werden."
              es="No se pudieron cargar las publicaciones guardadas."
              fr="Impossible de charger les publications enregistrées."
              pl="Nie udało się załadować zapisanych postów."
              ptBR="Não foi possível carregar as publicações salvas."
              zh="无法加载已保存的帖子。"
            />
          </p>
        )}

        {postsState === "ready" && posts.length === 0 && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T
              uk="Поки немає збережених постів."
              en="No saved posts yet."
              ru="Пока нет сохранённых постов."
              de="Noch keine gespeicherten Beiträge."
              es="Aún no hay publicaciones guardadas."
              fr="Aucune publication enregistrée pour l'instant."
              pl="Brak zapisanych postów."
              ptBR="Ainda sem publicações salvas."
              zh="暂无已保存的帖子。"
            />
          </p>
        )}

        {postsState === "ready" && posts.length > 0 && (
          <ul className="flex flex-col gap-2">
            {posts.map((post) => (
              <li key={post.id} onClick={onNavigate}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 max-h-60 overflow-y-auto" hidden={tab !== "users"}>
        {usersState === "loading" && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" />
          </p>
        )}

        {usersState === "signed-out" && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T
              uk="Увійдіть, щоб побачити збережених користувачів."
              en="Sign in to see your saved users."
              ru="Войдите, чтобы увидеть сохранённых пользователей."
              de="Melde dich an, um gespeicherte Nutzer zu sehen."
              es="Inicia sesión para ver tus usuarios guardados."
              fr="Connectez-vous pour voir vos utilisateurs enregistrés."
              pl="Zaloguj się, aby zobaczyć zapisanych użytkowników."
              ptBR="Entre para ver seus usuários salvos."
              zh="登录以查看已保存的用户。"
            />
          </p>
        )}

        {usersState === "error" && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T
              uk="Не вдалося завантажити збережених користувачів."
              en="Couldn't load saved users."
              ru="Не удалось загрузить сохранённых пользователей."
              de="Gespeicherte Nutzer konnten nicht geladen werden."
              es="No se pudieron cargar los usuarios guardados."
              fr="Impossible de charger les utilisateurs enregistrés."
              pl="Nie udało się załadować zapisanych użytkowników."
              ptBR="Não foi possível carregar os usuários salvos."
              zh="无法加载已保存的用户。"
            />
          </p>
        )}

        {usersState === "ready" && savedUsers.length === 0 && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T
              uk="Поки немає збережених користувачів."
              en="No saved users yet."
              ru="Пока нет сохранённых пользователей."
              de="Noch keine gespeicherten Nutzer."
              es="Aún no hay usuarios guardados."
              fr="Aucun utilisateur enregistré pour l'instant."
              pl="Brak zapisanych użytkowników."
              ptBR="Ainda sem usuários salvos."
              zh="暂无已保存的用户。"
            />
          </p>
        )}

        {usersState === "ready" && savedUsers.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {savedUsers.map((u) => {
              const avatarSrc = u.avatarUrl ?? pickDefaultCatAvatar(u.id);
              const row = (
                <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <Image
                    src={avatarSrc}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                    placeholder="blur"
                    blurDataURL={u.avatarBlurDataUrl ?? BLUR_DATA_URL}
                    unoptimized
                  />
                  <div className="min-w-0 truncate text-sm text-neutral-900 dark:text-neutral-50">{u.fullName || "—"}</div>
                </div>
              );
              return u.username ? (
                <Link key={u.id} href={profileHref(u.username)} onClick={onNavigate}>
                  {row}
                </Link>
              ) : (
                <div key={u.id}>{row}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
