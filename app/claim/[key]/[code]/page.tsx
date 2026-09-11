// app/claim/[key]/[code]/page.tsx
//
// 2026-09-11: where a claim link lands. The link's two halves are path
// segments rather than query params so the whole URL reads as one thing when
// it is pasted into an email, and `robots: noindex` keeps it out of search —
// the second half is a secret.
//
// No server-side pre-check of the link: the backend has no read-only "is this
// link alive" method, and adding one would mean an endpoint that confirms the
// existence of a valid claim token to anyone who asks. The form surfaces a
// dead link on the first step instead.

import type { Metadata } from "next";

import { ClaimForm } from "@/components/claim-form";

export const metadata: Metadata = {
  title: "A1",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ key: string; code: string }> };

export default async function ClaimPage({ params }: Props) {
  const { key, code } = await params;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <ClaimForm claimKey={key} claimCode={code} />
    </main>
  );
}
