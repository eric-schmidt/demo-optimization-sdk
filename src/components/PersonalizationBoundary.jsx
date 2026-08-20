import React from "react";
import { connection } from "next/server";
import {
  NextAppAutoPageTracker,
  OptimizationRoot,
} from "@/src/lib/optimization";

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
export const PersonalizationBoundary = async ({ children }) => {
  await connection();

  return (
    <OptimizationRoot>
      <NextAppAutoPageTracker />

      {children}
    </OptimizationRoot>
  );
};
