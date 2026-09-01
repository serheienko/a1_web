// components/contacts-panel.tsx
//
// 2026-09-01 (Aleksandr, iterating live on components/avatar-menu.tsx's
// hover/tap panel):
//   1) "Контакты я имею ввиду именно в модалке, которая всплывает после
//      наведения на аватар" / "В самих контактах должны быть только
//      контакты" / "Отсюда убери табы, только список контактов" — the
//      Контакти/Збережені tabs moved OUT of app/contacts/page.tsx (that
//      page is back to a plain contacts list) and INTO this panel,
//      embedded directly in the avatar dropdown.
//   2) "Давай сделаем по аналогии 'ТЕМЫ', 3 кнопки горизонтально и
//      текст под ними, но контакты оставим как есть, а на 3 кнопки
//      выведем: Мои публикации / Сохраненные публикации / Сохраненные
//      пользователи" — Контакти itself is NOT one of these three
//      buttons; it stays its own plain row above this panel (see
//      avatar-menu.tsx). The three grid buttons here are: my own
//      published posts (Мої дописи — same posts.search({author:"me"})
//      the profile's own Пости tab is built on, via the new app/api/
//      posts/mine-feed route), saved posts, and saved users. Grid style
//      copied byte-for-byte from this same panel's own Тема (Light/
//      Dark/Auto) picker so the two 3-across pickers read as one
//      consistent panel convention rather than two different ones.
//   3) "переименуем везде 'посты' на 'публикации' ... На українській це
//      буде 'допис'" — every UK "пост(и)" and RU "пост(ы)" label across
//      the app was reworded to "допис(и)"/"публикация(и)"; this file's
//      own tab labels/empty-states follow that too.
//
// Same three lazy-fetch-on-first-switch fetches as before, just backed
// by three different endpoints now: app/api/posts/mine-feed (own
// published posts), app/api/favorites/posts (saved posts), app/api/
// favorites/users (saved users) — Контакти's own app/api/contacts/list
// fetch is gone from this file entirely, it lives back in app/contacts/
// page.tsx only.
//
// `onNavigate` fires on every click that takes the visitor somewhere (a
// user row, a post card) — components/avatar-menu.tsx passes its own
// `() => setOpen(false)` so the panel closes the same way every other
// row in it already does.
"use client";

import { useEffect, useRef, useState } from "react";
import { T, LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { PostCard } from "@/components/post-card";
import { profileHref } from "@/lib/profile-href";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import Image from "next/image";
import Link from "next/link";
import type { WebPost } from "@/types/web-post";
import { authFetch } from "@/lib/auth-fetch";

type LoadState = "loading" | "signed-out" | "error" | "ready";
type Tab = "mine" | "posts" | "users";

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

function MyPostsTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
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

// Aleksandr's exact requested order: Мої дописи / Збережені публікації /
// Збережені користувачі.
const TAB_ORDER: Tab[] = ["mine", "posts", "users"];

function tabLabel(tab: Tab, lang: Locale): string {
  const STRINGS: Record<Tab, Record<Locale, string>> = {
    mine: {
      uk: "Мої дописи", en: "My posts", ru: "Мои публикации", de: "Meine Beiträge",
      es: "Mis publicaciones", fr: "Mes publications", pl: "Moje posty", ptBR: "Minhas publicações", zh: "我的帖子",
    },
    posts: {
      uk: "Збережені дописи", en: "Saved posts", ru: "Сохранённые публикации", de: "Gespeicherte Beiträge",
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
  if (tab === "mine") return <MyPostsTabIcon />;
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
  const [tab, setTab] = useState<Tab>("mine");

  const [mineState, setMineState] = useState<LoadState>("loading");
  const [minePosts, setMinePosts] = useState<WebPost[]>([]);
  const mineFetched = useRef(false);

  const [postsState, setPostsState] = useState<LoadState>("loading");
  const [posts, setPosts] = useState<WebPost[]>([]);
  const postsFetched = useRef(false);

  const [usersState, setUsersState] = useState<LoadState>("loading");
  const [savedUsers, setSavedUsers] = useState<SavedUser[]>([]);
  const usersFetched = useRef(false);

  useEffect(() => {
    if (tab !== "mine" || mineFetched.current) return;
    mineFetched.current = true;
    let cancelled = false;
    authFetch("/api/posts/mine-feed")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setMineState("signed-out");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          setMineState("error");
          return;
        }
        setMinePosts(((data.posts ?? []) as RawSavedPost[]).map(revivePostDates));
        setMineState("ready");
      })
      .catch(() => {
        if (!cancelled) setMineState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

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

      <div className="mt-2 max-h-60 overflow-y-auto" hidden={tab !== "mine"}>
        {mineState === "loading" && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" />
          </p>
        )}

        {mineState === "signed-out" && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T
              uk="Увійдіть, щоб побачити свої дописи."
              en="Sign in to see your posts."
              ru="Войдите, чтобы увидеть свои публикации."
              de="Melde dich an, um deine Beiträge zu sehen."
              es="Inicia sesión para ver tus publicaciones."
              fr="Connectez-vous pour voir vos publications."
              pl="Zaloguj się, aby zobaczyć swoje posty."
              ptBR="Entre para ver suas publicações."
              zh="登录以查看您的帖子。"
            />
          </p>
        )}

        {mineState === "error" && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T
              uk="Не вдалося завантажити дописи."
              en="Couldn't load posts."
              ru="Не удалось загрузить публикации."
              de="Beiträge konnten nicht geladen werden."
              es="No se pudieron cargar las publicaciones."
              fr="Impossible de charger les publications."
              pl="Nie udało się załadować postów."
              ptBR="Não foi possível carregar as publicações."
              zh="无法加载帖子。"
            />
          </p>
        )}

        {mineState === "ready" && minePosts.length === 0 && (
          <p className="px-1 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            <T
              uk="У вас ще немає опублікованих дописів."
              en="You don't have any published posts yet."
              ru="У вас пока нет опубликованных публикаций."
              de="Noch keine veröffentlichten Beiträge."
              es="Aún no tienes publicaciones."
              fr="Vous n'avez pas encore de publications."
              pl="Nie masz jeszcze opublikowanych postów."
              ptBR="Você ainda não tem publicações."
              zh="您还没有已发布的帖子。"
            />
          </p>
        )}

        {mineState === "ready" && minePosts.length > 0 && (
          <ul className="flex flex-col gap-2">
            {minePosts.map((post) => (
              <li key={post.id} onClick={onNavigate}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
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
              uk="Увійдіть, щоб побачити збережені дописи."
              en="Sign in to see your saved posts."
              ru="Войдите, чтобы увидеть сохранённые публикации."
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
              uk="Не вдалося завантажити збережені дописи."
              en="Couldn't load saved posts."
              ru="Не удалось загрузить сохранённые публикации."
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
              uk="Поки немає збережених дописів."
              en="No saved posts yet."
              ru="Пока нет сохранённых публикаций."
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
