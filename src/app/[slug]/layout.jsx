import React, { Suspense } from "react";
import { PersonalizationBoundary } from "@/src/components/PersonalizationBoundary";

// TEMPORARY DEBUG PLACEHOLDER — remove before shipping.
// Shows while <PersonalizationBoundary> is pending, i.e. while connection() and
// the OptimizationRoot request preflight resolve. Measured at ~24ms, so in
// practice React's 300ms fallback throttle means this is the placeholder you
// actually see — it is held on screen until the page's own boundary resolves.
const PersonalizationFallback = () => (
  <div
    style={{
      width: "100%",
      padding: "3rem 2rem",
      background: "#1d4ed8",
      color: "#ffffff",
      font: "bold 1.25rem/1.4 system-ui, sans-serif",
      textAlign: "center",
      border: "8px dashed #67e8f9",
    }}
  >
    LAYOUT SUSPENSE FALLBACK — OptimizationRoot preflight pending
  </div>
);

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
const LandingPageLayout = ({ children }) => {
  return (
    <Suspense fallback={<PersonalizationFallback />}>
      <PersonalizationBoundary>{children}</PersonalizationBoundary>
    </Suspense>
  );
};

export default LandingPageLayout;
