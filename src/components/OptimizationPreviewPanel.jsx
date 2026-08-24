"use client";

import { useEffect } from "react";
import { useOptimizationContext } from "@contentful/optimization-nextjs/client";
import { getClient } from "@/src/lib/contentfulClient";

// Attaches the first-party Optimization preview panel — the audience/variant
// switcher authors use to see what a given profile would get. Renders nothing.
//
// This is the one capability in this set that is still a real package:
// @contentful/optimization-web-preview-panel. It is a Lit web component that
// registers against a running Optimization Web SDK instance.
//
// Draft Mode is the only gate, enforced server-side at the mount site in
// PersonalizationBoundary. This app has no separate preview route — preview is
// Draft Mode on /[slug] — and entering it already requires
// CONTENTFUL_PREVIEW_SECRET, so a published visitor can neither render this
// component nor trigger the import below.
//
// Worth knowing for bundle review: the panel package (~124KB) is emitted as a
// lazy chunk regardless. It is absent from the build manifest and referenced only
// as a dynamic import target, so nothing is fetched unless this component
// actually mounts. The cost is a build artifact, not bytes on the wire.
export const OptimizationPreviewPanel = () => {
  // The SDK instance is taken from React context rather than letting attach()
  // fall back to its default of `window.contentfulOptimization`.
  //
  // That default is a race. The React runtime initializes *asynchronously* after
  // commit, so the global does not exist yet when a child effect first runs, and
  // attach() is documented to throw "no Optimization Web SDK instance can be
  // resolved" when it cannot find one. Reading context instead gives a value that
  // is undefined until the SDK is genuinely ready and re-runs this effect when it
  // is — no timing assumption, and it is the same instance either way, since that
  // runtime is what assigns the global.
  const { sdk, error } = useOptimizationContext();

  useEffect(() => {
    if (error) {
      console.error(
        "[OptimizationPreviewPanel] Optimization SDK failed to initialize; " +
          "not attaching the preview panel:",
        error,
      );
      return;
    }

    // Not an error — the SDK simply has not finished initializing. This effect
    // re-runs when it has.
    if (!sdk) return;

    // The panel fetches from the browser, so it needs the Contentful credentials
    // present. Checked up front because otherwise createClient throws a bare
    // "Expected parameter accessToken", which gives no hint about which variable
    // is missing or why only the preview path is affected.
    //
    // Each variable is read as a static `process.env.NAME` expression on purpose.
    // Next.js inlines these at build time by textual substitution, so a computed
    // lookup like process.env[name] is NOT replaced — in the browser it would
    // read undefined for every key and this guard would never let the panel
    // attach. Do not refactor this into a loop over names.
    const missing = Object.entries({
      NEXT_PUBLIC_CONTENTFUL_SPACE_ID:
        process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID,
      NEXT_PUBLIC_CONTENTFUL_ENV_ID: process.env.NEXT_PUBLIC_CONTENTFUL_ENV_ID,
      NEXT_PUBLIC_CONTENTFUL_PREVIEW_KEY:
        process.env.NEXT_PUBLIC_CONTENTFUL_PREVIEW_KEY,
    })
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      console.warn(
        `[OptimizationPreviewPanel] Not attaching. Missing: ${missing.join(", ")}. ` +
          "Set these in .env.local — the panel fetches from the browser, so only " +
          "NEXT_PUBLIC_-prefixed values are visible to it.",
      );
      return;
    }

    let cancelled = false;

    const attach = async () => {
      const { default: attachOptimizationPreviewPanel } = await import(
        "@contentful/optimization-web-preview-panel"
      );

      if (cancelled) return;

      // The panel fetches its own nt_audience / nt_experience entries. Content
      // Source Maps are switched off — it renders its own UI and would only pay
      // the payload cost. attach() is idempotent, so an effect re-run reuses the
      // existing attachment rather than stacking panels.
      await attachOptimizationPreviewPanel({
        optimization: sdk,
        contentful: getClient({
          preview: true,
          includeContentSourceMaps: false,
        }),
      });
    };

    void attach().catch((attachError) => {
      console.error(
        "Failed to attach the Optimization preview panel:",
        attachError,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [sdk, error]);

  return null;
};
