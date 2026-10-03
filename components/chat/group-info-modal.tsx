"use client";

// components/chat/group-info-modal.tsx
//
// Группы в чатах (волна 1, 2026-10-03). Карточка группы по нажатию на
// шапку чата: фото, название, число участников, список участников с
// ролью («творець») и кнопка «Вийти з групи» с подтверждением.
// Управление (редактирование, добавление/удаление участников,
// инвайт-ссылка) -- волна 2, здесь только просмотр и выход.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { backdropDismiss } from "@/lib/use-backdrop-dismiss";
import { CachedAvatar } from "@/components/cached-avatar";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import type { Locale } from "@/components/t";
import { authFetch } from "@/lib/auth-fetch";
import { groupText, membersCountText } from "@/lib/a1/group-chat";
import { peerNameColorIndex, peerNameColorVar } from "@/lib/peer-name-color";
import type { GroupMember } from "@/app/api/chats/group-info/route";

export function GroupInfoModal({
  lang,
  chatId,
  title,
  photo,
  members,
  myUserId,
  onClose,
}: {
  lang: Locale;
  chatId: string;
  title: string;
  photo: string;
  members: GroupMember[];
  myUserId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function leave() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await authFetch("/api/chats/group-leave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat: chatId }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok) throw new Error("leave_failed");
      onClose();
      router.push("/chats");
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  // Создатель первым, потом админы, потом остальные по имени.
  const rank = { creator: 0, admin: 1, member: 2 } as const;
  const sorted = [...members].sort((a, b) => rank[a.role] - rank[b.role] || a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" {...backdropDismiss(onClose)}>
      <div
        className="flex max-h-[85vh] w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <CachedAvatar src={photo} blurDataURL={BLUR_DATA_URL} size={84} className="h-[84px] w-[84px] rounded-full object-cover" />
          <h2 className="max-w-full break-words text-[19px] font-semibold text-neutral-900 dark:text-neutral-50">{title || "—"}</h2>
          <div className="text-[14px] text-neutral-500 dark:text-neutral-400">{membersCountText(lang, members.length)}</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {groupText(lang, "groupMembers")}
          </div>
          <div className="flex flex-col gap-0.5">
            {sorted.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                <CachedAvatar
                  src={m.photo ?? pickDefaultCatAvatar(m.id)}
                  blurDataURL={BLUR_DATA_URL}
                  size={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium" style={{ color: peerNameColorVar(peerNameColorIndex(m.id)) }}>
                    {m.name || groupText(lang, "groupUnknownUser")}
                    {m.id === myUserId && <span className="text-neutral-400"> · {groupText(lang, "groupYou")}</span>}
                  </div>
                  {m.username && <div className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">@{m.username}</div>}
                </div>
                {m.role === "creator" && (
                  <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
                    {groupText(lang, "groupOwner")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {failed && <p className="text-center text-[13px] text-red-500">{groupText(lang, "groupCreateFailed")}</p>}

        {confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-center text-[13px] text-neutral-600 dark:text-neutral-300">{groupText(lang, "leaveGroupConfirm", { title })}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-full bg-black/5 py-2.5 text-[15px] font-semibold text-neutral-800 transition hover:bg-black/10 dark:bg-white/10 dark:text-neutral-100"
              >
                {groupText(lang, "groupCancel")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void leave()}
                className="flex-1 rounded-full bg-red-500 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {groupText(lang, "leaveGroup")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-full bg-red-500/10 py-2.5 text-[15px] font-semibold text-red-500 transition hover:bg-red-500/20"
          >
            {groupText(lang, "leaveGroup")}
          </button>
        )}
      </div>
    </div>
  );
}
