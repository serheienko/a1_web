// app/github-verify/page.tsx
//
// 18.10.2026: страница-итог после подтверждения GitHub (куда ведёт /api/github/callback).
// Не для поиска. Статус берётся из адреса и ничего не раскрывает: только одно из шести слов.
import type { Metadata } from "next";
import { GithubVerifyResult } from "@/components/github-verify-result";
import { isVerifyStatus } from "@/lib/github/verify";

export const metadata: Metadata = {
  title: "GitHub",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ status?: string | string[] }> };

export default async function GithubVerifyPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const value = Array.isArray(status) ? status[0] : status;
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <GithubVerifyResult status={isVerifyStatus(value) ? value : "error"} />
    </main>
  );
}
