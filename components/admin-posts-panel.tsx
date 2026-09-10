// components/admin-posts-panel.tsx
//
// 2026-09-09 (Aleksandr, see app/admin/posts/page.tsx's header comment
// for the full request/access-control story): the actual list+search+
// edit UI for /admin/posts. Deliberately built as a straight full-page
// list rather than reusing components/my-posts-panel.tsx's modal shell
// — that panel is meant to sit on top of whatever page the visitor was
// already on; this one IS the page, and needs room for a search box and
// (eventually, as the scraped dataset grows) more than a couple of
// rows without a tiny modal's own scroll area fighting the page's.
//
// 2026-09-09, same day, round 2 (Aleksandr: "хочу чтобы админ-страница
// показывала посты со всех технических аккаунтов сразу... сейчас на
// сервисном акке показывает только одну вакансию"): confirmed live —
// every scraped/bulk-provisioned company gets its OWN account (see
// lib/a1/admin-accounts.ts), so the original app/api/posts/mine-based
// version of this panel only ever showed whichever ONE account was
// signed in in the browser. Now backed by app/api/admin/all-posts
// (lib/a1/admin-post-aggregate.ts), which logs into every account on
// file and merges their posts — the account each post belongs to now
// rides along as companyName/companyEmail, and Edit/Delete pass that
// through to components/post-editor.tsx's adminActingAs prop so a save
// logs in as the OWNING account, not whoever's browser this is. Search
// is still client-side only (filter over the list already fetched).
//
// 2026-09-10 (Aleksandr: "пагинация в самой админке -- частями по 50 +
// кеширование", after /api/admin/all-posts started 504ing once
// TECHNICAL_ACCOUNTS_JSON grew to ~500 accounts): load() below now
// fetches one PAGE of accounts at a time (ACCOUNT_PAGE_SIZE) and keeps
// going until the server says there's no more -- each individual page
// request comfortably finishes well under Vercel's function timeout,
// where fetching all ~500 accounts in a single request did not. Posts
// are appended and re-sorted after every page, so the list visibly
// fills in rather than staying blank until everything has loaded.
//
// 2026-09-10, later same day (Aleksandr: the auto-loop above still
// silently fetched ALL ~500 accounts in the background right after
// mount -- fine for avoiding the 504, but wasteful, and the "load the
// newest posts first" ordering wasn't reliable while later pages kept
// reshuffling the list. Changed to real lazy pagination: load() now
// only fetches the FIRST page and stops. loadMore() fetches one more
// page at a time and is wired to an IntersectionObserver on a sentinel
// element below the list, so the next page only loads once the user
// has actually scrolled near the bottom -- same idea Aleksandr asked
// for originally ("догружать следующие, когда доскроллил до низа").
// reloadAfterSave() is a separate path used after editing a post: a
// plain load() would reset back to just the first page, and if the
// edited post's account wasn't in it, the post would appear to vanish
// right after saving -- so this refetches from the start but keeps
// paging until it's back to at least as many accounts as were loaded
// before the save.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { PostEditor, type EditablePost } from "@/components/post-editor";
import { authFetch } from "@/lib/auth-fetch";

type AdminPost = EditablePost & {
  created: number;
  published: number | null;
  scheduled: number | null;
  isDraft: boolean;
  companyName: string;
  companyEmail: string;
};

