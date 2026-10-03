"use client";

// app/join/[hash]/page.tsx
//
// Волна 2 групп (2026-10-03): страница по ссылке-приглашению
// a1appp.com/join/<hash> (и jobs.a1appp.com/join/<hash>). Как join-экран
// в приложении (group_invite_screen): сначала chats.checkInviteLink --
// фото, название, число участников, потом «Приєднатися до групи» ->
// chats.joinByInviteLink -> открывается чат. Если уже участник --
// «Відкрити групу». Не вошедшему -- «Увійдіть, щоб приєднатися».
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CachedAvatar } from "@/components/cached-avatar";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { authFetch } from "@/lib/auth-fetch";
import { useActiveLocale } from "@/lib/use-active-locale";
import { groupText, membersCountText, type GroupLang } from "@/lib/a1/group-chat";

type Preview = { chatId: string | null; title: string; photo: string | null; memberCount: number; isPublic: boolean; isMember: boolean };
type State = { kind: "loading" } | { kind: "ready"; preview: Preview } | { kind: "invalid" } | { kind: "signed-out" };

export default function JoinGroupPage() {
  const lang = useActiveLocale() as GroupLang;
  const router = useRouter();
  const params = useParams<{ hash: string }>();
  const hash = decodeURIComponent(params.hash ?? "");
  const [state, setState] = useState<State>({ kind: "loading" });
  const [joining, setJoining] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/chats/group-invite-check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hash }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) return setState({ kind: "signed-out" });
        const data = await res.json().catch(() => null);
        if (!data?.ok || !data.chatId) return setState({ kind: "invalid" });
        setState({ kind: "ready", preview: data as Preview });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "invalid" });
      });
    return () => {
      cancelled = true;
    };
  }, [hash]);

  async function join(preview: Preview) {
    if (preview.isMember && preview.chatId) {
      router.push(`/chats/${preview.chatId}?group=1`);
      return;
    }
    setJoining(true);
    setFailed(false);
    try {
      const res = await authFetch("/api/chats/group-join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hash }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && typeof data.chatId === "string") {
        router.push(`/chats/${data.chatId}?group=1`);
        return;
      }
      throw new Error("join_failed");
    } catch {
      setFailed(true);
      setJoining(false);
    }
  }

  const L = (k: string) => groupText(lang, k);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center shadow-sm dark:bg-neutral-900">
        {state.kind === "loading" && <div className="h-24 w-24 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />}

        {state.kind === "invalid" && <p className="text-[15px] text-neutral-600 dark:text-neutral-300">{L("groupInviteInvalid")}</p>}

        {state.kind === "signed-out" && (
          <>
            <h1 className="text-[19px] font-semibold text-neutral-900 dark:text-neutral-50">{L("groupInviteTitle")}</h1>
            <Link href="/sign-in" className="rounded-full bg-[#335ef7] px-6 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90 dark:bg-[#009bff]">
              {L("groupSignInToJoin")}
            </Link>
          </>
        )}

        {state.kind === "ready" && (
          <>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{L("groupInviteTitle")}</div>
            <CachedAvatar
              src={state.preview.photo ?? pickDefaultCatAvatar(state.preview.chatId ?? hash)}
              blurDataURL={BLUR_DATA_URL}
              size={96}
              className="h-24 w-24 rounded-full object-cover"
            />
            <h1 className="break-words text-[22px] font-semibold text-neutral-900 dark:text-neutral-50">{state.preview.title || "—"}</h1>
            <div className="text-[14px] text-neutral-500 dark:text-neutral-400">{membersCountText(lang, state.preview.memberCount)}</div>
            {state.preview.isMember && <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{L("groupInviteAlreadyMember")}</p>}
            {!state.preview.isMember && <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{L("groupInviteHint")}</p>}
            {failed && <p className="text-[13px] text-red-500">{L("groupInviteInvalid")}</p>}
            <button
              type="button"
              disabled={joining}
              onClick={() => void join(state.preview)}
              className="w-full rounded-full bg-[#335ef7] py-3 text-[16px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-[#009bff]"
            >
              {state.preview.isMember ? L("openGroup") : L("joinGroup")}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
