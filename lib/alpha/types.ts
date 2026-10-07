// lib/alpha/types.ts -- shared shapes for Alpha search (A1 Premium).

export type AlphaRole = "seeking" | "hiring";
export type AlphaLevel = "junior" | "middle" | "senior" | "lead";
export type AlphaFormat = "remote" | "office" | "hybrid" | "any";

/** What Alpha has understood about the person ("портрет"). */
export type AlphaPortrait = {
  role: AlphaRole | null;
  /** Main thing searched for: a stack/role, e.g. "Flutter". */
  stack: string[];
  roleText: string | null;
  level: AlphaLevel | null;
  format: AlphaFormat | null;
  /** Monthly USD: minimum salary (seeking) or budget (hiring). */
  money: number | null;
  /** Hard "no": words that must not appear (gambling, outstaff...). */
  dealbreakers: string[];
  /** Soft wishes in the person's own words (pets in office...). */
  wishes: string[];
  /** Everything the person typed, kept for the future AI ranker. */
  notes: string[];
};

export type AlphaSlot = "role" | "stack" | "level" | "money" | "dealbreakers";

export type AlphaQuestion = {
  slot: AlphaSlot;
  text: string;
  options: { label: string; value: string }[];
  allowFree: boolean;
};

export type AlphaTurnRequest = {
  lang: string;
  portrait: AlphaPortrait | null;
  /** The person's latest message (free text or a chip value). */
  message: string;
  /** Which question this message answers (null = the very first message). */
  answering: AlphaSlot | null;
  asked: AlphaSlot[];
};

export type AlphaTurnResponse = {
  portrait: AlphaPortrait;
  question: AlphaQuestion | null; // null = ready to search
  step: number; // 1-based, for "Питання 2 з 4"
  total: number;
};

export type AlphaMatch = {
  id: string;
  slug: string;
  title: string;
  company: string;
  salary: string | null;
  remote: boolean;
  score: number; // 0..100
  reasons: string[];
  locked: boolean;
};

export const EMPTY_PORTRAIT: AlphaPortrait = {
  role: null,
  stack: [],
  roleText: null,
  level: null,
  format: null,
  money: null,
  dealbreakers: [],
  wishes: [],
  notes: [],
};