type StringKey =
  | "title" | "signedInAs" | "totalCount" | "loadingMore" | "searchPlaceholder"
  | "empty" | "noMatches" | "loadError"
  | "jobs" | "talents"
  | "statusPublished" | "statusDraft" | "statusScheduled"
  | "edit" | "delete" | "confirmDelete" | "cancel" | "deleteFailed" | "noDescription";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: { uk: "Усі дописи", en: "All posts", ru: "Все публикации", de: "Alle Beiträge", es: "Todas las publicaciones", fr: "Toutes les publications", pl: "Wszystkie posty", ptBR: "Todas as publicações", zh: "所有帖子" },
  signedInAs: { uk: "Обліковий запис", en: "Signed in as", ru: "Аккаунт", de: "Angemeldet als", es: "Sesión iniciada como", fr: "Connecté en tant que", pl: "Zalogowano jako", ptBR: "Conectado como", zh: "已登录" },
  // 2026-09-09 (Aleksandr, looking at the admin list after the big bulk
  // import: "выведи тут наверх где то общее кол-во вакансий") -- total
  // count of everything this page loaded (across every technical
  // account, both Jobs and Talents posts -- see the file header comment
  // on why this list is already an aggregate), not the search-filtered
  // count below it.
  totalCount: { uk: "Всього дописів: {n}", en: "Total posts: {n}", ru: "Всего публикаций: {n}", de: "Beiträge insgesamt: {n}", es: "Total de publicaciones: {n}", fr: "Total des publications : {n}", pl: "Łącznie postów: {n}", ptBR: "Total de publicações: {n}", zh: "共 {n} 篇帖子" },
  // 2026-09-10: shown under totalCount whenever more accounts remain
  // to load (hasMore) -- with lazy scroll-pagination the next page
  // isn't actually being fetched until the user scrolls near the
  // bottom, so this is phrased as "scroll for more" rather than
  // "loading", see this file's header comment.
  loadingMore: { uk: "Завантажено {loaded}/{total} акаунтів — прокрутіть вниз, щоб довантажити", en: "Loaded {loaded}/{total} accounts — scroll down to load more", ru: "Загружено {loaded}/{total} аккаунтов — прокрутите вниз, чтобы догрузить", de: "{loaded}/{total} Konten geladen — nach unten scrollen, um mehr zu laden", es: "Cargadas {loaded}/{total} cuentas — desplázate hacia abajo para cargar más", fr: "{loaded}/{total} comptes chargés — faites défiler vers le bas pour en charger plus", pl: "Załadowano {loaded}/{total} kont — przewiń w dół, aby wczytać więcej", ptBR: "Carregadas {loaded}/{total} contas — role para baixo para carregar mais", zh: "已加载 {loaded}/{total} 个账号 — 向下滚动加载更多" },
  searchPlaceholder: { uk: "Пошук за назвою або текстом…", en: "Search by title or text…", ru: "Поиск по названию или тексту…", de: "Suche nach Titel oder Text…", es: "Buscar por título o texto…", fr: "Rechercher par titre ou texte…", pl: "Szukaj po tytule lub tekście…", ptBR: "Buscar por título ou texto…", zh: "按标题或内容搜索…" },
  empty: { uk: "Ще немає жодного допису", en: "No posts yet", ru: "Пока нет ни одной публикации", de: "Noch keine Beiträge", es: "Aún no hay publicaciones", fr: "Aucune publication pour le moment", pl: "Jeszcze nie ma żadnego posta", ptBR: "Ainda não há publicações", zh: "还没有帖子" },
  noMatches: { uk: "Нічого не знайдено", en: "Nothing found", ru: "Ничего не найдено", de: "Nichts gefunden", es: "No se encontró nada", fr: "Rien trouvé", pl: "Nic nie znaleziono", ptBR: "Nada encontrado", zh: "未找到任何内容" },
  loadError: { uk: "Не вдалося завантажити дописи", en: "Couldn't load posts", ru: "Не удалось загрузить публикации", de: "Beiträge konnten nicht geladen werden", es: "No se pudieron cargar las publicaciones", fr: "Impossible de charger les publications", pl: "Nie udało się załadować postów", ptBR: "Não foi possível carregar as publicações", zh: "无法加载帖子" },
  jobs: { uk: "Вакансія", en: "Job", ru: "Вакансия", de: "Job", es: "Empleo", fr: "Emploi", pl: "Praca", ptBR: "Vaga", zh: "职位" },
  talents: { uk: "Резюме", en: "Profile", ru: "Резюме", de: "Profil", es: "Perfil", fr: "Profil", pl: "Profil", ptBR: "Perfil", zh: "简历" },
  statusPublished: { uk: "Опубліковано", en: "Published", ru: "Опубликовано", de: "Veröffentlicht", es: "Publicado", fr: "Publié", pl: "Opublikowano", ptBR: "Publicado", zh: "已发布" },
  statusDraft: { uk: "Чернетка", en: "Draft", ru: "Черновик", de: "Entwurf", es: "Borrador", fr: "Brouillon", pl: "Szkic", ptBR: "Rascunho", zh: "草稿" },
  statusScheduled: { uk: "Заплановано", en: "Scheduled", ru: "Запланировано", de: "Geplant", es: "Programado", fr: "Planifié", pl: "Zaplanowano", ptBR: "Agendado", zh: "已定时" },
  edit: { uk: "Редагувати", en: "Edit", ru: "Редактировать", de: "Bearbeiten", es: "Editar", fr: "Modifier", pl: "Edytuj", ptBR: "Editar", zh: "编辑" },
  delete: { uk: "Видалити", en: "Delete", ru: "Удалить", de: "Löschen", es: "Eliminar", fr: "Supprimer", pl: "Usuń", ptBR: "Excluir", zh: "删除" },
  confirmDelete: { uk: "Точно видалити?", en: "Delete for good?", ru: "Точно удалить?", de: "Wirklich löschen?", es: "¿Eliminar definitivamente?", fr: "Supprimer définitivement ?", pl: "Na pewno usunąć?", ptBR: "Excluir definitivamente?", zh: "确定要删除吗？" },
  cancel: { uk: "Скасувати", en: "Cancel", ru: "Отмена", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pl: "Anuluj", ptBR: "Cancelar", zh: "取消" },
  deleteFailed: { uk: "Не вдалося видалити", en: "Couldn't delete", ru: "Не удалось удалить", de: "Löschen fehlgeschlagen", es: "No se pudo eliminar", fr: "Échec de la suppression", pl: "Nie udało się usunąć", ptBR: "Não foi possível excluir", zh: "删除失败" },
  noDescription: { uk: "Без опису", en: "No description", ru: "Без описания", de: "Keine Beschreibung", es: "Sin descripción", fr: "Sans description", pl: "Bez opisu", ptBR: "Sem descrição", zh: "无描述" },
};

