# A1 Web — Master Plan & Execution Spec (v1.0 / MVP)

> **Audience:** the implementing agent (Claude Sonnet) + the two devs.
> **Owner:** founder (non-developer). Every decision below is already made — do not re-litigate them, ask only about items in `OPEN QUESTIONS`.
> **Goal of v1.0:** a public, server-rendered, SEO-indexable web surface that shows posts created in the A1 mobile app. Read-only. No web signup, no chat, no post creation.

---

## 0. Ground truth about the backend (verified against https://api.a1appp.com/openapi.json on 2026-08-26)

These are facts, not assumptions. Do not invent endpoints.

| Fact | Detail |
|---|---|
| Style | JSON-RPC-ish over HTTP. **Every** endpoint is `POST https://api.a1appp.com/v1/<namespace>.<method>` with a JSON body. There are no REST path params, no `GET`, no query strings. |
| Count | 121 endpoints total. |
| Auth | `Authorization: Bearer <accessToken>` on all but 18 endpoints. Global security requirement is `bearerToken`. |
| Public (no auth) | `auth.email`, `auth.google`, `auth.appleId`, `auth.refreshToken`, `auth.resetPassword`, `auth.resetPasswordConfirm`, `users.createUser`, `account.checkEmail`, `account.checkUsername`, and all `dataset.*` (`postCategories`, `postTags`, `countries`, `currencies`, `companyCategories`, `hobbies`, `langPack`, `workInterests`, `workStylePreferences`). |
| **Critical** | `posts.search`, `posts.get` and `media.getUrl` **all require a bearer token.** There is no anonymous read path. This drives the whole architecture (see §2). |
| Envelope | Success responses are wrapped: `{ "ms": number, "status": 200, "data": <payload> }`. The payload you want is always `body.data`. |
| Errors | `400 / 401 / 500` are declared with no schema. Treat any non-200 `status` as an error; log the raw body. |

### 0.1 Endpoints this project uses

```
POST /v1/auth.email            { email, password }        -> { userId, expiresAt, accessToken, refreshToken }
POST /v1/auth.refreshToken     { refreshToken }           -> { userId, expiresAt, accessToken, refreshToken }
POST /v1/posts.search          <see 0.2>                  -> { items: Post[], pagination, promoted: Post[], count }
POST /v1/posts.get             { ids: PostId[] }          -> (Post | PostEmpty)[]
POST /v1/media.getUrl          { fileId?, fileReference?, size, trackView?, trackUsage? } -> { downloadUrl }
POST /v1/dataset.postCategories  {}                       -> { items: [{ value, text, lottie }] }   // NO AUTH
POST /v1/dataset.postTags        {}                       -> { "post-job-seeking": [...], ... }      // NO AUTH
POST /v1/locations.search      (auth)                     -> location lookup, only if location filter UI is built
```

Everything else (chats, messages, stickers, wallet, contacts, notifications, favorites, apply) is **out of scope for v1.0**. Do not touch it.

### 0.2 `posts.search` input (exact field names)

```ts
{
  limit?: number            // 1..100
  next?: string             // opaque forward cursor
  previous?: string         // opaque backward cursor
  q?: string                // free-text
  author?: "me" | UserId
  location?: number         // WorldLocation._id
  object?: string           // discriminator, e.g. "post-job-employing"
  expand?: string | string[]
  favorited?: boolean
  categories?: number[]     // OR-matched
  tags?: string[]           // OR-matched
  scheduled?: boolean
  drafts?: boolean
  eventFromStart?: number   // unix seconds
  eventToStart?: number
}
```

Output:

```ts
{
  items: Post[]
  pagination: { next: string | null, previous: string | null, hasMore: boolean }
  promoted: Post[]
  count?: { total: number, object: Record<string, number> }
}
```

**Pagination is cursor-based, not offset-based.** There is no page number and no total-page count. Anything in the UI that implies "page 5 of 40" is impossible — use "Load more" / infinite scroll, plus a stable seeded sitemap for crawlers (§5).

### 0.3 `Post` is a discriminated union

`Resource.Post` = one of six variants, discriminated by the `object` string field:

**Founder correction (2026-08-26): only two of the six types are live in the product.** The other four are legacy schema left in the API and are hidden in the app. The product has exactly two feeds.

| `object` | Product name | Feed | In scope for web v1.0? |
|---|---|---|---|
| `post-job-employing` | **Jobs** — someone is hiring | Feed 1 | **YES** |
| `post-job-seeking` | **Talents** — a specialist offering themselves | Feed 2 | **YES** |
| `post-collaborator` | legacy, hidden | — | no |
| `post-supplier-b2b` | legacy, hidden | — | no |
| `post-brainstorm` | legacy, hidden | — | no |
| `post-meetup` | legacy, hidden | — | no |

The web mirrors the app: two feeds, two URL trees (`/jobs`, `/talents`), one shared card and detail component parameterised by `kind`. Never render a legacy type — filter by `object` on the way in and drop anything unrecognised.

Shared shape (identical across `post-job-employing` and `post-job-seeking`):

```ts
{
  _id: string
  title: string
  content: string
  links: { title: string; url: string }[]
  location: WorldLocation | null
  created: number                  // unix SECONDS
  updated: number | null
  published: number | null         // null => not published
  scheduled: number | null
  author: UserPreview | UserHidden
  categories: number[]
  tags: string[]
  viewCount: number
  flags: number                    // bitmask, semantics unknown — see OPEN QUESTIONS
  media: MediaDocument[]
  pinExpiresAt: number | null
  highlightExpiresAt: number | null
  apply: { questions: {...}[] } | null
  money: Money | null
  object: "post-job-employing" | "post-job-seeking"
}
```

Supporting types:

```ts
WorldLocation  { _id: number, displayName: string, country: CountryCode, city: string, adm_level_1: string, coordinates: number[], object: "world-location" }
UserPreview    { _id, fullName, photo, photos: MediaDocument[], username: string|null, emojiStatus, object: "user-preview" }
UserHidden     { ...anonymous author variant — must render as "Anonymous", never crash }
MediaDocument  { _id, mimetype, fileReference, date, sizes: Size[], ttl, flags, attributes[], object: "media-document" }
Money          = Money.Single | Money.SingleAnnual | Money.Range | Money.RangeAnnual
                 e.g. Range { unitAmount: number[], currency: CurrencyCode, object: "post-money-range" }
```

**All timestamps are unix seconds, not milliseconds.** Multiply by 1000 before `new Date()`. Getting this wrong yields 1970 dates in `datePosted` and silently kills the Google Jobs integration.


---

## 0.4 Working environment — read this before doing anything

The environment has two hard limits that were measured, not assumed (2026-08-26):

| Where | git / GitHub | npm registry | Consequence |
|---|---|---|---|
| Cloud session container | ✅ works | ❌ 403 by security policy | Can write and push code. **Cannot `npm install`, cannot run `next build` locally.** |
| Founder's device shell (`device_bash`) | ❌ proxy 403 | ❌ no network at all | Useless for this project. Do not try to build there. |
| Vercel build servers | ✅ | ✅ | **This is our build machine and our type-checker.** |

Therefore:

1. **The working copy lives in the cloud container**, in a clone of `github.com/serheienko/a1_web`.
2. **Never run `create-next-app`, `npm install`, or any command that touches a registry — it will fail.** Hand-write `package.json`, `tsconfig.json`, `next.config.ts` and every source file by hand. Version *ranges* are fine (`"next": "^15"`): the install happens on Vercel, which has a registry. There will be no lockfile and therefore no reproducible builds until the registry is reachable from somewhere we control — acceptable at MVP, note it as tech debt.
3. **`git push` is the build trigger.** Vercel builds on every push; `next build` runs `tsc`, so a green Vercel build *is* the type-check. Rule #7 in §5 is amended accordingly: instead of pasting local command output, push and report the Vercel build result.
4. **Read build logs through the founder's browser** (Claude-in-Chrome, he is logged into Vercel and GitHub). Do not ask him to copy-paste logs unless the browser route fails.
5. Because the feedback loop costs ~2 minutes per push, **be deliberate**: re-read your own diff before pushing, and prefer one careful commit over five speculative ones.
6. The folder connected from the founder's Mac (`Desktop/Документы:a1-web`) has no network and is **not** the working copy. Ignore it unless he asks for a local mirror.

---

## 0.5 Founder's working assumptions (2026-08-26) — pending backend confirmation

The backend has not answered yet. He made three calls so the work can start. Implement each as a **single named constant or config flag**, never as logic scattered through the codebase, so that flipping it later is a one-line change.

| Question | His decision | How to implement | What to watch |
|---|---|---|---|
| Does `location === null` mean remote? | **Treat as remote.** | `const NULL_LOCATION_MEANS_REMOTE = true` in `lib/a1/config.ts`; `isRemote` derives from it. | If wrong, every location-less post claims `jobLocationType: TELECOMMUTE` and Google may flag the structured data. Re-check as soon as the backend answers. |
| Native vs scraped posts | **No distinction for now — publish everything.** | `const PUBLISH_ONLY_NATIVE = false` plus a `isNativePost()` stub returning `true`. Wire the filter in now; leave it off. | This reverses an earlier decision, knowingly. Duplicated third-party vacancies on an indexed domain risk being ignored by Google and, at worst, cost domain trust. Flag it again if indexing underperforms — do not silently absorb it. |
| `flags` bitmask | **Meaning unknown.** | Do not read `flags` anywhere. Parse it as `number` and drop it in the mapper. | A hidden or reported post may therefore appear on the public site. Ask the backend before launch, not after. |

---

## 1. Non-negotiable constraints

1. **SEO is the primary success metric of this project.** Every architectural choice loses to SEO. Client-side-only rendering is banned.
2. **No own database in v1.0.** The A1 API is the single source of truth. Do not mirror posts into Postgres/Mongo/Supabase. (Revisit only if §5 sitemap generation becomes too slow at >20k posts.)
3. **No raw API object ever reaches the browser.** The mapper (§3.3) allow-lists fields explicitly. Rationale: a prior audit found `/v1/users.search` leaking other users' emails to clients; the same class of mistake must be structurally impossible here.
4. **The service-account credentials live only in server-side env vars.** Never `NEXT_PUBLIC_*`. Never in a client component. Never in a response body.
5. **One shippable increment per phase.** Do not start phase N+1 before phase N builds, type-checks and is deployed.

---

## 2. Architecture

### 2.1 The access problem and its solution

`posts.search` requires a logged-in user. A public website has no logged-in user. Solution:

```
Visitor's browser  ──►  Next.js server (Vercel)  ──►  api.a1appp.com
   no token                holds service-account          bearer token
                           token, server-side only
```

A dedicated **service account** ("web reader") is created in the app. The Next.js server logs in as that account once, caches the tokens, refreshes them automatically, and never exposes them. To the browser, the site looks like a plain static job board.

This is a bridge, not the destination. Design `lib/a1/auth.ts` behind an interface so that swapping to a real public/anonymous endpoint later is a one-file change:

```ts
// lib/a1/auth.ts
export interface Authorizer { headers(): Promise<Record<string, string>> }
export const authorizer: Authorizer = process.env.A1_PUBLIC_MODE === "true"
  ? new NoAuthAuthorizer()          // future: backend ships a public read endpoint
  : new ServiceAccountAuthorizer()  // today
```

### 2.2 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript strict** | Server rendering + ISR + per-page metadata + built-in sitemap/robots. Required by constraint #1. |
| Runtime | Node runtime for routes that touch the token (`export const runtime = "nodejs"`) | Edge runtime complicates token caching. |
| Styling | Tailwind CSS v4 + shadcn/ui | Maps cleanly onto a Figma design system in the later design phase. |
| Validation | **Zod** | The API union types are wide; runtime validation is the only defence against a silent backend change. |
| Data fetching | React Server Components + `fetch` with `next: { revalidate }`. TanStack Query **only** inside the "Load more" client component. | Less JS shipped = better Core Web Vitals = better ranking. |
| Token cache | In-process module singleton + **Upstash Redis** (free tier) | Serverless instances are ephemeral; without shared cache every cold start burns a login. |
| Hosting | **Vercel**, domain `jobs.a1appp.com` | Zero-ops. WordPress on `a1appp.com` stays untouched. |
| Tests | Vitest + fixture JSON captured from the real API | CI must never call the live API. |

### 2.3 Repository layout

```
a1-web/
  app/
    layout.tsx
    page.tsx                     # feed (SSR + ISR 60s)
    jobs/[slug]/page.tsx         # detail (SSR + ISR 300s) — slug = "<kebab-title>-<postId>"
    api/
      feed/route.ts              # "load more" — returns mapped posts + next cursor
      media/[docId]/route.ts     # signed-URL resolver + 302 redirect, cached
      revalidate/route.ts        # webhook for the backend (see 2.5)
    sitemap.xml/route.ts
    robots.ts
    not-found.tsx
  lib/a1/
    config.ts                    # base URL, env parsing (fail fast at boot)
    auth.ts                      # Authorizer interface + ServiceAccountAuthorizer
    client.ts                    # call<T>(method, body) — the ONLY place fetch() touches the API
    schemas.ts                   # Zod schemas mirroring §0.3
    mappers.ts                   # ApiPost -> WebPost (explicit allow-list)
    media.ts                     # MediaDocument -> our /api/media URL
    datasets.ts                  # cached categories/tags lookup tables
  lib/seo/
    jsonld.ts                    # WebPost -> JobPosting JSON-LD
    slug.ts                      # slugify + parse "<title>-<id>"
  types/
    web-post.ts                  # OUR domain type. UI imports only from here.
  components/
    post-card.tsx, post-detail.tsx, filters.tsx, load-more.tsx, empty-state.tsx
  test/fixtures/*.json
```

### 2.4 The anti-corruption layer (most important part of this spec)

The UI must never import a type derived from the OpenAPI schema. Define our own:

```ts
// types/web-post.ts
export type WebPost = {
  id: string
  kind: "hiring" | "seeking"
  title: string
  slug: string
  contentText: string
  contentHtml: string            // sanitised, paragraph-wrapped
  publishedAt: Date              // from `published` ?? `created`
  updatedAt: Date | null
  author: { name: string; username: string | null; avatarUrl: string | null; isAnonymous: boolean }
  location: { city: string; region: string; country: string; display: string } | null
  isRemote: boolean              // location === null  (CONFIRM — see OPEN QUESTIONS)
  categories: { id: number; label: string }[]
  tags: string[]
  salary: { min: number | null; max: number | null; currency: string; period: "MONTH" | "YEAR" } | null
  images: { url: string; width: number; height: number }[]
  links: { title: string; url: string }[]
  viewCount: number
  hasApplyForm: boolean
}
```

Rules:
- `mappers.ts` is the only file that knows both shapes.
- Anything absent from `WebPost` cannot leak. Emails, `flags`, `apply.questions`, raw `author._id` — all deliberately excluded.
- If Zod parsing of one item fails: log the error with the post id, **drop that item**, continue. One malformed post must never 500 the feed.

### 2.5 Sync — "a post created in the app appears on the web"

There is no push mechanism today. Ship in two steps:

**Step A (v1.0, no backend work):** ISR. The feed page carries `revalidate = 60`, detail pages `revalidate = 300`. A new post shows up on the web within ~1 minute. This is the default and it is enough.

**Step B (later, one small backend change):** on-demand revalidation. Ship the endpoint now, unused:

```
POST /api/revalidate
Header: X-A1-Secret: <A1_REVALIDATE_SECRET>
Body:   { "type": "post.new" | "post.update" | "post.delete", "postId": "..." }
-> revalidatePath("/"), revalidatePath(`/jobs/${slug}`), 200
```

The backend already emits `post.new` / `post.update` / `post.delete` events internally (`Event.PostNewEvent` etc. exist in the schema), so wiring a webhook is small. **Do not** build a poller against `events.getUpdates` — that stream is per-user and is the wrong tool for a public site.

### 2.6 Images

`media.getUrl` needs auth and returns a temporary `downloadUrl`. Therefore:

```
<Image src="/api/media/<docId>?size=<size>&ref=<fileReference>" .../>
        └─ our route: resolves via media.getUrl, 302-redirects to downloadUrl,
           Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800
```

Set `trackUsage`/`trackView` to false — website traffic must not pollute in-app analytics. Always emit `width`/`height` (from `MediaDocument.sizes`) to avoid layout shift, which is a ranking factor.

---

## 3. SEO specification (the point of the project)

### 3.1 URLs

```
/                              landing: entry into both feeds, canonical, indexable
/jobs                          Jobs feed (post-job-employing), indexable
/jobs/<kebab-title>-<postId>   one vacancy per page  <- the money page for SEO
/talents                       Talents feed (post-job-seeking)
/talents/<kebab-title>-<postId>  one specialist per page  <- see privacy question below
/jobs?category=12&tag=flutter  filtered feed -> canonical points to /jobs, noindex
/sitemap.xml                   sitemap index
/sitemaps/posts-<n>.xml        max 45 000 URLs each
/robots.txt
```

Filtered/search views must be `noindex, follow` with a canonical to `/`. Google explicitly does not want search-result pages carrying JobPosting data.

### 3.2 Per-page metadata (`generateMetadata`)

- `title`: `"<job title> — <company/author> | A1 Jobs"`, ≤ 60 chars, truncated on word boundary.
- `description`: first ~155 chars of `contentText`, whitespace-collapsed.
- `openGraph` + `twitter` cards, OG image from the post's first media, else a generated fallback (`opengraph-image.tsx`).
- `alternates.canonical`: absolute URL, always.

### 3.3 `JobPosting` JSON-LD — required fields and how we fill them

Verified against Google's current spec (developers.google.com, Aug 2026). **`JobPosting` JSON-LD is emitted on `/jobs/*` pages only.** A Talents page is a person, not a job — emitting `JobPosting` there is a structured-data policy violation. Use `ProfilePage` + `Person` there, or no structured data at all.

| Google field | Required | Source | Risk |
|---|---|---|---|
| `title` | ✅ | `post.title` | Must be the job title only — no company name, no salary, no emoji. Strip them. |
| `description` | ✅ | `contentHtml` | **Highest risk.** Google wants full responsibilities/qualifications/skills in HTML. A1 posts are short free text. See §3.5. |
| `datePosted` | ✅ | `published ?? created`, ×1000, ISO 8601 | Seconds→ms bug kills this. |
| `hiringOrganization` | ✅ | `author.fullName` + `sameAs: <A1 profile URL>` | A1 authors are *users*, not verified companies. Acceptable, but see OPEN QUESTIONS. |
| `jobLocation` | ✅ (unless remote) | `location.city / adm_level_1 / country` as `PostalAddress` with `addressCountry` | `location` is often `null`. |
| `jobLocationType` | remote only | `"TELECOMMUTE"` when `location === null` | Only if the post is truly 100% remote, and the description must say so. Do not guess. |
| `applicantLocationRequirements` | remote only | at least one `Country` | Needed whenever `TELECOMMUTE` is set. |
| `validThrough` | recommended | **no such field in the API** | Policy: `published + 60 days`. After that the page returns `410 Gone` and drops the JSON-LD. Decision needed. |
| `baseSalary` | recommended | `money` union → `MonetaryAmount` with `currency`, `value` (`QuantitativeValue` with `minValue`/`maxValue`/`unitText`) | `Money.Range` → min/max; `*Annual` variants → `unitText: "YEAR"`, others `"MONTH"`. Omit entirely when `money === null` — never emit a zero salary. |
| `employmentType` | recommended | derived from `tags` | Requires a tag→enum mapping table. See OPEN QUESTIONS. |
| `identifier` | recommended | `{ "@type": "PropertyValue", name: "A1", value: post._id }` | |
| `directApply` | recommended | `false` for v1.0 | We send people to the app; applying is not possible on the web. Setting `true` without a web apply flow is a policy violation. |

### 3.4 Expiry handling

Google requires expired jobs to be removed. Implement:
- `validThrough = publishedAt + 60 days`.
- Detail page for an expired post: still renders for humans (with an "This vacancy is no longer active" banner), returns `noindex`, and omits the JSON-LD block.
- Deleted post (`posts.get` returns `PostEmpty`): return **410 Gone** via `notFound()` plus a custom 410 handler, not a soft 200.
- Expired/deleted posts are excluded from the sitemap.

### 3.5 The honest risk you must plan around

Google Jobs rewards unique, substantial, structured job descriptions from identifiable employers. A1's current content is short, user-written, and — for seeded vacancies — copied from other boards. Consequences:

