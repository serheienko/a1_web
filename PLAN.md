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


## OPEN QUESTIONS — Stage 2, for Aleksandr

1. ~~**Google Sign-In needs its own Web-application OAuth Client ID**~~
   — **Answered/done 2026-08-28: one already existed (Firebase
   auto-created it), now configured and published.** See §6.9. Client ID
   sent to Andrew; waiting on him to add it to the accepted list
   (§6.8).
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
