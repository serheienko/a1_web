// app/api/users/search/route.ts
//
// 2026-09-13 (Александр, скриншот поиска по «serheienko» -> «Нічого не
// знайшлося»: "Надо чтобы с поиска можно было быстро и легко найти
// пользователя по нику"). Строка поиска в шапке всегда искала только
// среди вакансий и фахівців -- то есть среди ПОСТОВ. Найти человека по
// никнейму через неё было нельзя вовсе, хотя бэкенд это умеет: users.
// search ищет по колонке search_text, а она собрана как
// first_name + last_name + username + bio (packages/database/prisma/
// schema.prisma) -- никнейм в ней уже есть.
//
// Публичный маршрут: зовёт через служебный call() (lib/a1/client.ts), а
// не callAsVisitor -- иначе гость, который ещё не вошёл, не смог бы
// никого найти, а это ровно тот случай, ради которого поиск и нужен.
// Отдаём только то, что и так видно на странице профиля: имя, никнейм,
// аватарку, род занятий. Ничего из закрытого (телефон, почта, дата
// рождения) здесь не появляется -- ровно та же граница, что проведена в
// app/api/users/summaries/route.ts.

import { NextResponse, type NextRequest } from "next/server";
import { call, A1ApiError } from "@/lib/a1/client";
import { parseUserProfile } from "@/lib/a1/schemas";
import { buildMediaProxyUrl } from "@/lib/a1/media-proxy";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";

export const runtime = "nodejs";

export type UserSearchHit = {
  userId: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  avatarBlurDataUrl: string | null;
  occupation: string;
};

// Подсказка, а не страница результатов: шесть строк -- это ровно
// столько, сколько помещается в выпадающий список над клавиатурой
// телефона, не закрывая собой саму ленту.
const LIMIT = 6;
// Одна буква совпадёт с половиной базы и ничего не подскажет.
const MIN_QUERY = 2;

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < MIN_QUERY) {
    return NextResponse.json({ ok: true, users: [] });
  }

  let raw: unknown;
  try {
    // Никнейм часто набирают вместе с "@" -- для бэкенда это лишний
    // символ, который ничего не найдёт.
    raw = await call<unknown>("users.search", { q: q.replace(/^@+/, ""), limit: LIMIT });
  } catch (err) {
    if (err instanceof A1ApiError) {
      console.error("[api/users/search] failed:", err.httpStatus, err.body.slice(0, 300));
      return NextResponse.json({ ok: true, users: [] });
    }
    throw err;
  }

  const items = Array.isArray((raw as { items?: unknown })?.items) ? (raw as { items: unknown[] }).items : [];
  const users: UserSearchHit[] = [];
  for (const item of items) {
    const profile = parseUserProfile(item);
    if (!profile || profile.object !== "user") continue;
    // Без никнейма ссылку на профиль не собрать (app/u/[username]), так
    // что такой строке в подсказках делать нечего.
    if (!profile.username) continue;
    const avatarUrl = profile.photos[0] ? buildMediaProxyUrl(profile.photos[0]) : null;
    users.push({
      userId: profile._id,
      fullName: [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || profile.username,
      username: profile.username,
      avatarUrl,
      avatarBlurDataUrl: null,
      occupation: profile.occupation,
    });
  }

  // Блюр считается по шесть штук разом и кэшируется на сутки
  // (lib/avatar-blur.ts), так что на подсказки это почти не тратится.
  const blurs = await Promise.all(users.map((u) => generateAvatarBlurDataUrl(u.avatarUrl)));
  users.forEach((u, i) => {
    u.avatarBlurDataUrl = blurs[i] ?? null;
  });

  return NextResponse.json({ ok: true, users });
}
