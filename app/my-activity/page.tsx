// app/my-activity/page.tsx
//
// 2026-09-01 (Aleksandr, second thoughts on the same-day pass that had
// embedded a Тема-style 3-button grid directly in components/avatar-
// menu.tsx's hover/tap panel): "надо сделать это такими просто
// отдельными строчками, как сейчас у нас контакты, и под ним контакты
// отображать отдельно. А этот My Activity уже отображать тремя
// табами. Но ещё раз: мы в самой модалке ничего не отображаем. Это
// всё кнопки-ссылки, которые ведут на страницу... My Activity откроет
// одну страницу, на которой будет вот как раз то, что нам нужно: My
// Posts, Saved Posts, и saved users" — the dropdown goes back to being
// link rows only (see avatar-menu.tsx's own "My Activity" row, right
// above its "Контакти" row), and this is the page that row opens. The
// three tabs that used to live in components/contacts-panel.tsx (now
// deleted — nothing else imported it) move here essentially unchanged
// on the data side, but restyled: real page tabs (underline, matching
// the native app's own My posts/Saved posts/Saved users screen he
// screenshotted) instead of the compact Тема-style icon grid that made
// sense in a 288px dropdown but not on a full page.
//
// Same three lazy-fetch-on-first-switch fetches components/contacts-
// panel.tsx had: app/api/posts/mine-feed (own published posts), app/
// api/favorites/posts (saved posts), app/api/favorites/users (saved
// users). Контакти's own app/api/contacts/list fetch stays where it's
// always lived, in app/contacts/page.tsx — untouched by this page.
//
// Client component, not a server one — same reasoning app/contacts/
// page.tsx documents: this is inherently visitor-specific, needs the
// visitor's own session cookie client-side.
"use client";

import { useEffect, useRef, useState } from "react";
import { CachedAvatar } from "@/components/cached-avatar";
import Link from "next/link";
import { T, type Locale } from "@/components/t";
import { PostCard } from "@/components/post-card";
import { profileHref } from "@/lib/profile-href";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import type { WebPost } from "@/types/web-post";
import { authFetch } from "@/lib/auth-fetch";
import { GLASS } from "@/lib/glass";
import { useActiveLocale } from "@/lib/use-active-locale";
import { ApplicationAnswer } from "@/components/application-answer";

type LoadState = "loading" | "signed-out" | "error" | "ready";
type Tab = "mine" | "posts" | "users" | "applied";
type AppState = "applied" | "opened" | "confirmed";
type Application = { post: WebPost & { avatarBlurDataUrl: string | null }; state: AppState; leaving?: boolean };

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

// avatarBlurDataUrl rides along per post the same way components/
// load-more.tsx's own RawFeedPost documents (a render-layer artifact
// from lib/avatar-blur.ts, not real post data) -- both app/api/posts/
// mine-feed/route.ts and app/api/favorites/posts/route.ts compute it
// server-side now (2026-09-01: avatars here used to pop straight from
// PostCard's generic gray shimmer fallback to the real photo instead
// of blurring in like every other feed's avatars).
type RawSavedPost = Omit<WebPost, "publishedAt" | "sourcePublishedAt" | "updatedAt"> & {
  publishedAt: string;
  sourcePublishedAt?: string | null;
  updatedAt: string | null;
  avatarBlurDataUrl: string | null;
};

function revivePostDates(post: RawSavedPost): WebPost & { avatarBlurDataUrl: string | null } {
  return {
    ...post,
    publishedAt: new Date(post.publishedAt),
    // 16.10.2026: у внешних вакансий есть дата публикации у источника -- без неё карточка падала.
    sourcePublishedAt: post.sourcePublishedAt ? new Date(post.sourcePublishedAt) : null,
    updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
  };
}

// Aleksandr's exact requested order: Мої дописи / Збережені публікації /
// Збережені користувачі.
// 16.10.2026 (Александр): «Мої відгуки» -- четвёртой вкладкой.
const TAB_ORDER: Tab[] = ["mine", "posts", "users", "applied"];

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
    applied: {
      uk: "Мої відгуки", en: "Applied", ru: "Мои отклики", de: "Bewerbungen",
      es: "Postulaciones", fr: "Candidatures", pl: "Moje aplikacje", ptBR: "Candidaturas", zh: "我的申请",
    },
    users: {
      uk: "Збережені користувачі", en: "Saved users", ru: "Сохранённые пользователи", de: "Gespeicherte Nutzer",
      es: "Usuarios guardados", fr: "Utilisateurs enregistrés", pl: "Zapisani użytkownicy",
      ptBR: "Usuários salvos", zh: "已保存用户",
    },
  };
  return STRINGS[tab][lang];
}

