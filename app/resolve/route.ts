export const runtime = "nodejs";

// app/resolve/route.ts
//
// 2026-09-08: server-side hop for the a1appp.com -> jobs.a1appp.com
// deep-link fix. The mobile app shares Universal Links shaped like
// `https://a1appp.com/postDetails/po_<id>` (also /userProfile/<id>,
// /brainstormDetails/<id>, /invitesDetails/<id>) — see DeepLinkCoordinator
// in the Flutter app. When the app IS installed, iOS/Android intercept
// those at the OS level and never touch a server at all. When it is NOT
// installed, the OS falls through to loading the real a1appp.com page —
// which, until now, 404'd (a1appp.com is the WordPress marketing site and
// has no real content at those paths; the actual content lives here).
//
// a1appp.com's fix (a wp-content/mu-plugins must-use plugin) is a dumb,
// static 302 for those 4 prefixes straight to this route:
//   /postDetails/po_<id>       -> /resolve?type=post&id=po_<id>
//   /userProfile/<id>          -> /resolve?type=profile&id=<id>
//   /brainstormDetails/<id>    -> /resolve?type=brainstorm&id=<id>
//   /invitesDetails/<id>       -> /resolve?type=invite&id=<id>
// so WordPress/PHP never needs to know about api.a1appp.com, auth, or
// slug formats — this Next.js app already talks to that API for every
// other page, so the id -> real-URL lookup happens here instead.
//
// brainstorm/invite: "post-brainstorm" is a legacy post kind (see
// lib/a1/datasets.ts's comment) with no web page of its own, and this
// repo's only "invite" concept is an unrelated chat-meeting-invite
// feature (app/chats/[chatId]/page.tsx) — neither has a real jobs.a1appp.com
// destination to resolve to. Rather than block the whole fix on a product
// decision about pages that may not exist, both fall through to the site
// homepage below. Known gap — see the redirect plan doc for follow-up.
import { NextResponse, type NextRequest } from "next/server";
import { fetchPostById } from "@/lib/a1/posts";
import { fetchUsernameById } from "@/lib/a1/users";
import { slugify } from "@/lib/seo/slug";
import { profileHref } from "@/lib/profile-href";

const SITE_URL = "https://jobs.a1appp.com";

function homeRedirect(): NextResponse {
  return NextResponse.redirect(new URL("/", SITE_URL), { status: 302 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!id) return homeRedirect();

  try {
    if (type === "post") {
      const post = await fetchPostById(id);
      if (post) {
        const slug = slugify(post.title, post.id);
        return NextResponse.redirect(new URL(`/jobs/${slug}`, SITE_URL), { status: 302 });
      }
    } else if (type === "profile") {
      const username = await fetchUsernameById(id);
      if (username) {
        return NextResponse.redirect(new URL(profileHref(username), SITE_URL), { status: 302 });
      }
    }
    // type === "brainstorm" | "invite" | anything else: no real
    // destination page exists yet (see file header) -- fall through to
    // the homepage redirect below, same as an unresolvable id.
  } catch (err) {
    console.error("[app/resolve] lookup failed", { type, id, err });
  }

  return homeRedirect();
}
