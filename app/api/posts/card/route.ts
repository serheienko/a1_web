// app/api/posts/card/route.ts
//
// Карточка поста для чата (волна 4B, 2026-10-03): сообщение с media-post
// несёт только id поста (po_...), а нарисовать нужно заголовок, компанию,
// место и зарплату. GET ?id=po_... -> { ok, card | null }. null -- пост
// удалён или не вакансия (сообщение тогда остаётся просто текстом).
import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/a1/session";
import { fetchPostById } from "@/lib/a1/posts";
import { slugify } from "@/lib/seo/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type PostCardData = {
  id: string;
  href: string;
  title: string;
  company: string;
  avatarUrl: string | null;
  place: string | null;
  remote: boolean;
  salary: string | null;
};

const CACHE = new Map<string, { at: number; card: PostCardData | null }>();

function money(n: number): string {
  return n >= 1000 ? `${Math.round(n / 100) / 10}k`.replace(".0k", "k") : String(n);
}

export async function GET(request: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!/^po_[A-Za-z0-9]+$/.test(id)) return NextResponse.json({ ok: false, message: "bad_id" }, { status: 400 });
  const hit = CACHE.get(id);
  if (hit && Date.now() - hit.at < 5 * 60_000) return NextResponse.json({ ok: true, card: hit.card });
  let card: PostCardData | null = null;
  try {
    const post = await fetchPostById(id);
    if (post) {
      let salary: string | null = null;
      if (post.salary && (post.salary.min || post.salary.max)) {
        const a = post.salary.min ? money(post.salary.min) : "";
        const b = post.salary.max ? money(post.salary.max) : "";
        salary = `${a && b && a !== b ? `${a}–${b}` : a || b} ${post.salary.currency}`.trim();
      }
      card = {
        id: post.id,
        href: `/jobs/${slugify(post.title, post.id)}`,
        title: post.title,
        company: post.author.name,
        avatarUrl: post.author.avatarUrl,
        place: post.location?.display || null,
        remote: post.isRemote,
        salary,
      };
    }
  } catch {
    return NextResponse.json({ ok: false, message: "card_failed" }, { status: 502 });
  }
  if (CACHE.size > 300) CACHE.delete(CACHE.keys().next().value as string);
  CACHE.set(id, { at: Date.now(), card });
  return NextResponse.json({ ok: true, card });
}