1. **Do not publish scraped/seeded vacancies on the web.** Duplicated postings at best get ignored, at worst damage domain trust. This was already decided; now it must be enforced in code by a filter. The blocker: *the API exposes no field that says "this post is native vs. seeded"* (see OPEN QUESTIONS #1).
2. **Thin descriptions will underperform.** Mitigation for a later phase, not v1.0: prompt the employer inside the app to add responsibilities/requirements sections, and/or render a structured section from `categories`/`tags`/`money` to enrich the page.
3. **Expect a slow start.** With few native posts, the site will be small. That is fine — the architecture must be right first; volume follows the seeding strategy.

---

## 4. Delivery phases

Each phase = one PR, deployable, reviewable by a non-developer via a URL.

### Phase 0 — Plumbing (no UI)
- `create-next-app` (TS, App Router, Tailwind, ESLint), strict mode on.
- `lib/a1/config.ts`: parse `A1_API_BASE`, `A1_SERVICE_EMAIL`, `A1_SERVICE_PASSWORD`, `A1_REVALIDATE_SECRET`, `UPSTASH_*` with Zod; **throw at boot** if missing.
- `lib/a1/auth.ts` + `client.ts`: login, cache, refresh-on-401-and-retry-once, 10s timeout, structured errors.
- `lib/a1/schemas.ts` + `mappers.ts` + `types/web-post.ts`.
- A `pnpm smoke` script that prints the titles of 5 posts.
- Capture 3 real API responses into `test/fixtures/`.
- **Done when:** the smoke script prints real titles and `tsc --noEmit` is clean.

### Phase 1 — Feed
- `app/jobs/page.tsx`, RSC, `revalidate = 60`, `posts.search { limit: 20, object: "post-job-employing" }`. Build Jobs first; `/talents` is the same component with `object: "post-job-seeking"` and ships in the same phase once Jobs works.
- `PostCard`: title, company/author, location or "Remote", salary, relative date, tags.
- `/api/feed` + `LoadMore` client component using the `next` cursor.
- Empty state, error boundary, loading skeleton.
- **Done when:** the deployed feed shows real vacancies and "Load more" works.

### Phase 2 — Detail page + structured data
- `app/jobs/[slug]/page.tsx`; parse the id out of the slug; if the slug does not match the canonical slug → 301 redirect to the canonical one.
- `generateMetadata`, canonical, OG image.
- `lib/seo/jsonld.ts` per §3.3; render in a `<script type="application/ld+json">`.
- 410 / expired handling per §3.4.
- **Done when:** Google's Rich Results Test passes with zero errors on 3 real vacancies.

### Phase 3 — Media + filters
- `/api/media/[docId]` proxy + `next/image` custom loader; add the media host to `next.config` `images.remotePatterns`.
- Filters from `dataset.postCategories` / `dataset.postTags`, driven by URL `searchParams` (shareable links), `noindex` on filtered views.
- Free-text search via `q`.
- **Done when:** images render with no layout shift and filters survive a page reload.

### Phase 4 — SEO plumbing
- `sitemap.xml` index + chunked `posts-<n>.xml`, `revalidate = 3600`, excluding expired/deleted.
- `robots.ts`.
- Google Search Console verification file/meta.
- `/api/revalidate` webhook (secret-protected).
- Basic analytics (Vercel Analytics or Plausible — no cookie banner needed for Plausible).
- **Done when:** the sitemap is submitted in GSC and the first pages are indexed.

### Phase 5 — Design pass *(separate future session)*
Figma design system + reference-driven visual design. Until then keep the UI deliberately plain: system font stack, one accent colour (brand gradient `#4F71EB → #C830FF`), generous whitespace. Do not invest in visual polish before phase 5 — it will be thrown away.

---

## 5. Rules for the implementing agent

1. **Never invent an endpoint.** Only the 121 documented `POST /v1/*.*` methods exist. If something seems missing, add it to OPEN QUESTIONS instead of guessing.
2. **Every API response passes through Zod** before use. No `as any`, no non-null assertions on API data.
3. **`fetch()` against api.a1appp.com appears in exactly one file:** `lib/a1/client.ts`.
4. **No secret in a client component.** If a file has `"use client"`, it may not import from `lib/a1/`.
5. **Timestamps are seconds.** Every conversion goes through one helper, `fromUnixSeconds()`.
6. **A single bad post never breaks a page.** Parse failures are logged and skipped.
7. Before declaring a phase done, push and confirm the **Vercel build is green** (see §0.4 — no local build is possible). Report the deployment URL and the build status.
8. Tests hit fixtures, never the live API. (Test tooling only lands once the registry is reachable from a build; until then, keep fixtures and pure mapper functions ready.)
9. Commit messages: `phase-N: <what>`. One phase per branch.
10. When a decision is ambiguous, choose the option that produces more server-rendered HTML.

---

## OPEN QUESTIONS — for the backend developer (blocking, in priority order)

1. **How does the web tell a natively-created post from a seeded/scraped one?** Is it encoded in the `flags` bitmask? A dedicated category? The author account? *(Founder's interim call: publish everything, filter stubbed but off — see §0.5. Still worth answering.)*
2. **What are the `flags` bits on `Resource.Post`?** Need the full mapping (hidden / reported / promoted / seeded / …).
3. **Is `location === null` the same as "remote"?** *(Founder's interim call: yes, treat as remote — see §0.5. Confirm before launch, it affects structured data validity.)*
4. **Employment type (full-time / contract / part-time)** — which tag ids or category ids carry it? Needed for `employmentType`.
5. **`dataset.postTags` returns keys for `post-brainstorm`, `post-collaborator`, `post-job-seeking`, `post-meetup`, `post-supplier-b2b` — but not `post-job-employing`.** Is that a bug, or do hiring posts share the job-seeking tag set?
6. **Can we get a service account** whose reads do not pollute `viewCount` and in-app analytics? And can rate limits accommodate a website (sitemap generation may page through everything hourly)?
7. **Post expiry:** is there any concept of a vacancy closing? If not, is `published + 60 days` an acceptable `validThrough` policy?
8. **Webhook** on `post.new` / `post.update` / `post.delete` → `POST https://jobs.a1appp.com/api/revalidate` with a shared secret. How long to implement?
9. **Long term:** would you add an unauthenticated, field-restricted `posts.search` (published posts only, no author emails)? That removes the service-account workaround entirely.

## OPEN QUESTIONS — for the founder

- Confirm the subdomain: `jobs.a1appp.com` (recommended) vs `a1appp.com/jobs` (would require WordPress reverse-proxy rules — avoid).
- **Answered:** both live types ship — Jobs (`post-job-employing`) and Talents (`post-job-seeking`), as two separate feeds, mirroring the app.
- **Still open — privacy of the Talents feed.** In the app a candidate post is seen by logged-in users; on the web it becomes a permanent, Google-indexed page carrying a real person's name, photo and what they are looking for, findable by their current employer. Decide one of: (a) index Talents fully, (b) publish Talents pages but mark them `noindex` so they work as shareable links only, (c) make web visibility an explicit opt-in toggle in the app profile, (d) show Talents on the web without the author's name/photo. Recommendation: **(b) for launch, (c) as the real answer.** This is also a GDPR-shaped question, not only a product one.
- Languages at launch: English only, or English + Ukrainian with `hreflang`? (Adds ~1 phase.)

---

## 6. Stage 2 — Sign-in & Web Publishing (planning only, not yet built, 2026-08-28)

Aleksandr's own framing, kept close to verbatim because the order matters:
reading (feed + profiles) stays exactly as open as it is today, no sign-in
required. Sign-in is required only to publish. Whatever gets created on the
web (a vacancy, a profile) must appear in the app identically — same
fields, same data — because both surfaces hit the same backend. Master
sequence: **auth → profile → publish button → parity check.**

This section is planning, grounded in the live API (verified against
`https://api.a1appp.com/openapi.json` on 2026-08-28, same source PLAN.md
§0 already cites) — not a build. Nothing in §0–§5 above changes: the
public feed/detail pages keep the exact ISR/no-cookies architecture they
have today. Stage 2 adds a new, separate slice of the site (sign-in,
profile editor, post editor) that is allowed to be dynamic, because it
has to be — a signed-in session cannot be served from a shared ISR cache.

### 6.1 Ground truth (verified against the live OpenAPI spec, 2026-08-28)

| Endpoint | Request (required fields unless noted) | Response `data` |
|---|---|---|
| `auth.google` | `{ token }` — a Google ID token | same shape as `auth.email`: `{ userId, expiresAt, accessToken, refreshToken }` |
| `auth.appleId` | `{ token }` — an Apple identity token | same as above |
| `auth.email` | `{ email, password }` | `{ userId, expiresAt, accessToken, refreshToken }` |
| `users.createUser` (email/password sign-up) | `{ email, firstName, lastName, password, ... }` — the rest of the profile fields are accepted here too but only these three plus password are required | `{ user, accessToken, refreshToken }` — **signup logs you in directly, no separate `auth.email` call needed after** |
| `account.updateProfile` | no fields required — send only what changed. Full field surface: `email, firstName, lastName, phoneNumber, occupation, username, voiceIntroduction, photos, expertise, lockingFor, helpfulWith, password, skills, links, languages, workInterests, hobbies, companies, education, favoriteBooks, favoriteMovies, favoriteGames, workStylePreferences (14 sub-axes), bio, location, dob, showDob, showPhoneNumber, showEmailAddress, metadata` | updated user |
| `account.checkEmail` / `account.checkUsername` | public, no auth — meant to be called live while someone fills in a sign-up form | availability boolean |
| `account.verifyEmail` / `account.verifyEmailConfirm` | exists — email verification is a real flow, not assumed | — |
| `posts.createPost` | `{ input }`, a discriminated union (`Resource.PostInput`) across 6 post types. For `post-job-employing`/`post-job-seeking`: **required** `title, content, links, location, media, money, object, tags, categories`. Optional: `hideAuthor, premiumPinDays, premiumHighligh(t), scheduled, draft, apply` | the created `Resource.Post` |
| `posts.updatePost` | `{ id, input }` — same `PostInput` shape | updated post |
| `posts.deletePost` | `{ id }` (not yet inspected past existence) | — |
| `upload.create` | `{ mimetype, bytes, flags?, ttlSeconds?, attributes? }` | **either** `Resource.MediaUploadDestination` `{ id, url, fields }` — a presigned-POST target, upload the file bytes straight from the browser to `url` with `fields`, never through our server — **or** `Resource.MediaUploadUsage` `{ limitBytes, usedBytes, remainingBytes, usedByType, resetAt }` when the account is over its media quota |
| `upload.confirm` | `{ documentId }` (the `id` from `upload.create`) | the finalized `MediaDocument` — same shape `lib/a1/mappers.ts` already maps on the read side |

`location` on a post is a `WorldLocation._id` (resolve via `locations.search`,
already built for the feed filters) or `null`. `money` is the same
`Money.Single / SingleAnnual / Range / RangeAnnual` union as the read side
(PLAN.md §0.3) — the "post a vacancy" form's salary section needs to
produce one of those four shapes, not a simplified one, or app-side
rendering of a web-created post will hit a case it doesn't handle.

### 6.2 The architecture problem this creates

Every page in the app today (§2.1) is built around **zero user sessions**:
one shared service-account token, server-side only, ISR everywhere, no
`cookies()`/`headers()` anywhere in the render path — that's *why* `/` and
`/talents` can revalidate on a timer instead of rendering per-request.
Stage 2 introduces a second, different kind of authorization: a real
visitor's own `accessToken`/`refreshToken`, which has to live somewhere
between requests (a cookie — there is no other option for a browser
across page loads) and has to be read to answer "is this visitor signed
in," which is a per-request, dynamic question.

Rule to hold the line on: **only the new sign-in/profile/post-editor
pages become dynamic. The public feed and detail pages do not change.**
`lib/a1/auth.ts` already anticipated exactly this split — its
`Authorizer` interface (§2.1) was designed so a second implementation
(a per-user, cookie-backed one) can sit next to
`ServiceAccountAuthorizer` without touching any of the read-side code
that uses the service account today.

Concretely, still to be designed (implementation, not this section):
session cookie contents and lifetime (httpOnly + Secure at minimum),
where the refresh-before-`expiresAt` + retry-once-on-401 logic already
proven for the service account (§2.3 step 2) gets reused for per-user
tokens, and the URL scheme for the new pages (a `/sign-in` page, a
profile editor, a post editor — exact routes not yet decided).

### 6.3 OAuth setup — needs Aleksandr in two consoles before any code can work

Sign-in *code* can be written now; it cannot be *tested* until these
exist, because Google and Apple both tie a token to the exact origin/app
that requested it:

1. **Google.** Web Sign-In needs an OAuth 2.0 Client ID of type "Web
   application" in Google Cloud Console, with `https://jobs.a1appp.com`
   listed under Authorized JavaScript origins. This is almost certainly
   a *different* client ID than whatever the mobile app uses (mobile
   Google Sign-In uses an Android/iOS-type client, not a Web-type one) —
   check whether one already exists for any other web property before
   assuming a new one is needed.
2. **Apple.** Sign in with Apple on the web needs a Services ID
   (distinct from the app's Bundle ID) registered in the Apple Developer
   portal, the domain verified via a domain-association file hosted at a
   specific path, and a Return URL configured. Native iOS Sign in with
   Apple does not need any of this, so it is very unlikely to already
   exist.
3. **Backend confirmation needed either way** — see OPEN QUESTIONS below:
   does `auth.google`/`auth.appleId` accept ID tokens from more than one
   client ID per platform, or does adding a web client require a backend
   change too?

**2026-08-28, answering Aleksandr's question "will the web client tie in
with the app, so accounts/posts cross without errors?" — verified against
Google's and Apple's own docs, not assumed:**

There is only one backend and one users table — a post or a profile
created through the web *is* an app-visible record already, by
construction, regardless of which OAuth client mediated the sign-in that
created it (same for email/password: `auth.email`/`users.createUser` are
the one shared login, no separate "web accounts"). The one real risk is
narrower than "will it tie in at all" — it's specifically whether signing
in with the SAME Apple/Google account through the NEW web client
resolves to the SAME user record as signing in through the app's
existing client, or a second, orphaned one. Two separate things have to
be true for that:

- **Google:** the ID token's `sub` (the stable per-user identifier —
  Google's own guidance: "unique and stable among all Google Accounts and
  never reused") is scoped to the *Google Cloud project*, not the
  individual OAuth client. Google's own recommended structure is exactly
  "a separate OAuth client for each platform (Web, Android, iOS), all
  within the same Google Cloud project" ([Best Practices for Sign in with
  Google](https://developers.google.com/identity/siwg/best-practices)) —
  so **the new web client must be created in the same GCP project as the
  app's existing Google client**, not a new project, or the same person
  gets two different `sub`s on web vs. app.
- **Apple:** does NOT default to a shared identifier — a Services ID
  created standalone gets its own `sub` space. Apple's own instructions:
  "you must create a Services ID and **associate your website to an
  existing primary iOS/macOS/tvOS/watchOS App ID** enabled for Sign in
  with Apple" ([Configure Sign in with Apple for the
  web](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web))
  — doing that association is what makes the same Apple ID return the
  same stable identifier on web and in the app. **This has to be an
  explicit choice while creating the Services ID**, not the default.

Neither of these is a code problem — both are console configuration, and
both are exactly the two things to double-check while doing OPEN
QUESTIONS #1-2 below: create the web client *inside* the app's existing
Google Cloud project, and *associate* (don't stand up standalone) the
web Services ID with the app's existing App ID.

That still leaves the backend side: even a correctly-configured client
produces a token whose `aud` (audience) claim is the new web client's ID,
not the app's. If `auth.google`/`auth.appleId` on the backend verify
the token against one hardcoded audience, a correctly-configured web
token still gets rejected at the verification step, before `sub` even
matters — this is OPEN QUESTION #1 for Andrew below, and it doesn't
resolve itself just by getting the console setup right.

### 6.4 Scope question the form-building depends on

`account.updateProfile`'s field list (6.1) is the same ~25-field, 14-sub-axis
surface the app's own profile editor exposes. Building all of it in one
pass is a large form. Whether "adding a profile" (Aleksandr's step 2)
means that whole editor, or a minimal subset (name, occupation, bio, one
photo) with the rest deferred, changes the size of phase 6 by a lot —
flagged as OPEN QUESTIONS #4 below rather than guessed at.

### 6.5 Data-parity is satisfied by construction, with one caveat

Because both the app and the web would call the exact same
`posts.createPost` / `account.updateProfile` endpoints against the same
backend, a post or profile created on the web is not a copy that could
drift from the app's version — it *is* the same record. The only way to
break Aleksandr's "must appear in the app identically" requirement is to
invent a web-only field, skip a required one with a fabricated default,
or map a value into the wrong shape (e.g. a simplified salary that isn't
actually a valid `Money` variant). Rule for phase 6/7: **the web form's
fields are exactly the API's fields — no more, no less** — the same
anti-corruption-layer discipline §2.4 already applies to the read side,
mirrored outbound.

### 6.6 Proposed phased delivery (mirrors §4's phase style — not started)

- **Phase 5 — Sign-in only.** **Split in two, 2026-08-28** — Andrew
  confirmed the backend hard-codes one client ID per platform for
  `auth.google`/`auth.appleId` (§6.7), so Google/Apple cannot pass on the
  web until that changes, on no timeline yet.
  - **Phase 5a — ships now:** email+password only. A session, "signed
    in as X" in the nav. No profile editing, no publishing yet —
    smallest possible slice to prove the session architecture (6.2)
    before building any form on top of it.
  - **Phase 5b — ships once §6.7's backend change lands:** add Google
    and Apple as additional sign-in options on the same session
    infrastructure Phase 5a already built. The client-side buttons/SDK
    wiring can be built alongside 5a; only the final backend round-trip
    is blocked.
- **Phase 6 — Profile create/edit.** **Decided (2026-08-28): minimal
  fields first** — name, `occupation`, `bio`, one photo. The rest of
  `account.updateProfile`'s surface (skills, languages, favorites, the
  14 work-style axes, etc.) is explicitly deferred to a later phase, not
  built now.
- **Phase 7 — Post publish/edit/delete.** Jobs first, same
  Jobs-before-Talents order as Phase 1, including the direct-to-storage
  image upload flow (6.1's `upload.create`/`upload.confirm`). **Decided
  (2026-08-28): no moderation step** — a web-created post goes live
  immediately, exactly like an app-created one. **Decided: the existing
  feed/detail pages are not touched in this phase** — no "my posts"
  list, no edit/delete buttons on the public pages yet. A signed-in
  visitor's only new surface is the separate sign-in/profile/post-editor
  flow from Phases 5-7; revisit once that flow itself needs a "my
  posts" entry point.
- **Phase 8 — Parity pass.** Create a post on web, confirm it renders
  correctly in the app; edit a profile on web, confirm the app shows it;
  and both directions the other way.

### 6.7 Andrew's answer: the client-ID check is hard-coded (2026-08-28)

His words: **"У нас жесткая привязка к client id. Веб вообще не
планировался в том обозримом будущем."** Direct consequence: today,
literally no ID token from a new web OAuth client will pass
`auth.google`/`auth.appleId` — not a config problem on our side, a
backend code path that only ever expected one client ID per platform.
Getting the Google Cloud project and Apple Services ID set up correctly
(§6.3) is still necessary but is no longer sufficient by itself.

**This is very likely a small change, not a redesign.** Verifying a
Google or Apple ID token against a *list* of accepted client IDs instead
of a single hard-coded one is the standard, well-supported shape of this
check — both platforms' own verification libraries accept an array of
audiences out of the box (this isn't a workaround, it's the documented
way to support multiple client IDs per platform). Worth relaying back to
Andrew in exactly those terms, so the ask lands as "swap one constant for
a short list" rather than an open-ended architecture change — likely
easier to prioritize on a Friday than it might have sounded from the
original question.

**Impact on delivery (see revised Phase 5 below): email+password sign-in
is entirely unaffected — `auth.email`/`users.createUser` were never
part of this restriction — so it ships on its own, and Google/Apple
follow once his change lands, on whatever timeline he gives.**

### 6.8 Andrew confirmed the fix, same evening: "Client id можно добавить"

Resolved, not just hoped for — he agreed to add a client ID, framed
exactly as the small addition §6.7 described. **This is no longer
blocked on Andrew; it's now blocked on our own sequencing:**

1. Aleksandr creates the web Google OAuth client (in the app's existing
   GCP project, §6.3) and the web Apple Services ID (associated with the
   app's existing App ID, §6.3).
2. Sends Andrew the two resulting client IDs.
3. Andrew adds them to the accepted list.
4. Only then can Phase 5b's Google/Apple sign-in be tested end-to-end —
   the client-side code (buttons, SDK wiring) can still be built before
   that, same as §6.7 already said.

Phase 5a (email+password) has no dependency on any of this and can
proceed immediately regardless of where steps 1-3 are.

### 6.9 Google web OAuth client: found, configured, published (2026-08-28)

Turned out step 1 of §6.8's list was already half-done: Firebase had
auto-created a **Web application**-type OAuth client in the app's own
GCP project (`a1-app-9aaf1`, account `aonesoftdev@gmail.com`) back on
2026-08-26, when Google sign-in was set up for the app. Same project as
the existing Android/iOS clients — which is exactly the requirement
from §6.2/§6.5, since Google's `sub` (the stable per-user id) is scoped
per *project*, not per client. No new client needed creating; it needed
finishing:

- Added `https://jobs.a1appp.com` to its Authorized JavaScript origins
  (was missing — only `localhost` and the Firebase default domain were
  there).
- The consent screen ("Google Auth Platform" in Cloud Console) had no
  scopes declared and no App name/support-email/home-page/privacy-policy
  filled in, which blocked publishing. Declared the three basic scopes
  (`openid`, `userinfo.email`, `userinfo.profile` — same ones the app
  already asks for), and filled in home page (`https://a1appp.com`) and
  privacy policy / terms of service link (`https://a1appp.com/privacy-policy`,
  which already covers both).
- Published the consent screen from **Testing → In production.** Basic
  scopes only, so no Google verification review was required (Google's
  own publish-confirmation dialog confirmed this). Before this, only
  ~100 explicitly-added test accounts could have completed sign-in on
  the web at all — this was a real, separate blocker from the client-ID
  allow-list Andrew is fixing.

**Client ID to send Andrew:**
```
954420352634-d2s57so6b7gkk31q5uffl2vtku1vgdeb.apps.googleusercontent.com
```

Apple Services ID (§6.3, §6.8 step 1's other half) is done too — see §6.10.

### 6.10 Apple Services ID: created, configured (2026-08-28)

Same shape as §6.9, done live in Apple Developer (team "A-ODYN, TOV",
Aleksandr's own Apple Developer account). The app's
existing App ID (`com.aone.aoneapp`) already had **Sign In with Apple**
enabled as a primary App ID — nothing to change there.

Registered a new **Services ID** (Apple's equivalent of a Web OAuth
client — this is what appears as `aud` in the ID token, same role as
Google's client id):

```
com.aone.aoneapp.web
```

Configured for Web Authentication:
- **Primary App ID:** `com.aone.aoneapp` (the app's own) — this is what
  makes Apple treat a web sign-in as the same app family; without this
  link a web sign-in would be a fully separate, unrelated identity.
- **Domains and Subdomains:** `jobs.a1appp.com`
- **Return URLs:** `https://a1-app-9aaf1.firebaseapp.com/__/auth/handler`
  — same Firebase generic OAuth handler already registered as the
  redirect URI on the Google web client (§6.9), on the assumption the
  web sign-in buttons will go through the Firebase Auth JS SDK
  (`signInWithPopup` + `GoogleAuthProvider`/`OAuthProvider('apple.com')`)
  rather than hand-rolled OAuth — matches the pattern already set up for
  Google. **Flag if the implementing agent goes a different route.**

**Noticed but left alone:** a second, older Services ID already existed
(`com.aone.aoneapp.signin`, description "Sign in with AppleID") with
Sign In with Apple *not* enabled — looked unfinished/unused. Didn't
touch or delete it, history unknown; new work uses `com.aone.aoneapp.web`
instead.

**Not done yet (optional, deferred):** Apple's setup flow also offers a
"Create Key" step and a "Register Email Sources for Communication"
step. Per Apple's own UI copy, these are specifically for supporting
Apple's *Private Email Relay* (so the backend can email a user who chose
to hide their real email from Apple). Not needed to get basic sign-in
working — revisit only if/when we need to email users who used Apple's
hide-my-email option.

**Identifier to send Andrew, same purpose as the Google client id
(§6.9) — the value his backend needs to add to `auth.appleId`'s accepted
audience list:**
```
com.aone.aoneapp.web
```


### 6.11 Andrew: Google needs no backend change at all (2026-08-28)

Sent him the Google web client id from §6.9. His reply: **"Такой уже
добавлен, Ниджат просил для андроида. Видимо он и для веба годится."**
("Already added — Nijat asked for it for Android. Looks like it works
for web too.")

**Why this makes sense, not just luck:** on Android, Google Identity
Services does not let the app request an ID token audienced to its own
Android client id — the documented pattern (`GetSignInWithGoogleOption
.Builder(serverClientId)` / `idTokenRequestOptions.setServerClientId()`)
requires passing the project's **Web application** client id even for a
native Android sign-in. So whoever set up Google sign-in for the
Android build (per Andrew, a dev named Nijat) would have had to ask for
this exact Web client id to be whitelisted already — before Stage 2
existed. It's the *same* client (§6.9), not a coincidence.

**Consequence: Google sign-in on web needs zero backend changes.** The
audience check Andrew described in §6.7 already accepts this id. Once
the client-side button/SDK code (§6.6 checklist item 3) is written and
wired to this same web client, Google login can be tested end-to-end
immediately — no more waiting on Andrew for Google specifically.

Apple is unaffected by this — Services IDs don't have an Android-style
shared-audience trick, so `com.aone.aoneapp.web` (§6.10) still needs to
be added to `auth.appleId`'s accepted list before Apple sign-in works.


### 6.12 Phase 5a implemented: email+password sign-in (2026-08-28)

Built the "smallest possible slice" from §6.6's Phase 5a — a real
session, "signed in as X" in the nav, nothing else yet (no profile
editing, no publishing, no Google/Apple buttons — those are Phase 5b/6/7).
Not yet pushed/verified on Vercel (this repo's only build/type-check
environment, §0.4) — that's the next step, not a claim this is confirmed
working end-to-end.

**New files:**
- `lib/a1/session.ts` — the session primitive. Deliberately a *sibling*
  to `lib/a1/auth.ts`, not a second implementation of its `Authorizer`
  interface: that module is a per-warm-instance singleton speaking for
  one shared service account (§6.2 already ruled this out for per-
  visitor state — a signed-in visitor's tokens can't live in a
  module-level cache shared by every visitor hitting that instance).
  Two cookies, split by trust level: `a1_session` (httpOnly — the real
  `accessToken`/`refreshToken`, read only in Route Handlers or a future
  dynamic page) and `a1_user` (plain — just the email, so the nav can
  show "signed in as X" from a client-side read without ever calling
  `cookies()`/`headers()` in a shared render path — the same constraint
  §6.2 already put on this whole phase, to keep the ISR'd feed/detail
  pages exactly as they are). Same two-tier pattern this codebase
  already uses for `a1_geo` (`middleware.ts`) and the theme/lang
  anti-flash cookies (`app/layout.tsx`). **Deliberately unsigned** for
  this phase — editing your own `a1_session` cookie can only break your
  own login (the API validates the real tokens on every call, same as
  the app does); there's no cross-user risk to sign against yet.
- `app/api/auth/sign-up/route.ts`, `app/api/auth/sign-in/route.ts` —
  call the two documented public endpoints from §6.1 as-is
  (`users.createUser`, `auth.email`) with Zod-validated bodies, set the
  session cookies on success. No invented endpoints, no new required
  env vars (`A1_API_BASE` already existed).
- `app/api/auth/sign-out/route.ts` — clears both cookies, no backend
  call. §6.1's ground truth has no documented revoke endpoint, and §5's
  rule 1 says never invent one against the 121 known methods — a
  forgotten cookie is a sufficient "sign out" at this phase.
- `app/sign-in/page.tsx` — one combined sign-in/sign-up form, all 9
  locales, reusing `--color-accent`/`--radius-card` and the input
  styling already established in `components/filters-form.tsx`.
  Deliberately plain — §4 Phase 5 (the *visual* design pass, a different
  "Phase 5" than this one) is a separate future session; no point
  polishing a page likely to be restyled then.
- `components/account-menu.tsx` — the nav's "Sign in" link (signed out)
  or email + "Sign out" (signed in), mounted next to `<SettingsMenu>` in
  `components/site-nav.tsx`. Reads `a1_user` client-side only, same
  reason as the cookie split above.

**Modified:** `lib/a1/client.ts` — added a `.detail` getter to
`A1ApiError` for best-effort human-readable error extraction (looks for
a plain-string `message`/`error` field, returns `null` otherwise — §0's
ground truth is explicit that 400/401/500 are declared with no schema,
so this is a debugging aid, never something the sign-in page's copy
relies on for correctness).

**Deliberately deferred, not forgotten** (tracked as open question 3
below): no email verification before sign-in works, no client-side
"is this email already taken" check before submitting sign-up, no
password-strength rule beyond "non-empty" — all pending Aleksandr's
answer on what the backend actually requires/offers.

**Navigation after sign-in/up/out is a full page load**
(`window.location.href = "/"`), not client-side routing — chosen so
`AccountMenu` (which reads its cookie once on mount, by design) remounts
and picks up the fresh state, without building a shared auth context/
event bus for a phase this small.

**First Vercel build failed — fixed same day.** `npm run build` errored:
`components/account-menu.tsx` (a client component) imported the
`DISPLAY_COOKIE` string constant from `lib/a1/session.ts`, but that file
also does `import { cookies } from "next/headers"` — a server-only API.
Importing anything from a module drags the whole module into whichever
bundle imports it, so the client bundle tried to include `next/headers`
and Next.js correctly refused to build. Fixed by moving just the two
cookie-name constants into a new `lib/a1/session-constants.ts` with no
other imports at all; `lib/a1/session.ts` (server) and
`components/account-menu.tsx` (client) both import the names from there
now. Confirms §0.4's rule in practice — this class of error is exactly
why a green Vercel build, not a local read of the diff, is the real
check.

**Second Vercel build attempt also failed, different cause — fixed same
day.** Once the `next/headers` issue above was fixed, the build got
further and hit a real `tsc` type error: `tsconfig.json`'s
`noUncheckedIndexedAccess` (already on for this whole project) makes
`SOME_TABLE.knownKey[lang]` a type error whenever `SOME_TABLE` is typed
as `Record<string, ...>` — a generic `string` key is an index signature,
and with that flag on, TypeScript treats every lookup through one as
possibly missing, even for a key that's always there. Three of this
session's new locale-string tables (`app/sign-in/page.tsx`,
`components/account-menu.tsx`, `components/google-sign-in-button.tsx`)
were typed exactly that way. The codebase already has the fix
established in `components/filters-form.tsx` — type the table as
`Record<SomeLiteralKeyUnion, Record<Locale, string>>` instead of
`Record<string, ...>`, so every key is a real, always-present property
instead of an index-signature guess. Reused that convention rather than
inventing a different one; `components/settings-menu.tsx` instead
handles it with an optional-chaining accessor function
(`SETTINGS_MENU_STRINGS[key]?.[lang] ?? ""`) — either fix is valid, the
literal-union one was picked here as the closer match to how these three
files were already written.

### 6.13 Phase 5b (Google): sign-in button implemented (2026-08-28)

Google is the one OAuth path already fully unblocked (§6.11 — the
backend needs no change), so it went first, ahead of Apple which is
still waiting on Andrew.

**New files:**
- `lib/a1/oauth-public.ts` — holds `GOOGLE_WEB_CLIENT_ID` (the id from
  §6.9), the one OAuth-related value that's *supposed* to be public and
  shipped in client JS (Google's own design — there's no client secret
  in this flow). Deliberately separate from `lib/a1/config.ts`, which
  throws if ever imported client-side because it holds real secrets.
  Inlined as a plain constant rather than a `NEXT_PUBLIC_` env var —
  it's not sensitive, and this avoids one more thing to configure on
  Vercel.
- `components/google-sign-in-button.tsx` — renders Google's own "Sign in
  with Google" button via Google Identity Services (a `<script>` tag,
  `google.accounts.id.initialize`/`renderButton`), not the Firebase Auth
  SDK. Verified against Google's own JS reference docs (2026-08-28,
  not assumed): the button's callback receives a `CredentialResponse`
  whose `.credential` is the ID token JWT — that's what gets POSTed to
  the new route below. No new npm dependency (can't install one anyway,
  §0.4) and no Firebase project config needed, unlike Apple's flow will
  require (Apple's redirect-based sign-in needs a real callback
  endpoint; Google's popup/One Tap flow talks to the browser directly
  and doesn't).
- `app/api/auth/google/route.ts` — same shape as the email sign-in
  route: forwards the token to `auth.google` (PLAN.md §6.1), sets the
  same two session cookies. Since `auth.google`'s response has no email
  field, the display cookie's email comes from decoding (not
  re-verifying — `auth.google` is what actually validates the token)
  the `email` claim out of the same JWT already sent.

**Wired into `app/sign-in/page.tsx`** below the email/password form,
behind an "or" divider — visible immediately, not gated on Apple being
ready.

**Third Vercel build attempt also failed, same root cause as the
`noUncheckedIndexedAccess` one above, one spot missed.**
`components/account-menu.tsx`'s `readDisplayCookie()` did
`decodeURIComponent(match[1])` — a regex capture group, which this flag
also types as possibly `undefined` (same rule, different kind of
indexing: an array/tuple index, not an object key this time). Fixed with
an optional-chain read (`match?.[1]`) plus a truthy check before
decoding. Audited every other new file in this phase for the same
pattern (`[0]`/`[1]` indexing, `.match()`/`.split()` results) after this
one — nothing else found.

**Pushed and verified green on Vercel (commit `fa169a3`)** after three
build-failure fixes above, all mechanical consequences of this
project's existing strict tsconfig, not a design problem with Stage 2
itself. Manually confirmed at `jobs.a1appp.com/sign-in`: the email/
password form renders, and the Google button renders too — it already
recognized an active Google session in the browser it was checked from
and offered "Continue as ..." with that account's name/photo, which
means Google Identity Services is correctly wired to the real web
client id end to end. Not yet exercised — sign-up, sign-in, and the
Google button's full round trip through `auth.google` still need an
actual test pass by Aleksandr.

### 6.14 Manual test passed + UI polish + mobile nav fix (2026-08-28)

**Manual sign-up confirmed working end-to-end in production.** Aleksandr
signed up for real as `dewalaj262@neowd.com` and it went through — the
first live proof that Phase 5a's session/cookie architecture (§6.12)
actually works outside of my own testing, not just a green build.

**Follow-up request, not yet built: email verification.** Aleksandr's
own words: "надо добавить чтобы присылало код наверное, или какой-то
вариант верификации имейла" (send a code, or some verification flow).
This is exactly open question 3 below, now confirmed as wanted rather
than hypothetical — needs its own design pass before coding (when is
the code sent — at sign-up or before first publish; is it required to
use the account at all, or just to publish; does `account.verifyEmail`
already do what's needed, per that open question). Not started.

**Reported bug, reproduced and fixed: "Sign in" didn't fit on mobile.**
Aleksandr: "надо поправить на мобильной версии, а то sign in не
влазит." Reproduced live (Chrome resized to 375x700) rather than
guessed, per this project's own rule — at that width, several locales'
nav text (e.g. Spanish "Iniciar sesión") visibly collided with the
centered pill nav and `<SettingsMenu>`'s button. Root cause:
`components/site-nav.tsx` centers the tab pill absolutely over the flex
row, so the left/right groups can't push it out of the way — on a
narrow viewport there's very little room left on the right for
`<AccountMenu>`.

Fix, in `components/account-menu.tsx`: icon-only below `sm:` (a new
`h-9 w-9` circular button matching `<SettingsMenu>`'s own style exactly,
so the two sit as a matched pair), with the text label added back from
`sm:` up. Locale-length-independent by design — works whichever
language's "Sign in"/"Sign out" string is active, not a fix tuned to
fit today's specific translations.

**Explicit UI request for this one page, ahead of the general §4 Phase
5 design pass.** Aleksandr: "Сделай сразу красивый UI как у тебя при
регистрации и у GPT" — i.e. do the visual polish for the sign-in page
now, not later, in the style of Claude's own sign-up flow and
ChatGPT's. This is a deliberate, page-specific override of the
"functionality first" sequencing this file documented for this same
page (see the file-level comment in `app/sign-in/page.tsx` from
§6.6) — the general Phase 5 (visual) pass for the rest of the site is
unaffected and still pending.

Changes to `app/sign-in/page.tsx`: centered `A1` logo (the existing
`/brand/a1-logo-blue.svg` / `-white.svg` assets, swapped by
`dark:`), a bigger card (`p-8`, `shadow-lg`), labeled fields (a
`<label>` above each input, not just a placeholder) with a shared
`labelClass`, and a larger, higher-contrast submit button. Same design
tokens as the rest of the site throughout (`rounded-card`, `bg-card`,
`bg-accent`) — no new colors or radii introduced. Also added a new
`orDivider` locale string (all 9 locales) for the "or" between the
form and the Google button.

Small matching tweak in `components/google-sign-in-button.tsx`:
`renderButton`'s `shape` changed from the default `"pill"` to
`"rectangular"`, to match the page's own `rounded-xl` inputs/button
rather than a fully round stadium shape.

**Pushed and verified green on Vercel (commit `4aa9fcf`).** Checked
live at both viewport sizes: at 1200px the redesigned card renders as
intended (logo, labeled fields, accent submit button, Google button
recognizing the active session and offering "Continue as ..."); at
375x700 the nav overflow is gone — `<AccountMenu>` now shows as a
plain icon next to the settings button, matched in size and style, no
clipping or overlap with the centered tab pill.


### 6.15 Post-signup onboarding steps — requirements gathering in progress (2026-08-28)

Aleksandr's own words: the web sign-up flow needs extra steps after
registration to collect data, and it "must tie in completely with the
app — the same data we already collect and use" (not a new, web-only
data shape). Also: a real email-verification step (a service sends a
code), and he sent screenshots of the app's own onboarding screens plus
two cat animations to use.

**What was received so far (screenshots of the app, 2026-08-28):**
- Step "Настройте профиль" (Set up your profile) — three required
  fields: a free-text "Роль и навыки" field (placeholder example:
  "Разработчик, Основатель, Дизайнер"), a "Я..." dropdown (three
  options, each with its own cat animation, values shown so far:
  Бизнесмен / Специалист / Фрилансер — Aleksandr's term: "тип
  пользователя", user type), and an "Отрасль" dropdown (a searchable
  list with emoji-prefixed entries — IT, B2B, Аренда, Бизнес-услуги,
  Бухгалтерия, Бытовая техника, ... — Aleksandr's term: "Категория").
  Aleksandr confirmed: **all three fields are required.**
- Step "Введите код подтверждения" (Enter confirmation code) — a
  4-digit numeric code sent to the user's email, a resend timer shown
  as a live countdown ("Не получили код? 55" — seconds remaining) and
  an "Изменить электронную почту" (change email) link.
- Two cat animations, as native Telegram sticker files (`.tgs` — gzipped
  Lottie JSON, confirmed by decompressing them: 512x512, ~60fps, ~3s
  loops). Aleksandr: 2 of an eventual set — `Briefcase.tgs` for the
  profile-setup step, `Phone.tgs` (a "cat-telephone-operator" pose) for
  the code step. **Decoded to plain Lottie JSON and committed as static
  assets**: `public/animations/briefcase-profile-setup.json`,
  `public/animations/phone-verify-code.json`. Three more animations
  (one per "Я..." dropdown option) are still coming.
  Rendering plan, to avoid adding a new npm dependency to a codebase
  that already can't `npm install` locally (§0.4) and has had three real
  build failures this session from exactly this kind of avoidable risk:
  load the `@lottiefiles/lottie-player` web component from a CDN
  `<script>` tag, the same pattern already used for Google Identity
  Services (`components/google-sign-in-button.tsx`), rather than
  installing a React Lottie wrapper package.

**Two things confirmed against already-established facts, not
assumed:**
- "Отрасль" is almost certainly `dataset.companyCategories` — its
  values (emoji + label, e.g. "IT") match the exact `{value, text,
  lottie}` / HTML-entity-encoded-emoji shape `lib/a1/datasets.ts`
  already documents for this exact dataset (comment there: "Aleksandr,
  2026-08-27: his mobile-app walkthrough video showed a company card
  with 'IT' as a labeled category" — the same word appears first in
  this new screenshot's list too).
- ~~`occupation` is a plain string field~~ — **correction, caught
  before anything was wired: this was wrong.** A WebFetch summary of
  the live openapi.json (lossy on a document this large — see the
  earlier `?openapi=` debug-route addition, built for exactly this
  reason) returned `occupation`'s generic-looking description text,
  which doesn't match what this codebase already had confirmed the
  hard way: `app/u/[username]/page.tsx`'s own 2026-08-27 comment
  states plainly that "occupation isn't free text — the openapi spec
  (Resource.User.Occupation) pins it to exactly these 4 values"
  (`entrepreneur` / `professional` / `freelancer` / `none`) — which is
  exactly the enum the existing `OCCUPATION_LABELS` lookup and
  `<OccupationIcon>` already use, both live on `/u/[username]` today.
  **So `occupation` is "Я..." (тип пользователя), not "Роль и
  навыки"** — the opposite of what this section said before. The
  free-text "Роль и навыки" field maps to `expertise` instead
  (`z.string().nullable()` in schemas.ts, rendered as plain text with
  no icon on the profile page — consistent with free text, not an
  enum). Moral: a full close read of a schema already in this
  codebase beats a summarizer's pass over the same document — should
  have checked `app/u/[username]/page.tsx` and `schemas.ts` before
  stating this as confirmed.

**Not yet resolved — genuinely unknown, not guessed:**
- ~~What backend field(s) "Я..." writes to~~ — **answered: `occupation`**.
  Confirmed by reading `app/u/[username]/page.tsx`'s own pre-existing
  code/comments (dated 2026-08-27, predating this correction): the real
  openapi spec pins `occupation` to exactly the 3 values Aleksandr's
  screenshot shows (`entrepreneur`/`professional`/`freelancer`, plus
  `none`), and it's what drives the cat-icon+label badge on live profile
  pages today. So "Я..." (тип пользователя) → `occupation`. This
  flips the earlier (wrong) conclusion below — see the correction note
  above: `expertise` is the free-text "Роль и навыки" field instead,
  not "Я...".
- ~~Which service actually sends the verification email/code~~ —
  **answered: Mailgun**, confirmed via `a1appp.com`'s own SPF record.
  See OPEN QUESTIONS #8. Sending happens entirely server-side (Andrew's
  infrastructure) — the web only ever calls `account.verifyEmail` /
  `verifyEmailConfirm`, never Mailgun itself.
- ~~Exact request/response shape of `account.verifyEmail` /
  `verifyEmailConfirm`~~ — **answered, 2026-08-29**, pulled exact-text
  from the live `openapi.json` via the `?openapi=` debug-route mode
  (§ code comment in `app/api/debug/route.ts`):
  - `POST /v1/account.verifyEmail` — bearer-token auth (acts on the
    signed-in visitor, no body params at all: `additionalProperties:
    false` on an otherwise-empty input object). Sends a code to the
    caller's own email. Returns `OtpOutput`: `{key: string (e.g.
    "otp_11VuaQ1JL7"), codeLength: integer >= 1, expiresAt:
    TIMESTAMP_SECONDS}` — all three required. `key` must be carried
    forward (e.g. in component state or a query param) to the confirm
    call; `codeLength` tells the UI how many digit boxes to render
    (matches the 4 seen in both the app screenshots and the real email
    screenshot's "6747"); `expiresAt` drives the resend countdown
    instead of a hardcoded 55s guess.
  - `POST /v1/account.verifyEmailConfirm` — bearer-token auth. Body is
    `OtpInput`: `{key: string, code: string}`, both required,
    `additionalProperties: false`. Returns a bare `{type: boolean,
    const: true}` on success — no extra data, just confirmation. A
    wrong/expired code presumably comes back as a non-200 (400 is
    referenced in the same spec block) — exact error shape not yet
    pulled, but the web only needs to show a generic "wrong code, try
    again" message either way, so not blocking.
  - Both endpoints require the visitor's own `accessToken` (via
    `lib/a1/session.ts`'s `readSession()`), same as the not-yet-written
    `account.updateProfile` call — confirms `lib/a1/client.ts`'s new
    `accessToken` override (added alongside this) is the right
    mechanism, not a guess.
- The remaining 3 "Я..." dropdown animations — not sent yet.

**Debug-route access note (2026-08-29):** `A1_DEBUG_SECRET` in Vercel
was of type "Secret" (write-only — Vercel's own UI: "You can't reveal
this value after saving"), so its original value couldn't be read back
to use the `?openapi=` debug mode. Rotated it via Vercel's own Rotate
flow instead (Aleksandr entered the new value himself in the Vercel UI
— entering secret values is something I won't do myself, by design),
redeployed without a new commit so the Production function picked up
the new value, then confirmed the debug route with it. Current value
is intentionally simple (`test12345abc`) since this whole route is
already marked TEMPORARY/delete-before-Phase-1 in its own file header
— not worth a strong value for a route that's getting deleted, but
noting the actual current value here so a future session isn't stuck
guessing it again.

**2026-08-28, follow-up from Aleksandr after seeing the Mailgun
investigation:** the web's code-entry step does not need to match the
email pixel-for-pixel — "можешь посмотреть на дизайн нашего письма и
сделать похожее" (look at the email's design and make something
similar) — i.e. big code font + a cat, same spirit, not the same asset.
He sent `HiCatforemail.tgs` (the waving-cat-with-mouse character) as a
reference for what's IN THE EMAIL itself, not a replacement animation
for the site — corrected immediately after an initial
misunderstanding here. **The website's code-entry step keeps the
telephone-operator cat**, `public/animations/phone-verify-code.json`
(from `Phone.tgs`, §6.15 above). `hi-cat-email-code.json` stays
committed as a decoded reference asset only — not wired into any page.
He is also sending a large-font code style reference separately.
**Font for the big code display, confirmed: "Impact"** ("Шрифт кода -
Impact вроде") — a bold condensed display font; use a websafe/system
fallback stack (`Impact, "Arial Narrow Bold", sans-serif`) since it's
not loaded as a webfont anywhere else in this codebase yet.

**Built, 2026-08-29** — both steps, now that the verifyEmail/
verifyEmailConfirm shape is confirmed (above). Not yet pushed/verified
on Vercel as of this commit; see the build-status note once it lands.

New files:
- `lib/a1/visitor-call.ts` — shared "call the A1 API as the signed-in
  visitor, refresh the accessToken once on 401" helper, factored out so
  the three new routes below don't each reimplement the retry dance
  `lib/a1/client.ts`'s own doc comment says is an accessToken caller's
  responsibility.
- `app/api/account/update-profile/route.ts` — writes `{occupation,
  expertise, companies: [{category}]}` via `account.updateProfile`.
  The `companies: [{category}]` shape (a company entry with only its
  category set, no name) is a **labeled assumption, not confirmed** —
  nothing in §6.1's field list says whether the backend accepts/keeps a
  nameless company entry. Revisit if Andrew says otherwise, or if a
  real submission comes back missing the category on the profile page.
- `app/api/account/verify-email/route.ts` and `.../verify-email-confirm/
  route.ts` — thin wrappers around the two confirmed endpoints.
- `app/onboarding/profile/page.tsx` (+ `profile-setup-form.tsx`) — the
  "Настройте профиль" step: occupation (3 cat-icon options, reusing
  `components/occupation-icon.tsx`), expertise (free text), and a
  searchable "Отрасль" dropdown over `dataset.companyCategories`
  (server-fetched, passed to the client form as props).
- `app/onboarding/verify/page.tsx` — the code-entry step: `codeLength`
  digit boxes in Impact font (Aleksandr, 2026-08-28: "Шрифт кода -
  Impact вроде"; websafe fallback stack since it's not loaded as a
  webfont elsewhere), the phone-operator cat, a real countdown from
  `expiresAt` (not a guessed duration), paste-to-fill, and auto-submit
  once all digits are entered. "Change email" is a placeholder — no
  confirmed backend way to edit a pending signup's email exists yet, so
  it just signs out and sends the visitor back to `/sign-in` to
  re-register; flagged here rather than guessed at silently.
- `components/occupation-labels.ts` — the uk/en/ru/... occupation-name
  table, split out of `app/u/[username]/page.tsx` (which now imports it)
  specifically so the onboarding form (a client component) could import
  just the labels without pulling that page's server-only data fetching
  (`lib/a1/users`, `lib/a1/datasets`) into the client bundle — the same
  class of build failure `lib/a1/session-constants.ts`'s file header
  already documents, for the same reason.

Wiring: `app/sign-in/page.tsx`'s sign-up branch now redirects to
`/onboarding/profile` instead of `/` (sign-in still goes straight to
`/` — only a brand-new account needs onboarding). No local `tsc`
available to type-check before pushing (§0.4) — reviewed by hand against
this codebase's known `noUncheckedIndexedAccess` failure modes, but not
proven green until Vercel says so.

**Icon-rendering investigation, 2026-08-29** — Aleksandr reported the
cat icons not showing at all after the first live test
("Запушил, попробовал на проде... а сразу запустило"). Debugged with
console instrumentation (render/effect logs in `components/
lottie-player.tsx`, since there's no local dev server to reproduce
against — §0.4) directly against production. Finding: **this was never
a rendering bug** — `useEffect` fires on mount every time, `lottie-web`
loads and renders correctly, and the exact same behavior was already
present, unnoticed, on the live `/u/[username]` page. The real cause is
asset size: the animation JSON files are unusually large for small
decorative icons —
`public/occupations/{entrepreneur,freelancer,professional}.json` are
44-54KB each, `public/animations/briefcase-profile-setup.json` is
188KB, and `public/animations/phone-verify-code.json` (used by the
verify-code step) is 348KB. A cold fetch of the larger ones can take
several real seconds, during which the icon's `<span>` container was
just an invisible empty box with zero visual feedback — easy to mistake
for "broken" if you don't wait it out. Fixed the symptom (not the file
size) by fading the icon in via opacity once `loadAnimation` actually
resolves, so the delay reads as a deliberate animation-in rather than a
missing icon; removed the diagnostic console.log calls used to find
this (kept the existing `console.error` on genuine load failures).
**Not fixed**: the animation files themselves are still large — worth
Aleksandr re-exporting them at a lower fidelity/frame count if the
multi-second cold-load delay matters (e.g. on a throttled mobile
connection), especially `phone-verify-code.json` (348KB) and
`hi-cat-email-code.json` (324KB, present in `public/animations/` but,
as far as this investigation found, not referenced by any page —
possibly a leftover from choosing between two versions of the
verify-step animation; flagged rather than deleted, since deleting an
asset on a guess is worse than leaving an unused file).

**Step order swapped, 2026-08-29** — Aleksandr: "сначала код, потом
профиль" (verify-by-code first, then profile-setup). Redirects updated:
sign-up now goes to `/onboarding/verify` first; a correct code moves on
to `/onboarding/profile`; a successful profile save is now the end of
onboarding (`/`). The verify page's quiet "skip" arrow now points at
`/onboarding/profile` instead of `/` — it was always meant to skip just
that one step (a code that never arrives), not the whole flow.

**Profile-save is currently BROKEN in production, confirmed 2026-08-29**
— real end-to-end testing (not a guess) hit this live: every submission
of the "Налаштуйте профіль" step that picks an industry fails with "Не
вдалося зберегти." Vercel's function logs show the actual backend
response: `400 INVALID_INPUT "'companies.0' is missing required
property 'name'"`. Pulled `Resource.User.Company`'s real schema from the
live openapi.json to confirm — it has a required `name` field (example:
"Coca-Cola"), i.e. a company entry represents an actual named employer,
not a bare industry tag. This step never collects a company/employer
name, so the `companies: [{category}]` shape this route has always sent
was wrong — not a guess that happened to work, an assumption that was
flagged as unconfirmed (see the "Built, 2026-08-29" note above) and has
now been proven wrong by the backend itself. **Asked Aleksandr how he
wants this resolved** (add a company-name field to this step vs.
"Отрасль" isn't really `companies[].category` at all) rather than
sending a placeholder/fake company name to a real backend on a guess.
Not fixed yet — occupation and expertise still save fine on their own;
it's specifically the category/industry field that's blocked. **RESOLVED, same day** — Aleksandr:
"в приложении мы не спрашиваем про компанию и все нормально
сохраняется" prompted re-checking the real schema instead of adding a
name field the app doesn't have. Pulled `Resource.User.Company`'s full
`required` array from the live openapi.json: `name`, `description`,
`position`, `turnover`, `employeesCount`, `category`, `link` — all
seven keys must be PRESENT, but only `category` needs a real value
(confirmed by iterating live: each fix moved the 400 to the next
missing key, until sending `{category, name:"", description:"",
position:null, turnover:null, employeesCount:0, link:null}` returned
200). Verified end-to-end with a fresh test account (claude-onboarding-
test2-20260829@neowd.com): sign-up → verify (skipped via the arrow,
same as a real "can't get the code" case) → profile-setup with IT
selected → 200 → redirected to "/". Onboarding is fully working now.

**Small UI fixes, 2026-08-29** (Aleksandr, live-testing feedback):
- Briefcase cat on this step enlarged 50% (72px → 108px).
- "Отрасль" dropdown: added a chevron indicator, and it no longer gets
  cut off by the viewport — it now measures real space above/below the
  input on open and flips upward + caps its own height to whatever's
  actually available, instead of always dropping down at a fixed height.
- "IT" (the single most common answer on a jobs platform) is now always
  pinned to the top of the category list/search results instead of
  sitting wherever alphabetical/dataset order puts it.



### 6.16 Phase 5b (Apple): sign-in button implemented (2026-08-29)

Aleksandr, unprompted: "я так понял что мы ничего не ждем от Андрея
больше и у нас всё есть" — Apple is unblocked the same way Google was
(§6.11): Andrew added `com.aone.aoneapp.web` (§6.10) to
`auth.appleId`'s accepted audience list. Built the same evening.

**New files**, mirroring the Google pair exactly:
- `components/apple-sign-in-button.tsx` — Apple's own "Sign in with
  Apple JS" (`https://appleid.cdn-apple.com/.../appleid.auth.js`), not
  the Firebase Auth SDK. Same reasoning as Google's button: no new npm
  dependency (§0.4), no Firebase project config. `AppleID.auth.init()`
  + `usePopup: true`, then a plain custom button (Apple's own glyph,
  inline SVG) calling `AppleID.auth.signIn()` on click — a Promise that
  resolves with `{authorization: {id_token}}` when `usePopup` is set,
  verified against Apple's own JS reference (developer.apple.com/
  documentation/sign_in_with_apple_js), not assumed.
- `app/api/auth/apple/route.ts` — same shape as the Google route:
  forwards the token to `auth.appleId`, sets the two session cookies.
- `lib/a1/decode-jwt-email.ts` — the JWT-email-claim helper that
  `app/api/auth/google/route.ts` had inline was needed verbatim here
  too (both Google's and Apple's ID tokens carry a standard OIDC
  `email` claim), so it moved out to a shared file rather than being
  copy-pasted a second time.
- `lib/a1/oauth-public.ts` — added `APPLE_SERVICES_ID` (`com.aone.
  aoneapp.web`, from §6.10) and `APPLE_REDIRECT_URI`.

**Real, still-open gap — flagged, not silently worked around, per
§6.10's own "flag if the implementing agent goes a different route"
note:** §6.10 configured Apple's Services ID assuming the web sign-in
would go through the Firebase Auth SDK (`signInWithPopup` +
`OAuthProvider('apple.com')`), so its only registered Return URL today
is the Firebase generic handler
(`https://a1-app-9aaf1.firebaseapp.com/__/auth/handler`). This
implementation bypasses Firebase for Apple, the same way it already
does for Google (§6.13) — hand-rolled, first-party SDK, direct to our
own backend. That means Apple's popup flow needs its own Return URL
under our domain instead: `APPLE_REDIRECT_URI` is set to
`https://jobs.a1appp.com/sign-in` (the page hosting the button itself —
no dedicated callback route needed, since Apple's JS SDK completes the
popup flow via `postMessage` once it reaches that URL). **Aleksandr
still needs to add this exact URL as an additional Return URL on the
`com.aone.aoneapp.web` Services ID in Apple Developer** before the
button will work end-to-end — not done yet, this is a console change
only he can make (same category as §6.3's original OAuth console
setup).

**Not yet tested live** (couldn't be, until now — blocked on Andrew).
Once the Return URL above is added, still to verify:
- Apple sign-in actually completes and creates/resumes a session.
- **Cross-provider identity, raised by Aleksandr the same session:**
  does the SAME email across DIFFERENT sign-in methods resolve to one
  account or two? Same-method parity is already established by
  construction (one backend, one users table, §6.3/§6.5) — a plain
  email+password account is identical from app or web, and Google's
  `sub` is confirmed same-project (§6.9/§6.11) so it should match the
  app's Google-created accounts too. Apple's Services ID was deliberately
  associated with the app's own App ID (§6.10) for the same reason.
  What's genuinely unconfirmed: sign up by email+password on one
  platform, then try Google/Apple with an account sharing that same
  email on the other — does the backend link that to the existing
  record (by email) or create a second, separate one? Not yet asked of
  Andrew or tested live; testable by us directly (create a test account
  by email, then attempt a Google sign-in against the same address)
  without needing his input, and worth doing once Apple's Return URL is
  fixed so both providers can be checked in the same pass.


**Visual-parity follow-up, 2026-08-29** (Aleksandr, from a live mobile
screenshot after testing the new Apple button): asked for the Google
button to match Apple's — black background, nicer font, logo aligned
the same way, same width as the Apple and blue Sign-in buttons.
`components/google-sign-in-button.tsx`: switched `theme` from
`"outline"` to `"filled_black"` (one of Google's own documented themes)
and made `width` a real measurement of the same `max-w-[320px]` wrapper
the other two buttons use (was a hardcoded `320` guess) so it matches at
every viewport, not just the one it was eyeballed at. **Not changed,
and flagged rather than silently attempted:** the button's font and
exact icon/text layout are Google's own — it renders inside Google's
iframe, which isn't restyleable CSS. Building a fully custom button
(styled entirely by us, triggering sign-in via `accounts.id.prompt()`
on click) was considered and rejected: `prompt()` is the One Tap
surface, which Google suppresses with a growing cooldown after a user
dismisses it a couple of times — trading the always-reliable rendered
button for one that can go silently inert isn't worth it for a purely
cosmetic gap. Not yet re-verified live (same push as whatever Aleksandr
tests next).

### 6.17 UI polish pass: mobile nav shadow, cat-avatar fill, Google button v2, consolidated avatar menu (2026-08-29)

Aleksandr's next message, sent with 7 mobile screenshots after live-
testing Apple/Google sign-in: a 5-item backlog. Landed in one commit
(`9ac210b`) plus this one:

1. **Mobile nav "shadow" bleeding onto search, even without scrolling.**
   `components/progressive-blur.tsx` — round 4 on this exact complaint
   (see that file's own comment history). Fix this time: hide the fog
   effect entirely below `sm` (`heightClassName` default changed from
   `"h-20 sm:h-32"` to `"hidden sm:block sm:h-32"`), unchanged on
   desktop, per Aleksandr's own explicit fallback ("или вообще убери
   ее, чтобы не делала мозги").
2. **Cat avatars losing their colored fill outside registration.**
   Root-caused by fetching a live cat image directly
   (`cats/16.png`) rather than guessing from the complaint: `lib/
   avatars.ts`'s `pickDefaultCatAvatar` images are square with a full-
   bleed colored gradient background, not plain circular cutouts.
   Every call site but registration's own picker was cropping that
   fill away with `rounded-full`. Fixed the 4 fallback-avatar `<img>`s
   in `app/u/[username]/page.tsx`, `app/jobs/[slug]/page.tsx`,
   `app/talents/[slug]/page.tsx`, `components/post-card.tsx` to
   `rounded-2xl`/`rounded-xl`. Real-photo avatars (the `<Image>` branch
   at each of those same sites) stay circular — only the cat fallback
   ever had this bug.
3. **Google button visual-parity, round 2.** Round 1 (§6.16's
   follow-up: `filled_black` theme + measured width) wasn't enough —
   Aleksandr wanted the exact corner radius of the blue Sign-in button
   and a normal font weight, neither reachable via Google's theme
   presets (their rendered button is their own iframe content, not
   restyleable CSS). Rebuilt `components/google-sign-in-button.tsx`
   with the "invisible overlay" technique instead: a fully custom,
   `pointer-events-none` button pixel-matched to the Apple button
   renders visibly, with the real, official Google-rendered widget
   layered exactly on top at `opacity-0` — a click always lands on
   Google's actual button and goes through its normal flow, only what's
   visible changed. Chosen over a fully custom `accounts.id.prompt()`
   button (rejected in §6.16's follow-up for the same reason it's
   rejected here: One Tap's dismissal-cooldown risk) because this
   technique keeps the official widget's reliability while allowing
   full CSS control.
4. **Floating "+" create-post button** — scoped (AskUserQuestion:
   signed-in click opens a placeholder for now, real post-creation form
   is separate future work) but not yet built.
5. **Consolidated avatar-menu modal** (resuming an earlier-session
   spec) — new `components/avatar-menu.tsx`, mounted in
   `components/site-nav.tsx` in place of `components/account-menu.tsx`
   + `components/settings-menu.tsx`. Signed in: one avatar button opens
   a panel with email at top, the same theme (light/dark/auto) and
   language pickers `settings-menu.tsx` already had, and a red "Sign
   out" action at the very bottom. Signed out: renders the same sign-in
   link `account-menu.tsx` always had, plus `<SettingsMenu/>` unchanged
   next to it — no avatar to attach a panel to yet, and theme/language
   still need to be reachable while signed out. `components/account-
   menu.tsx` is now unused (left in place, not deleted, per this repo's
   own convention for superseded files — see `components/logo-play.tsx`).

   **Known gap, flagged rather than silently worked around:** the
   avatar always shows the deterministic cat fallback
   (`pickDefaultCatAvatar`, seeded on the signed-in email — the only
   stable per-user string available client-side today), never a real
   uploaded photo. There is no confirmed backend call for "get my own
   username/photo" — PLAN.md's endpoint table (§6.1) has no `users.
   getMe`/`account.getProfile`-style read, and `DISPLAY_COOKIE` (`lib/
   a1/session-constants.ts`) only ever carried the signed-in email.
   `account.updateProfile` returns a full user, but only on a write.
   When a real "get my profile" read exists, swap the avatar seed to
   the real username and add a real-`avatarUrl` branch (same split
   `app/u/[username]/page.tsx` already does) — `avatar-menu.tsx` is
   structured so that only needs a new `photoUrl` variable, not a
   rewrite.

### 6.18 Sign-out button outline restyle + floating create-post button (2026-08-29)

Follow-ups from the same session as §6.17:

- **Sign-out button, outline instead of solid fill** (`components/
  avatar-menu.tsx`, from a live mobile screenshot: "Sign out сделай без
  заливки только красный stroke") — transparent background, red border
  + red text, a light red tint only on hover.
- **Floating create-post "+" button** (`components/create-post-fab.tsx`,
  new; mounted in `app/layout.tsx` next to `<SiteNav/>` so it shows on
  every page, signed in or not). Signed out: clicking navigates to
  `/sign-in?reason=create-post` — `app/sign-in/page.tsx` now checks that
  query param (plain `URLSearchParams` over `window.location.search` in
  an effect, not `useSearchParams`, for the same Suspense-avoidance
  reason this page already reads locale/theme that way) and shows one
  extra line above the form, only on that path, never on a plain visit.
  Signed in: opens a stub dialog ("this feature is coming soon") —
  scope explicitly cut down via AskUserQuestion, the real post-creation
  form is separate future work. Button color is `bg-accent`, the site's
  existing CSS variable for "the brand blue for the current theme"
  (#335ef7 light / #0c8ce9 dark) — not two new hardcoded hexes, already
  what Aleksandr's "2 брендовых синих в зависимости от темы" ask
  amounts to. Icon is a thick-stroke, round-linecap plus on a rounded-
  square button, matching the mobile app's own FAB from his reference
  screenshot.

## OPEN QUESTIONS — Stage 2, for Aleksandr

1. ~~**Google Sign-In needs its own Web-application OAuth Client ID**~~
   — **Answered/done 2026-08-28: one already existed (Firebase
   auto-created it), now configured and published.** See §6.9. Sent to
   Andrew — turned out to already be whitelisted (Android needed the
   same Web client id). **No backend change needed for Google at all;
   see §6.11.**
2. ~~**Apple Sign-In needs a Services ID + verified domain**~~ —
   **Answered/done 2026-08-28: created `com.aone.aoneapp.web`,
   associated with the app's App ID, domain + return URL configured.**
   See §6.10. Identifier sent to Andrew alongside the Google one.
3. **Password rules and email verification.** Any minimum password
   policy the backend enforces, or should the web set its own? Does a
   web account need to verify its email (`account.verifyEmail` exists)
   before it can publish, or is that unnecessary?
4. ~~**Profile editor scope (§6.4)**~~ — **Answered 2026-08-28:
   minimal subset first** (name, occupation, bio, one photo). See Phase 6.
5. ~~**Moderation**~~ — **Answered 2026-08-28: no moderation step**,
   goes live immediately like an app post. See Phase 7.
6. ~~**Read-side changes**~~ — **Answered 2026-08-28: public feed/
   detail pages are not touched.** Purely a separate sign-in → editor
   flow for now. See Phase 7.
7. ~~**What does the "Я..." (Бизнесмен/Специалист/Фрилансер) onboarding
   field save as?**~~ — **Answered/confirmed live, 2026-08-29:** it's
   `occupation`, a plain field on `Resource.User` itself (enum
   entrepreneur/professional/freelancer) — not nested, doesn't steer
   post type. Confirmed by a real successful `account.updateProfile`
   call (200) with `occupation` set. See §6.15.
8. ~~**Which verification-email screenshot?**~~ — **Answered
   2026-08-28: Mailgun.** Aleksandr sent the real received email
   (From: info@a1appp.com, subject "Greetings from A1! Enter this code
   to proceed", a 4-digit code, the app's cat mascot). The screenshot
   itself carries no ESP branding, so this was confirmed the same way
   everything else in this project is — a live check, not a guess:
   `a1appp.com`'s own SPF TXT record (queried via Google's public DNS-
   over-HTTPS resolver, since this environment cannot reach arbitrary
   DNS resolvers or api.a1appp.com directly) is `v=spf1 include:
   mailgun.org ~all`, which authorizes Mailgun to send mail as this
   domain. (Its MX record points at `mx.ukraine.com.ua` instead — that
   is just where *incoming* mail to @a1appp.com addresses is hosted,
   unrelated to outbound transactional mail.) Since `account.
   verifyEmail`/`verifyEmailConfirm` already exist as backend
   endpoints (§6.1), the web never talks to Mailgun directly — sending
   is entirely Andrew's side. This only matters if Aleksandr wants to
   look up the template/quota in Mailgun's own dashboard, or if a
   future web-only email (not yet planned) needs to match its look.

## OPEN QUESTIONS — Stage 2, for the backend developer (Andrew)

1. ~~Do `auth.google` / `auth.appleId` validate the ID token's audience
   against one fixed client ID per platform?~~ — **Answered 2026-08-28
   by Andrew: yes, hard-coded to one client ID per platform, and web
   was not previously planned for.** See §6.7 for what this means and
   the specific fix being asked for.
2. `account.checkEmail` being public suggests it's meant to be called
   live while a sign-up form is filled in — confirm that's the intended
   use, and whether `users.createUser` itself also rejects a duplicate
   email (i.e. whether the check is advisory or the source of truth).
3. `upload.create` can return a `MediaUploadUsage` object instead of an
   upload destination when the account is over its media quota (§6.1).
   What is that quota, and is there a recommended UX for hitting it
   mid-upload?
4. Any web-specific rate limiting wanted on `posts.createPost` /
   `users.createUser`, given the web has no app-store review gate the
   way the mobile client does?

### 6.19 Phase 7 implemented: post CRUD (create/edit/delete, drafts + scheduling) (2026-08-29)

Built from 5 reference screenshots of the real mobile-app post-creation
flow ("давай пилити создание поста, полностью по аналогии приложения.
Драфты и запланированные посты можно тоже сразу делать"), plus a same-
day follow-up widening scope from create-only to full CRUD ("посты
повинні бути CRUD, create / update / delete").

- `components/post-editor.tsx` — the real form, replacing
  `create-post-fab.tsx`'s stub dialog. Object toggle, title, description
  (with contextual tips copy), location (via `/api/locations`, reusing
  `filters-form.tsx`'s own debounced search), category (single pick from
  `dataset.postCategories`), one link, tag pills sourced straight from
  `dataset.postTags` (work type / employment type / experience, split by
  matching against the same English strings `filters-form.tsx`'s
  `TAG_LABEL_TRANSLATIONS` already keys on) plus up to 5 free-text custom
  tags in the same flat array, salary (amount + `dataset.currencies` +
  a month/year toggle → `Money.Single`/`SingleAnnual`), up to 5
  `apply.questions` entries, up to 5 direct-to-storage photo uploads
  (`upload.create` → POST to the presigned destination → `upload.confirm`),
  and three distinct submits (Post / Save draft / Schedule via a native
  `datetime-local` picker). Handles both create and edit via one
  `mode`/`initialPost` prop pair.
- `components/my-posts-panel.tsx` — new "My posts" entry in
  `avatar-menu.tsx` (the "revisit once needed" §6.6 flagged). Lists the
  visitor's own posts across all three states, Edit opens the same
  `PostEditor` prefilled, Delete is a two-step inline confirm.
- Server: `app/api/posts/{create,update,delete,mine}/route.ts`,
  `app/api/upload/{create,confirm}/route.ts`,
  `app/api/post-editor/bootstrap/route.ts` (categories/currencies/tags in
  one call). All auth-needing calls go through `callAsVisitor`, same
  shape as `app/api/account/update-profile/route.ts`.
  `lib/a1/schemas.ts` gained `PostInputSchema` (the write-side mirror of
  §6.1's documented `posts.createPost` contract); `lib/a1/datasets.ts`
  gained `fetchCurrencies()`.
- Deliberately not built: `hideAuthor`/`premiumPinDays`/`premiumHighlight`
  (no reference screenshot, and the last two names were only ever a
  guess by convention — left out rather than guessed in), and Range/
  RangeAnnual salaries (the editor never produces one, but preserves an
  existing Range salary untouched on an edit rather than dropping it —
  see `post-editor.tsx`'s `buildMoney()`).
- Known unverified guess, flagged in code: `apply.questions`' per-item
  shape (`{ question: string }`) — PLAN.md never had this confirmed past
  "array of unknown" on the read side, and it's only exercised once a
  founder actually adds a custom question. Verify against the first live
  200/400 the same way `Resource.User.Company` was fixed (§6.15).

Same-day, unrelated small fixes bundled into the same commit: the
avatar-menu trigger button is now a full circle (`rounded-full`, was
`rounded-xl`) per a live screenshot follow-up — accepted as a one-off
exception to the "square gradient fill needs rounded-xl" rule the other
4 cat-avatar call sites still follow, since a 36px nav icon crops fine.
Occupation cat icons on `/u/[username]` now render via new
`public/occupations/*-nobg.json` variants (same source animation with
just the baked-in gradient-square background shape layer stripped out)
while onboarding keeps the original with-background files — see
`components/occupation-icon.tsx`'s new `background` prop.

### 6.20 Post editor: live-testing feedback fixes (2026-08-29)

A batch of 7 live-deploy screenshots plus 2 follow-up messages surfaced
issues in the 6.19 post editor. All addressed in the same
`components/post-editor.tsx` (632-line diff) plus a small
`my-posts-panel.tsx` follow-up:

- Salary row: the amount `<input>` had `flex-1` with no `min-w-0`,
  so it refused to shrink and pushed the currency `<select>` off-screen
  — root cause, not a width tweak. Fixed with `min-w-0` on the amount
  input, `w-[4.5rem]` on the currency select, and a labeled two-button
  month/year segmented toggle replacing the old swap icon.
- Photos: capped at 3 (was 5); each is now compressed client-side
  (`compressImage()` — `createImageBitmap` + canvas + iterative
  `toBlob` quality stepping, no new dependency) to fit under ~300KB
  before upload.
- Tags: `dataset.postTags`'s experience group turned out to be
  `"1 yr. exp."` followed by bare `"2"`/`"3"`/`"4"`/`"5+"` strings (only
  the first matched the old "yr"/"exp" substring regex) — confirmed
  live, not previously documented. `isExperienceTag()` extended with
  `/^\d+\+?$/` so the bare numbers bucket under Experience instead of
  Other tags.
- Category: list now sorted IT-first (mirrors
  `profile-setup-form.tsx`'s existing logic), gained a rotating chevron,
  and reuses that same file's viewport-aware drop-up positioning so the
  dropdown shows more rows comfortably instead of a cramped fixed list.
- Location: shows a spinner while a debounced search is in flight and
  a "no results" hint once a completed search returns zero matches,
  matching the mobile app's own feedback instead of typing into an
  apparently-dead field.
- Validation: inline red hints now live-track title (< 10 chars) and
  description (< 30 chars) — copied from the mobile app's own displayed
  thresholds — plus permanent "required field" hints under
  location/category when unset; all four gate the submit buttons
  (`canSubmit`), not just a submit-time alert.
- Schedule popover: was a native `datetime-local` input, which (a)
  rendered its OS calendar below the modal, often off-screen, and
  (b) accepted keystroke-typed nonsense like year `0002` while leaving
  the confirm button enabled, since native `min`/`max` attributes don't
  reliably gate manual entry. Replaced with a custom popover
  (`absolute bottom-full`, opens upward) with 4 quick-pick chips
  (today evening / tomorrow morning / +3 days / +1 week) and separate
  date/time inputs; `min`/`max` attributes are kept as a first line of
  defense but the actual gate on the confirm button is an independent
  numeric check (`scheduleIsValid()`), so a malformed typed date can no
  longer produce an enabled Schedule button.
- Offer-a-job/Find-a-job toggle wrapped in `sticky top-0` so it stays
  visible while the form scrolls, instead of scrolling out of view.
- Save draft previously called `onClose()` unconditionally after any
  successful save, so (in create mode) every repeated "Save draft"
  click minted a brand new post via `posts.createPost` with no visible
  confirmation. Added `savedPostId` state (seeded from
  `initialPost?.id` in edit mode, filled in after the first successful
  create) so every later save — draft, post, or schedule — targets the
  same post via `posts.updatePost`; a draft save no longer closes the
  dialog and instead shows a "✓ Draft saved" badge next to the header
  for 3 seconds. `my-posts-panel.tsx`'s `onSaved` prop, previously
  `() => { setEditing(null); load(); }`, is now just `load` so a draft
  save from "My posts → New post" also stays open with the same
  confirmation instead of force-closing.

### 6.21 Post editor: round-3 feedback (Safari layout, i18n, validation, custom calendar) (2026-08-29)

A second live-testing pass (7 screenshots + 2 follow-up messages) turned
up issues round 2 (§6.20) didn't catch, plus two new asks:

- The salary row's round-2 flex fix (`min-w-0` + `flex-1`) still broke,
  this time only on Safari — a flex-basis quirk collapsed the amount
  input to just its native spinner decoration while the currency select
  silently absorbed the row's width. Rebuilt with CSS Grid
  (`grid-cols-[1fr_4rem_auto]`), whose fixed column tracks can't be
  misread by either browser's flex algorithm the same way. Currency
  select narrower still (`w-16`, appearance-none + a custom chevron
  since that also drops the native one), and the amount input's
  native number-spinner buttons are hidden (`[appearance:textfield]`
  + the two `::-webkit-*-spin-button` pseudo-elements).
- `isExperienceTag()`'s bare-number regex didn't match the live "5+"
  tag because the actual string is "5 +" (a space before the plus) —
  now strips whitespace before testing.
- New: `components/label-translations.ts` extracts
  `TAG_LABEL_TRANSLATIONS`/`translateTagLabel` and
  `CATEGORY_LABEL_TRANSLATIONS`/`translateCategoryLabel` out of
  `components/filters-form.tsx` (which now imports them instead of
  keeping its own copy) so `post-editor.tsx` can translate its tag
  pills (work type / employment type / experience) and category names
  into all 9 languages too — previously rendered as raw English,
  never localized at all.
- New: required-field/min-length hints no longer render the instant
  the dialog opens (they used to greet a blank form with 3 red
  errors). Each field (title/description/location/category) tracks
  its own "touched" state, set on blur; a submit attempt while
  something's missing calls `markAllTouched()` so all four surface at
  once, matching the reference screenshot's "tried to submit" moment
  instead of an idle empty form.
- Schedule popover is now `position: fixed`, its coordinates computed
  in `openSchedulePopover()` from the dialog's and the clock button's
  `getBoundingClientRect()`, instead of `absolute bottom-full` inside
  the dialog. The dialog needs `overflow-hidden` for its rounded
  corners, which was clipping the popover's top whenever it grew
  taller than the gap above the footer — no amount of scrolling could
  reveal the clipped part, since it was the popover being cut, not
  content being out of view. `position: fixed` escapes an ancestor's
  `overflow-hidden` unless that ancestor sets a transform/filter/
  perspective (this dialog doesn't), so this works regardless of DOM
  nesting.
- The native `<input type="date">` inside that popover is gone —
  its OS calendar couldn't be restyled or repositioned, and picking a
  specific year meant clicking a tiny stepper repeatedly. Replaced
  with a month `<select>` + year `<select>` pair (any valid year is
  one click) plus a day grid, both driven by `Intl.DateTimeFormat`
  for month/weekday names rather than a hand-written 9-language table.
  `scheduleIsValid()` still gates the actual submit regardless of what
  the picker shows.
- The popover's own Cancel/Schedule buttons are gone too — the
  footer's existing Save-draft/Post buttons now switch to
  Cancel/Schedule (via `t("scheduleActionCaps", lang)`) while the
  popover is open, since scheduling is the one action that makes
  sense at that point and a second primary button was redundant.
- On a failed create/update, `not_signed_in` (the visitor session
  expired) now redirects to `/sign-in?reason=create-post` instead of
  showing the generic error with no next step; anything else is
  `console.error`'d with the backend's `message`/`detail` so a repeat
  failure is diagnosable from the browser console. Couldn't reproduce
  the reported "couldn't post despite filling everything in" live (no
  way to sign in as the founder from here) — a stray browser tab
  sitting on that exact sign-in URL was the only lead, hence this fix
  being a reasoned guess rather than a confirmed root cause. Worth
  confirming against the next live occurrence, if any.

### 6.22 Root cause found: revoked refresh tokens weren't triggering re-sign-in (2026-08-29)

§6.21 guessed at a session-expiry cause for "Щось пішло не так" without
being able to reproduce it live. This time Aleksandr reproduced both
that error AND a new "Не вдалося завантажити фото" (photo upload)
failure, and Vercel's function logs named the real cause directly:

```
[api/posts/create] failed: 401 {"code":"TOKEN_VALIDATION_ERROR","message":"Token revoked.","status":401}
[api/upload/create] failed: 401 {"code":"TOKEN_VALIDATION_ERROR","message":"Token revoked.","status":401}
```

The External-APIs trace on the first log line showed `auth.refreshToken`
WAS called (`callAsVisitor`'s existing 401-retry logic did fire) — its
own attempt just also got rejected with the same "Token revoked." 401.
`lib/a1/visitor-call.ts`'s `callAsVisitor` had no handling for that: an
A1ApiError thrown by the refresh call itself (or by the retried original
call) bubbled straight out of the try/catch as an unrecognized error,
which every calling route's generic catch-all turned into an opaque 502
— never reaching the `NoSessionError` branch that would have told the
client to send the visitor back to `/sign-in`.

Fixed: `callAsVisitor` now wraps both the refresh call and the retried
call in their own try/catch, and a 401 from either one converts to
`NoSessionError` — a revoked refresh token can never succeed no matter
how many times it's retried, so there's nothing to gain by surfacing the
raw error instead of routing through the same "session's dead" path a
missing cookie already takes. All 9 routes calling `callAsVisitor`
(`account.updateProfile`, both email-verification routes, all four
`posts.*` routes, both `upload.*` routes) now also `clearSession()` when
returning `not_signed_in`, so a dead cookie doesn't keep tripping the
same failure on every later call instead of letting a fresh sign-in
through. `components/post-editor.tsx`'s photo-upload path
(`handleFileSelected`) gained the same not-signed-in redirect
`submit()` already had, via a small shared `isNotSignedIn()` helper.

Open question this doesn't answer: WHY the refresh token got revoked in
the first place (normal 60-day expiry per `lib/a1/session.ts`'s own
comment, a manual sign-out/session-revoke elsewhere, or something else)
— out of scope here since the actual bug (silently surfacing the wrong
error instead of prompting a fresh sign-in) is fixed regardless of cause.

### 6.23 Why the token got revoked: likely a refresh-token race, not real expiry (2026-08-29)

§6.22 fixed the symptom (a revoked-token 401 wasn't triggering
re-sign-in) but left WHY it got revoked as an open question. Answer,
with the caveat below on confidence: almost certainly a race in our own
refresh logic, not a backend policy or an actual 60-day expiry.

The tell: `lib/a1/auth.ts` (the separate service-account bridge) already
has an `inFlight` promise cache with a comment reading "coalesce
concurrent callers into a single login/refresh instead of a stampede" —
i.e. this exact class of bug was already found and fixed once in this
codebase, just for the OTHER token (the shared service account), never
for the per-visitor one in `lib/a1/visitor-call.ts`. The mechanism:
`readSession()` reads the visitor's refreshToken fresh from the request's
own cookie every time, so two authenticated requests that both arrive
while the access token is expired — a photo upload firing alongside a
draft autosave, two browser tabs on the same account, or simply several
of the post editor's own calls landing close together — each see the
SAME not-yet-rotated refreshToken and each call `auth.refreshToken` with
it. If that endpoint's refresh token is single-use/rotating (typical for
this kind of flow, though never confirmed in PLAN.md's ground truth),
only the first of those concurrent calls actually succeeds; every other
one gets rejected, and the backend reports that identically to a
genuinely dead session (`TOKEN_VALIDATION_ERROR` / `"Token revoked."`)
— there's no way to tell "lost a race" from "actually revoked" apart
from the error text alone.

Fixed in the same commit as this note (§6.22's follow-up): `callAsVisitor`
now coalesces concurrent refreshes of the same refreshToken value through
one shared in-flight promise, the same pattern `lib/a1/auth.ts` already
uses — only the first caller for a given token actually calls
`auth.refreshToken`; everyone else awaits and reuses that result instead
of racing it.

Honesty check on confidence: this is a strong circumstantial case (an
identical bug already existed and was fixed once in this exact codebase
for the sibling auth path), not a confirmed root cause — there is no
direct evidence (no backend docs, no reproduced race in a live session)
that this is what actually happened on 2026-08-29. The other live
possibility, not ruled out: the backend enforces one active session per
account and a login from elsewhere (another tab, another device, testing
from two machines) revoked the refresh token the web app was holding —
if "Token revoked" recurs on a single tab with nothing else signed in at
the same time, this fix wasn't the (or the whole) cause and that theory
moves up.

### 6.24 Round 5 live retest: revoke recurred (race theory now doubtful) + new "missing categories" 400 (2026-08-29)

Aleksandr pushed §6.23's coalescing fix and retested live. Two findings,
neither the clean confirmation hoped for:

**"Token revoked" recurred, but is now handled correctly.** Vercel logs
show `POST /api/upload/create` → 401 at 20:59:36, `External APIs` trace
showing `upload.create` then `auth.refreshToken` — no `[error]` console
line at all this time (contrast §6.22's opaque 502), because it now hits
the `NoSessionError` path cleanly: the client got a real 401 with
`message: "not_signed_in"` and the post-editor's existing handling sent
the browser to `/sign-in?reason=create-post` (confirmed — that page was
open in the reproduction). Aleksandr had to sign back in
("Токен тоже отвалился, мне пришлось перезайти"), then upload + create
worked past the auth step entirely.

This occurrence undercuts §6.23's race theory, though: `auth.refreshToken`
was called exactly once here, for one sequential request (`upload.create`)
with no concurrent call visible anywhere in the surrounding log window —
there is nothing for the coalescing fix to have deduplicated. §6.23's own
"honesty check" flagged exactly this outcome as the falsifying case for
the race theory and the confirming case for the alternative: something
external to this app's own request pattern is revoking the refresh token
(a fixed, shorter-than-expected server-side TTL, or a sign-in elsewhere
on the same account revoking the old session). Added a diagnostic
(`lib/a1/visitor-call.ts`, commit 7c19883): logs the token's age against
its own stated `expiresAt` the next time a 401 happens, so the next
occurrence tells us whether it was already "expired" by our own
bookkeeping (points at TTL/proactive-refresh) or still well inside its
stated window (points at external revocation). Not asking Aleksandr to
change anything yet — this needs one more real occurrence with the new
log line present before drawing a conclusion.

**New, unrelated bug: `/api/posts/create` 400 "root is missing required
property 'categories'".** After signing back in, photo upload succeeded
(`200`/`200` on create+confirm) but the actual post create failed with
this backend validation error — a completely different failure from the
auth issue, on the very next call. Investigated the obvious explanation
first: `canSubmit` (`components/post-editor.tsx`) already gates every
submit button on `category !== null`, and the `categories` array sent is
`category ? [category.value] : []` — if the button was clickable at all
(and it was; the dialog showed the generic error banner, which only
render after `submit()` itself runs, not the `markAllTouched()`/required-
field-hint branch that fires when `canSubmit` is false), a category must
have been selected, so an empty array reaching the backend doesn't add up
from reading the client code alone. `category.value` is confirmed
`z.number()` (`lib/a1/datasets.ts`'s `CategorySchema`), and nothing
between building `input` and `JSON.stringify`-ing it mutates `categories`.

Couldn't reproduce this live (no way to sign in as Aleksandr from here)
and Vercel's log viewer on this plan doesn't expose the actual request
body sent to `api.a1appp.com`, only the error text — so rather than
guess at a fix that might not be it (this file's own established rule:
verify against the live failure, don't pre-guess), added a diagnostic
instead: `app/api/posts/create/route.ts` and `app/api/posts/update/route.ts`
(commit 7c19883) now log `object`/`categories`/`tags`/whether
location+money were set whenever the backend rejects the call, so the
next 400 tells us the exact shape that actually left this route instead
of what the client code merely appears to construct. Open question until
that next data point: whether `categories` really did leave empty (a
client bug not yet found) or whether this is a backend-side quirk (e.g.
a `oneOf` discriminated-union match failing and surfacing an unrelated
branch's "missing" error) unrelated to what we send at all.

### 6.25 Confirmed: PostInput validates at the request root, not only nested in `input` (2026-08-29)

Live evidence resolved §6.24's open "categories" question completely.
After §6.24's diagnostic logging shipped, the exact payload
(`categories: [30]`, non-empty, confirmed) still got the same "root is
missing required property 'categories'" 400 — ruling out any
post-editor.tsx client bug. Tried the obvious next hypothesis
(duplicate `categories` as a sibling of `input`, not only nested inside
it) and pushed it. The very next live attempt gave a DIFFERENT error:
**"root is missing required property 'content'"** — `categories` was no
longer the complaint.

That shift is the proof, not a guess: `categories` sorts alphabetically
before `content` among `PostInput`'s required keys
(`categories, content, links, location, media, money, object, tags,
title`). The backend walks that list against the ROOT of the request
body and reports the first one still missing there — once `categories`
existed at the root, it moved on to the next alphabetically-missing key.
Conclusion: `posts.createPost` (and by the same contract, `updatePost`)
validates `PostInput` at the top level of the request body, not only
inside an `input` wrapper. §6.1/PLAN.md §0's `{ input }`-only ground
truth was incomplete for this endpoint (or the live behavior diverged
from whatever the OpenAPI spec said at the time it was read).

Fix (commit e432b87): `app/api/posts/create/route.ts` and
`app/api/posts/update/route.ts` now call `posts.createPost`/
`posts.updatePost` with every `input` field spread onto the root of the
call body, alongside keeping `input` itself:
`{ input: parsed.data.input, ...parsed.data.input }` (plus `id` for
update). This satisfies whichever shape the backend actually validates
without needing to guess which — cheap insurance if `input` turns out
to still matter for something else. Not live-reproduced on the update
path specifically, only create; applied to both for symmetry per this
file's own contract ("same PostInput shape update-vs-create").

**Token-revoke mystery, refined (not yet closed):** the same
reproduction's `[visitor-call] 401 on posts.createPost` diagnostic
(added in §6.24) logged `tokenAgeMs: 1243246` against the token's own
`expiresAt` — i.e. the access token had been expired for a completely
ordinary ~20.7 minutes when this request fired, consistent with a
normal, expected access-token TTL, not an early/external revocation.
That rules out "the access token itself expired suspiciously early."
The mystery narrows to exactly one step: why did `auth.refreshToken`,
called for what should be a first, unused refresh token, come back
"Token revoked" instead of issuing a new access token? Still unresolved
— §6.23's coalescing fix doesn't explain a single, non-concurrent
refresh failing either. Left as open per §6.23/§6.24's existing
alternative theory (refresh tokens may be single-use/rotating and this
session's stored refreshToken had already been consumed by something
not visible in this window); no new evidence either confirms or
refutes that today.

### 6.26 Confirmed: write-side `object` literal needs an "-input" suffix (2026-08-29)

Immediate follow-up to §6.25's fix. With `categories`/`content` now
reaching the request root correctly, the very next live attempt gave a
brand-new, extremely specific 400: `'object' must be one of:
post-collaborator-input, post-supplier-b2b-input,
post-job-employing-input, post-job-seeking-input, post-brainstorm-input,
post-meetup-input`. The backend's write-side discriminator uses its own
`"-input"`-suffixed literal set — `post-job-employing`/`post-job-seeking`
(no suffix) is what the READ side returns on a fetched `Post.object` and
what this whole codebase otherwise uses (mappers, feed, datasets,
sitemap, `components/post-editor.tsx`'s own `PostObject` UI type) — but
`posts.createPost`/`updatePost` wanted the `-input` variant instead.

Fix (commit ee1ee7a): `lib/a1/schemas.ts`'s `PostInputSchema.object` now
validates against `PostInputObjectSchema` (`"post-job-employing-input"`
/ `"post-job-seeking-input"`), and `components/post-editor.tsx`'s
`submit()` appends `-input` only at the point it builds the
create/update payload (`` `${object}-input` ``) — every other place in
the app keeps using the plain literal unchanged, since those are all
verified-correct read-side/UI usages, not this write-side field.

This is the second of two backend-shape surprises found back-to-back on
the very first real live attempts at this endpoint (root-vs-nested
`input`, §6.25; now the discriminator's literal set) — both textbook
examples of PLAN.md's own long-standing rule: verify against the first
live 400, fix the exact shape, don't keep guessing blind. Not yet
confirmed end-to-end (post successfully created) — that's the next
live attempt to watch for.

### 6.27 Confirmed: drop the `input` wrapper entirely — PostInput lives only at the root (2026-08-29)

Third confirmed step in this same live-debugging chain (§6.25, §6.26).
With every required field present at the root and `object` carrying the
correct `-input`-suffixed literal, the next live 400 was **"root has
unknown property 'input'"** — the backend enforces
`additionalProperties: false` at the root, so §6.25's defensive
belt-and-suspenders (`{ input: parsed.data.input, ...parsed.data.input
}`, keeping `input` "just in case") had itself become the one thing
still wrong.

Fix (commit 1f9cf84): dropped `input` entirely.
`app/api/posts/create/route.ts` now calls
`callAsVisitor<unknown>("posts.createPost", parsed.data.input)` — the
whole `PostInput` object IS the request body, no wrapper. `posts/update`
keeps `id` as a root sibling (it isn't part of `PostInput`) alongside
the spread, dropping `input` there too. Not reproduced live on the
update path specifically, applied for symmetry per this route's own
documented "same PostInput shape as create" contract.

This closes out the three-part shape mystery that started at §6.24:
PLAN.md's `{ input }`-wrapped ground truth for `posts.createPost` was
wrong on THIS live backend (whatever the OpenAPI spec said when §0/§6.1
were written), the `object` literal needed an `-input` suffix distinct
from the read side, and the request body is `PostInput` directly with
no wrapper and no extra keys. Each of the three fixes was driven by an
exact, different, verified live error message, not a guess kept in
place hoping it was right — this is the discipline PLAN.md has asked
for from the start, applied three times in a row on one endpoint.
Watching the next live attempt to see whether post creation actually
succeeds now that all three are fixed together.

### 6.28 Confirmed: strip the server-assigned `_id` from media items (2026-08-29)

Fourth confirmed step in this same chain (§6.25–§6.27). With the
object/wrapper shape fixed, the next live 400 was **"'media.0' has
unknown property '_id'"**. `PostInputSchema.media` reused
`MediaDocumentSchema` verbatim (this file's own prior comment: "sending
exactly what upload.confirm handed back keeps the write side symmetrical
with the read side") — that assumption was wrong for `_id` specifically:
the write side doesn't want the server-assigned id echoed back.

Fix (commit 555622f): `PostInputMediaSchema = MediaDocumentSchema.omit({
_id: true })`, used for `PostInputSchema.media`. zod's default "strip
unrecognized keys" behavior means `_id` is dropped from
`parsed.data.input.media` automatically — no change needed in
`components/post-editor.tsx`, which still builds `media:
media.map((m) => m.doc)` from whatever `upload.confirm` returned.
Deliberately didn't touch any other `MediaDocument` field (`mimetype`,
`fileReference`, `date`, `sizes`, `ttl`, `flags`, `attributes`, `object`)
since only `_id` was flagged — if the backend rejects another one next,
that's the next live 400 to fix the same way, not something to
pre-guess now.

Running tally on this one endpoint, all found via real live 400s in one
evening, none guessed blind: `{ input }` wrapper → root-level fields
(§6.25), `object` literal needs `-input` suffix (§6.26), drop the
`input` key entirely (§6.27), strip media's `_id` (§6.28). Watching the
next live attempt for either success or the next specific mismatch.

### 6.29 Confirmed: strip `mimetype` from media items too (2026-08-29)

Fifth confirmed step in this same chain (§6.25-6.28). With `_id`
stripped from media (§6.28), the very next live 400 on the same request
was **"'media.0' has unknown property 'mimetype'"** (request id
c7qzj-1788032279178-df69f0724538, deployment dpl_5Qjdq7kixZWypTzjWJtC2AXFwPzc,
2026-08-29 19:37:59 UTC). Same shape-mismatch pattern as `_id`: the
write side of `posts.createPost` doesn't want every field the read side
(`upload.confirm`) hands back for a media document.

Fix: `PostInputMediaSchema = MediaDocumentSchema.omit({ _id: true,
mimetype: true })`. As with §6.28, no `components/post-editor.tsx`
change needed — zod's default "strip unrecognized keys" behavior drops
`mimetype` from `parsed.data.input.media` automatically. Per the
discipline stated in §6.28 itself, only the one confirmed-unwanted field
(`mimetype`) was removed this round, not a preemptive guess at
`fileReference`/`date`/`sizes`/`ttl`/`flags`/`attributes`/`object` too —
if the backend rejects one of those next, that's the next live 400 to
fix the same way.

Running tally on this one endpoint, all found via real live 400s, none
guessed blind: `{ input }` wrapper -> root-level fields (§6.25), `object`
literal needs `-input` suffix (§6.26), drop the `input` key entirely
(§6.27), strip media's `_id` (§6.28), strip media's `mimetype` (§6.29).
Watching the next live attempt for either success or the next specific
mismatch.

### 6.30 Confirmed `date` too, then a deliberate jump to `fileReference`-only (2026-08-29)

New deployment (dpl_4aExvNd8ZDX33j7UWaXRx5X6WkQP) confirmed the `_id` and
`mimetype` fixes from §6.28-6.29 both landed and both stayed fixed - the
next live 400 moved to a THIRD field: **"'media.0' has unknown property
'date'"** (request id bwjwh-1788032961114-e482054acc84, 2026-08-29
19:49:21 UTC).

That's three confirmed rejections in a row (`_id`, `mimetype`, `date`),
all of them exactly the fields a client never invents and a media
pipeline computes server-side. Given how slow and how demoralizing each
one-field-per-round-trip cycle is for live testing, this round breaks
from the strict "only fix what's confirmed" discipline used in
§6.25-6.29 and makes a reasoned jump instead of waiting for `sizes`,
`ttl`, `flags`, `attributes`, and `object` to fail one at a time too:
every remaining `MediaDocumentSchema` field besides `fileReference` is
server-derived metadata (`sizes` = computed thumbnail variants, `ttl`/
`flags` = internal state, `attributes` = server annotations, `object` =
a discriminator upload.confirm itself sets). `fileReference` is the only
field that is genuinely "which file does this post point to" - the one
piece of information the client actually owns.

Fix: `PostInputMediaSchema = MediaDocumentSchema.pick({ fileReference:
true })` - media items now send `{ fileReference }` and nothing else.
This is a hypothesis, clearly weaker evidence than §6.25-6.29 (only 3 of
7 excluded fields are individually confirmed), not a certainty. If the
backend answers with "root is missing required property" for something
under `media.0` (e.g. it turns out to need `sizes` back for display),
that's the very next live 400 to read and fix - don't guess further,
go back to reading exact errors.

### 6.31 Confirmed: application questions need their own `object` too (2026-08-29)

First real post creation with a custom application question ("How r
u?") hit a brand new field entirely, on `post-job-seeking-input` this
time (Find a job, not Offer a job) — **"'apply.questions.0' is missing
required property 'object'"** (request id
mc7qv-1788033861108-729593446d1e, 2026-08-29 20:04:21 UTC). Every
earlier fix in this session had been reached with an empty questions
list, so this path was never exercised live until now.

Unlike the root `object` 400 back in §6.26, this error only says the
property is missing — it does NOT enumerate the allowed values. Fix
(schemas.ts's PostInputQuestionSchema, and components/post-editor.tsx's
one call site building `input.apply`): added `object:
"apply-question-input"` as a literal, following this file's own
`<kind>-input` convention for every other write-side discriminator so
far — explicitly a guess, not confirmed like §6.25-6.29's fixes were.
If the backend comes back with "'apply.questions.0.object' must be one
of: ..." next, that enumeration is the live evidence to correct this
against — don't guess a second time past that, read the exact error.

### 6.32 Confirmed: a country-level location 400s on create (2026-08-29)

With §6.31's `apply.questions.0.object` fix live, the very next real
attempt (Find a job, London selected as "London, United Kingdom") hit a
DIFFERENT error shape than every earlier one in this chain — not
`INVALID_INPUT` with a field path, but **`{"code":"BAD_REQUEST",
"message":"You cannot set country as location for a post."}`** (request
id gwfp9-1788042872846-071609839cc4, 2026-08-29 22:34:33 UTC). Confirms
`apply.questions` is fully fixed (no complaint about it this time) and
surfaces a genuinely new rule: `posts.createPost` refuses a
`WorldLocation` whose own `city` field is empty (a bare country entry,
not a real city).

lib/a1/locations.ts's `WorldLocationSchema` already carries `city`
(`.catch("")` when absent) — app/api/locations/route.ts's `{id, label}`
trim just never forwarded it. Fix: that route now also returns
`hasCity: loc.city !== ""` per result, and
components/post-editor.tsx's `searchLocationsClient` drops any result
with `hasCity === false` before it ever reaches the autocomplete
dropdown — a visitor physically cannot select a country-only location
in the post editor anymore, so this 400 shouldn't recur from the editor
going forward. Deliberately NOT touched: components/filters-form.tsx's
own location search, which reuses this same route to filter the public
feed by location — filtering by a whole country there is legitimate,
only the post editor needed the narrower list.

### 6.33 Confirmed: update wants the nested `{ id, input }` shape after all (2026-08-29)

First real edit of an existing post (via the new "•••" > Edit on the
post detail page, §6.30's PostOwnerMenu) hit `posts.updatePost`'s first
live 400 ever on this path — **"root is missing required property
'input'"** (request id fg8xq-1788043772574-4419b686dde6, 2026-08-29
22:49:32 UTC, after three retries all failing identically). Every
earlier "fix" to app/api/posts/update/route.ts's request shape had
copied create's own root-flattening fix (§6.24/§6.25/§6.27) over by
assumed symmetry — this file's own comment said so explicitly ("not
live-reproduced on this path specifically"). That assumption was wrong:
update's root schema requires the `input` key to be PRESENT, the exact
opposite of what create's schema wants.

Fix: reverted the call body back to the original nested shape, `{ id,
input: parsed.data.input }`. Lesson carried into the comment itself —
create and update are NOT guaranteed to share a request shape just
because they share a body schema (PostInputSchema); don't re-apply one
endpoint's confirmed fix to the other without its own live evidence.

### 6.34 UI polish: "•••" menu next to the badge, whole feed card opens the post (2026-08-29)

Two more screenshot-driven layout requests, neither backend-confirmed
(no API involved) — pure client-side layout:

- **PostOwnerMenu placement**: "Кружок с 3 точками вынеси наверх,
  напротив тега 'job'" — the "•••" Edit/Delete trigger
  (`components/post-owner-menu.tsx`, added in §6.30) moved in both
  `app/jobs/[slug]/page.tsx` and `app/talents/[slug]/page.tsx` from
  sitting next to the author byline to sitting next to the top
  "Вакансія"/"Job" (or "Фахівець"/"Talent") status badge, in a new
  shared `flex items-center justify-between` row. No prop or behavior
  changes to the component itself.

- **Feed card click area**: annotated screenshot circling almost the
  entire card in green — badge, whitespace, description text, tag
  pills — meaning all of it should open the post on tap, while the
  avatar and author name keep opening the profile exactly as before.
  `components/post-card.tsx`'s title `Link` grows a CSS "stretched
  link": `after:absolute after:inset-0 after:content-['']` sized to the
  whole card via a new `relative` on the `<article>`. Non-positioned
  siblings (badge span, description Link, tag spans) sit below that
  pseudo-element in paint order and click through to it; the avatar
  Link and author-name Link get `relative z-10` to stay on top and keep
  routing to the profile. No nested `<a>` tags (invalid HTML) and no
  client JS added — still a pure server component.

### 6.35 Fix: feed default-cat avatars went square by mistake (2026-08-29)

Screenshot: two feed cards side by side, one avatar circular (real
photo), the other a rounded square (default cat) — read as "why is one
of these rectangular?" Root cause was mine, not the backend: §6.34's
predecessor edit (and, it turns out, the original avatar-shape pass
earlier the same day) had generalized the rounded-square treatment from
`app/u/[username]/page.tsx`'s profile header into `components/
post-card.tsx`'s feed cards too, on the assumption they should match.

Aleksandr corrected this directly: feed, onboarding, and profile are
three separate presentations of the same default-cat asset, not one
shape to keep in sync — feed cats are round with the fill showing and
no animation, onboarding cats are square and animated, profile cats
have no fill background and their own different animation. Only the
profile page's square treatment was ever actually requested; the feed
was never supposed to change.

Fix: `components/post-card.tsx`'s default-avatar `<img>` back to
`rounded-full`, matching real-photo avatars in the same card.
`app/u/[username]/page.tsx` (profile) is untouched — still square, per
the original request. Left `app/jobs/[slug]/page.tsx` and
`app/talents/[slug]/page.tsx`'s post-detail byline avatars as rounded
square for now since Aleksandr's correction named feed/onboarding/
profile specifically, not the detail page byline — worth asking about
separately if it turns out to look inconsistent there too, but not
guessing at it here.

### 6.36 UI: hide draft-save/schedule when editing an already-published post; revert profile avatar shape too (2026-08-29)

Two more screenshot-driven fixes, UI-only:

- **Edit modal footer**: "если пост уже запощен - кнопок 'зберегти
  чернетку' и 'запланировать' не должно быть... а зберегти должно быть
  на всю ширину" — draft-save and scheduling only make sense for a post
  that hasn't gone out yet. `components/post-editor.tsx`'s
  `EditablePost` type gained an optional `isDraft?: boolean` (already
  supplied by `MinePost` in `components/post-owner-menu.tsx`, which is
  the only `mode="edit"` caller today); a new `isEditingPublishedPost =
  mode === "edit" && initialPost?.isDraft === false` collapses the
  footer to a single full-width "Зберегти" button in that case, leaving
  the existing three-button (clock/draft/post) footer untouched for
  create mode and for editing an actual draft.

- **Profile avatar shape, reverted**: §6.35 already reverted the feed's
  default-cat avatars from square back to circle after Aleksandr
  clarified feed/onboarding/profile are three separate presentations.
  He's now clarified the profile is ALSO round, not square — the
  square-crop change (this file's own 2026-08-29 comment, made earlier
  the same day, reasoning about the gradient-fill asset) was itself the
  mistake, not just its copy into the feed. `app/u/[username]/page.tsx`'s
  default-cat `<img>` is back to `rounded-full`, matching the
  real-photo branch above it.

### 6.37 UI: remove the description (i) tooltip; case-insensitive tag translation fallback (2026-08-29)

- **"Убери (i)"**: removed the small "i" info-bubble next to the
  "Опис"/Description label in `components/post-editor.tsx` — its tip
  text keeps living on as the textarea's own placeholder, which already
  showed the same copy, so nothing it explained is actually lost.

- **Tags still untranslated in the feed**: screenshot showed "remote"
  and "full-time" still in English with Ukrainian selected, even after
  §6.34 wired `TagLabel`/`translateTagLabel` into the feed and detail
  pages. Root cause: `TAG_LABEL_TRANSLATIONS` is keyed on tag.TEXT
  ("Remote") because that's what `post-editor.tsx`'s own picker has on
  hand — but `toggleTag()` there stores tag.VALUE into a post's `tags`
  array (`lib/a1/datasets.ts`'s `Tag = {value, text}`), and that's all
  the feed/detail pages ever see back. For every tag confirmed live so
  far, the value is just a lower-cased/hyphenated form of the same word
  ("remote", "full-time", "hybrid", ...), so `translateTagLabel` now
  falls back to a case-insensitive match against the same table before
  giving up. Doesn't fix a value that isn't just a re-cased version of
  its text (experience tags look like "exp-3-yr" against a text of
  "3") — no live tag list to confirm those value strings against, so
  not guessing at a second table for them yet.

### 6.38 UI: confirm-before-close in the create-post modal (2026-08-29)

Aleksandr, from 3 screenshots of the native app's own "New post" flow
(the form, its close-confirm prompt, and the resulting Draft Posts
sheet): "если я заполнил поля и случайно кликнул вне формы, форма
должна меня спросить 'сохранить черновик'... а то я могу случайно
нажать, оно выйдет и будет заеб переписывать."

`components/post-editor.tsx` gained:
- `isDirty` (`mode === "create"` and at least one field has content) —
  scoped to create mode only; a fresh blank form has nothing worth
  guarding, and diffing an edit session against its own `initialPost`
  is a separate, fuzzier problem not asked for here.
- `requestClose()` — the backdrop click and the header's ✕ now call
  this instead of `onClose` directly; it opens a small "Зберегти
  чернетку?" confirm popover when `isDirty`, otherwise closes
  immediately exactly like before.
- The popover's two actions: "Зберегти чернетку" (same required-field
  gate as the footer's own draft button — `markAllTouched()` and stay
  open if invalid, otherwise save as a draft and THEN close, via a new
  `submit(action, { closeAfter })` option) and "Продовжити редагування"
  (just dismisses the popover, per Aleksandr's own 2-button description
  of the native flow — no separate "discard everything" button added,
  matching what was actually asked for).

Not yet done (same request, larger scope, next up): the drafts-count
badge/list in the editor's own header (native app's file-icon-with-
number, opening a "Draft Posts" sheet) — needs its own design pass,
tracked separately rather than guessed at in the same commit.

### 6.39 UI: "this is your post" badge on feed cards (2026-08-29)

Aleksandr, from a screenshot where a feed card's cat avatar (blue) and
his own nav avatar (purple) didn't match, worried it might be a second
account: reiterated to him that this is expected (different seed
strings for the same deterministic cat picker, `pickDefaultCatAvatar` —
`post-card.tsx` seeds off the author's username/name, `avatar-menu.tsx`
seeds off email — not a real account mismatch), and he asked for the
actual fix instead of chasing avatar parity: "надо куда-то добавить
значок на карточке, типа что это мой пост... в мобильном приложении
это отображается таким маленьким человечком возле имени."

New `components/my-post-badge.tsx` — a small accent-colored person-icon
badge, client component (same reasoning as `post-owner-menu.tsx`: no
server-side-comparable identity between a visitor's session and a
post's public author), checking `/api/posts/mine` and rendering nothing
until it resolves or for someone else's post. One shared fetch/promise
for every badge on a page rather than one per card, since a feed page
can mount dozens of `PostCard`s at once. Wired into `post-card.tsx`
next to the author's name (not the avatar, which is exactly what
prompted the confusion).

### 6.40 Title max length (unconfirmed placeholder); Posting/Updating banner with cat animation; feed auto-refresh (2026-08-30)

Three related fixes, one from a live error with no usable number in it,
two from a native-app screenshot + an animated sticker Aleksandr sent:

- **Title max length**: "запостил такой заголовок, длинный, и не мог
  запостить пост." Live Vercel logs (2026-08-29 23:29 UTC,
  `posts.createPost`) show only a bare `500 INTERNAL_SERVER_ERROR` with
  no validation message or character count — confirms a cap exists
  server-side, but not what it is. `components/post-editor.tsx` gained
  `TITLE_MAX = 120` as an explicit placeholder (`maxLength` attribute +
  a defensive `.slice()` on change) — flagged in its own comment as a
  guess pending Aleksandr checking the mobile app's own input limit,
  not a confirmed number like every other fix in this log.

- **Posting/Updating banner**: Aleksandr sent a `.tgs` (Telegram
  animated sticker — gzipped Lottie JSON) of a cat, decoded and saved as
  `public/animations/posting-cat.json`, plus a description of the
  native app's own flow: "хочу... чтобы страница релоадилась и
  показывала posting... прогресс-бар лоудер и надпись posting...
  можно справа анимацию... этого же кота используем на апдейтинг."
  `post-editor.tsx` now renders a small floating card (no dark
  backdrop — feed stays visible/scrollable underneath) the instant
  Post/Save-changes is clicked (`pendingAction` is set synchronously
  before the fetch), replacing the dialog entirely: an indeterminate
  progress bar + "Публікується.../Оновлюється..." label on the left,
  the cat animation (via the existing `components/lottie-player.tsx` —
  already used for onboarding icons, no new player written) on the
  right. Not shown for a draft save, which already has its own inline
  confirmation and stays open. `package.json` also picked up a
  pre-existing inconsistency in the same pass: `lottie-web` (the
  library `lottie-player.tsx`/`occupation-icon.tsx`/`logo-play.tsx`
  already `import("lottie-web")` at runtime) was missing from
  `dependencies` — only the unused, never-imported `lottie-react` was
  listed. Fixed to declare what the code actually uses.

- **Feed auto-refresh**: the other half of the same request — a
  published post previously wouldn't appear in the feed until its
  `revalidate` ISR window naturally passed. `app/api/posts/create`,
  `update`, and `delete` now call `revalidatePath("/")` and
  `revalidatePath("/talents")` on success (skipped for a draft
  save/edit, which never shows in either feed anyway) — same two feed
  roots `app/api/revalidate/route.ts`'s existing backend-pushed webhook
  already revalidates. `components/create-post-fab.tsx` was the one
  `PostEditor` mount point with no `onSaved` at all (post-owner-menu.tsx
  and my-posts-panel.tsx already had their own), so posting from the
  main "+" button never refreshed anything behind it — now passes
  `onSaved={() => router.refresh()}`.

### 6.41 Own-profile view: posts as cards on `/u/[username]`, "View profile" link in the avatar menu (2026-08-30)

Aleksandr: "давай сделаем... чтобы мы могли зайти к себе на профиль и
посмотреть, как там у нас всё устроено... могли... нажать на наши
посты и чтобы наши посты отображались такими карточками тоже... я
сильно над UI не думал, но думаю, что ты что-то прикольное придумаешь"
— explicitly left the UI shape up to this pass rather than specifying
it screenshot-by-screenshot like most of this log's other entries.

Two parts:

- **Posts-as-cards on the profile page.** `app/u/[username]/page.tsx`
  already builds a mapped `UserProfileResult` for the header/bio/
  favorites sections; it now also fetches the *raw* profile
  (`lib/a1/users.ts`'s new `fetchUserRawByUsername`, with the existing
  `fetchUserByUsername` rebuilt on top of it) purely to get the
  profile's real `_id`, then calls a new `lib/a1/feed.ts` helper,
  `fetchPostsByAuthor(authorId)`, which is just `posts.search({
  author: authorId, limit })` — confirmed viable because
  `app/api/posts/mine/route.ts` already calls the same endpoint with
  `author: "me"` and gets both post kinds back in one call, so an
  arbitrary author id works the same way (`PostsSearchInputSchema`
  already types `author` as `"me" | string`). Renders with the
  existing `components/post-card.tsx` — same component the main feed
  uses, no new card built — in a "Пости"/"Posts" section placed after
  Favorites, only when there's at least one.

- **"View profile" row in the avatar menu.** `components/avatar-menu.tsx`
  had no way to point a signed-in visitor at their own `/u/...` URL —
  its own header comment already documented that there's no real
  whoami endpoint, only a deterministic cat avatar seeded on email.
  Rather than add a new backend call, `app/api/posts/mine/route.ts`'s
  `summarize()` now also echoes `authorUsername` (the real
  `author.username` off any of the visitor's own posts — `author: "me"`
  guarantees it's genuinely theirs). The avatar menu fetches
  `/api/posts/mine` once it knows the visitor is signed in and renders
  a "Переглянути профіль"/"View profile" link above "Мої пости" only
  when a username actually came back. A visitor with zero posts still
  has no way to resolve their own profile URL through this path — the
  row is simply omitted for them, not shown broken.

Known limitation, unchanged from before this entry: still no real
"get my profile" endpoint. Once one exists, both of today's
`authorUsername`/raw-profile-id workarounds can be replaced with a
direct call.

### 6.42 CONFIRMED: two production deploys silently failed to build (2026-08-30)

Aleksandr reported three things missing/broken right after testing a live
deploy — the Posting/Updating cat banner never appeared, the profile
link he'd filled in at post creation wasn't showing on the post page,
and a garbled duplicate-looking title. Checked Vercel's Deployments tab
directly rather than guessing: the two most recent production builds
(`d75de66` "Add title max length, Posting/Updating banner..." and
`a516f77` "PLAN.md: document §6.41...") both show **Build Failed**,
`npm run build` exiting 1 — the live site was still serving `d3021da`,
everything from §6.38 onward (the badge, confirm-close, banner, title
limit, feed auto-refresh, and §6.41's whole profile feature) never
actually reached production. That fully explains the cat banner not
showing; it does not explain the missing link (see §6.43) or the
garbled title, which looks like the character-limit correctly
truncating a test string typed/pasted twice, not a bug.

Root cause (from the build's own log, not a guess): `TS2367` at
`components/post-editor.tsx:1585` — `"'\"draft\" | null'` and
`'"post"'` have no overlap". `isSubmittingPost` (§6.40) is
`pendingAction === "post" || pendingAction === "schedule"`, and the new
`if (isSubmittingPost) return <banner>;` early return means
TypeScript's control-flow narrowing on aliased conditions rules out
`"post"`/`"schedule"` for `pendingAction` everywhere below it in the
function — so the three leftover `pendingAction === "post" ? <Spinner/>
: ...` / `pendingAction === "schedule" ? <Spinner/> : ...` ternaries
inside the footer buttons became genuinely unreachable code once the
banner replaces the whole dialog during submission, and `next build`'s
real type-check (not just syntax) caught it. This session's usual
pre-commit check (`tsc --noEmit` filtered to `error TS1[0-9]{3}:`,
syntax only, chosen because no `node_modules` is installable here or on
the device — npm registry 403s both places) does not run this class of
check, so it slipped through both commits.

Fixed by deleting the three dead ternaries (the buttons just show their
label directly now — correct, since the pending-spinner state they
guarded can no longer be reached while this JSX renders at all).
Process fix for future changes touching this file: also run the same
`npx tsc` invocation WITHOUT the `TS1` filter and read past the
`TS2307`/`TS7006` "Cannot find module"/"implicitly any" noise (expected
without `node_modules`) for other codes like `TS2367` — that noise
doesn't hide same-file control-flow errors like this one, only ones
that need real library types.

Also fixed while in this file, from a live mobile screenshot
(Aleksandr: "На мобильном чуть поломался UI с годом и временем. Уменьши
ширину"): the schedule popover's year `<select>` was rendering at
nearly full width, squeezing the month `<select>` next to it down to
just its disclosure arrow. Cause: `inputClass` already bakes in
`w-full`; appending `w-20` has identical CSS specificity, so which one
wins in the compiled stylesheet is decided by Tailwind's fixed utility
order, not by source order in the className string — `w-full` was
winning. Fixed with Tailwind's `!` (important) modifier on the
intended override (`!w-20`), which cannot lose that fight regardless of
build order; applied the same fix to the time `<input>` (was also
inheriting `inputClass`'s `w-full`, stretching edge-to-edge) with
`!w-32`.

Separately, Aleksandr confirmed `TITLE_MAX = 120` (§6.40) against the
mobile app's own limit ("да, вроде такой лимит и есть") — no longer a
placeholder, comment updated to say so.

### 6.43 Always-available profile link; missing post link finally rendered (2026-08-30)

Two corrections to §6.41 the moment Aleksandr saw it live:

- **"Просмотр профиля" was gated on having a post.** §6.41's first pass
  resolved the visitor's own username from `/api/posts/mine`'s
  `authorUsername`, which only exists if they have at least one post.
  Aleksandr: "должна быть возможность всегда посмотреть свой профиль."
  Since PLAN.md's endpoint table still has no dedicated "get my
  profile" read, the only authenticated call that returns a full user
  object at all is `account.updateProfile` — documented as "no fields
  required — send only what changed" (§6.1). New route
  `app/api/account/whoami` calls it with a genuinely empty `{}` as a
  no-op "read" and parses the response with the same `parseUserProfile`
  `users.getByUsername` already uses. **Flagged, not presented as
  confirmed**: no code in this project has ever actually parsed
  `account.updateProfile`'s response body before (the existing
  update-profile route discards it), so assuming it returns the same
  `Resource.User` shape is an inference from the endpoint table, not
  something proven live yet — `parseUserProfile` fails closed (link
  just stays hidden) rather than throwing if that guess is wrong.
  Needs a live check: open the avatar menu signed in with zero posts
  and confirm "Переглянути профіль" appears.

- **The link field has never been shown anywhere.** Aleksandr: "в
  отображении поста нет ссылки, хотя я заполнял при создании." Not a
  regression — `components/post-editor.tsx` has always collected it
  (`linkUrl` → `links: [{ title: "", url }]`) and `lib/a1/mappers.ts`
  has always carried `WebPost.links` through, but neither
  `app/jobs/[slug]/page.tsx` nor `app/talents/[slug]/page.tsx` ever had
  any markup for it. Added a "Посилання"/"Link" section to both, right
  after the description, rendering each link as an `<a target="_blank"
  rel="noopener noreferrer nofollow">`.

### 6.44 Posting banner actually visible; title-length defense-in-depth; profile page redesign (2026-08-30)

Three more live reports after §6.42/§6.43 finally reached production:

- **"Кот с прогресс-баром тоже не появился."** The banner WAS mounting —
  `components/lottie-player.tsx`'s own 2026-08-29 finding (PLAN.md
  §6.15) already documented why: its Lottie JSON files are 180-350KB
  (`posting-cat.json` is ~247KB) and take a real, sometimes multi-second
  fetch+parse on a cold load. `posts.createPost` itself is usually
  faster than that, so the whole banner — including the still-invisible,
  still-loading cat — could mount and get torn down by `onClose()`
  before a human eye registers it. Fixed two ways: (1)
  `components/post-editor.tsx` now preloads `lottie-web` and
  `posting-cat.json` the moment the editor opens (a plain fire-and-
  forget `useEffect`), not only once Post is clicked, so the asset is
  very likely already cached by the time the banner needs it; (2)
  `pendingSinceRef` timestamps when the banner appears, and `submit()`
  now holds it on screen for at least 900ms regardless of how fast the
  API call actually was, so it's guaranteed visible even on a fast
  connection or a cache miss.

- **Title still exceeded 120 chars and the create call failed.**
  `maxLength` + slice-on-`onChange` (§6.40) only reliably clamp a plain
  keystroke or paste; this is at least the second live report of a
  mobile input (this session's pattern strongly suggests voice
  dictation) putting more than that into the field anyway — some
  composition/dictation insert paths don't go through the same
  synchronous per-chunk `onChange` clamp. Fixed with two more layers:
  a `useEffect` that reactively re-clamps `title` on every change
  regardless of how it got set, and `title.trim().slice(0, TITLE_MAX)`
  at the actual submit call, so whatever is sent to `posts.createPost`/
  `updatePost` can never exceed the limit even if the visible input
  briefly did.

- **Profile page + avatar menu redesign**, from Aleksandr's screenshots
  and: "мои посты и просмотр профиля должны жить в одном месте...
  поднять выше... должны быть просто две кнопки, как в мобильном
  приложении — bio и посты."
  - `components/avatar-menu.tsx`: "Переглянути профіль" and "Мої
    пости" were two plain text rows easy to miss among theme/language.
    Merged into one visually distinct, icon-led block (tinted
    background, person-circle icon + email + "Переглянути профіль"
    subtitle + chevron, "Мої пости" row underneath with its own icon),
    moved to the very top of the panel, right where email used to sit
    alone.
  - New `components/profile-tabs.tsx` (client component, `hidden`-
    based toggle, no extra fetch) splits `/u/[username]` into exactly
    two tabs matching the native app: "Про мене"/Bio (everything that
    was already there — bio text, work experience, skills, languages,
    hobbies, favorites, etc., all still individually conditional on
    having data) and "Пости"/Posts (the §6.41 post-cards grid, now with
    an empty state instead of just vanishing when there are none). The
    identity header (avatar, name, username, occupation/location line)
    stays above the tabs, unchanged.
  - **"Вот эти посты, они все удалённі, ты их зачем-то показал"** — a
    real bug, not a testing artifact: `app/api/posts/mine/route.ts`
    deliberately reads the raw `Post` (bypassing `mapPosts()`'s public-
    feed filtering) so it can show drafts/scheduled posts to their own
    author — but that meant it never excluded the ARCHIVED flag bit
    either (this backend's delete, per `lib/a1/post-flags.ts`'s own
    OpenAPI-sourced bit table), so an already-deleted post kept
    reappearing in "Мої пости", mislabeled "Опубліковано". New
    `isArchived()` helper in `post-flags.ts`; `mine`'s route now
    filters it out before returning the list.
  - **Not changed, on purpose**: the "World 2"-only profile Aleksandr
    flagged ("я скорее всего заполнял мою сущность, а она не
    отображается") — the page already conditionally renders bio,
    occupation, expertise, work experience, skills, etc. whenever
    `WebProfile` actually has them (each section is its own `profile.X
    && ...` check, unchanged by this pass). That specific test account
    ("AI Ex") just doesn't have those fields filled in server-side —
    confirmed by reading the fetched `WebProfile` shape, not guessed.
    Worth Aleksandr double-checking he filled in that profile under the
    same account he's viewing.

### 6.45 Avatar menu: real photo, drop the duplicate "Мої пости" row (2026-08-30)

Aleksandr, from a screenshot of §6.44's merged account block: "поставь
не цветная векторное синее, поставь аватар, персональный этот профиль...
мои посты можно убрать, потому что сейчас будет унифицировано: нажимаем
персональный профиль, а там уже есть мои посты, не обязательно
дублировать."

- `app/api/account/whoami` now also returns `avatarUrl`, built the same
  way every other real-photo-or-cat-fallback spot in this app already
  does (`buildMediaProxyUrl(profile.photos[0])`) — this closes the exact
  gap `components/avatar-menu.tsx`'s own KNOWN GAP comment flagged
  before this route existed. Also confirms, now live (Aleksandr's own
  screenshot showed "Переглянути профіль" working end to end), that
  §6.43's flagged guess about `account.updateProfile({})`'s response
  shape was right.
- `avatar-menu.tsx`: the merged block's icon and the nav's own 36px
  avatar button both now show that real photo when whoami resolves one,
  falling back to the deterministic cat otherwise — previously the nav
  button always showed the cat regardless, so the two didn't even agree
  with each other.
- Removed the "Мої пости" row and its `MyPostsPanel` mount entirely.
  **Tradeoff worth flagging**: `components/my-posts-panel.tsx` was the
  only place that showed drafts/scheduled posts (with inline edit/
  delete) — the profile's own Posts tab (§6.44) only shows already-
  published posts, matching the public feed by design. Left
  `my-posts-panel.tsx` in place, unused but working (this project's
  usual policy — see account-menu.tsx's own history), rather than
  deleting it, specifically so drafts/scheduled have somewhere to go
  back to if that gap turns out to matter later.

### 6.46 Post editor: "close without saving" option (2026-08-30)

Aleksandr, mid-session, screenshot of the §6.41 close-confirm popover:
"давай ещё кнопку добавим... если я просто хочу закрыть, но ничего
сохранять там не хочу."

- The popover only offered two choices: save as draft, or continue
  editing — no way to just discard and close. Added a third, visually
  quieter text-button ("Закрити без збереження" / "Close without
  saving") beneath the other two, that calls `onClose()` directly —
  the exact same path `requestClose()` already takes when the form
  isn't dirty at all, just reached explicitly instead of only via the
  "nothing was typed" shortcut.
- No new state, no new confirmation-of-the-confirmation — one click
  discards and closes, matching what the user asked for plainly.

### 6.47 Top nav: drop the fog/shadow effect; search box widens on focus (2026-08-30)

Aleksandr, desktop screenshot of the bar over the Вакансії feed: "убери
полностью тень отсюда сверху." components/progressive-blur.tsx had
already gone through four rounds of retuning (mask-math fix, mobile
height cut twice, hidden on mobile outright — see that file's own
history) without ever landing on a look he was happy with on desktop
either. This time removed `<ProgressiveBlur>` from site-nav.tsx entirely
rather than tuning again; the component itself is left in place, unused.

Separately, same bar: "базово поиск такой ширины как сейчас, но при
нажатии на него развидвался, добавлялось процентов 50-60 ширины." The
compact desktop search box's 12rem resting cap (2026-08-29) now stays
exactly that at rest; components/filters-form.tsx pushes an inline
max-width (18.6rem, +55%) onto the `#nav-search-slot` host element
(reached via the same `document.getElementById` ref this component
already held for the portal) when the input is focused, and clears it
on blur so the CSS class stays the single source of truth for the
resting width. site-nav.tsx adds a transition on that element so the
change reads as a widen, not a jump.

### 6.48 Post editor: schedule popover closes on any other click in the form (2026-08-30)

Aleksandr, 2 screenshots of the schedule/calendar popover open over the
form: "надо чтобы, когда мы нажимаем внутри первой модалки вне
календаря, где угодно... неактивные кнопки, чтобы она закрывалась."
The popover already stopped ITS OWN clicks from reaching the level-1
dialog's requestClose, but nothing closed the popover itself when a
click landed elsewhere in the form (a format pill, blank padding).

Added an invisible overlay scoped to just the scrollable form area
(between the header and footer) — z-20, above that area's own sticky
z-10 category toggle, below the popover's own z-30 so the popover still
gets its own clicks (browsers hit-test whichever element is topmost at
that pixel, not DOM order). Deliberately NOT covering the header or
footer, so the footer's Cancel/Schedule buttons — the popover's real
actions — and the header's close button keep working exactly as before.

### 6.49 Posting/updating banner: top-center over the feed, not bottom-right (2026-08-30)

Aleksandr, screen recording of a post being created: "появляется
справа... надо, чтобы по центром сверху над лентой показывалась эта
штука." The banner (§6.44's minimum-visibility fix) was positioned
`items-end ... sm:justify-end` — bottom-center on mobile, bottom-right
on desktop. Moved to `items-start justify-center` on every viewport
with top padding to clear the sticky nav bar.

Worth noting explicitly: the same message also asked that "the post
[modal] should close" when posting — it already does, structurally.
`isSubmittingPost` replaces PostEditor's entire return value with just
this small card the instant Post/Save is clicked; the big multi-field
form is unmounted at that point, not hidden behind or beside it. That
was likely read as "still open" only because the small card that
replaces it was tucked in a corner instead of taking the form's place
up top — the position fix above should make the close itself legible
too.

Same recording also re-showed the §6.44 title-length bug (pasting a
long title, hitting Post, "Щось пішло не так"). Re-inspected
components/post-editor.tsx's title handling directly rather than
re-guessing a fix: the onChange clamp (`e.target.value.slice(0,
TITLE_MAX)`), the reactive useEffect re-clamp, and the submit-time
`.slice(0, TITLE_MAX)` from §6.44 are all still exactly in place and
look correct — a paste fires the same onChange with the full pasted
string in `e.target.value`, clamped before it ever reaches state. Cross-
checked against Vercel: `ba5f091` (which includes §6.44's fix, commit
738db0d) was the latest Ready production deployment, built ~2 minutes
before this recording's own timestamp (ffprobe: 2026-08-30T05:21:18Z
vs. the deployment's own "12m ago" read moments after). Likely
explanation, not confirmed: the recorded tab was already loaded with
the pre-fix JS bundle before that deploy finished propagating, since a
already-open tab doesn't pick up a new deploy without a reload. Flagged
rather than "fixed" again blind — needs Aleksandr to hard-refresh and
retest before this is touched further.

### 6.50 Profile "Пости" tab: own drafts/scheduled posts with a gray badge (2026-08-30)

Aleksandr, closing the loop §6.45 left open: "во вкладке посты,
черновики, просто помечаем плашечкой draft, там где у тебя сейчас, ну,
другой: Jobs... Мы помечаем другим цветом, типа сереньким draft,
черновики, запланированные scheduled — это уже у нас решенный вопрос."
§6.45 removed the avatar-menu's "Мої пости" row on the theory that the
profile's own Posts tab already unified everything into one place — it
didn't: that tab (§6.44) only ever showed already-published posts,
matching the public feed by design, so drafts/scheduled lost their only
home.

- `lib/a1/mappers.ts`: new exported `mapOwnPost()` — identical field
  mapping to `mapPost()`, but only excludes ARCHIVED (soft-deleted),
  not DRAFT/SCHEDULED like the public-facing gate does. Only ever safe
  to call on the signed-in visitor's own posts (enforced by its caller
  always being `posts.search({ author: "me" })`).
- `app/api/posts/mine/route.ts`: new `draftsAndScheduled` field
  alongside the existing `posts` (left byte-for-byte unchanged for
  `my-posts-panel.tsx`/`post-owner-menu.tsx`) — each entry a
  `{ post: WebPost, status: "draft" | "scheduled" }` via `mapOwnPost()`.
- `components/post-card.tsx`: new optional `statusBadge` prop that
  replaces the colored Jobs/Talent pill with a plain one when set.
  Unset for every existing caller (feeds, load-more) — no visual change
  there.
- `components/profile-tabs.tsx`: on mount, calls `/api/account/whoami`
  and compares its username against the `profileUsername` prop (new,
  from `app/u/[username]/page.tsx`) — only on a match (this IS the
  visitor's own profile) does it fetch `/api/posts/mine` and render its
  `draftsAndScheduled` cards above the server-rendered published list,
  each with a small gray badge ("Чернетка"/"Заплановано", same
  translated labels `my-posts-panel.tsx` already had). Silently does
  nothing for a signed-out visitor or anyone else's profile — same
  posts-only view as before for those.
- Deliberately did NOT fold `my-posts-panel.tsx`'s inline edit/delete
  into this view — Aleksandr's message asked specifically about the
  status badge, not the CRUD actions; that file is still left in place,
  unused, if that turns out to be wanted too.

### 6.51 Filter button grows with the search box; profile tab pill forced opaque white (2026-08-30)

Aleksandr, screen recording of §6.47's search-widen-on-focus: "ширина
фильтра должна тоже подстраиваться при расширенном поиске." Asked which
of two readings he meant (the button itself growing vs. the outer
container growing further) — picked growing the button. It now goes
h-8 w-8 → h-9 w-9 on the same `inputFocused` state already driving the
search box's own widen (§6.47), staying circular rather than becoming
an oval (nowhere sensible for a single centered icon to grow into).

Separately, profile screenshot of the Про мене/Пости tab pill: "сделай
заливку кнопки полностью FFFFF 100%, а то она теряется." Switched the
active tab's `bg-white` to `bg-white/100` — forces Tailwind's
opacity-variable-based background color to a literal, fully opaque
white regardless of what `--tw-bg-opacity` happened to resolve to,
rather than trusting the plain utility class.

### 6.52 Profile-page crash fix + scoped error boundary; avatar menu opens on hover (2026-08-30)

Aleksandr, screen recording: reloading a profile page right after §6.50
(own drafts/scheduled in the Пости tab) shipped crashed the whole page,
showing "Не вдалося завантажити вакансії" — obviously wrong copy for a
profile page, which is what led to finding the real cause. There is no
`app/u/[username]/error.tsx`, so any crash there bubbles to the root
`app/error.tsx`, whose text is hardcoded for the jobs feed.

Root cause in `components/profile-tabs.tsx`: its fetch chain checked
`data.ok` before calling `setOwnDrafts(data.draftsAndScheduled)`, but
never checked that `draftsAndScheduled` was actually present — a
response from just before §6.50 shipped (a tab with a cached response,
or a request racing the rolling deploy) returns `{ ok: true, posts }`
with no `draftsAndScheduled` field at all, since that field didn't
exist yet. `setOwnDrafts(undefined)` then crashed the very next render
at `ownDrafts.length`/`ownDrafts.map`. Fixed by validating
`Array.isArray(data.draftsAndScheduled)` before using it — an
unexpected shape now just means "no drafts/scheduled shown", same as
before this feature existed, instead of taking the page down.

Also added `app/u/[username]/error.tsx`, mirroring `app/jobs/error.tsx`'s
own pattern but with wording that actually fits a profile page — a
backstop so any *other* future crash there gets a sensible message
instead of reusing the jobs-feed one.

Separately, same conversation: "у вас (Claude) это сделано для левого
меню... наводишь на кнопку, не нажимаешь, оно появляется, если ушёл не
выбрав — исчезает плавно, с opacity. Хочу такое же на аватара."
`components/avatar-menu.tsx` now opens on `onMouseEnter` (additive to
the existing `onClick` toggle, which still matters for touch) with a
200ms delayed close on `onMouseLeave` — the panel sits a real `mt-2`
gap below the button, and without that delay the cursor crossing that
gap on the way down would flash-close it before landing back inside.
Also replaced the old instant `{open && (...)}` unmount with a
`rendered` state that lags `open` by ~150ms on the way to false, so the
panel actually plays an opacity/scale-down transition instead of
vanishing outright — this applies to every way the menu closes (hover-
away, a link click, the backdrop), not just the new hover path.
Deliberately scoped to just this component, not the 3 other places
sharing the `.animate-popover` entrance class (settings-menu.tsx,
post-owner-menu.tsx, filters-form.tsx's filter popover) — only the
avatar menu was asked for.

### 6.53 Avatar hover-menu: real fade transition + fixed the dead-zone gap; filter width stays expanded after clicking Filters (2026-08-30)

Aleksandr, after testing §6.52's hover-open avatar menu, reported two
separate real bugs in the same message, plus a regression in §6.51's
filter-button widening:

1. "появляется не плавно... прям скопируй, как у вас (Claude), даже в
   плоти" — the panel's entrance never actually animated. Root cause:
   the previous version mounted the panel (`{rendered && (...)}`)
   already carrying its OPEN opacity/scale classes in the very same
   commit that `open` became true, so the browser never painted a
   "closed" frame for the CSS `transition` to animate away from — it
   just popped straight to the open state. Fixed with a second state,
   `visible`, that starts false on every mount: `rendered` mounts the
   node, then a `requestAnimationFrame` (guaranteed to fire only after
   that closed-style frame has actually painted) flips `visible` true,
   so the opacity/scale change is now a real transition on both open
   and close, matching how Claude's own left-sidebar hover panel does
   it.
2. "не исчезает всегда... по горизонтали сверху исчезает, вниз по
   вертикали не исчезает, зависает" — root cause: the panel sat a real
   `mt-2` MARGIN below the avatar button. A margin is unpainted space
   with no element in it, so whether `mouseleave`/`mouseenter` fire
   correctly while the cursor crosses that gap depends on the exact
   pixel path and speed — genuinely racy, not fixable with a longer
   delay (that's a band-aid over the same raciness, not a fix). Fixed
   by eliminating the dead zone itself: the outer positioning wrapper
   now uses `pt-2` PADDING (not margin) and starts flush at
   `top-full`, so the hoverable rectangle is physically continuous
   from the button's bottom edge straight into the panel — no gap the
   cursor can "leave" through at all. The actual visible card styling
   (background, border, rounded corners, shadow) moved to an inner
   child div so the padding itself stays invisible.
3. "при нажатии на поиск, а потом нажатии на фильтры, фильтры
   оставляют такую же ширину, как и были" — §6.51 tied both the search
   box's focus-widen and the filter button's own size-grow to
   `inputFocused` alone. Clicking the filter button blurs the search
   input first (an ordinary DOM focus change), which independently
   fired the pre-existing 150ms-delayed `setInputFocused(false)` and
   collapsed both back to resting size right as the filter popover
   opened. Fixed in `components/filters-form.tsx` with
   `searchExpanded = inputFocused || filtersOpen`, now driving both the
   search box's `maxWidth` effect and the filter button's `h-8 w-8` /
   `h-9 w-9` toggle — everything now stays expanded for as long as
   either the input is genuinely focused or the filter popover itself
   is open.

### 6.54 Real fix for the profile-page crash (Date fields lost across a client fetch); search width reverted to focus-only (2026-08-30)

Aleksandr reported the profile crash was STILL happening after §6.52's
`Array.isArray(data.draftsAndScheduled)` guard, specifically when a
draft exists ("если есть драфты"). Reproduced live in his real Chrome
session (jobs.a1appp.com, signed-in account, a saved draft post):
opening or reloading the profile crashed to "Не вдалося завантажити
профіль" every time, console showing `TypeError: e.getTime is not a
function` thrown from `lib/format.ts`'s `formatRelativeTime()`, called
by `PostCard` with `post.publishedAt`.

Real root cause, different from §6.52's: `WebPost.publishedAt` /
`updatedAt` are typed as `Date`. That holds for the server-rendered
`posts` prop (Next's RSC payload preserves real `Date` instances across
that particular boundary), but NOT for `ownDrafts` in
`components/profile-tabs.tsx` -- that array comes from a plain client
`fetch("/api/posts/mine").then(r => r.json())` in a client component,
and `NextResponse.json()` on the API route serializes `Date` objects to
ISO strings with nothing on the client reviving them back.
`Array.isArray` only checked the array itself existed, not that its
contents matched the `WebPost` contract -- so `PostCard` received a
string where its prop type promised a `Date`, and crashed formatting a
"posted N days ago" label. This also explains why it crashed on a
plain page load, before ever clicking "Пости": that section only gets
`hidden` when its tab isn't active (see this component's own header
comment on why), it's still mounted and rendered.

Fixed by reviving both fields with `new Date(...)` right after the
`Array.isArray` check, before `setOwnDrafts` -- `ownDrafts` now honors
the same `WebPost` contract the server-rendered `posts` prop already
does.

Separately confirmed live (same session) that the "Про мене"/"Пости"
tab pill IS correctly fully opaque white per §6.51's `bg-white/100` --
Aleksandr couldn't have seen this on his own profile since it always
crashed first; verified directly on a draft-free profile in light
theme.

Also, §6.53's `searchExpanded` change (search box widens on Filters
click alone) was wrong per Aleksandr's follow-up: "если ничего не
трогаешь с поиском, нажал фильтры -- оно просто по ширине короткого
фильтра разошлось [только кнопка]... если уже нажал input и при этом
открыл фильтры -- тогда по всей ширине." Reverted the search box's own
`maxWidth` effect back to `inputFocused` alone (matching §6.47); the
filter BUTTON's own `h-8`/`h-9` size toggle keeps using `searchExpanded`
so it still grows on its own click regardless of the search box.

### 6.55 Avatar menu: geometry-based close (not just enter/leave events); "Про мене/Пости" pill matches the Вакансії/Фахівці accent-tint style; search box no longer collapses under an open filter popover (2026-08-30)

Aleksandr, live, twice in a row: "меню при наведении на аватар по
прежнему не исчезает." My own live testing in his Chrome session
(§6.54) had found the panel DOES close correctly for a normal,
continuous cursor path, but a single large/fast cursor jump could
leave `handleMouseLeave` never called at all -- the browser's
mouseout->mouseleave synthesis depends on `relatedTarget` walking the
DOM tree correctly, and at least one real cursor path wasn't
delivering that event to the wrapper. Rather than keep chasing
individual paths, added a second, independent closing mechanism that
doesn't depend on enter/leave event semantics at all: while `open`, a
`document`-level `mousemove` listener directly compares the cursor's
raw coordinates against the trigger button's and panel's own
`getBoundingClientRect()` (unioned, 4px margin) and schedules/cancels
the same close timer based on pure geometry. This can't silently fail
to fire the way a missed native event can -- it backstops
onMouseEnter/onMouseLeave rather than replacing them.

Separately, re-litigated the "Про мене"/"Пости" tab pill twice in one
sitting: pixel-sampled his screenshot and confirmed the active tab WAS
already pure `#FFFFFF` (255,255,255) -- the real complaint was
contrast, not opacity, since the gray container (~245,245,245) and the
page background (~242,242,247) are barely distinguishable from white
to begin with. He pointed at site-nav.tsx's own Вакансії/Фахівці
switcher wanting "абсолютно такой же эффект" -- copied that scheme
byte-for-byte (white container, active tab `bg-accent/15 text-accent`)
after briefly going back and forth on whether to keep the old
gray-container scheme.

Also: `components/filters-form.tsx`'s search-box widen-on-focus
effect went through a third revision this same conversation. §6.54
reverted it to `inputFocused` alone so a bare Filters click (no prior
search focus) wouldn't widen the box -- but that meant clicking
Filters blurs the input, and after the existing 150ms blur delay the
box SHRINKS back down while the filter popover is still open under it:
"при нажатии на фильтры, ты сворачиваешь поиск... хотя бы не
сворачивай поиск." Reverted back to `searchExpanded` (`inputFocused ||
filtersOpen`) per his explicit "фиг с ним с длиной, но не закрывай
поиск" -- the box no longer collapses out from under an open filter
popover, accepting that Filters alone now also widens it.

### 6.56 10px gap between the profile tab pill and the posts list (2026-08-30)

Aleksandr, live screenshot: "опусти на 10 px вниз черновик" -- then
clarified it's about the whole posts list, not just the draft card:
"в смысле весь пост... и все остальные посты какие будут." The tab
content had no top margin at all, so both `ownDrafts` and the
server-rendered `posts` after it sat flush against the pill switcher
above. Added `mt-2.5` (10px) to the shared `hidden={tab !== "posts"}`
wrapper so every card in the list gets the same breathing room, not
just the first one.

### 6.57 Search box width vs Filters: needed both halves at once (2026-08-30)

Fourth round on this one. Aleksandr, screenshot of the RESTING search
box: "в таком положении при нажатии на фильтры не расширяй поиск" --
confirming a bare Filters click on an unfocused box must NOT widen it.
That's exactly what §6.54 already did (`inputFocused` alone) -- but
§6.54 broke the OTHER half §6.55 had just fixed: if the box was
already focused/widened, clicking Filters blurs the input, and after
its own 150ms delay `inputFocused` flips false and collapses the box
while the popover is still open ("сворачиваешь поиск... не
сворачивай"). A single boolean can't satisfy both requirements at
once, so this adds a second piece of state, `keepWideForFilters`,
set by a new shared `toggleFilters()` handler (replacing the inline
`setFiltersOpen((v) => !v)` in both the mobile and desktop filter
buttons): when Filters OPENS, it captures whatever `inputFocused`
happens to be at that exact moment (still reliably the pre-click value
-- the blur only *schedules* `setInputFocused(false)` via its own
150ms timeout, it isn't synchronous) and that decision then latches
for as long as the popover stays open, reset only when it closes. The
search box's own width now reads `inputFocused || (filtersOpen &&
keepWideForFilters)`; the filter BUTTON's own size keeps using the
simpler `inputFocused || filtersOpen` (`searchExpanded`) -- growing
the button on every Filters click was never in question, only the
search box's width was.

### 6.58 Scheduled posts invisible until reload + error hidden behind the schedule calendar (2026-08-30)

Aleksandr, screen recording: scheduled a post from the "+" FAB; the
posting-cat banner ran for under a second, then the full "Новий пост"
form reappeared with the exact same field values and the schedule
calendar still open, no visible error -- looking like the schedule
action and the "Зберегти чернетку?" close-confirm were fighting each
other. Two separate, confirmed bugs, both fixed here:

1. components/profile-tabs.tsx fetches drafts/scheduled posts once on
   mount only. Scheduling (or drafting, or editing) a post from
   anywhere else on the page -- the FAB lives in the root layout,
   entirely outside this component's tree -- never told it to refetch,
   so the new "Заплановано" card was invisible until a full page
   reload. Reproduced live: scheduled a test post, it was missing from
   "Пости" until reloading the profile, then appeared correctly with
   the right badge. Fix: components/post-editor.tsx now dispatches a
   plain `window.dispatchEvent(new Event("a1:post-saved"))` right
   after every successful save (post/draft/schedule, from every entry
   point this editor has), and profile-tabs.tsx's fetch chain is now a
   named `load()` function called both on mount and on that event.

2. On a failed submit, `scheduleOpen` was never reset to false. The
   error message (`{error}`) renders earlier in the dialog's scrollable
   area, and the schedule popover is `position: fixed`, anchored near
   the footer -- when scheduling fails with the calendar still open,
   the calendar stays open on top of the reappeared form and sits
   exactly where the error text would be, hiding it completely. This
   is the best explanation I have for what the recording shows -- I
   could NOT reproduce the underlying request failure itself live (my
   own test schedule, same account type, succeeded cleanly end to
   end), so the actual cause of THAT particular failure is still
   unconfirmed; labeling this explicitly per PLAN's no-blind-guessing
   rule. Fixed the visibility bug regardless: both the `!res.ok` branch
   and the `catch` block in submit() now also call
   `setScheduleOpen(false)`, so a real failure shows its error instead
   of silently reverting behind the calendar. If this recurs, a
   screenshot with the form visible (or the browser console) will tell
   us what's actually failing server-side.

Also, per the same recording ("текст возле кота можно сделать
'планирую', и локализовать на всі мови"): added a schedule-specific
banner label, `schedulingLabel` ("Планується..." uk, matching the
existing passive-voice pattern of "Публікується.../Оновлюється..."),
shown whenever `pendingAction === "schedule"`, localized across all 9
languages, instead of reusing the generic "Публікується...".

### 6.59 Draft/scheduled post click 404s from the profile's "Пости" tab (2026-08-30)

Aleksandr, after §6.58 shipped: "з чернеткою і запланованим все одно
траблы" with 4 screenshots of the "Новий пост" dialog showing "Щось
пішло не так. Спробуйте ще раз." on submit. Investigated live with the
exact field values from the screenshots (category, link, format,
employment, experience, salary) on both the immediate-publish and
schedule paths -- both succeeded cleanly, HTTP 200, no console/network
errors. Could NOT reproduce that specific submit failure; per PLAN's
no-blind-guessing rule this is reported as unreproduced, not as fixed.
If it recurs, a screenshot of the browser console (F12) at the moment
of the error is what's actually needed next.

While reproducing it, found and fixed a separate, real, confirmed bug
in the same area that is very plausibly what's actually being
experienced as ongoing "траблы": clicking into your OWN draft or
scheduled post from the profile's "Пости" tab always led to "Сторінку
не знайдено" (404). Reproduced live twice (a freshly scheduled test
post, and an older orphaned draft left over from an earlier session --
the draft could not even be deleted because of this same bug, no
reachable UI path to it otherwise).

Root cause: components/post-card.tsx unconditionally builds
`href = /{jobs|talents}/{slug}` and points both the title and the
whole-card click area (`after:inset-0`) at it, with no awareness of
whether the post is actually published yet -- the backend only serves
that route once a post is published, so any draft/scheduled post
404s. profile-tabs.tsx's ownDrafts cards render through this exact
same PostCard with no click-interception at all.

Fix, reusing what already existed rather than adding new backend work:
`app/api/posts/mine/route.ts` already returns both `draftsAndScheduled`
(what profile-tabs.tsx displays) and `posts` (the same underlying
posts, EditablePost-shaped -- already what components/my-posts-panel.tsx
feeds into `<PostEditor mode="edit">`) from one response. profile-tabs.tsx
now also keeps `posts` keyed by id (`ownEditable`), and passes a new
`onOpen` prop to PostCard for each of its own draft/scheduled cards,
opening `<PostEditor mode="edit" initialPost={...} />` in place instead
of navigating. post-card.tsx's title and content areas now render a
`<button onClick={onOpen}>` instead of `<Link href>` whenever `onOpen`
is passed (every other caller -- public feeds, load-more -- doesn't
pass it and keeps the exact same `<Link>` behavior as before). Avatar
and author-name links are untouched either way.

Not yet re-tested live end to end after this fix (no local build
tooling available in this pass -- `node_modules` isn't installed on
the connected folder and the npm registry isn't reachable from either
this session's cloud container or the linked Mac to install one) --
Aleksandr, please click into a draft or a scheduled post from your own
profile's "Пости" tab after this deploys and confirm the editor opens
instead of a 404.

### 6.60 OPEN (spec only, NOT to be implemented from this repo): same draft/scheduled parity needed in the native Flutter app (2026-08-30)

Aleksandr, after §6.59's web fix: "запланированные посты и черновики
должны абсолютно идентично отображаться в приложении... как я тебе и
говорил, в общих постах просто подсвечивается бейджиком... тут должна
быть чёткая же тема... должны между собой полностью дружить и быть на
100% правильно подвязаны" -- wanted the same two things §6.59 just
gave the web profile's "Пости" tab, done on the native app too.

He later shared the actual Flutter/Dart app repo (`aone_private-chat_dev_v2_merge`,
plus its backend `aone-api-private-main`) read-only for this
investigation -- then drew a hard line once the findings below were in:
"я в приложении ничего не делаю, я не разработчик... фронтенд и бэкенд
[апп-команда] всё коммитят, ведут репозитории... делай так, чтобы на
приложении вообще ничего не менялось... не хочу ломать... надо просто
это связать. Если что, потом подфиксим как-то." So this section is a
precise handoff spec for whoever maintains that app repo -- NO code in
it was touched or will be from this session, on principle, regardless
of how small a fix looks.

**Confirmed live in that repo** (read-only, this session):

1. The own-profile "Posts" tab is `_buildPostsTabSliver()` in
   `lib/features/settings/presentation/components/logged_user_account_screen.dart`.
   It fetches via `context.read<A1Repos>().posts.makeMyPosts()`
   (`lib/core/rest_repository/concrete/a1_posts.dart`), which passes
   `excludeDraftPosts: true` -- drafts are explicitly filtered out of
   this list client-side (`_postSearchJsonIsDraft()` checks the
   `draft` field returned by the shared `/v1/posts.search` backend
   call and drops the post entirely). Drafts are currently only
   reachable through the separate "Drafts" sheet opened from the post
   creator (`lib/features/posts/post_draft/draft_posts_sheet.dart`).
2. Scheduled-but-unpublished posts are NOT filtered by that same
   check, so they DO appear in this tab today -- but with no status
   badge: the shared `PostCard` widget
   (`lib/core/common_widgets/cards/post_card.dart`) already has
   `isDraft`/`scheduledAt` params that render exactly this kind of
   label (already used by `draft_posts_sheet.dart` and by a chat
   reply-draft indicator) -- `_buildPostsTabSliver()`'s own
   `PostCard(...)` call just never passes them.
3. Tapping any card in this tab always calls its `onPressed`, which
   unconditionally does
   `context.pushNamed(_previewRouteForFeedType(post.feedType), extra: {'id': ..., 'preview': ...})`
   -- the public preview route, with no branch for "this is my own
   unpublished post." Exact same class of bug §6.59 fixed on web
   (post-card.tsx's Links unconditionally pointing at a public URL
   that doesn't exist yet for an unpublished post). A working
   edit-entry point already exists elsewhere in this codebase to route
   to instead: `DetailsNavigation.goToPostEditor()` in
   `lib/features/favourites/view/details_navigation.dart`.

**What the fix would look like** (for the app team, not for this
session): stop excluding drafts in `makeMyPosts()` (or fetch them
separately and merge, like this repo's own `/api/posts/mine` does),
pass `isDraft`/`scheduledAt` through to `PostCard(...)` in
`_buildPostsTabSliver()`, and branch `onPressed` to call
`DetailsNavigation.goToPostEditor()` instead of the preview route for
the user's own draft/scheduled posts.

No backend changes needed -- `/v1/posts.search` already returns the
`draft`/`scheduled` fields this app reads client-side, same as this
repo's `/api/posts/mine` already does server-side.

### 6.61 Second live-testing batch, 2026-08-30: profile editor overhaul + profile "Пости" tab menu/centering bugs

A 29-item feedback batch from one round of live testing against the
deployed profile editor (15 screenshots + a 24s screen recording of the
real mobile app's own profile-editing screen, used throughout as ground
truth for labels/caps/wording rather than guessing). This sandbox had no
network access to the real API at any point in this batch (a direct curl
to api.a1appp.com returned a 403 from the egress proxy, from both this
session and Aleksandr's own Mac) -- every fix below is either confirmed
against a screenshot/video frame, or root-caused by static code review
with the reasoning written out in the file's own comment; anything that
couldn't be pinned down that way is called out as such rather than
guessed at. Full reasoning for each item lives in the comment at its own
change site -- this entry is an index, not a duplicate of it.

**components/profile-editor.tsx and its new companions** (commit
"Profile editor: fix save-blocking bug, occupation naming, add
username/phone/DOB/avatar-crop/voice-upload, localize dataset pills"):
save-blocking validation for companies missing a category (§ open
question below on whether this was really the cause -- never confirmed
live, only inferred from this repo's own already-documented "category
must be real" backend constraint); occupation label correction
("Бізнесмен"/"Фахівець"); a username field; Voice Intro moved to the top
of the dialog with a 120s cap (was 60s) and a new "upload an audio file"
option; phone + date-of-birth fields with USER_FLAG-backed visibility
toggles; company/links field-width and label fixes; Languages capped at
10 and Hobbies at 5 (matching the real app, confirmed on video); an
icon-only edit-profile button and a new avatar quick-edit badge with a
real crop-and-zoom step (`components/avatar-edit-button.tsx`); a hover
rotate on the dialog's close icon; and client-side EN->UK translation
for the Hobbies/Work-Interests/Work-Style dataset pill values
(`lib/pill-translations.ts` -- deliberately not exhaustive, see that
file's own header comment for exactly which sections/groups have
confirmed translations and which still fall back to English).

**components/post-card.tsx, components/post-owner-menu.tsx,
components/profile-tabs.tsx** (commit "Fix profile Пости tab: '•••' menu
clicks swallowed by its own backdrop, and card list off-center on
windowed desktop widths"): the reported "can't actually click
Edit/Delete on the profile's own posts" bug was a z-index stacking
bug -- post-card.tsx's z-10 wrapper around `<PostOwnerMenu>` was LOWER
than that menu's own z-30 click-outside backdrop, so the backdrop
(invisible) painted above the popover and swallowed every click on it;
bumped to z-40, mirroring components/settings-menu.tsx's own documented
fix for the identical pattern. The delete-then-redirect logic itself
(`redirectAfterDeleteTo` vs. `window.location.pathname`) was already
correct on review -- it was simply unreachable because of the click bug
above. Separately, the profile's own Пости tab's card-width breakout (an
earlier fix widening its cards to match the feed's own width) used a
hardcoded `-mx-[174px]` that didn't re-center correctly once its own
width-clamp kicked in below ~816px window width; replaced with a
viewport-relative full-bleed technique that centers correctly at any
width.

**Not independently confirmed, flagged rather than silently assumed
correct:**
- The profile-save failure's exact cause (missing company category) is
  this session's best inference from evidence already in this repo, not
  something reproduced live against the real backend this round either.
- Only 9 of the real app's 14 Work Style preference sections, and only
  5 of its (evidently more than 5) Hobbies groups, had a real screenshot
  to translate from -- the rest still render in English until a
  screenshot of them turns up.

### 6.62 Web chat, Phase 1: polling-based data layer + basic UI (2026-09-01)

Aleksandr: "я хочу добавить еще веб-версию чата... такие же примерно
полноценные чаты, как у нас в приложении... можно и шарить файлы, и
создавать таблицы для подсчета, и добавлять фотографии... они же должны
каким-то образом синхронизироваться между нашим приложением. Вообще в
целом скажи, реально ли это?" Answer given live: yes -- the same backend
monorepo (aone-api-private-main, shared read-only per §6.60's standing
"don't touch this repo" rule) already runs a dedicated chat-server
microservice (own MongoDB, separate from api-server-modern) with a
working reference web client already built against it
(apps/chat-app -- Vue 3), so this is "wire a second client to an
existing, working chat backend," not build chat from scratch.

**Architecture decision (Aleksandr asked directly: "А ты какой бы
выбрал и почему?"):** polling for MVP, not a WebSocket relay, recommended
and agreed. Reasoning: the whole data layer + UI is transport-agnostic
(same code either way, only "how updates arrive" differs), a relay is a
new always-on service (this app has none today -- Vercel serverless can't
host a persistent WS server) that would delay a first working result and
risks rework once real chat-server connection details are confirmed,
and polling needs zero new infrastructure -- it's the exact same
callAsVisitor pattern every other route in this app already uses.
Swapping the transport later (Phase 2, a small relay on Aleksandr's
existing Railway api-service) changes nothing about the UI/data layer
built here.

**Confirmed vs inferred, read before touching any of this code:**
chat-server's own request/response types
(packages/types/methods/*.d.ts) could NOT be read this session -- every
attempt (cat, python open(), cp, immediate + waited retries) hit the
same `Resource deadlock avoided` (EDEADLK) OS error specifically on
that mount (isolated to a1_app -- a1_web's own files read fine
throughout). What's actually confirmed comes from two files that DID
read cleanly: apps/chat-app/src/composables/useChat.ts and useWs.ts
(the reference Vue chat client) -- Chat's _id/title/flags/participants/
lastMessage fields, the Peer discriminated union (peer-user/peer-chat),
and that messages are always addressed via `{object:"peer-chat",
chat: chatId}` even inside a personal 1:1 chat. Everything else
(Message's exact fields, every method's exact request body, whether
chats.getChats/messages.getMessages return a side `users` array like
contacts.search's confirmed `{contacts, users}` shape) is this
session's best inference, documented inline at each call site in
lib/a1/chat-schemas.ts -- same "confirm on first live 502, don't guess
further" rule already applied to contacts.search
(app/api/contacts/list/route.ts). None of this has been tested against
the real backend yet -- Aleksandr, first live test of /chats after this
deploys will tell us which guesses were wrong; expect at least one
field-name fix once real data comes back.

**What Phase 1 delivers:**
- `lib/a1/chat-schemas.ts` / `lib/a1/chat-mappers.ts`: zod schemas
  (Chat, ChatUser, ChatMessage, Peer), defensive extraction (drop what
  doesn't parse rather than fail the whole list, same rule as posts/
  contacts), and display resolution (personal-chat title/photo from the
  other participant, falling back to the chat's own title + a generated
  cat avatar).
- Four proxy routes, all through callAsVisitor like every other
  authenticated route: `GET /api/chats/list` (chats.getChats),
  `GET /api/chats/messages?chat=<id>` (messages.getMessages),
  `POST /api/chats/send` (messages.send), `POST /api/chats/typing`
  (messages.sendAction, fire-and-forget).
- `app/chats/page.tsx` (chat list, 5s poll) and
  `app/chats/[chatId]/page.tsx` (message thread, 3s poll, send box,
  typing-action ping on input) -- both client components polling like
  app/contacts/page.tsx, both pause polling on `document.hidden`.
- A new "Чати" row in components/avatar-menu.tsx, above Контакти --
  placement is provisional, same "first pass, react to it live" framing
  app/contacts/page.tsx's own entry point got.

**Explicitly NOT in this pass** (per Aleksandr's own list -- files,
photos, stickers, gifs, "tables for counting" -- plus typing INDICATOR
DISPLAY, all deferred):
- Receiving/showing another participant's typing indicator: sending our
  own works (POST /api/chats/typing), but chat-server almost certainly
  only delivers that to the other side as a live WS event
  (MessageSendActionEvent, seen in packages/types/events/) -- polling
  messages.getMessages will never surface it. Needs Phase 2's realtime
  transport.
- Any media (photos, files, stickers, gifs), reactions, message
  editing/deleting, group-chat creation, or starting a brand-new chat
  with a contact who has none yet (chats.createChat's shape is
  unconfirmed and out of scope for this pass).
- "Таблицы для подсчета" (tables for counting) -- not found anywhere in
  the explored chat-server method/event catalog. Not clear yet what
  this refers to; needs Aleksandr to clarify before it can be scoped at
  all (possibly the Flutter app's leisure/brainstorm features, seen only
  as unread directory names during this research -- unconfirmed).
- WS/relay realtime delivery itself (Phase 2, only once this MVP is
  confirmed working against the real backend).

Not build-tested locally (no `node_modules` on the connected Mac, same
gap §6.59's own comment already notes) -- next step is Aleksandr
pushing this via GitHub Desktop and a live Vercel build + signed-in
test of /chats.

### 6.63 Contacts: "Chat" icon per row, opens/creates the personal chat (2026-09-01)

Aleksandr: "в контактах добавь кнопку 'написать', т е не текст, а
просто напротив имени добавь иконку чатов и раздели на 2 нажатия:
аватар и определенная ширина поля - переход на акк, а чат иконка -
открыть чат. Строка выбора (подсветка) мне нравится как сейчас."

app/contacts/page.tsx: each row's outer highlighted pill (unchanged
hover/select styling, per his explicit "нравится как сейчас") now
wraps two separate click targets instead of being one big `<Link>`:
avatar+name+phone -> profile (same as before), plus a new trailing chat
icon -> app/api/chats/open, shown only when `contact.user` is set (a
phone-book-only entry has no platform account to message). Failure
flashes the icon red for ~2s -- same flashError() convention
components/profile-action-row.tsx's own contact/save buttons already
use (§ ProfileActionRow toggle-bug fix, this same file's earlier
entries).

New `POST /api/chats/open` ({userId} -> {chatId}): first checks
GET-chats.getChats-equivalent logic for an EXISTING personal chat with
that user (same Chat/otherParticipantUserId helpers app/api/chats/list/
route.ts already uses -- this half is on the same confirmed-ish footing
as the rest of Phase 1). Only when none exists does it fall back to
`chats.createChat` with a guessed `{ users: [userId] }` body -- that
method's own request/response type file hit the same packages/types
read-lock as everything else in this chat feature (see lib/a1/chat-
schemas.ts's header), so this is explicitly the least-confirmed part of
today's change. `extractCreatedChatId()` (chat-schemas.ts) parses the
create response defensively (direct Chat, `{chat:...}` wrapper, or a
bare `_id`) so a slightly-off wrapper key still resolves.

**Aleksandr's live-testing question this same round, answered:** does
/chats actually show real data synced with the mobile app? Yes in
principle -- this proxies the SAME chat-server the app talks to, not a
separate system, so there's no "sync" step to build. Whether it
actually renders real chats depends entirely on whether §6.62's
best-guess field names for messages.getMessages/chats.getChats matched
the real backend -- not independently confirmed as of this entry
either; first live screenshot of a populated /chats will settle it.

### 6.64 Favorites grid: no-cover tiles now keep the same square slot (2026-09-01)

Aleksandr, live screenshot (The Witcher next to Mafia in the Games
row): "там де не знайшло обкладинку показується просто текст, але він
випадає із загального блоку" -- the 2026-08-31 fix (§ this file, "Если
не находит медиа - не показываем серый квадратик, только название")
was right to stop rendering a literally-empty gray box, but it also
skipped the square tile entirely for a title with no cover, which broke
grid alignment against tiles right next to it that DID resolve one.

Fix, kept both constraints at once: a no-cover tile keeps the exact
same `aspect-square rounded-xl` slot, now filled with a muted
category-appropriate icon (book/film/game-controller,
components/favorite-cover.tsx's new `FavoriteCoverFallback`) instead of
either an empty box or nothing at all. Covers both failure modes --
lib/covers.ts finding no match at all (server-side, app/u/[username]/
page.tsx's favoriteTile) and a cover URL that resolved server-side but
404'd at load time in the browser (client-side, FavoriteCover's own
onError, previously `return null`). favoriteTile() now takes an
explicit `kind: "book" | "movie" | "game"` param (all three call sites
updated) so the fallback icon matches the section it's in.

### 6.65 Chat messages 400: `peer` -> `peerTo` (confirmed live via Vercel Logs, 2026-09-01)

Aleksandr opened a real chat live ("Що робимо далі по чатам? Поки
повідомлення з чату не підгружає" -- screenshot: "Не вдалося
завантажити повідомлення" in the chat window). `/api/chats/messages`
was 502ing every call. `packages/types` is still unreadable under this
session's persistent EDEADLK lock, so per §6.62's own rule ("confirm on
first live error, don't guess further") the next step was reading the
real backend response instead of guessing again -- Vercel's Logs page
(https://vercel.com/serheienko-7585/a1-web/logs) has the actual
serverless `console.error` output, including chat-server's real HTTP
body:

    [api/chats/messages] failed: 400 {"ms":0,"error":true,"code":"INVALID_INPUT","message":"root is missing required property 'peerTo'","status":400}

So `messages.getMessages`'s peer field is named `peerTo`, not `peer` --
fixed in app/api/chats/messages/route.ts. The VALUE shape
(`peerForChat(chatId)`, i.e. `{ object: "peer-chat", chat: chatId }`)
is untouched and still just a guess pending its own live confirmation --
only the wrapping field name was wrong.

Pre-emptively applied the identical `peer` -> `peerTo` rename to
app/api/chats/send/route.ts (`messages.send`) and app/api/chats/typing/
route.ts (`messages.sendAction`) too, since all three are `messages.*`
calls against the same chat-server and near-certainly share one naming
convention -- but this part is NOT independently confirmed yet, only
inferred from messages.getMessages's real error. First live send/typing
attempt is what actually confirms or refutes it; if either still 502s,
that response body is the next thing to read, not another guess.
