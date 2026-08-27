// lib/a1/user-mappers.ts
//
// UserProfile (raw, from lib/a1/schemas.ts) -> WebProfile (types/web-profile.ts).
// The anti-corruption layer for profiles, same role as mappers.ts for
// posts (PLAN.md §2.4) — the ONLY file that knows both shapes.
//
// Security note, read before editing: phone/email/dob are copied out ONLY
// when the corresponding USER_FLAG bit (lib/a1/user-flags.ts) says the
// profile owner has chosen to show it to other users. That flag check is
// not a formatting nicety — it's the one and only thing standing between
// "public profile page" and "leaking a real person's phone number and
// date of birth onto a Google-indexed page." Do not add a code path that
// reads `raw.phoneNumber` / `raw.email` / `raw.dob` outside this function.

import { canShowPhone, canShowEmail, canShowDob, isDeletedUser } from "./user-flags";
import { buildMediaProxyUrl } from "./mappers";
import type { UserProfile as RawUserProfile, UserProfileResult } from "./schemas";
import type {
  WebProfile,
  WebProfileCompany,
  WebProfileLink,
  WebProfileLocation,
} from "@/types/web-profile";

function mapLink(link: { title: string; url: string } | null): WebProfileLink | null {
  return link ? { title: link.title, url: link.url } : null;
}

function mapLocation(
  location: { city: string; adm_level_1: string; country: string; displayName: string } | null,
): WebProfileLocation | null {
  if (!location) return null;
  return {
    city: location.city,
    region: location.adm_level_1,
    country: location.country,
    display: location.displayName,
  };
}

function mapCompanies(companies: RawUserProfile["companies"]): WebProfileCompany[] {
  return companies.map((c) => ({
    name: c.name,
    description: c.description,
    positionDescription: c.position?.description ?? null,
    positionStart: c.position?.start ?? null,
    positionEnd: c.position?.end ?? null,
    employeesCount: c.employeesCount,
    establishedYear: c.est,
    link: mapLink(c.link),
    // Aleksandr, 2026-08-27 (video walkthrough of the mobile app): the
    // company card there shows "IT" / "2-10" / "a1appp.com" — those are
    // employeesCount/link above (already parsed, just never mapped
    // through here before) plus this category id, which was sitting
    // unused on the raw schema (lib/a1/schemas.ts's UserCompanySchema)
    // since it's a plain number, not a label — see
    // lib/a1/datasets.ts's fetchCompanyCategories for the id -> text
    // lookup, same dataset.* pattern as post categories/tags.
    category: c.category,
  }));
}

/**
 * Raw users.getByUsername result -> our WebProfile, or null when there's
 * nothing safe/meaningful to show: the account is anonymous/hidden
 * (UserHidden variant), deleted (USER_FLAG.DELETED), or has no username
 * (a profile page keyed by username can't exist for one). The caller
 * renders null as "not found" (mirrors mapPost()'s null for a gone post).
 */
export function mapUserProfile(raw: UserProfileResult): WebProfile | null {
  if (raw.object !== "user") return null;
  if (isDeletedUser(raw.flags)) return null;
  if (!raw.username) return null;
  const username = raw.username; // hoisted so later property accesses don't rely on
  // TS's narrowing surviving past the several function calls below (this codebase
  // has been bitten by strict-mode edge cases before — see lib/seo/slug.ts's history).

  const avatarDoc = raw.photos[0];
  const fullName = [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim() || username;

  return {
    username,
    fullName,
    // Same proxy, same size-picking logic as post/author avatars — see
    // buildMediaProxyUrl in lib/a1/mappers.ts (exported for reuse here;
    // no circular import, mappers.ts doesn't import from this file).
    avatarUrl: avatarDoc ? buildMediaProxyUrl(avatarDoc) : null,
    // Same proxy as avatarUrl/photos — voiceIntroduction is just another
    // MediaDocument (a Resource.MediaDocument.AttributeAudio with
    // voice: true under the hood), not a separate media type on the wire.
    voiceIntroUrl: raw.voiceIntroduction ? buildMediaProxyUrl(raw.voiceIntroduction) : null,
    occupation: raw.occupation,
    expertise: raw.expertise,
    bio: raw.bio,
    profileTitle: raw.profileTitle,
    location: mapLocation(raw.location),
    links: raw.links.map((l) => ({ title: l.title, url: l.url })),
    companies: mapCompanies(raw.companies),
    education: raw.education,
    skills: raw.skills,
    languages: raw.languages,
    // Aleksandr, 2026-08-27 (mobile app video vs web gap): raw ids/text
    // passed through as-is — see the WebProfileWorkStylePreferences /
    // WebProfileBook comments in types/web-profile.ts for why the
    // dataset-id -> label resolution happens on the page, not here.
    hobbies: raw.hobbies,
    workInterests: raw.workInterests,
    favoriteBooks: raw.favoriteBooks,
    favoriteMovies: raw.favoriteMovies,
    favoriteGames: raw.favoriteGames,
    workStylePreferences: raw.workStylePreferences,
    phone: canShowPhone(raw.flags) ? raw.phoneNumber : null,
    email: canShowEmail(raw.flags) ? raw.email : null,
    dob: canShowDob(raw.flags) ? raw.dob : null,
  };
}