function t(key: StringKey, lang: Locale, vars?: Record<string, string | number>): string {
  let s = STRINGS[key][lang];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
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

function statusOf(post: AdminPost, lang: Locale): { label: string; className: string } {
  if (post.isDraft) {
    return { label: STRINGS.statusDraft[lang], className: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" };
  }
  if (post.scheduled && !post.published) {
    return { label: STRINGS.statusScheduled[lang], className: "bg-accent/10 text-accent" };
  }
  return { label: STRINGS.statusPublished[lang], className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" };
}

// Short single-line preview for the list row — collapse the multi-
// paragraph description (see core/description_formatter.py on the
// scraper side for where the real line breaks come from) down to
// something that fits one line, the same idea as a feed card's own
// teaser text but computed here since this list has no server-rendered
// card to borrow one from.
function shortDescription(content: string): string {
  const flat = content.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  return flat.length > 140 ? flat.slice(0, 140) + "…" : flat;
}

// How many technical accounts' posts to fetch per /api/admin/all-posts
// request -- matches DEFAULT_PAGE_SIZE in that route. See this file's
// header comment for why this is paginated at all.
const ACCOUNT_PAGE_SIZE = 20;

type PostsPage = { posts: AdminPost[]; total: number; nextOffset: number | null; hasMore: boolean };

// Pure network call, no component state -- both load() and loadMore()
// use this, and reloadAfterSave() loops over it directly without
// waiting on React state between iterations (state updates aren't
// visible to a function's own local loop, only to the next render).
async function fetchPage(offset: number): Promise<PostsPage> {
  const res = await authFetch(`/api/admin/all-posts?offset=${offset}&limit=${ACCOUNT_PAGE_SIZE}`);
  const data = await res.json();
  if (!data.ok) throw new Error("not ok");
  return {
    posts: data.posts ?? [],
    total: data.total ?? 0,
    nextOffset: data.nextOffset ?? null,
    hasMore: Boolean(data.hasMore) && data.nextOffset !== null && data.nextOffset !== undefined,
  };
}

export function AdminPostsPanel({ signedInAs }: { signedInAs: string }) {
  const lang = useActiveLocale();
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [totalAccounts, setTotalAccounts] = useState<number | null>(null);
  const [loadedAccounts, setLoadedAccounts] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminPost | null>(null);

  async function load() {
    setError(false);
    setPosts(null);
    setLoadedAccounts(0);
    setTotalAccounts(null);
    setOffset(0);
    setHasMore(true);
    try {
      const page = await fetchPage(0);
      const sorted = page.posts.slice().sort((a, b) => b.created - a.created);
      setPosts(sorted);
      setTotalAccounts(page.total);
      setLoadedAccounts(Math.min(ACCOUNT_PAGE_SIZE, page.total));
      setHasMore(page.hasMore);
      setOffset(page.nextOffset ?? 0);
    } catch {
      setError(true);
    }
  }

  // Fetches exactly one more page, wired to the IntersectionObserver
  // below on the sentinel div at the bottom of the list. loadingRef
  // (not the loadingMore state) is what guards against overlapping
  // calls -- the observer callback can fire again before a re-render
  // updates its closure over the loadingMore state, but a ref is
  // always read fresh.
  async function loadMore() {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchPage(offset);
      setPosts((prev) => {
        const merged = (prev ?? []).concat(page.posts);
        merged.sort((a, b) => b.created - a.created);
        return merged;
      });
      setTotalAccounts(page.total);
      setLoadedAccounts((prev) => Math.min(prev + ACCOUNT_PAGE_SIZE, page.total));
      setHasMore(page.hasMore);
      if (page.hasMore) setOffset(page.nextOffset ?? offset);
    } catch {
      // Stop trying rather than leave the sentinel spinning forever --
      // a full reload (e.g. reopening the page) tries again from
      // scratch.
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }

  // See this file's header comment -- used instead of load() right
  // after a save, so an already-visible post never disappears.
  async function reloadAfterSave() {
    const targetAccounts = Math.max(loadedAccounts, ACCOUNT_PAGE_SIZE);
    setError(false);
    setPosts(null);
    setLoadedAccounts(0);
    setTotalAccounts(null);
    try {
      let acc: AdminPost[] = [];
      let off = 0;
      let more = true;
      let total = 0;
      let loaded = 0;
      for (;;) {
        const page = await fetchPage(off);
        acc = acc.concat(page.posts);
        total = page.total;
        loaded = Math.min(loaded + ACCOUNT_PAGE_SIZE, total);
        more = page.hasMore;
        off = page.nextOffset ?? off;
        if (!more || loaded >= targetAccounts) break;
      }
      acc.sort((a, b) => b.created - a.created);
      setPosts(acc);
      setTotalAccounts(total);
      setLoadedAccounts(loaded);
      setHasMore(more);
      setOffset(more ? off : 0);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Scroll-triggered pagination: once the sentinel below the list
  // enters the viewport (with a generous rootMargin so it starts a
  // little before the user actually hits bottom), load the next page.
  useEffect(() => {
    if (!hasMore || posts === null) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, offset, posts]);

  const filtered = useMemo(() => {
    if (!posts) return null;
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.companyName.toLowerCase().includes(q),
    );
  }, [posts, query]);

  async function confirmDelete(id: string) {
    setDeleteError(null);
    const target = posts?.find((p) => p.id === id);
    if (!target) return;
    try {
      const res = await authFetch("/api/admin/posts/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, email: target.companyEmail }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        setDeleteError(STRINGS.deleteFailed[lang]);
        return;
      }
      setPosts((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
      setConfirmingId(null);
    } catch {
      setDeleteError(STRINGS.deleteFailed[lang]);
    }
  }

  // PostEditor renders its own `fixed inset-0` overlay (see its own
  // dialog markup) — same as my-posts-panel.tsx's usage, no wrapper
  // needed here.
  if (editing) {
    return (
      <PostEditor
        mode="edit"
        initialPost={editing}
        onClose={() => setEditing(null)}
        onSaved={reloadAfterSave}
        adminActingAs={{ email: editing.companyEmail }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{STRINGS.title[lang]}</h1>
        <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
          {STRINGS.signedInAs[lang]}: {signedInAs}
        </p>
        {posts !== null && (
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{t("totalCount", lang, { n: posts.length })}</p>
        )}
        {posts !== null && totalAccounts !== null && hasMore && (
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
            {t("loadingMore", lang, { loaded: loadedAccounts, total: totalAccounts })}
          </p>
        )}
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={STRINGS.searchPlaceholder[lang]}
        className="mb-4 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-accent dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{STRINGS.loadError[lang]}</p>}
      {deleteError && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}

      {!error && posts === null && (
        <div className="flex justify-center py-8">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 animate-spin text-neutral-400" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {posts !== null && posts.length === 0 && !error && (
        <p className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">{STRINGS.empty[lang]}</p>
      )}

      {filtered !== null && filtered.length === 0 && posts !== null && posts.length > 0 && (
        <p className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">{STRINGS.noMatches[lang]}</p>
      )}

      <div className="flex flex-col gap-2">
        {filtered?.map((post) => {
          const status = statusOf(post, lang);
          const kindLabel = post.object === "post-job-employing" ? STRINGS.jobs[lang] : STRINGS.talents[lang];
          const preview = shortDescription(post.content);
          return (
            <div key={post.id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">{post.title || "—"}</span>
                <span className={"shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " + status.className}>{status.label}</span>
              </div>
              <div className="mb-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                {kindLabel} · {post.companyName}
              </div>
              <p className="mb-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                {preview || STRINGS.noDescription[lang]}
              </p>

              {confirmingId === post.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{STRINGS.confirmDelete[lang]}</span>
                  <button
                    type="button"
                    onClick={() => confirmDelete(post.id)}
                    className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700"
                  >
                    {STRINGS.delete[lang]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-500 transition hover:text-neutral-900 dark:border-neutral-700 dark:hover:text-neutral-50"
                  >
                    {STRINGS.cancel[lang]}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(post)}
                    className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    {STRINGS.edit[lang]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(post.id)}
                    className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-500 dark:hover:bg-red-500/10"
                  >
                    {STRINGS.delete[lang]}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {posts !== null && hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loadingMore && (
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-spin text-neutral-400" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
