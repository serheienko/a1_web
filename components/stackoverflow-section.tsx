// components/stackoverflow-section.tsx
//
// 18.10.2026 (Александр): «подтверждённый Stack Overflow». Плитка показывается ТОЛЬКО тому, кто
// доказал через Stack Exchange OAuth, что профиль из ссылки -- его (тот же принцип, что у GitHub и
// Dribbble). id из ссылки == подтверждённый id -- плитка; иначе обычная ссылка, а ВЛАДЕЛЬЦУ профиля --
// карточка «Підтвердити через Stack Overflow». Кто смотрит -- решает браузер (страница кешируется).
"use client";

import { useEffect, useState } from "react";
import { StackoverflowTile } from "@/components/stackoverflow-tile";
import { VerifyCtaCard, useStartVerify } from "@/components/verify-cta";
import { authFetch } from "@/lib/auth-fetch";

function StackoverflowMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.5 21.5v-6h2v8h-17v-8h2v6z" fill="#bcbbbb" />
      <path d="M7.5 18.5h9v-2h-9zM7.7 14.5l8.8 1.9.4-1.9-8.8-1.9zm1.2-4.5 8.2 3.8.8-1.8-8.2-3.8zm2.3-4 6.9 5.8 1.3-1.5-6.9-5.8zM15.6 1.5 14 2.7l5.4 7.2 1.6-1.2z" fill="#f48024" />
    </svg>
  );
}

type Props = {
  username: string;
  /** Числовой id из ссылки на Stack Overflow в профиле. */
  linkId: number;
  /** Сервер уже видит подтверждение (id из ссылки == stackoverflowVerifiedId). */
  serverVerified: boolean;
};

export function StackoverflowSection({ username, linkId, serverVerified }: Props) {
  const [verified, setVerified] = useState(serverVerified);
  const [isOwner, setIsOwner] = useState(false);
  const [shown, setShown] = useState(false);
  const { phase, start } = useStartVerify("stackoverflow");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const who = await authFetch("/api/account/whoami").then((r) => r.json());
        if (cancelled || !who?.ok || who.username !== username) return;
        setIsOwner(true);
        const st = await authFetch("/api/stackoverflow/verify/status").then((r) => r.json());
        if (cancelled || !st?.ok) return;
        setVerified(st.id === linkId);
      } catch {
        // Не вошёл или сеть -- остаётся то, что показал сервер.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, linkId]);

  const card = !verified && isOwner;
  useEffect(() => {
    if (!card) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [card]);

  if (verified) return <StackoverflowTile key={linkId} id={linkId} />;
  if (!card) return null;
  return <VerifyCtaCard provider="stackoverflow" icon={<StackoverflowMark />} phase={phase} onStart={start} shown={shown} />;
}
