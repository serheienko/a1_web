// app/api/chats/send/route.ts
//
// Phase 1 web chat (Aleksandr, 2026-09-01). POST { chatId, text } --
// proxies chat-server's `messages.send`.
//
// 2026-09-02: request shape confirmed directly off chat-server's own
// types (packages/types/global/MessageInput.d.ts, read straight off
// the source this time instead of guessed): `{ peerTo, message, ... }`
// -- `peerTo` was already right (2026-09-01's live-confirmed rename,
// see app/api/chats/messages/route.ts's header), but `randomId` was
// never a real field on this input at all and is dropped here, and
// `chatId` may now be a real Chat _id OR the `u_<userId>` "no chat
// yet" sentinel (app/api/chats/open/route.ts) -- peerForRouteParam
// (lib/a1/chat-schemas.ts) resolves either to the right Peer, and for
// a `peer-user` peer chat-server transparently resolves-or-creates the
// personal chat right here (services/chats/methods/
// _peerToPeerChat.ts + resolvePersonalChat.ts) before the message goes
// out -- no separate "create the chat first" step needed.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { A1ApiError } from "@/lib/a1/client";
import { callAsVisitor, NoSessionError } from "@/lib/a1/visitor-call";
import { setSession, clearSession } from "@/lib/a1/session";
import { peerForRouteParam, MessageSchema } from "@/lib/a1/chat-schemas";

export const runtime = "nodejs";

