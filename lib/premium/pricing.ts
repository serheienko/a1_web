// lib/premium/pricing.ts
//
// A1 Premium -- regional price grid (Aleksandr, 2026-10-07).
// Ukraine: $5.99/month, $4.49/month when paid yearly (25% off).
// Other markets follow the same rule, in four tiers. Display-only for now:
// payments are not connected yet (test environment).

export type PriceTier = "base" | "east" | "west" | "rich";

export type TierPrice = {
  month: number; // USD per month, monthly plan
  yearPerMonth: number; // USD per month, yearly plan
  yearTotal: number; // USD charged once for the year
};

export const TIER_PRICES: Record<PriceTier, TierPrice> = {
  base: { month: 5.99, yearPerMonth: 4.49, yearTotal: 53.88 },
  east: { month: 7.99, yearPerMonth: 5.99, yearTotal: 71.88 },
  west: { month: 9.99, yearPerMonth: 7.49, yearTotal: 89.88 },
  rich: { month: 12.99, yearPerMonth: 9.74, yearTotal: 116.88 },
};

// ISO-3166 alpha-2 -> tier. Anything not listed falls back to "west".
const COUNTRY_TIER: Record<string, PriceTier> = {
  // base
  UA: "base", MD: "base", GE: "base", AM: "base", AZ: "base", KZ: "base",
  UZ: "base", KG: "base", TR: "base", IN: "base", ID: "base", VN: "base",
  PH: "base", EG: "base", BR: "base", AR: "base", MX: "base", CO: "base",
  PE: "base", CL: "base",
  // east
  PL: "east", CZ: "east", SK: "east", HU: "east", RO: "east", BG: "east",
  LT: "east", LV: "east", EE: "east", HR: "east", SI: "east", RS: "east",
  PT: "east", GR: "east", CY: "east", MT: "east",
  // west
  GB: "west", DE: "west", FR: "west", NL: "west", BE: "west", ES: "west",
  IT: "west", IE: "west", AT: "west", FI: "west", LU: "west",
  // rich
  US: "rich", CA: "rich", AU: "rich", NZ: "rich", CH: "rich", NO: "rich",
  SE: "rich", DK: "rich", IS: "rich", IL: "rich", AE: "rich", SG: "rich",
};

export function tierForCountry(country: string | null | undefined): PriceTier {
  if (!country) return "west";
  return COUNTRY_TIER[country.toUpperCase()] ?? "west";
}

// Best-effort country guess on the client from the device time zone.
// Good enough for showing a price; the real charge will use the store /
// payment provider's own country.
const TZ_COUNTRY: Record<string, string> = {
  "Europe/Kyiv": "UA", "Europe/Kiev": "UA", "Europe/Uzhgorod": "UA", "Europe/Zaporozhye": "UA",
  "Europe/Chisinau": "MD", "Asia/Tbilisi": "GE", "Asia/Yerevan": "AM", "Asia/Baku": "AZ",
  "Asia/Almaty": "KZ", "Asia/Tashkent": "UZ", "Europe/Istanbul": "TR", "Asia/Kolkata": "IN",
  "Europe/Warsaw": "PL", "Europe/Prague": "CZ", "Europe/Bratislava": "SK", "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO", "Europe/Sofia": "BG", "Europe/Vilnius": "LT", "Europe/Riga": "LV",
  "Europe/Tallinn": "EE", "Europe/Zagreb": "HR", "Europe/Lisbon": "PT", "Europe/Athens": "GR",
  "Europe/London": "GB", "Europe/Berlin": "DE", "Europe/Paris": "FR", "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE", "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Dublin": "IE",
  "Europe/Vienna": "AT", "Europe/Helsinki": "FI", "Europe/Zurich": "CH", "Europe/Oslo": "NO",
  "Europe/Stockholm": "SE", "Europe/Copenhagen": "DK", "Asia/Jerusalem": "IL", "Asia/Dubai": "AE",
  "Asia/Singapore": "SG", "Australia/Sydney": "AU", "Australia/Melbourne": "AU",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/New_York": "US",
  "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US",
  "America/Sao_Paulo": "BR", "America/Mexico_City": "MX", "America/Argentina/Buenos_Aires": "AR",
};

export function guessCountry(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_COUNTRY[tz] ?? null;
  } catch {
    return null;
  }
}

export function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}
