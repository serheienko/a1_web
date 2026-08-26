// app/jobs/page.tsx
//
// The Jobs feed moved to the site root ("/") on 2026-08-26 per Aleksandr:
// https://jobs.a1appp.com/ should show Jobs directly, no intermediate
// landing page and no "jobs.jobs" duplication in the URL. This route is
// now a permanent redirect for anyone hitting the old /jobs URL (bookmarks,
// old links, search engines that haven't re-crawled yet), forwarding any
// query/filter params through unchanged. See app/page.tsx for the actual
// feed implementation. /jobs/[slug] detail pages are untouched.

import { permanentRedirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function JobsRedirectPage({ searchParams }: Props) {
  const params = await searchParams;
  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.append(key, value);
    }
  }

  const query = qs.toString();
  permanentRedirect(query ? `/?${query}` : "/");
}
