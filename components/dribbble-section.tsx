// components/dribbble-section.tsx
//
// 18.10.2026 (Александр): «подтверждённый Dribbble». Плитка Dribbble показывается ТОЛЬКО тому, кто
// доказал через Dribbble OAuth, что аккаунт из ссылки -- его (см. components/github-section.tsx, тот же
// принцип). Подтверждён и логин совпал со ссылкой -- плитка из снимка работ; владельцу к ней добавлена
// кнопка «Оновити». Не подтверждён -- обычная ссылка, а ВЛАДЕЛЬЦУ профиля -- карточка «Підтвердити
// через Dribbble». Кто смотрит и свежий снимок определяет браузер (страница профиля кешируется).
"use client";

import { useEffect, useState } from "react";
import { DribbbleTile } from "@/components/dribbble-tile";
import { VerifyCtaCard, useStartVerify } from "@/components/verify-cta";
import { authFetch } from "@/lib/auth-fetch";
import { isDribbbleSnapshotShowable, sanitizeDribbbleSnapshot, type DribbbleSnapshot } from "@/lib/dribbble/core";

function DribbbleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M5 5.5c4 4 7 9 9 16M2.6 10.5c6 .3 11-1 15-5M8.5 21c2-5 6-8 12.5-7.5" />
    </svg>
  );
}

type Props = {
  /** Имя в адресе профиля -- чтобы понять, что это профиль смотрящего. */
  username: string;
  /** Логин из Dribbble-ссылки профиля. */
  linkLogin: string;
  /** Снимок, если сервер видит подтверждение (логин из ссылки == подтверждённый), иначе null. */
  serverSnapshot: DribbbleSnapshot | null;
};

export function DribbbleSection({ username, linkLogin, serverSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState<DribbbleSnapshot | null>(serverSnapshot);
  const [verified, setVerified] = useState(serverSnapshot !== null);
  const [isOwner, setIsOwner] = useState(false);
  const [shown, setShown] = useState(false);
  const { phase, start } = useStartVerify("dribbble");

  // Свежее подтверждение владельца: страница могла быть из кеша.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const who = await authFetch("/api/account/whoami").then((r) => r.json());
        if (cancelled || !who?.ok || who.username !== username) return;
        setIsOwner(true);
        const st = await authFetch("/api/dribbble/verify/status").then((r) => r.json());
        if (cancelled || !st?.ok) return;
        const match = typeof st.login === "string" && st.login.toLowerCase() === linkLogin.toLowerCase();
        setVerified(match);
        setSnapshot(match ? sanitizeDribbbleSnapshot(st.snapshot) : null);
      } catch {
        // Не вошёл или сеть -- остаётся то, что показал сервер.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, linkLogin]);

  const card = !verified && isOwner;
  useEffect(() => {
    if (!card) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [card]);

  if (verified) {
    if (!isDribbbleSnapshotShowable(snapshot)) return null;
    return <DribbbleTile snapshot={snapshot} onRefresh={isOwner ? start : undefined} refreshPhase={phase} />;
  }
  if (!card) return null;
  return <VerifyCtaCard provider="dribbble" icon={<DribbbleMark />} phase={phase} onStart={start} shown={shown} />;
}
