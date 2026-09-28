import React, { Suspense } from "react";
import { draftMode } from "next/headers";
import { connection } from "next/server";
import { getEntriesBySlug } from "@/src/lib/client";
import { ComponentResolver } from "@/src/components/ComponentResolver";
import { LivePreviewResolver } from "@/src/components/LivePreviewResolver";
import { notFound } from "next/navigation";

// Server Component that performs the request-time reads (params + draftMode)
// and the Contentful fetch. Isolated so it can sit inside its own <Suspense>.
//
// That boundary is NOT redundant with the one in [slug]/layout.jsx, however much
// it looks like it. Next.js prerenders a layout and the page it receives as
// `children` as separate units, so the layout's boundary is not an ancestor for
// the purposes of prerender analysis. Remove this one and `await connection()`
// below reports:
//
//   Route "/[slug]": Next.js encountered uncached data during prerendering...
//   `connection()` accessed outside of `<Suspense>`
//
// (Learned the hard way — this comment previously said the layout covered it.
// It does not.)
//
// `fallback={null}` matches the layout's boundary: blank, then baseline at full
// opacity. See the reasoning in [slug]/layout.jsx — in short, the production
// window is ~47ms and nothing renders below this subtree, so there is no shift
// to reserve against. Keep the two fallbacks identical, whatever they are; two
// boundaries resolving in sequence with *different* fallbacks is what produced
// the visible jump this replaced.
const PageBody = async ({ params }) => {
  // The resolvers below render <OptimizedEntry>, which builds a personalization
  // event payload and stamps it with new Date() — an unstable value Next.js
  // refuses to prerender. Awaiting connection() moves this subtree to request
  // time, which is required anyway since variant selection depends on the
  // visitor profile.
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

const landingPage = (props) => {
  return (
    <Suspense fallback={null}>
      <PageBody params={props.params} />
    </Suspense>
  );
};

export default landingPage;
