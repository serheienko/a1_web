// lib/profile-fill.ts
//
// 24.10.2026 (Александр: «блок "профіль замість резюме" показывать тем, кто
// не зарегистрирован, и тем, кто заполнил профиль меньше чем полей на 5»).
// Сколько разделов профиля человек заполнил. Считаем только то, что он
// вносит сам: профессию не берём (её выбирают при регистрации, она есть у
// всех), телефон/почту/дату рождения тоже (это не витрина профиля).

import type { WebProfile } from "@/types/web-profile";

/** С какого числа заполненных разделов профиль считаем «заполненным». */
export const PROFILE_FILLED_MIN = 5;

export function countFilledProfileFields(p: WebProfile): number {
  const checks = [
    !!p.avatarUrl,
    !!p.voiceIntroUrl,
    !!(p.bio && p.bio.trim()),
    !!(p.profileTitle && p.profileTitle.trim()),
    !!p.location,
    p.links.length > 0,
    p.companies.length > 0,
    p.education.length > 0,
    p.skills.length > 0,
    p.languages.length > 0,
    p.hobbies.length > 0,
    p.workInterests.length > 0,
    p.favoriteBooks.length + p.favoriteMovies.length + p.favoriteGames.length > 0,
    Object.values(p.workStylePreferences).some((ids) => ids.length > 0),
  ];
  return checks.filter(Boolean).length;
}
