import { cacheLife, cacheTag } from "next/cache";
import safeJsonStringify from "safe-json-stringify";
import { getClient } from "@/src/lib/contentfulClient";

// `getClient` lives in src/lib/contentfulClient.js rather than here because the
// preview panel needs it in the browser, and this module cannot cross that
// boundary: next/cache and the "use cache" directive below are server-only.
// Re-exported so existing importers (src/app/api/draft/route.js) keep working.
export { getClient };

// Walk the Contentful response and collect every Entry/Asset id that appears
// anywhere in the tree — as a resolved entity (`sys.type: 'Entry' | 'Asset'`)
// or as an unresolved link stub (`sys.type: 'Link'` with a matching
// `linkType`). Link stubs let us tag references one level deeper than the
// query's `include` depth resolved.
const collectContentfulIds = (node, ids = new Set()) => {
  if (!node || typeof node !== "object") return ids;
  if (Array.isArray(node)) {
    for (const item of node) collectContentfulIds(item, ids);
    return ids;
  }
  const sys = node.sys;
  if (sys && typeof sys.id === "string") {
    if (
      sys.type === "Entry" ||
      sys.type === "Asset" ||
      (sys.type === "Link" &&
        (sys.linkType === "Entry" || sys.linkType === "Asset"))
    ) {
      ids.add(sys.id);
    }
  }
  for (const key of Object.keys(node)) {
    if (key === "sys") continue;
    collectContentfulIds(node[key], ids);
  }
  return ids;
};

// Cached fetch used for the public Delivery API. The "use cache" directive
// caches the return value keyed on the function arguments; cacheTag() is
// called with every referenced entry's sys.id so that a webhook publish for
// any of them invalidates this page cache.
const getPublishedEntriesBySlug = async ({
  contentType,
  slug,
  includeDepth = 10,
}) => {
  "use cache";
  cacheLife("contentful");
  // Tag the query itself so an empty-result cache entry (miss before publish)
  // can still be invalidated once content appears at this slug.
  cacheTag(`${contentType}:${slug}`);

  const client = getClient({ preview: false });

  try {
    const response = await client.getEntries({
      content_type: contentType,
      include: includeDepth,
      "fields.slug": slug,
    });
    // Prevent circular reference errors.
    const items = JSON.parse(safeJsonStringify(response.items));

    // Tag every Entry/Asset that appears anywhere in the response tree,
    // including unresolved link stubs — so references one level deeper than
    // the query's `include` still invalidate the parent when they publish.
    const ids = new Set();
    collectContentfulIds(items, ids);
    collectContentfulIds(response.includes?.Entry, ids);
    collectContentfulIds(response.includes?.Asset, ids);
    for (const id of ids) {
      cacheTag(id);
    }

    return items;
  } catch (error) {
    console.error("Error fetching entries:", error);
    throw error;
  }
};

// Public API: dispatches on preview so the cached branch's "use cache"
// directive stays static. Preview / Draft Mode reads bypass the cache
// entirely — the Contentful Preview API must not be cached.
export const getEntriesBySlug = async ({
  preview = false,
  contentType,
  slug,
  includeDepth = 10,
}) => {
  if (preview) {
    const client = getClient({ preview: true });
    try {
      const response = await client.getEntries({
        content_type: contentType,
        include: includeDepth,
        "fields.slug": slug,
      });
      return JSON.parse(safeJsonStringify(response.items));
    } catch (error) {
      console.error("Error fetching preview entries:", error);
      throw error;
    }
  }

  return getPublishedEntriesBySlug({ contentType, slug, includeDepth });
};
