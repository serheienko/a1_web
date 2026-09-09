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
// Data/actions are the exact same ones my-posts-panel.tsx already uses
// (app/api/posts/mine for the list, components/post-editor.tsx for
// edit, app/api/posts/delete for delete) — this is a different VIEW
// over the same CRUD, not a new backend surface. Search is client-side
// only (filter over the list already fetched) since /api/posts/mine
// already returns everything the signed-in account owns in one shot —
// no separate search endpoint needed for the volumes this handles today.
"use client";

import { useEffect, useMemo, useState } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { PostEditor, type EditablePost } from "@/components/post-editor";
import { authFetch } from "@/lib/auth-fetch";

type AdminPost = EditablePost & {
  created: number;
  published: number | null;
  scheduled: number | null;
  isDraft: boolean;
};

type StringKey =
  | "title" | "signedInAs" | "searchPlaceholder"
  | "empty" | "noMatches" | "loadError"
  | "jobs" | "talents"
  | "statusPublished" | "statusDraft" | "statusScheduled"
  | "edit" | "delete" | "confirmDelete" | "cancel" | "deleteFailed" | "noDescription";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: { uk: "Усі дописи", en: "All posts", ru: "Все публикации", de: "Alle Beiträge", es: "Todas las publicaciones", fr: "Toutes les publications", pl: "Wszystkie posty", ptBR: "Todas as publicações", zh: "所有帖子" },
  signedInAs: { uk: "Обліковий запис", en: "Signed in as", ru: "Аккаунт", de: "Angemeldet als", es: "Sesión iniciada como", fr: "Connecté en tant que", pl: "Zalogowano jako", ptBR: "Conectado como", zh: "已登录" },
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

export function AdminPostsPanel({ signedInAs }: { signedInAs: string }) {
  const lang = useActiveLocale();
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminPost | null>(null);

  function load() {
    setError(false);
    authFetch("/api/posts/mine")
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) throw new Error("not ok");
        setPosts(data.posts ?? []);
      })
      .catch(() => setError(true));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!posts) return null;
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q),
    );
  }, [posts, query]);

  async function confirmDelete(id: string) {
    setDeleteError(null);
    try {
      const res = await authFetch("/api/posts/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
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
    return <PostEditor mode="edit" initialPost={editing} onClose={() => setEditing(null)} onSaved={load} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{STRINGS.title[lang]}</h1>
        <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
          {STRINGS.signedInAs[lang]}: {signedInAs}
        </p>
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
              <div className="mb-1.5 text-xs text-neutral-400 dark:text-neutral-500">{kindLabel}</div>
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
    </div>
  );
}
