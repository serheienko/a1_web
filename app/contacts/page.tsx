// app/contacts/page.tsx — "contact book" (Aleksandr, 2026-08-31: "давай
// где-то что-то накидаешь... где-то у нас какую-то контактную книгу. Но
// я пока не сильно знаю UI, где и как это расположить").
//
// 2026-09-01 follow-up ("Давай сохраненные посты и сохраненных
// пользователей будем сохранять и отображать 2 табами под
// контактами?"): grew from a single contacts list into a 3-tab page —
// Контакти (unchanged from the original pass below), Збережені пости
// (app/api/favorites/posts, mapped WebPosts rendered with the existing
// components/post-card.tsx), Збережені користувачі (app/api/favorites/
// users). The saved-users tab has nothing to show yet — there's no UI
// to favorite a user this side of a post-detail page's author, only
// posts.search({favorited:true})'s post-viewer-menu.tsx counterpart —
// "Сохраненных пользователей еще сделаем, в профиле будут кнопки,
// сделаем чуть позже" — but the backend already supports it end to end
// (favorites.addFavorites/deleteFavorites already route a USER_ID the
// same way as a POST_ID; users.search already takes the same
// {favorited:true}+{expandFavoritedBy} shape posts.search does — see
// app/api/favorites/users/route.ts's own comment), so this tab exists
// and simply renders empty until that follow-up ships, rather than
// waiting to build the tab shell later too.
//
// Both new tabs fetch lazily (only once, on first switch to that tab)
// rather than eagerly on mount alongside Контакти — a visitor who never
// opens them shouldn't pay for two extra authenticated round-trips.
//
// Both new tabs' dates/blur handling follow this codebase's established
// patterns exactly: components/load-more.tsx's own reviveDates()
// (WebPost's publishedAt/updatedAt cross a plain fetch().json() as ISO
// strings, not real Date instances) and components/profile-tabs.tsx's
// own client-fetched `ownDrafts` list (PostCard renders fine with no
// avatarBlurDataUrl at all, falling back to the generic shimmer — not
// worth a per-author sharp() fetch for a list that's short and visited
// rarely).
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
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { profileHref } from "@/lib/profile-href";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { T } from "@/components/t";
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
  // See app/api/contacts/list/route.ts's own ContactUserSummary comment
  // -- a real per-avatar blur preview, computed server-side there.
  avatarBlurDataUrl: string | null;
};

// Matches app/api/favorites/users/route.ts's own SavedUser export --
// re-declared locally rather than imported, same as components/load-
// more.tsx's own local RawFeedPost: a "use client" file importing a
// TYPE from an app/api/ route file works (it's erased at build), but
// this codebase's convention is that client components don't reach
// into route-handler modules at all, type-only or not.
type SavedUser = {
  id: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  avatarBlurDataUrl: string | null;
};

// Same shape/reasoning as components/load-more.tsx's own RawFeedPost/
// reviveDates -- WebPost's publishedAt/updatedAt cross this client
// fetch as ISO strings, not real Date instances.
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

// Same pill-switcher treatment as components/profile-tabs.tsx's own
// Bio/Posts tabs -- copied byte-for-byte (see that component's own
// comment on where it in turn came from: components/site-nav.tsx's
// Вакансії/Фахівці switcher) rather than inventing a fourth variant of
// the same active-tab-tint pattern.
function tabButtonClass(active: boolean): string {
  return (
    "flex-1 rounded-full py-2 text-sm font-medium transition " +
    (active ? "bg-accent/15 text-accent" : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50")
  );
}

export default function ContactsPage() {
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
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-50">
        <T uk="Контакти" en="Contacts" ru="Контакты" de="Kontakte" es="Contactos" fr="Contacts" pl="Kontakty" ptBR="Contatos" zh="联系人" />
      </h1>

      <div className="mt-6 flex gap-1 rounded-full bg-white p-1 dark:bg-neutral-900">
        <button type="button" onClick={() => setTab("contacts")} aria-pressed={tab === "contacts"} className={tabButtonClass(tab === "contacts")}>
          <T uk="Контакти" en="Contacts" ru="Контакты" de="Kontakte" es="Contactos" fr="Contacts" pl="Kontakty" ptBR="Contatos" zh="联系人" />
        </button>
        <button type="button" onClick={() => setTab("posts")} aria-pressed={tab === "posts"} className={tabButtonClass(tab === "posts")}>
          <T
            uk="Збережені пости"
            en="Saved posts"
            ru="Сохранённые посты"
            de="Gespeicherte Beiträge"
            es="Publicaciones guardadas"
            fr="Publications enregistrées"
            pl="Zapisane posty"
            ptBR="Publicações salvas"
            zh="已保存帖子"
          />
        </button>
        <button type="button" onClick={() => setTab("users")} aria-pressed={tab === "users"} className={tabButtonClass(tab === "users")}>
          <T
            uk="Збережені користувачі"
            en="Saved users"
            ru="Сохранённые пользователи"
            de="Gespeicherte Nutzer"
            es="Usuarios guardados"
            fr="Utilisateurs enregistrés"
            pl="Zapisani użytkownicy"
            ptBR="Usuários salvos"
            zh="已保存用户"
          />
        </button>
      </div>

      <div hidden={tab !== "contacts"}>
        {state === "loading" && (
          <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
            <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" />
          </p>
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

        {state === "ready" && contacts.length > 0 && (
          <div className="mt-6 flex flex-col gap-1">
            {contacts.map((contact) => {
              const linkedUser = contact.user ? contactUsers[contact.user] : undefined;
              const avatarSrc = linkedUser?.avatarUrl ?? pickDefaultCatAvatar(contact._id);
              const row = (
                <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900">
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
                </div>
              );
              return linkedUser?.username ? (
                <Link key={contact._id} href={profileHref(linkedUser.username)}>
                  {row}
                </Link>
              ) : (
                <div key={contact._id}>{row}</div>
              );
            })}
          </div>
        )}
      </div>

      <div hidden={tab !== "posts"} className="mt-6">
        {postsState === "loading" && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" />
          </p>
        )}

        {postsState === "signed-out" && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
          <ul className="flex flex-col gap-4">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div hidden={tab !== "users"} className="mt-6">
        {usersState === "loading" && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" />
          </p>
        )}

        {usersState === "signed-out" && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
          <div className="flex flex-col gap-1">
            {savedUsers.map((u) => {
              const avatarSrc = u.avatarUrl ?? pickDefaultCatAvatar(u.id);
              const row = (
                <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <Image
                    src={avatarSrc}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                    placeholder="blur"
                    blurDataURL={u.avatarBlurDataUrl ?? BLUR_DATA_URL}
                    unoptimized
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">{u.fullName || "—"}</div>
                    {u.username && <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">@{u.username}</div>}
                  </div>
                </div>
              );
              return u.username ? (
                <Link key={u.id} href={profileHref(u.username)}>
                  {row}
                </Link>
              ) : (
                <div key={u.id}>{row}</div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