const SendInput = z
  .object({
    chatId: z.string().trim().min(1),
    text: z.string().trim().max(4000).optional(),
    // 2026-09-02 (Aleksandr: "поискать теперь в коде всё что у нас
    // живет на скрепке и приготовиться к имплементации") -- one entry
    // per attachment already uploaded+confirmed via /api/upload/create
    // + /api/upload/confirm (the same two routes post-editor.tsx and
    // profile-editor.tsx already use for photos -- confirmed reusable
    // here too, since Upload/Media is one unified service shared across
    // every backend service per the OpenAPI spec's own description, not
    // something chat-server duplicates). Only `fileReference` is needed
    // from the confirmed MediaDocument -- see the `media` mapping below
    // for the exact MessageInput.Media.Document shape chat-server wants.
    media: z.array(z.object({ fileReference: z.string().trim().min(1) })).max(10).optional(),
    // 2026-09-02 (Aleksandr: "прокинь пока на бэке возможность
    // отправлять контакты. Актуальный UI я потом тебе покажу") -- one
    // entry per shared platform-contact, confirmed against
    // MessageInput.Media.Contact: all four fields required by
    // chat-server, no partial contact card allowed. The obvious source
    // for these once a picker UI exists is /api/contacts/list's own
    // `Contact` rows (lib/a1/schemas.ts) -- `user` -> userId, `phone` ->
    // phoneNumber, `firstName`/`lastName` straight across -- but a
    // Contact whose `phone` is null (this app doesn't collect one at
    // add-time, see app/api/contacts/add/route.ts's own header; it only
    // ever comes from the linked user's own profile, if they set one)
    // simply can't be sent this way -- that UI will need to filter or
    // grey those out, not something this route can paper over given the
    // backend's own required field.
    contacts: z
      .array(
        z.object({
          userId: z.string().trim().min(1),
          phoneNumber: z.string().trim().min(1),
          firstName: z.string().trim().min(1),
          lastName: z.string().trim().min(1),
        }),
      )
      .max(5)
      .optional(),
    // 2026-09-02 (Aleksandr, native-app screenshot of an invoice card
    // with Description/Cost/Qty/Subt columns: "поищи плз, у нас есть
    // еще такая фича, calculations") -- confirmed against
    // Resource.RichText.Calculation: a QUOTE, not a media attachment --
    // it rides in `entities` (the same array plain message text already
    // lives in as `entity-text`), not `media`. `unitAmount` is
    // documented as integer CENTS ("$1.50" -> 150) -- this app's own
    // post-editor salary amounts (lib/format.ts's formatAmount) are
    // whole units, not cents, so a future calculator UI must NOT reuse
    // that formatter unmodified. `note`/`currency`/`rows` are all
    // required by chat-server (rows may be an empty array -- the
    // reference screenshot's own "0 USD" state before any row is added
    // -- but the key itself must be present).
    calculation: z
      .object({
        note: z.string().trim().max(200),
        currency: z
          .string()
          .trim()
          .length(3)
          .transform((v) => v.toLowerCase()),
        rows: z
          .array(
            z.object({
              quantity: z.number().int().min(1),
              unitAmount: z.number().int().min(0),
              description: z.string().trim().max(300).nullable().optional(),
            }),
          )
          .max(50),
      })
      .optional(),
    // 2026-09-04 (Aleksandr, after lib/a1/meeting-protocol.ts's own
    // ARCHITECTURE NOTE shipped this whole feature as plain text only,
    // "WebFetch found no entity-meeting equivalent": he found one
    // himself off the live docs -- confirmed via https://api.a1appp.com/
    // openapi.json that a real Resource.Message.Media union member DOES
    // exist for meetings, just under `media` (not `entities`) and named
    // differently than what was searched for: `media-meet-invite-online`/
    // `-offline` (bare markers, no fields at all -- `{object}` only) for
    // a still-pending invite, and `media-meet` (`{at, url, object}`,
    // `at` a TIMESTAMP_SECONDS) once confirmed. Deliberately thin: the
    // marker carries no time at all (so a native client that renders it
    // shows only its own generic "meeting invite" affordance, nothing
    // to leak before Accept) and `media-meet` mirrors exactly what this
    // app's own meeting-protocol.ts text payload already carries, once
    // that becomes shareable. This RIDES ALONGSIDE the existing text
    // payload (scheduleMeeting/acceptMeeting in app/chats/[chatId]/
    // page.tsx still send the same A1MEETINGv1::/A1MEETINGACCEPTv1::
    // text this web client decodes for its own richer pre-accept UI --
    // fuzzy time buckets, hide-until-accept -- none of which the real
    // protocol has any field for) purely so a client that does NOT know
    // that text convention (the native app, today) gets something real
    // to render instead of raw base64 garble.
    meet: z
      .union([
        z.object({ kind: z.literal("invite") }),
        z.object({ kind: z.literal("confirm"), at: z.number().int().positive(), url: z.string().trim().min(1).nullable() }),
      ])
      .optional(),
    // Reply feature (2026-09-05) -- CONFIRMED off the mobile app's own
    // source (chat_detail_cubit.dart's actual send call, not the
    // generated OpenAPI model, see lib/a1/chat-schemas.ts's own
    // MessageReplyToSchema header): only `message`/`object`/`user` are
    // ever actually sent, `chat`/`channel` left off. `userId` here is
    // the ORIGINAL message's own sender (mobile's own `replyMessage.
    // peerFrom.user`) -- app/chats/[chatId]/page.tsx already has that on
    // the ChatMessage object it's replying to, no extra lookup needed.
    replyTo: z
      .object({
        messageId: z.union([z.string(), z.number()]),
        userId: z.string().trim().min(1),
      })
      .optional(),
    // Forward feature (2026-09-05, Aleksandr: "И переслать... это
    // форвард обычный") -- CONFIRMED off the mobile app's own source
    // (chat_detail_cubit.dart's sendForwardedMessage -- read directly,
    // not guessed): a forward is NOT a separate RPC, it's a flavor of
    // this same messages.send carrying one extra field, `forwardFrom`
    // (`{user, object:"peer-user"}, the ORIGINAL author -- Telegram-
    // style re-forward keeps the first author, not whoever last
    // forwarded it, see chat_forward_payload.dart's own
    // chatForwardFromUserId comment). `userId` here is already that
    // resolved original-author id (app/chats/[chatId]/page.tsx picks
    // `msg.forwardFrom?.user ?? msg.fromId` before calling this route,
    // mirroring chatForwardFromUserId's own `forwardFrom ?? peerFrom`
    // fallback) -- this route itself does no such resolution, same
    // "client already did the lookup" division every other route here
    // already has for e.g. replyTo's userId. The forwarded CONTENT
    // itself (text/media/contacts) rides in this SAME request's
    // existing text/media/contacts fields, re-using the original
    // message's own entities/media -- nothing forward-specific there.
    forwardFrom: z.object({ userId: z.string().trim().min(1) }).optional(),
  })
  .refine(
    (v) =>
      (v.text && v.text.length > 0) ||
      (v.media && v.media.length > 0) ||
      (v.contacts && v.contacts.length > 0) ||
      v.calculation !== undefined ||
      v.meet !== undefined,
    { message: "empty_message" },
  );

