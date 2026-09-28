import "server-only";
import { bindNextjsAppRouterServerOptimization } from "@contentful/optimization-nextjs/app-router/server";
import { OPTANON_COOKIE, resolveConsentFromOptanon } from "@/src/lib/consent";

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
    // Consent is derived from OneTrust's OptanonConsent cookie: C0002
    // (Performance) grants event emission, C0003 (Functional) grants durable
    // profile continuity. The mapping and its fail-open demo default live in
    // src/lib/consent.js so the browser half resolves it identically.
    server: ({ cookies }) =>
      resolveConsentFromOptanon(cookies.get(OPTANON_COOKIE)?.value),

    // Deliberately fail-closed even though the server above fails open. This is
    // static config baked into the binding — it cannot read a cookie — so the
    // browser starts denied and <OneTrustConsentSync> corrects it on mount.
    // Erring the other way would let the browser emit events for one tick
    // against a decision OneTrust may have denied.
    clientDefaults: { consent: false, persistenceConsent: false },
  },

  // Narrowed from the SDK default of ['identify', 'page'].
  //
  // `page` stays allowed so the tracker's initial page event is not lost in the
  // tick before <OneTrustConsentSync> applies real consent. `identify` is
  // removed because <IdentifyThirdParty> aliases a third-party id onto the
  // profile, and that is precisely the event a consent gate should hold until
  // C0002 is granted.
  allowedEventTypes: ["page"],

  // Insights is built into this SDK — there is no separate plugin to install.
  // Stated explicitly rather than left to the default so the intent is visible:
  // views and clicks feed component and experiment reporting, hovers are off
  // because they are noisy and nothing here reports on them.
  trackEntryInteraction: { views: true, clicks: true, hovers: false },

  // No `contentful` key: this app fetches its own entries in src/lib/client.js
  // and hands them over as `baselineEntry`. Configuring managed fetching here
  // would duplicate that fetch and its cache.
});

// The `request` family is the surface for private, per-visitor personalization.
// It derives the URL, route key, initial page payload, headers, and cookies
// from the request context forwarded by src/proxy.js, so the app does not have
// to assemble a handoff or decide who emits the initial page event.
//
// Note `hydration` is intentionally left at the request family's `preserve-server`
// default: the server resolves variants into the markup, so the browser must not
// discard and re-resolve them. Switching to `client-only-hidden-until-ready`
// would throw that away and blank content until the browser SDK initializes.
export const { NextAppAutoPageTracker, OptimizationRoot, OptimizedEntry } =
  optimization.request;
