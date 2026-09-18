// app/blocked/page.tsx
//
// Кого я заблокировал, и кнопка снять блокировку.
//
// Александр, 18.09.2026: «где будет разблокировка? Сейчас заблокировать
// можно, а разблокировать негде» и «сделай где-то, я пока не знаю где
// лучше». Выбрано меню под аватаркой -- рядом с «Контакти» и «Моя
// активність»: это такой же личный список, и искать его человек будет
// там же. На странице профиля ему не место: туда приходят смотреть
// одного человека, а не разбирать свой список.
//
// Клиентский компонент по той же причине, что и /contacts: список
// принадлежит вошедшему, общей версии для кэша не существует.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CachedAvatar } from "@/components/cached-avatar";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { profileHref } from "@/lib/profile-href";
import { EmptyState } from "@/components/empty-state";
import { T } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";

type BlockedUser = {
  id: string;
  name: string;
  username: string;
  photoUrl: string | null;
};

export default function Page() {
  const [users, setUsers] = useState<BlockedUser[] | null>(null);
  const [failed, setFailed] = useState(false);
  // id того, кого прямо сейчас разблокируем -- кнопка на это время гаснет.
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await authFetch("/api/users/blocked");
        const data = (await res.json()) as { ok?: boolean; users?: BlockedUser[] };
        if (!alive) return;
        if (!res.ok || !data.ok) {
          setFailed(true);
          setUsers([]);
          return;
        }
        setUsers(data.users ?? []);
      } catch {
        if (!alive) return;
        setFailed(true);
        setUsers([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function unblock(user: BlockedUser) {
    if (busyId) return;
    setBusyId(user.id);
    try {
      const res = await authFetch("/api/users/block", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id, block: false }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (res.ok && data.ok) {
        // Убираем из списка сразу: повторный запрос ради одной строки
        // не нужен, а бэкенд уже подтвердил.
        setUsers((current) => (current ?? []).filter((item) => item.id !== user.id));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 sm:pt-16 pb-fab-safe">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        <T uk="Заблоковані" en="Blocked" ru="Заблокированные" de="Blockiert" es="Bloqueados" fr="Bloqués" pl="Zablokowani" ptBR="Bloqueados" zh="已屏蔽" />
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        <T
          uk="Ці люди не бачать ваших дописів і не можуть вам написати."
          en="These people can't see your posts or message you."
          ru="Эти люди не видят ваших постов и не могут вам написать."
          de="Diese Personen sehen Ihre Beiträge nicht und können Ihnen nicht schreiben."
          es="Estas personas no ven tus publicaciones ni pueden escribirte."
          fr="Ces personnes ne voient pas vos publications et ne peuvent pas vous écrire."
          pl="Te osoby nie widzą Twoich postów i nie mogą do Ciebie napisać."
          ptBR="Estas pessoas não veem suas publicações e não podem lhe escrever."
          zh="这些人看不到你的帖子，也无法给你发消息。"
        />
      </p>

      {users === null ? (
        <p className="mt-8 text-sm text-neutral-400 dark:text-neutral-500">…</p>
      ) : users.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            message={
              failed ? (
                <T uk="Не вдалося завантажити список." en="Couldn't load the list." ru="Не удалось загрузить список." de="Liste konnte nicht geladen werden." es="No se pudo cargar la lista." fr="Impossible de charger la liste." pl="Nie udało się wczytać listy." ptBR="Não foi possível carregar a lista." zh="无法加载列表。" />
              ) : (
                <T uk="Ви нікого не заблокували." en="You haven't blocked anyone." ru="Вы никого не заблокировали." de="Sie haben niemanden blockiert." es="No has bloqueado a nadie." fr="Vous n'avez bloqué personne." pl="Nikogo nie zablokowałeś." ptBR="Você não bloqueou ninguém." zh="你还没有屏蔽任何人。" />
              )
            }
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-1">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
            >
              <CachedAvatar
                src={user.photoUrl ?? pickDefaultCatAvatar(user.id)}
                blurDataURL={BLUR_DATA_URL}
                size={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                {user.username ? (
                  <Link
                    href={profileHref(user.username)}
                    className="block truncate text-sm font-medium text-neutral-900 no-underline hover:text-accent dark:text-neutral-100"
                  >
                    {user.name || user.username}
                  </Link>
                ) : (
                  <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {user.name || "—"}
                  </span>
                )}
                {user.username && (
                  <span className="block truncate text-xs text-neutral-400 dark:text-neutral-500">
                    @{user.username}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void unblock(user)}
                disabled={busyId !== null}
                className="shrink-0 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-accent/40 hover:text-accent disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
              >
                <T uk="Розблокувати" en="Unblock" ru="Разблокировать" de="Entsperren" es="Desbloquear" fr="Débloquer" pl="Odblokuj" ptBR="Desbloquear" zh="解除屏蔽" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
