// lib/username-slug.ts
//
// 2026-09-13 (Александр, скриншот профиля Growe: "как мы можем полечить,
// чтобы никнейм @a1_154083680401228220 изначально у всех был более
// красивый?" -> "А как сделать, чтобы эти никнеймы на все новые профили
// предлагались более красивые? ... На новые компании которые спарсили +
// на те, которые пользователи создают вручную").
//
// The backend only falls back to `a1_<userId>` when the caller sends NO
// username at all -- apps/api-server-modern/src/services/user-service/
// methods/createUser.ts: `if (!data.username) data.username =
// \`a1_${userId}\``, and users.createUser takes the whole
// UserCreateInput, which has `username`. So nothing on the backend needs
// changing for a sign-up that goes through THIS app: we just have to
// send one.
//
// Rules are the backend's own (apps/api-server-modern/src/helpers/
// assertUsername.ts): [A-Za-z0-9_] only, 2..32 characters. No hyphens,
// no dots -- "N-iX" has to become "n_ix".
//
// Availability comes from account.checkUsername, which is public
// (security: [] on that method) and returns true when the name is FREE.
// It compares by exact match against the stored username, so candidates
// are lowercased here rather than relying on the database's collation.

export const USERNAME_MAX = 32;
const USERNAME_MIN = 2;

// Enough for names people actually sign up with: Latin passes through,
// Cyrillic is transliterated, everything else collapses to "_".
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie",
  ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
  ю: "iu", я: "ia", ы: "y", э: "e", ъ: "",
};

/** A display name -> a username candidate, or null when nothing usable
 *  survives (empty, punctuation only, a script this doesn't romanize). */
export function slugUsername(name: string): string | null {
  // NFKD first so accents come off as separate combining marks and
  // "Café" ends up "cafe" rather than "caf_".
  let s = (name ?? "").toLowerCase().normalize("NFKD");
  s = [...s].map((ch) => TRANSLIT[ch] ?? ch).join("");
  s = s.replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^a-z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  s = cutToLimit(s);
  return s.length >= USERNAME_MIN ? s : null;
}

/**
 * Trim to the length limit on a word boundary rather than mid-word --
 * "7 Корпус Швидкого Реагування ДШВ" otherwise ends in a stranded "_d",
 * which is valid but reads like a typo. A name with no underscore to cut
 * back to, or one where cutting back would leave almost nothing, keeps
 * the plain hard slice.
 */
function cutToLimit(s: string): string {
  if (s.length <= USERNAME_MAX) return s.replace(/_+$/, "");

  let cut = s.slice(0, USERNAME_MAX);

  // A "_" exactly at the limit means the slice already landed on a word
  // boundary and there is nothing to cut back.
  if (s[USERNAME_MAX] !== "_" && cut.includes("_")) {
    const trimmed = cut.slice(0, cut.lastIndexOf("_"));

    if (trimmed.length >= 8) cut = trimmed;
  }

  return cut.replace(/_+$/, "");
}

/** The first free username for this name, or null to let the backend do
 *  what it has always done (`a1_<id>`). `isFree` is injected rather than
 *  imported so this file stays free of any transport concern and can be
 *  unit-checked on its own. A thrown checker is treated as "no opinion":
 *  a cosmetic nicety must never be the reason a sign-up fails. */
export async function pickAvailableUsername(
  name: string,
  isFree: (candidate: string) => Promise<boolean>,
): Promise<string | null> {
  const base = slugUsername(name);
  if (!base) return null;
  const candidates = [base];
  for (let i = 2; i < 12; i += 1) {
    candidates.push(`${base.slice(0, USERNAME_MAX - 3).replace(/_+$/, "")}_${i}`);
  }
  for (const candidate of candidates) {
    try {
      if (await isFree(candidate)) return candidate;
    } catch {
      return null;
    }
  }
  return null;
}
