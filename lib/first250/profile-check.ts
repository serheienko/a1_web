// lib/first250/profile-check.ts
//
// 14.10.2026. «Заполненный профиль» для акции «Перші 250» -- проверяется по данным самого
// бэкенда, без скриншотов. Четыре обязательных пункта, их же человек видит на странице
// галочками: что уже есть и что ещё добавить в приложении.

import type { UserProfile } from "@/lib/a1/schemas";

export type ProfileChecks = {
  photo: boolean;
  name: boolean;
  title: boolean;
  experience: boolean;
};

export const CHECK_KEYS = ["photo", "name", "title", "experience"] as const;

function titleText(p: UserProfile): string {
  // схема уже сводит заголовок профиля к строке (или null)
  return p.profileTitle ?? "";
}

export function profileChecks(p: UserProfile): ProfileChecks {
  return {
    photo: p.photos.length > 0,
    name: p.firstName.trim().length > 0,
    // «Ким працюєте»: роль, статус-заголовок профиля или сфера
    title: Boolean(p.occupation.trim() || titleText(p).trim() || (p.expertise ?? "").trim()),
    // «Що вмієте»: навички, досвід роботи або освіта
    experience: p.skills.length > 0 || p.companies.length > 0 || p.education.length > 0,
  };
}

export function isComplete(c: ProfileChecks): boolean {
  return CHECK_KEYS.every((k) => c[k]);
}
