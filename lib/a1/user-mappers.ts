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
    phone: canShowPhone(raw.flags) ? raw.phoneNumber : null,
    email: canShowEmail(raw.flags) ? raw.email : null,
    dob: canShowDob(raw.flags) ? raw.dob : null,
  };
}