export async function POST(request: NextRequest) {
  const parsed = SendInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "invalid_input" }, { status: 400 });
  }
  const { chatId, text, media, contacts, calculation, meet, replyTo, forwardFrom } = parsed.data;

  try {
    // `message` and `media` are both optional on MessageInput (only
    // `peerTo` is required -- confirmed against the OpenAPI spec), so an
    // attachment-only send (no caption typed) omits `message` entirely
    // instead of sending an empty string. `media` itself is a single
    // array mixing whichever attachment variants are present -- chat-
    // server's own MessageInput.Media is a 7-way union keyed by
    // `object`, so a document and a contact can both go out in the same
    // message's media[] (untested combination so far, but nothing in
    // the spec suggests it's disallowed).
    const payload: Record<string, unknown> = { peerTo: peerForRouteParam(chatId) };
    if (replyTo) {
      payload.replyTo = { message: Number(replyTo.messageId), object: "peer-user", user: replyTo.userId };
    }
    if (forwardFrom) {
      payload.forwardFrom = { user: forwardFrom.userId, object: "peer-user" };
    }
    const mediaItems: Record<string, unknown>[] = [];
    if (media && media.length > 0) {
      mediaItems.push(...media.map((m) => ({ fileReference: m.fileReference, object: "media-document-input" })));
    }
    if (contacts && contacts.length > 0) {
      mediaItems.push(...contacts.map((c) => ({ ...c, object: "media-contact" })));
    }
    if (meet) {
      mediaItems.push(
        meet.kind === "invite"
          ? { object: "media-meet-invite-online" }
          : { object: "media-meet", at: meet.at, url: meet.url },
      );
    }
    if (mediaItems.length > 0) payload.media = mediaItems;
    if (calculation) {
      // A calculation lives in `entities`, not `media` -- and unlike
      // `media` (a separate top-level field from `message`), `entities`
      // is where plain message TEXT itself canonically lives too (a
      // real stored message's text is `entities: [{object:"entity-
      // text",...}]`, confirmed in MessageSchema's own header comment).
      // Whether chat-server would even accept both a flat `message`
      // string AND an explicit `entities` array on the same send, and
      // if so how it reconciles them, is NOT confirmed -- rather than
      // guess, a caption typed alongside a calculation is folded into
      // this SAME entities array as its own entity-text, and `message`
      // is left unset whenever `entities` is being sent. Revisit this
      // the moment it's actually live-tested (nothing has pushed yet).
      const entities: Record<string, unknown>[] = [];
      if (text) entities.push({ object: "entity-text", text });
      entities.push({
        object: "entity-calculation",
        note: calculation.note,
        currency: calculation.currency,
        rows: calculation.rows.map((r) => ({
          quantity: r.quantity,
          unitAmount: r.unitAmount,
          description: r.description ?? null,
        })),
      });
      payload.entities = entities;
    } else if (text) {
      payload.message = text;
    }
    const { data, refreshedSession } = await callAsVisitor<unknown>("messages.send", payload);

    // 2026-09-02: echoes the real created message back (parsed through
    // the now shape-confirmed MessageSchema -- see lib/a1/chat-schemas.ts)
    // instead of the raw payload, in case a future pass wants to append
    // it optimistically rather than waiting for the next poll tick.
    const parsedMessage = MessageSchema.safeParse(data);
    const response = NextResponse.json({ ok: true, message: parsedMessage.success ? parsedMessage.data : null });
    if (refreshedSession) setSession(response, refreshedSession);
    return response;
  } catch (err) {
    if (err instanceof NoSessionError) {
      const response = NextResponse.json({ ok: false, message: "not_signed_in" }, { status: 401 });
      clearSession(response);
      return response;
    }
    const detail = err instanceof A1ApiError ? err.detail : null;
    if (err instanceof A1ApiError) {
      console.error("[api/chats/send] failed:", err.httpStatus, err.body.slice(0, 500));
    } else {
      console.error("[api/chats/send] unexpected error:", err);
    }
    return NextResponse.json({ ok: false, message: "send_failed", detail }, { status: 502 });
  }
}
