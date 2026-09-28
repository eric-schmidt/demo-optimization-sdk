import React, { Suspense } from "react";
import { PersonalizationBoundary } from "@/src/components/PersonalizationBoundary";

// Personalization is scoped to this route group rather than the root layout so
// that routes without personalized content never wait on the request preflight,
// following the SDK's guidance to keep public shell content outside the request
// boundary. Anything rendered under /[slug] is still fully personalizable.
//
// Tradeoff: NextAppAutoPageTracker lives inside this boundary, so page events
// fire only on these routes. That is acceptable while the only other route is
// the untouched create-next-app page at /. If real non-personalized routes get
// added, revisit — OptimizationAnalyticsRoot covers tracking without blocking,
// but it requires a constructed analytics handoff and an explicit routeKey.
//
// The Suspense boundary is required, not cosmetic: <PersonalizationBoundary>
// awaits connection(), and Next.js refuses to prerender an uncached request-time
// access that is not inside one. page.jsx has its own for the same reason — see
// the note there about why it is not redundant with this one.
//
// `fallback={null}` is deliberate. It renders blank, then baseline content at
// full opacity, rather than a visible placeholder:
//
//   - In production the window is ~47ms (3ms TTFB, ~50ms total). A placeholder
//     that appears for 47ms reads as a flash, not as feedback. The ~170ms you
//     see in `next dev` is per-request compilation and does not ship.
//   - Nothing renders below this subtree — the root layout is main > div >
//     children with no footer or static sections — so there is nothing for
//     late-arriving content to push down, and no layout shift to prevent.
//
// If static content is ever added *below* the personalized area, that second
// point stops holding and this should become a sized placeholder again.
// <ContentSkeleton> is kept in src/components for exactly that case: swap it
// back in here and in page.jsx, and use the same one in both so the two
// boundaries resolving in sequence look like one continuous placeholder.
const LandingPageLayout = ({ children }) => {
  return (
    <Suspense fallback={null}>
      <PersonalizationBoundary>{children}</PersonalizationBoundary>
    </Suspense>
  );
};

export default LandingPageLayout;
