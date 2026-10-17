// app/invite/page.tsx -- «Отримай Alpha» (17.10.2026, Александр): реферальная программа.
// Свой код и ссылка, лестница наград, список приглашённых. Вся логика -- invite-client.tsx, данные -- app/api/referral.
import type { Metadata } from "next";
import { InviteClient } from "./invite-client";

export const metadata: Metadata = {
  title: "Отримай Alpha — запроси друзів в A1",
  description: "Поділись посиланням з друзями й отримай до 24 місяців A1 Alpha безкоштовно.",
  alternates: { canonical: "https://jobs.a1appp.com/invite" },
  robots: { index: false, follow: true },
};

export default function InvitePage() {
  return <InviteClient />;
}
