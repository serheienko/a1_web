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

/** "more" -- open follow-up that Alpha writes itself from the context
 *  (AI brain), or a re-ask when an answer wasn't understood. */
export type AlphaSlot = "role" | "stack" | "level" | "location" | "format" | "money" | "conditions" | "dealbreakers" | "more";

export type AlphaChatLine = { from: "me" | "alpha"; text: string };

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
  /** The whole conversation so far -- the AI brain asks by context. */
  history?: AlphaChatLine[];
};

export type AlphaTurnResponse = {
  portrait: AlphaPortrait;
  question: AlphaQuestion | null; // null = ready to search
  step: number; // 1-based: "Питання 2"
  /** 07.10.2026 (Александр: «не ставь хард лимит»): no fixed number of
   *  questions any more -- instead, how well Alpha understands the
   *  request, 0..100. Search starts when it's enough (or on "Досить, шукай"). */
  understood: number;
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
  /** The author's (company's) avatar, when it has one. */
  avatar?: string | null;
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
