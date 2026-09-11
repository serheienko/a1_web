// lib/a1/admin-applications.ts
//
// 2026-09-11 (Aleksandr: "С откликами я хочу довести до конца... Я сам
// рандомно откликнусь и хочу посмотреть что отклик пришел"). An
// application to an imported company does not exist as its own resource
// anywhere on this backend — it IS a chat message in that company
// account's own inbox (components/post-viewer-menu.tsx's Apply button
// sends it; see its own applyMessage comment for why that send had to be
// added before any of this could show anything at all). Nobody ever
// writes FROM these accounts — they were created by bulk_provision.py and
// only ever post vacancies — so every chat one of them has is, by
// construction, somebody reaching out about a vacancy.
//
// Same machinery as lib/a1/admin-post-aggregate.ts (read its header
// first — the one-account-per-company reasoning, the CONCURRENCY cap,
// the per-page cache and the account-level pagination all exist here for
// exactly the same reasons, and for the same Vercel 60s ceiling). The
// only structural difference is that one account's fetch here is three
// hops instead of one: chats.getChats, then messages.getMessages per
// chat, then one users.getUsers to put a real name on whoever wrote.
//
// The Python equivalent this replaces is "Claude outputs"/
// check_applications.py on Aleksandr's own machine — same three calls,
// same read-only stance (nothing here ever sends, edits or marks
// anything read; opening the admin page must not change what the
// company sees when it finally claims the account).
import { call, A1ApiError } from "./client";
import { loadTechnicalAccounts, type TechnicalAccount } from "./admin-accounts";
import { parseUserProfile } from "./schemas";
import {
  extractChats,
  extractMessages,
  describeMessagePreview,
  messageDateMs,
  otherParticipantUserId,
  peerForChat,
  type Chat,
} from "./chat-schemas";

const CONCURRENCY = 10;
const CACHE_TTL_MS = 45_000;
const MESSAGES_PER_CHAT = 20;
const pageCache = new Map<string, { data: AccountsApplicationsPage; fetchedAt: number }>();

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      const item = items[i];
      if (item === undefined) continue;
      results[i] = await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

export type AdminApplicationMessage = {
  id: string;
  // Plain one-line text for the row. describeMessagePreview (not the
  // raw entities) so a photo/voice/file-only message still reads as
  // something instead of an empty bubble — same call the web chat list
  // already uses for its own preview line.
  text: string;
  kind: string;
  dateMs: number;
  // True for the rare message sent BY the company account itself. Should
  // be none today (nobody signs into these accounts), but an admin
  // reading a thread needs to be able to tell the two sides apart the
  // moment somebody does reply from one.
  fromCompany: boolean;
};

export type AdminApplication = {
  chatId: string;
  companyName: string;
  companyEmail: string;
  applicantId: string | null;
  applicantName: string;
  applicantUsername: string | null;
  lastMessageAtMs: number;
  messageCount: number;
  messages: AdminApplicationMessage[];
};

type LoginOutput = { accessToken: string; user?: { _id?: string } };

async function fetchAccountApplications(account: TechnicalAccount): Promise<AdminApplication[]> {
  try {
    const login = await call<LoginOutput>(
      "auth.email",
      { email: account.email, password: account.password },
      { skipAuth: true },
    );
    const token = login.accessToken;
    const myUserId = login.user?._id ?? null;

    const chatsRaw = await call<unknown>("chats.getChats", {}, { accessToken: token });
    const chats = extractChats(chatsRaw);
    if (chats.length === 0) return [];

    // One messages.getMessages per chat, in parallel — same shape the
    // web chat list already uses, just asking for a window instead of
    // one message so the admin can read the whole short thread inline.
    const threads = await Promise.all(
      chats.map(async (chat: Chat) => {
        try {
          const raw = await call<unknown>(
            "messages.getMessages",
            { peerTo: peerForChat(chat._id), limit: MESSAGES_PER_CHAT },
            { accessToken: token },
          );
          return { chat, messages: extractMessages(raw) };
        } catch (err) {
          console.error(`[admin-applications] messages for ${account.email}/${chat._id} failed:`, err);
          return { chat, messages: [] };
        }
      }),
    );

    // One batched name lookup for every counterpart across this
    // account's chats (users.getUsers, the confirmed batch id endpoint —
    // see app/api/chats/list/route.ts's header for the users.search
    // dead end that preceded it).
    const applicantIds = Array.from(
      new Set(
        threads
          .map(({ chat }) => otherParticipantUserId(chat, myUserId))
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const names = new Map<string, { name: string; username: string | null }>();
    if (applicantIds.length > 0) {
      try {
        const usersRaw = await call<unknown>("users.getUsers", { ids: applicantIds }, { accessToken: token });
        for (const raw of Array.isArray(usersRaw) ? usersRaw : []) {
          const profile = parseUserProfile(raw);
          if (!profile || profile.object !== "user") continue;
          const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
          names.set(profile._id, { name, username: profile.username });
        }
      } catch (err) {
        // A nameless row still beats no row — the thread text itself is
        // the point, and the chat is still openable by id.
        console.error(`[admin-applications] users.getUsers for ${account.email} failed:`, err);
      }
    }

    return threads.map(({ chat, messages }) => {
      const applicantId = otherParticipantUserId(chat, myUserId);
      const resolved = applicantId ? names.get(applicantId) : undefined;
      const mapped: AdminApplicationMessage[] = messages.map((msg) => {
        const preview = describeMessagePreview(msg);
        return {
          id: msg._id,
          text: preview.text,
          kind: preview.kind,
          dateMs: messageDateMs(msg),
          fromCompany: Boolean(myUserId) && msg.fromId === myUserId,
        };
      });
      return {
        chatId: chat._id,
        companyName: account.name,
        companyEmail: account.email,
        applicantId,
        applicantName: resolved?.name || chat.title || "",
        applicantUsername: resolved?.username ?? null,
        lastMessageAtMs: mapped.length > 0 ? (mapped[mapped.length - 1]?.dateMs ?? 0) : 0,
        messageCount: mapped.length,
        messages: mapped,
      };
    });
  } catch (err) {
    // Same "one bad account never blanks the page" rule as
    // admin-post-aggregate.ts.
    if (err instanceof A1ApiError) {
      console.error(`[admin-applications] ${account.email} failed:`, err.httpStatus, err.body.slice(0, 300));
    } else {
      console.error(`[admin-applications] ${account.email} failed:`, err);
    }
    return [];
  }
}

export type AccountsApplicationsPage = {
  applications: AdminApplication[];
  total: number;
  nextOffset: number | null;
  hasMore: boolean;
};

export async function fetchAccountsApplicationsPage(offset: number, limit: number): Promise<AccountsApplicationsPage> {
  const cacheKey = `${offset}:${limit}`;
  const cached = pageCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }
  const accounts = loadTechnicalAccounts();
  const page = accounts.slice(offset, offset + limit);
  const results = await mapWithConcurrency(page, CONCURRENCY, fetchAccountApplications);
  const applications = results.flat().sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs);
  const nextOffset = offset + limit < accounts.length ? offset + limit : null;
  const data: AccountsApplicationsPage = {
    applications,
    total: accounts.length,
    nextOffset,
    hasMore: nextOffset !== null,
  };
  pageCache.set(cacheKey, { data, fetchedAt: Date.now() });
  return data;
}
