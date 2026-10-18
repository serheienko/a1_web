// app/dribbble-verify/page.tsx
//
// 18.10.2026: страница-итог после подтверждения Dribbble (куда ведёт /api/dribbble/callback).
// Не для поиска. Статус берётся из адреса и ничего не раскрывает: только одно из шести слов.
import type { Metadata } from "next";
import { ProviderVerifyResult } from "@/components/provider-verify-result";
import { isVerifyStatus } from "@/lib/github/verify";

export const metadata: Metadata = {
  title: "Dribbble",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ status?: string | string[] }> };

export default async function DribbbleVerifyPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const value = Array.isArray(status) ? status[0] : status;
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <ProviderVerifyResult provider="dribbble" status={isVerifyStatus(value) ? value : "error"} />
    </main>
  );
}
