import React, { Suspense } from "react";
import { draftMode } from "next/headers";
import { connection } from "next/server";
import { getEntriesBySlug } from "@/src/lib/client";
import { ComponentResolver } from "@/src/components/ComponentResolver";
import { LivePreviewResolver } from "@/src/components/LivePreviewResolver";
import { notFound } from "next/navigation";

// Server Component that performs the request-time reads (params + draftMode)
// and the Contentful fetch. Isolated so it can sit inside a <Suspense>
// boundary — under Cache Components any uncached request-time access must
// be wrapped in Suspense.
const PageBody = async ({ params }) => {
  // This Suspense boundary is prerendered independently of the one in
  // layout.jsx, so the connection() call there does not cover it. The resolvers
  // below render <OptimizedEntry>, which builds a personalization event payload
  // and stamps it with new Date() — an unstable value Next.js refuses to
  // prerender. Awaiting connection() moves this subtree to request time, which
  // is required anyway since variant selection depends on the visitor profile.
  await connection();

  const { slug } = await params;
  const { isEnabled: preview } = await draftMode();
  // Sometimes it is helpful to override Draft Mode when testing.
  // const isEnabled = true;

  // Depth 10 rather than 4: personalization adds nesting (page -> section ->
  // nt_experiences -> nt_variants -> variant entry -> the variant's own
  // assets). Links left unresolved past the include depth resolve to baseline
  // silently, with no error to point at. 10 matches what the SDK's own managed
  // fetch uses. The larger payload is absorbed by the "use cache" layer in
  // src/lib/client.js, which still caches baseline data per revalidation
  // window rather than per visitor.
  const landingPages = await getEntriesBySlug({
    preview: preview,
    contentType: "landingPage",
    slug,
    includeDepth: 10,
  });

  if (landingPages.length === 0) {
    notFound();
  }

  // Draft: use the client-side resolver so Live Preview updates stream in.
  // Published: use the server-side resolver so we ship zero Live Preview JS
  // to the client for cached page renders.
  const Resolver = preview ? LivePreviewResolver : ComponentResolver;

  return landingPages.map((landingPage) => (
    <React.Fragment key={landingPage.sys.id}>
      {landingPage.fields.hero && <Resolver entry={landingPage.fields.hero} />}

      {landingPage.fields.content?.map((entry) => (
        <Resolver key={entry.sys.id} entry={entry} />
      ))}
    </React.Fragment>
  ));
};

// TEMPORARY DEBUG PLACEHOLDER — remove before shipping.
// Shows while <PageBody> is pending: connection() + params + draftMode() + the
// Contentful fetch. Inline styles (not Tailwind) so nothing can be purged, and
// deliberately no clock read — a new Date() here would reintroduce the
// prerender error this boundary exists to contain.
const PageBodyFallback = () => (
  <section
    style={{
      width: "100%",
      padding: "10rem 2rem",
      background: "#dc2626",
      color: "#ffffff",
      font: "bold 1.25rem/1.4 system-ui, sans-serif",
      textAlign: "center",
      border: "8px dashed #fde047",
    }}
  >
    PAGE SUSPENSE FALLBACK — PageBody pending (fetch + resolvers)
  </section>
);

const landingPage = (props) => {
  return (
    <Suspense fallback={<PageBodyFallback />}>
      <PageBody params={props.params} />
    </Suspense>
  );
};

export default landingPage;
