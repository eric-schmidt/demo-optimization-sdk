import { createClient } from "contentful";

// Contentful client factory.
//
// Split out of src/lib/client.js so that a Client Component can import it.
// That module imports cacheLife/cacheTag from next/cache and defines a
// "use cache" function; both are server-only, and pulling them into a browser
// bundle yields stubs that throw
// "`cacheTag` is only available in a Server Component."
//
// The browser needs this factory for exactly one thing: the Optimization
// preview panel fetches its own nt_audience / nt_experience entries. See
// src/components/OptimizationPreviewPanel.jsx. Nothing else on the client
// should reach for it — page data still comes from the cached server fetch in
// src/lib/client.js.

// Retrieve a Contentful client with various configured options.
export const getClient = ({
  preview = false,
  // Content Source Maps prevent the need for manually tagging components for
  // Live Preview Inspector Mode, but they are only available on the Preview
  // API. Defaults to `preview` so existing callers behave exactly as before;
  // the preview panel opts out, since it renders its own UI and only pays the
  // payload cost.
  includeContentSourceMaps = preview,
} = {}) => {
  try {
    // If `preview` is true, use the Preview domain + API key, otherwise use Delivery.
    const domain = preview ? "preview.contentful.com" : "cdn.contentful.com";

    // Space, environment, and the Preview key are NEXT_PUBLIC_ because this
    // factory has to run in the browser for the preview panel, and Next only
    // inlines NEXT_PUBLIC_-prefixed values into client bundles. They are single
    // names rather than a server/public pair on purpose — one source of truth
    // beats two that can drift.
    //
    // The Delivery key stays server-only: getClient({ preview: false }) is only
    // ever called from the cached server fetch in src/lib/client.js, so there is
    // no reason to publish it. The two route secrets
    // (CONTENTFUL_PREVIEW_SECRET, CONTENTFUL_REVALIDATION_SECRET) must never be
    // published — they gate Draft Mode and the revalidation webhook.
    //
    // Accepted tradeoff: the Preview key is readable in the browser. It is
    // read-only, but it does grant access to unpublished content, so a
    // customer-facing build should move the panel to a server-fetched `entries`
    // handoff or a route-handler proxy rather than inherit this.
    const apiKey = preview
      ? process.env.NEXT_PUBLIC_CONTENTFUL_PREVIEW_KEY
      : process.env.CONTENTFUL_DELIVERY_KEY;

    return createClient({
      space: process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID,
      environment: process.env.NEXT_PUBLIC_CONTENTFUL_ENV_ID,
      accessToken: apiKey,
      host: domain,
      includeContentSourceMaps,
    });
  } catch (error) {
    console.error("Error initializing Contentful client:", error);
    throw error;
  }
};