const SCHEDULED_BADGE_CLASS = "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200";

const INTL_LOCALE: Record<Locale, string> = {
  uk: "uk-UA", en: "en-GB", ru: "ru-RU", de: "de-DE", es: "es-ES", fr: "fr-FR", pl: "pl-PL", ptBR: "pt-BR", zh: "zh-CN",
};

/** «🕒 жовт. 28 · 16:19» -- как бэдж запланированного поста в приложении. */
function ScheduledLabel({ at, lang }: { at: Date; lang: Locale }) {
  const loc = INTL_LOCALE[lang] ?? "uk-UA";
  const day = new Intl.DateTimeFormat(loc, { month: "short", day: "numeric" }).format(at);
  const time = new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit", hour12: false }).format(at);
  return (
    <span className="inline-flex items-center gap-1">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      {day} · {time}
    </span>
  );
}

/** Запланированный пост ещё не опубликован -- публичной страницы у него нет;
 *  открываем свой профиль, где его можно отредактировать. */
function openOwnProfile() {
  authFetch("/api/account/whoami")
    .then((r) => r.json())
    .then((d) => {
      if (d?.ok && d.username) window.location.href = profileHref(d.username);
    })
    .catch(() => {});
}

export default function MyActivityPage() {
  const lang = useActiveLocale();
  const [tab, setTab] = useState<Tab>("mine");

  const [mineState, setMineState] = useState<LoadState>("loading");
  const [minePosts, setMinePosts] = useState<(WebPost & { avatarBlurDataUrl: string | null })[]>([]);
  const mineFetched = useRef(false);
  const [scheduledPosts, setScheduledPosts] = useState<{ post: WebPost & { avatarBlurDataUrl: string | null }; at: Date }[]>([]);

  const [postsState, setPostsState] = useState<LoadState>("loading");
  const [posts, setPosts] = useState<(WebPost & { avatarBlurDataUrl: string | null })[]>([]);
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
        // 28.10.2026 (Александр): запланированные посты тоже здесь, с
        // бэджем «часы + время выхода», как в профиле в приложении.
        // mine-feed отдаёт только опубликованные, поэтому берём их из
        // /api/posts/mine (там же черновики и запланированные).
        authFetch("/api/posts/mine")
          .then((r) => r.json())
          .then((mine) => {
            if (cancelled || !mine?.ok || !Array.isArray(mine.draftsAndScheduled)) return;
            const whenById: Record<string, number> = {};
            for (const p of (mine.posts ?? []) as { id: string; scheduled?: number | null }[]) {
              if (p.scheduled) whenById[p.id] = p.scheduled;
            }
            const now = Date.now() / 1000;
            const cards = (mine.draftsAndScheduled as { post: RawSavedPost; status: string; avatarBlurDataUrl: string | null }[])
              .filter((c) => c.status === "scheduled" && (whenById[c.post.id] ?? 0) > now)
              .map((c) => ({
                post: revivePostDates({ ...c.post, avatarBlurDataUrl: c.avatarBlurDataUrl ?? null }),
                at: new Date((whenById[c.post.id] ?? 0) * 1000),
              }))
              .sort((a, b) => a.at.getTime() - b.at.getTime());
            setScheduledPosts(cards);
          })
          .catch(() => {});
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

  // 16.10.2026: «Мої відгуки» (app/api/posts/applications). Подгружаем по 20, дальше -- по кнопке.
  const [appsState, setAppsState] = useState<LoadState>("loading");
  const [apps, setApps] = useState<Application[]>([]);
  const [appsNext, setAppsNext] = useState<string | null>(null);
  const [appsMore, setAppsMore] = useState(false);
  const appsFetched = useRef(false);

  async function loadApps(next: string | null) {
    const res = await authFetch("/api/posts/applications" + (next ? `?next=${encodeURIComponent(next)}` : ""));
    if (res.status === 401) return "signed-out" as const;
    const data = await res.json().catch(() => null);
    if (!data?.ok) return "error" as const;
    const items = ((data.items ?? []) as { post: RawSavedPost; state: AppState }[]).map((i) => ({
      post: revivePostDates(i.post),
      state: i.state,
    }));
    setApps((prev) => {
      const seen = new Set(prev.map((a) => a.post.id));
      return [...prev, ...items.filter((i) => !seen.has(i.post.id))];
    });
    setAppsNext(data.next ?? null);
    return "ready" as const;
  }

  useEffect(() => {
    if (tab !== "applied" || appsFetched.current) return;
    appsFetched.current = true;
    loadApps(null)
      .then(setAppsState)
      .catch(() => setAppsState("error"));
  }, [tab]);

  function onAnswered(postId: string, applied: boolean) {
    if (applied) {
      setApps((prev) => prev.map((a) => (a.post.id === postId ? { ...a, state: "confirmed" } : a)));
      return;
    }
    // «Ні» -- карточка плавно уходит, потом пропадает из списка.
    setApps((prev) => prev.map((a) => (a.post.id === postId ? { ...a, leaving: true } : a)));
    window.setTimeout(() => setApps((prev) => prev.filter((a) => a.post.id !== postId)), 320);
  }

  const activeState =
    tab === "mine" ? mineState : tab === "posts" ? postsState : tab === "users" ? usersState : appsState;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-50">
        <T uk="Моя активність" en="My Activity" ru="Моя активность" de="Meine Aktivität" es="Mi actividad" fr="Mon activité" pl="Moja aktywność" ptBR="Minha atividade" zh="我的动态" />
      </h1>

      {/* Aleksandr, 2026-09-01, live screenshot of the underline version:
          "сделай, пожалуйста, это такими же красивыми горизонтальными
          табами, как вот у нас сверху, например, вакансии в шапке...
          можешь чуть сделать, меньше, чтобы оно всё поместилось
          красивенько" -- points at site-nav.tsx's own Вакансії/Фахівці
          pill switcher (also reused byte-for-byte by components/
          profile-tabs.tsx's Bio/Дописи toggle: white rounded-full
          container, `bg-accent/15 text-accent` active tab). Copied the
          same convention here rather than inventing a third one.
          First pass used `flex-1 whitespace-nowrap`, which held each
          button to its full one-line content width (flex items default
          to `min-width: auto`) -- on an actual phone (real screenshot,
          not this sandbox's simulated viewport) "Збережені
          користувачі" alone was wider than its 1/3 share, so the whole
          row overflowed straight off the right edge of the screen
          instead of shrinking. Aleksandr, live screenshot: "Не влезло.
          На моб делай в 2 ряда, если не помещается и увеличивай высоту
          кнопки" -- `grid grid-cols-3` (equal thirds, no min-width
          escape hatch the way flex has) plus dropping `whitespace-
          nowrap` lets a too-narrow button wrap its own label to a
          second line instead of pushing the row wider than the
          viewport; `py-2` (up from `py-1.5`) gives that wrapped
          two-line state room to breathe instead of clipping, and reads
          fine as slightly-taller-than-strictly-needed on the common
          case where everything still fits on one line (desktop, or
          shorter locales). */}
      <div
        className={
          "mt-6 grid grid-cols-2 gap-1 rounded-3xl p-1 sm:grid-cols-4 sm:rounded-full " +
          GLASS +
          " sm:border-0 sm:bg-white sm:shadow-none sm:backdrop-blur-none sm:backdrop-saturate-100 sm:dark:border-0 sm:dark:bg-neutral-900 sm:dark:shadow-none"
        }
      >
        {TAB_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={
              "min-w-0 rounded-full px-2 py-2 text-center text-xs font-medium leading-tight transition sm:text-sm " +
              (tab === t
                ? "bg-accent/15 text-accent"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50")
            }
          >
            {tabLabel(t, lang)}
          </button>
        ))}
      </div>

      {/* 2026-09-03 (Aleksandr: "Тут во всех вкладках тоже показывай
          подгрузку skeleton load, как и везде") -- was a bare
          "Завантаження…" line for all three tabs; now the same
          animate-pulse gray-block language app/jobs/loading.tsx and
          components/chats-flyout.tsx's ChatRowSkeleton already
          established elsewhere in this app. "mine"/"posts" render post
          cards (PostCard), so they get app/jobs/loading.tsx's own
          h-32-block shape; "users" renders a single-line avatar+name
          row, so it gets a one-line variant of ChatRowSkeleton (that
          row has no second text line to fake). */}
      {activeState === "loading" && tab !== "users" && (
        <ul className="mt-6 flex flex-col gap-3" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="h-32 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          ))}
        </ul>
      )}
      {activeState === "loading" && tab === "users" && (
        <div className="mt-6 flex flex-col gap-1" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-2.5">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            </div>
          ))}
        </div>
      )}

      {activeState === "signed-out" && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          {tab === "mine" && (
            <T uk="Увійдіть, щоб побачити свої дописи." en="Sign in to see your posts." ru="Войдите, чтобы увидеть свои публикации." de="Melde dich an, um deine Beiträge zu sehen." es="Inicia sesión para ver tus publicaciones." fr="Connectez-vous pour voir vos publications." pl="Zaloguj się, aby zobaczyć swoje posty." ptBR="Entre para ver suas publicações." zh="登录以查看您的帖子。" />
          )}
          {tab === "posts" && (
            <T uk="Увійдіть, щоб побачити збережені дописи." en="Sign in to see your saved posts." ru="Войдите, чтобы увидеть сохранённые публикации." de="Melde dich an, um gespeicherte Beiträge zu sehen." es="Inicia sesión para ver tus publicaciones guardadas." fr="Connectez-vous pour voir vos publications enregistrées." pl="Zaloguj się, aby zobaczyć zapisane posty." ptBR="Entre para ver suas publicações salvas." zh="登录以查看已保存的帖子。" />
          )}
          {tab === "applied" && (
            <T uk="Увійдіть, щоб побачити свої відгуки." en="Sign in to see your applications." ru="Войдите, чтобы увидеть свои отклики." de="Melden Sie sich an, um Ihre Bewerbungen zu sehen." es="Inicie sesión para ver sus postulaciones." fr="Connectez-vous pour voir vos candidatures." pl="Zaloguj się, aby zobaczyć swoje aplikacje." ptBR="Entre para ver suas candidaturas." zh="登录以查看您的申请。" />
          )}
          {tab === "users" && (
            <T uk="Увійдіть, щоб побачити збережених користувачів." en="Sign in to see your saved users." ru="Войдите, чтобы увидеть сохранённых пользователей." de="Melde dich an, um gespeicherte Nutzer zu sehen." es="Inicia sesión para ver tus usuarios guardados." fr="Connectez-vous pour voir vos utilisateurs enregistrés." pl="Zaloguj się, aby zobaczyć zapisanych użytkowników." ptBR="Entre para ver seus usuários salvos." zh="登录以查看已保存的用户。" />
          )}
        </p>
      )}

      {activeState === "error" && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          {tab === "mine" && (
            <T uk="Не вдалося завантажити дописи." en="Couldn't load posts." ru="Не удалось загрузить публикации." de="Beiträge konnten nicht geladen werden." es="No se pudieron cargar las publicaciones." fr="Impossible de charger les publications." pl="Nie udało się załadować postów." ptBR="Não foi possível carregar as publicações." zh="无法加载帖子。" />
          )}
          {tab === "posts" && (
            <T uk="Не вдалося завантажити збережені дописи." en="Couldn't load saved posts." ru="Не удалось загрузить сохранённые публикации." de="Gespeicherte Beiträge konnten nicht geladen werden." es="No se pudieron cargar las publicaciones guardadas." fr="Impossible de charger les publications enregistrées." pl="Nie udało się załadować zapisanych postów." ptBR="Não foi possível carregar as publicações salvas." zh="无法加载已保存的帖子。" />
          )}
          {tab === "applied" && (
            <T uk="Не вдалося завантажити відгуки." en="Couldn't load applications." ru="Не удалось загрузить отклики." de="Bewerbungen konnten nicht geladen werden." es="No se pudieron cargar las postulaciones." fr="Impossible de charger les candidatures." pl="Nie udało się załadować aplikacji." ptBR="Não foi possível carregar as candidaturas." zh="无法加载申请。" />
          )}
          {tab === "users" && (
            <T uk="Не вдалося завантажити збережених користувачів." en="Couldn't load saved users." ru="Не удалось загрузить сохранённых пользователей." de="Gespeicherte Nutzer konnten nicht geladen werden." es="No se pudieron cargar los usuarios guardados." fr="Impossible de charger les utilisateurs enregistrés." pl="Nie udało się załadować zapisanych użytkowników." ptBR="Não foi possível carregar os usuários salvos." zh="无法加载已保存的用户。" />
          )}
        </p>
      )}

      {tab === "mine" && mineState === "ready" && minePosts.length === 0 && scheduledPosts.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T uk="У вас ще немає опублікованих дописів." en="You don't have any published posts yet." ru="У вас пока нет опубликованных публикаций." de="Noch keine veröffentlichten Beiträge." es="Aún no tienes publicaciones." fr="Vous n'avez pas encore de publications." pl="Nie masz jeszcze opublikowanych postów." ptBR="Você ainda não tem publicações." zh="您还没有已发布的帖子。" />
        </p>
      )}
      {tab === "mine" && mineState === "ready" && (minePosts.length > 0 || scheduledPosts.length > 0) && (
        <ul className="mt-6 flex flex-col gap-3">
          {scheduledPosts.map(({ post, at }) => (
            <li key={"s-" + post.id}>
              <PostCard
                post={post}
                avatarBlurDataUrl={post.avatarBlurDataUrl}
                statusBadge={{ label: <ScheduledLabel at={at} lang={lang} />, className: SCHEDULED_BADGE_CLASS }}
                onOpen={openOwnProfile}
              />
            </li>
          ))}
          {minePosts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} avatarBlurDataUrl={post.avatarBlurDataUrl} />
            </li>
          ))}
        </ul>
      )}

      {tab === "posts" && postsState === "ready" && posts.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T uk="Поки немає збережених дописів." en="No saved posts yet." ru="Пока нет сохранённых публикаций." de="Noch keine gespeicherten Beiträge." es="Aún no hay publicaciones guardadas." fr="Aucune publication enregistrée pour l'instant." pl="Brak zapisanych postów." ptBR="Ainda sem publicações salvas." zh="暂无已保存的帖子。" />
        </p>
      )}
      {tab === "posts" && postsState === "ready" && posts.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} avatarBlurDataUrl={post.avatarBlurDataUrl} />
            </li>
          ))}
        </ul>
      )}

      {tab === "applied" && appsState === "ready" && apps.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T uk="Тут з'являться вакансії, на які ви відгукнулися." en="Jobs you apply to will appear here." ru="Здесь появятся вакансии, на которые вы откликнулись." de="Hier erscheinen Stellen, auf die Sie sich beworben haben." es="Aquí aparecerán las vacantes a las que se postule." fr="Les offres auxquelles vous postulez apparaîtront ici." pl="Tu pojawią się oferty, na które aplikujesz." ptBR="Aqui aparecerão as vagas às quais você se candidatar." zh="您申请过的职位会显示在这里。" />
        </p>
      )}
      {tab === "applied" && appsState === "ready" && apps.length > 0 && (
        <>
          <ul className="mt-6 flex flex-col gap-3">
            {apps.map((a) => (
              <li
                key={a.post.id}
                className={
                  "transition-all duration-300 ease-out " +
                  (a.leaving ? "pointer-events-none -translate-x-3 scale-[0.98] opacity-0" : "opacity-100")
                }
              >
                <PostCard
                  post={a.post}
                  avatarBlurDataUrl={a.post.avatarBlurDataUrl}
                  footer={
                    a.state === "opened" ? (
                      <ApplicationAnswer postId={a.post.id} onAnswered={(yes) => onAnswered(a.post.id, yes)} />
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
          {appsNext ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                disabled={appsMore}
                onClick={async () => {
                  setAppsMore(true);
                  await loadApps(appsNext).catch(() => null);
                  setAppsMore(false);
                }}
                className="rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                {appsMore ? "…" : <T uk="Показати ще" en="Show more" ru="Показать ещё" de="Mehr anzeigen" es="Mostrar más" fr="Afficher plus" pl="Pokaż więcej" ptBR="Mostrar mais" zh="显示更多" />}
              </button>
            </div>
          ) : null}
        </>
      )}

      {tab === "users" && usersState === "ready" && savedUsers.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <T uk="Поки немає збережених користувачів." en="No saved users yet." ru="Пока нет сохранённых пользователей." de="Noch keine gespeicherten Nutzer." es="Aún no hay usuarios guardados." fr="Aucun utilisateur enregistré pour l'instant." pl="Brak zapisanych użytkowników." ptBR="Ainda sem usuários salvos." zh="暂无已保存的用户。" />
        </p>
      )}
      {tab === "users" && usersState === "ready" && savedUsers.length > 0 && (
        <div className="mt-6 flex flex-col gap-1">
          {savedUsers.map((u) => {
            const avatarSrc = u.avatarUrl ?? pickDefaultCatAvatar(u.id);
            const row = (
              <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                {/* 2026-09-05 (Aleksandr: "кешировать вообще всё,
                    если оно хотя бы 1 раз открывалось") -- same
                    persistent Cache Storage-backed CachedAvatar every
                    other avatar surface on the site now uses. */}
                <CachedAvatar
                  src={avatarSrc}
                  blurDataURL={u.avatarBlurDataUrl ?? BLUR_DATA_URL}
                  size={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">{u.fullName || "—"}</div>
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
    </main>
  );
}
