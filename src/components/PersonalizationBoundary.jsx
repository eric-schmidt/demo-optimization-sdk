import React from "react";
import { draftMode } from "next/headers";
import { connection } from "next/server";
import {
  NextAppAutoPageTracker,
  OptimizationRoot,
} from "@/src/lib/optimization";
import { IdentifyThirdParty } from "@/src/components/IdentifyThirdParty";
import { OneTrustConsentSync } from "@/src/components/OneTrustConsentSync";
import { OptimizationDataLayer } from "@/src/components/OptimizationDataLayer";
import { OptimizationPreviewPanel } from "@/src/components/OptimizationPreviewPanel";

// Marks the start of the request-time half of the tree.
//
// `await connection()` is required, not decorative. Under Cache Components
// Next.js tries to prerender everything it can, and the request runtime reads
// unstable per-request values (it calls new Date() while building the page
// payload). A <Suspense> boundary alone does not defer that — Suspense controls
// streaming, not whether a value may be prerendered — so without an explicit
// dynamic data access the prerender fails with:
//   "Next.js encountered the unstable value `new Date()` while prerendering."
//
// Awaiting connection() opts this subtree out of prerendering and into
// request-time rendering, which is what personalization needs anyway: variant
// selection depends on the visitor's profile cookie.
//
// Isolated in its own component so the shell in layout.jsx stays prerenderable.
//
// This is also the single mount point for every browser-side personalization
// concern. All of them need to be *inside* <OptimizationRoot>: the hooks require
// its context, and the preview panel binds to the `window.contentfulOptimization`
// singleton the root creates. The app's root layout is above this boundary and
// therefore cannot host them.
export const PersonalizationBoundary = async ({ children }) => {
  await connection();

  // Free here — this component is already request-time by design. Preview in
  // this app is Draft Mode on /[slug], not a separate route, so this flag is
  // what "only on the preview route" actually means.
  const { isEnabled: preview } = await draftMode();

  return (
    <OptimizationRoot>
      <NextAppAutoPageTracker />

      {/* Reconciles the browser SDK's fail-closed consent default with OneTrust. */}
      <OneTrustConsentSync />

      {/* Aliases the profile onto a third-party id once consent allows it. */}
      <IdentifyThirdParty />

      {/* Mirrors SDK state into window.dataLayer for GTM. */}
      <OptimizationDataLayer />

      {/* Author tooling only — never on a published render. */}
      {preview && <OptimizationPreviewPanel />}

      {children}
    </OptimizationRoot>
  );
};
