import "server-only";
import { bindNextjsAppRouterServerOptimization } from "@contentful/optimization-nextjs/app-router/server";

// Name of the application-owned consent cookie. The SDK never writes this — the
// app owns the consent record — it is only read to decide what a request may do.
export const CONSENT_COOKIE = "demo-personalization-consent";

// Single bound server instance for the whole app. Called exactly once: a second
// binding would create a second SDK instance competing with this one.
const optimization = bindNextjsAppRouterServerOptimization({
  clientId: process.env.NEXT_PUBLIC_OPTIMIZATION_CLIENT_ID ?? "",
  environment: process.env.NEXT_PUBLIC_OPTIMIZATION_ENVIRONMENT ?? "main",
  // Matches the locale the Live Preview provider is configured with. One
  // concrete locale is required — locale-keyed field maps cannot be resolved.
  locale: "en-US",
  app: { name: "demo-optimization-sdk", version: "0.1.0" },
  consent: {
    // DEMO DEFAULT: an absent cookie is treated as granted so there is
    // something to see without building a consent UI. A production deployment
    // must invert this — default to denied and grant only on an explicit
    // visitor decision.
    server: ({ cookies }) =>
      cookies.get(CONSENT_COOKIE)?.value === "denied"
        ? false
        : { events: true, persistence: true },
    clientDefaults: { consent: false, persistenceConsent: false },
  },
  // No `contentful` key: this app fetches its own entries in src/lib/client.js
  // and hands them over as `baselineEntry`. Configuring managed fetching here
  // would duplicate that fetch and its cache.
});

// The `request` family is the surface for private, per-visitor personalization.
// It derives the URL, route key, initial page payload, headers, and cookies
// from the request context forwarded by src/proxy.js, so the app does not have
// to assemble a handoff or decide who emits the initial page event.
export const { NextAppAutoPageTracker, OptimizationRoot, OptimizedEntry } =
  optimization.request;
