# Demo - Optimization SDK

A [Next.js 16](https://nextjs.org/) (App Router) demo of **Contentful Personalization** via the Optimization SDK ([`@contentful/optimization-nextjs`](https://www.npmjs.com/package/@contentful/optimization-nextjs)), with Contentful Live Preview and Next.js Cache Components as the supporting architecture.

Rendering is **hybrid SSR**: baseline content is fetched once and cached per revalidation window (shared across visitors), while variant and audience resolution happens at request time on the server, per visitor. See [How it works](#how-it-works) for the details.

## Prerequisites

- **Node `v26`** — the version is pinned in `.nvmrc`; run `nvm use` to match it.
- A **Contentful space** with a Delivery API key, a Preview API key, and a Management token (the Management token is used only for the one-time content import below).
- A **Contentful Optimization / Personalization client ID** for the space.
- The [Contentful CLI](https://www.contentful.com/developers/docs/tutorials/cli/installation/), for importing the baseline content model.

## Quickstart

1. **Use the pinned Node version and install dependencies:**

   ```bash
   nvm use
   npm install
   ```

2. **Create your local env file** by copying the example, then fill in every value:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Purpose |
   | --- | --- |
   | **Core Contentful** | |
   | `CONTENTFUL_SPACE_ID` | Your Contentful space ID. |
   | `CONTENTFUL_ENV_ID` | Environment ID (e.g. `master`). |
   | `CONTENTFUL_DELIVERY_KEY` | Delivery API token — reads published content. |
   | `CONTENTFUL_PREVIEW_KEY` | Preview API token — reads draft content for Live Preview. |
   | `CONTENTFUL_MANAGEMENT_TOKEN` | CMA token used **only** by the CLI import in step 3. Not read at runtime. |
   | `CONTENTFUL_PREVIEW_SECRET` | A secret **you invent**, guarding the `/api/draft` preview endpoint. |
   | `CONTENTFUL_REVALIDATION_SECRET` | A secret **you invent**, guarding the `/api/revalidate` webhook. Keep it different from the preview secret. |
   | **Contentful Optimization** | |
   | `NEXT_PUBLIC_OPTIMIZATION_CLIENT_ID` | Optimization/Personalization client ID (exposed to the browser by design). |
   | `NEXT_PUBLIC_OPTIMIZATION_ENVIRONMENT` | Optimization environment; defaults to `main` if unset. |

3. **Import the baseline content model.** The repo ships a full space export, `space-export-no-p13n.json` (content types `landingPage`, `hero`, `duplex`, `mediaWrapper`):

   ```bash
   contentful space import \
     --space-id <CONTENTFUL_SPACE_ID> \
     --environment-id <CONTENTFUL_ENV_ID> \
     --content-file space-export-no-p13n.json
   ```

   As the `-no-p13n` name implies, this is the baseline model **without** personalization content types — audiences, experiences, and variants are configured separately in Contentful Personalization.

4. **Configure a Content Preview** in Contentful pointing at the draft endpoint:

   ```text
   http://localhost:3000/api/draft?secret=<CONTENTFUL_PREVIEW_SECRET>&type=landingPage&slug={entry.fields.slug}
   ```

5. **Create a revalidation Webhook** in Contentful that fires on Entry `Create`, `Archive`, `Unarchive`, `Publish`, `Unpublish`, and `Delete`, pointing at:

   ```text
   /api/revalidate?secret=<CONTENTFUL_REVALIDATION_SECRET>
   ```

   Contentful cannot deliver a webhook to `localhost`, so for local development expose the endpoint with a tunnel — e.g. `ngrok http 3000` — and use the public URL.

6. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The `/` route is the default Next.js template; the live content route is `/<slug>`, backed by a `landingPage` entry.

### Scripts

| Script | Command | |
| --- | --- | --- |
| `npm run dev` | `next dev` | Start the dev server. |
| `npm run build` | `next build` | Production build. |
| `npm run start` | `next start` | Serve the production build. |
| `npm run lint` | `eslint .` | Lint the project. |

## How it works

**Hybrid SSR.** Baseline entries are fetched in `src/lib/client.js` behind the `"use cache"` directive with a `cacheLife("contentful")` profile, and tagged by the `sys.id` of every entry and asset in the response graph — so publishing any referenced entry invalidates the parent page. Variant and audience resolution runs at request time in the RSC tree, layered on top of that cached baseline. See [`docs/adr/0001-cache-components-migration.md`](./docs/adr/0001-cache-components-migration.md).

**Personalization wiring.** `src/proxy.js` (the Next.js 16 `proxy`) forwards sanitized request context to Server Components. `src/lib/optimization.js` binds the Optimization SDK exactly once and exports its `request` family (`OptimizationRoot`, `OptimizedEntry`, `NextAppAutoPageTracker`). `PersonalizationBoundary` mounts the root behind `await connection()`, scoping personalization to the `/[slug]` route group. Each content entry is wrapped in `<OptimizedEntry>`, which resolves to the visitor's variant before markup is built and falls back to baseline when nothing matches.

> **Consent:** the demo treats an absent consent cookie as *granted* so there is something to see out of the box. A production deployment must invert this — default to denied and grant only on an explicit visitor decision (see the note in `src/lib/optimization.js`).

**Dual resolver, chosen by draft mode.** Published requests render through `ComponentResolver` (a pure React Server Component that ships zero Live Preview JS); draft requests render through `LivePreviewResolver` (a client component that subscribes to live updates). `src/app/[slug]/page.jsx` picks between them based on `draftMode()`. See [`docs/adr/0002-split-resolver-rsc-client.md`](./docs/adr/0002-split-resolver-rsc-client.md).

## Known rough edges

The `/[slug]` page and layout still contain **temporary debug placeholders** (brightly-colored Suspense fallbacks marked `TEMPORARY DEBUG PLACEHOLDER — remove before shipping`) in `src/app/[slug]/page.jsx` and `src/app/[slug]/layout.jsx`. They should be replaced with real skeletons before this is used as anything more than a demo.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs) — App Router, Cache Components, and rendering.
- Architecture decisions for this project live in [`docs/adr/`](./docs/adr).
