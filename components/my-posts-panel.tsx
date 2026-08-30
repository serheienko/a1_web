// components/my-posts-panel.tsx
//
// 2026-08-29 (Aleksandr: "Кстати посты должны быть CRUD, create / update
// / delete") — the "U" and "D" of CRUD needed somewhere to point at,
// since PLAN.md §6.6's Phase 7 had explicitly deferred any "my posts"
// entry point ("a signed-in visitor's only new surface is the separate
// sign-in/profile/post-editor flow... revisit once that flow itself
// needs a 'my posts' entry point" — this is that revisit). Was reachable
// from components/avatar-menu.tsx's panel, one row above Sign out.
//
// UNUSED as of 2026-08-30 (PLAN.md §6.44's follow-up): Aleksandr, once
// the avatar menu's "Переглянути профіль" and profile page's own Posts
// tab existed, asked to drop this as a duplicate entry point ("мы
// нажимаем персональный профиль, а там уже есть мои посты... не
// обязательно дублировать"). Left in place rather than deleted (this
// project's usual policy for a component with no remaining call site,
// see account-menu.tsx's own history) since it's still the only UI that
// shows drafts/scheduled posts at all — the profile's Posts tab only
// shows already-published ones, matching the public feed. If drafts/
// scheduled ever need a home again, this is a working one.
//
// Lists every post the signed-in visitor owns, across all three states
// (published / draft / scheduled — app/api/posts/mine/route.ts already
// merges the three separate posts.search calls that requires). Edit
// opens components/post-editor.tsx in mode="edit", prefilled from
// exactly the fields that route returns; Delete is a two-step inline
// confirm (no window.confirm() — consistent with this codebase never
// using native browser dialogs anywhere else) calling
// app/api/posts/delete/route.ts, then dropping the row locally rather
// than waiting on a full re-fetch.
"use client";

import { useEffect, useState } from "react";
import { LOCALES, LOCALE_CLASS, type Locale } from "@/components/t";
import { PostEditor, type EditablePost } from "@/components/post-editor";

type MinePost = EditablePost & {
  created: number;
  published: number | null;
  scheduled: number | null;
  isDraft: boolean;
};

type StringKey =
  | "title" | "close" | "newPost"
  | "empty" | "loadError"
  | "jobs" | "talents"
  | "statusPublished" | "statusDraft" | "statusScheduled"
  | "edit" | "delete" | "confirmDelete" | "cancel" | "deleteFailed";

const STRINGS: Record<StringKey, Record<Locale, string>> = {
  title: { uk: "Мої пости", en: "My posts", ru: "Мои посты", de: "Meine Beiträge", es: "Mis publicaciones", fr: "Mes publications", pl: "Moje posty", ptBR: "Minhas publicações", zh: "我的帖子" },
  close: { uk: "Закрити", en: "Close", ru: "Закрыть", de: "Schließen", es: "Cerrar", fr: "Fermer", pl: "Zamknij", ptBR: "Fechar", zh: "关闭" },
  newPost: { uk: "+ Новий пост", en: "+ New post", ru: "+ Новый пост", de: "+ Neuer Beitrag", es: "+ Nueva publicación", fr: "+ Nouvelle publication", pl: "+ Nowy post", ptBR: "+ Nova publicação", zh: "+ 新帖子" },
  empty: { uk: "У вас ще немає постів", en: "You don't have any posts yet", ru: "У вас пока нет постов", de: "Sie haben noch keine Beiträge", es: "Aún no tienes publicaciones", fr: "Vous n'avez pas encore de publications", pl: "Nie masz jeszcze postów", ptBR: "Você ainda não tem publicações", zh: "您还没有帖子" },
  loadError: { uk: "Не вдалося завантажити пости", en: "Couldn't load posts", ru: "Не удалось загрузить посты", de: "Beiträge konnten nicht geladen werden", es: "No se pudieron cargar las publicaciones", fr: "Impossible de charger les publications", pl: "Nie udało się załadować postów", ptBR: "Não foi possível carregar as publicações", zh: "无法加载帖子" },
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

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function statusOf(post: MinePost, lang: Locale): { label: string; className: string } {
  if (post.isDraft) {
    return { label: STRINGS.statusDraft[lang], className: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" };
  }
  if (post.scheduled && !post.published) {
    return { label: STRINGS.statusScheduled[lang], className: "bg-accent/10 text-accent" };
  }
  return { label: STRINGS.statusPublished[lang], className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" };
}

export function MyPostsPanel({ onClose }: { onClose: () => void }) {
  const lang = useActiveLocale();
  const [posts, setPosts] = useState<MinePost[] | null>(null);
  const [error, setError] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MinePost | "new" | null>(null);

  function load() {
    setError(false);
    fetch("/api/posts/mine")
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

  async function confirmDelete(id: string) {
    setDeleteError(null);
    try {
      const res = await fetch("/api/posts/delete", {
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

  if (editing) {
    return (
      <PostEditor
        mode={editing === "new" ? "create" : "edit"}
        initialPost={editing === "new" ? undefined : editing}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl dark:bg-neutral-950 sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{STRINGS.title[lang]}</h2>
          <button type="button" onClick={onClose} aria-label={STRINGS.close[lang]} className="text-neutral-400 transition hover:text-neutral-900 dark:hover:text-neutral-50">
            <CloseIcon />
          </button>
        </div>

        <div className="px-5 pt-3">
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="w-full rounded-xl border border-dashed border-accent/40 py-2 text-sm font-medium text-accent transition hover:bg-accent/10"
          >
            {STRINGS.newPost[lang]}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
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

          <div className="flex flex-col gap-2">
            {posts?.map((post) => {
              const status = statusOf(post, lang);
              const kindLabel = post.object === "post-job-employing" ? STRINGS.jobs[lang] : STRINGS.talents[lang];
              return (
                <div key={post.id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">{post.title || "—"}</span>
                    <span className={"shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " + status.className}>{status.label}</span>
                  </div>
                  <div className="mb-2 text-xs text-neutral-400 dark:text-neutral-500">{kindLabel}</div>

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
      </div>
    </div>
  );
}
