import React from "react";

// Sized placeholder for the personalized subtree.
//
// CURRENTLY UNUSED, on purpose — kept rather than deleted. Both Suspense
// boundaries ([slug]/layout.jsx and [slug]/page.jsx) render `fallback={null}`
// today, because:
//
//   - the production resolve window is ~47ms (3ms TTFB, ~50ms total), short
//     enough that any visible placeholder reads as a flash rather than as
//     feedback — the ~170ms visible in `next dev` is compilation overhead; and
//   - nothing renders below the personalized subtree (the root layout is
//     main > div > children, no footer), so no late-arriving content pushes
//     anything down and there is no layout shift to reserve against.
//
// Reinstate this when the second point stops being true — i.e. when static
// content is added below the personalized area. Use it as the fallback in BOTH
// boundaries, never just one: two boundaries resolving in sequence with
// different fallbacks is what produced the visible jump this originally fixed.
//
// It replaced red/blue debug banners that were a different size than the content
// replacing them, so every load ended in a layout shift.
//
// The job here is to reserve the same space the real content will occupy.
// The wrappers mirror <Hero> and <Duplex> class for class, so the reserved box
// tracks them at every breakpoint; only the inner blocks differ.
//
// Colours use bg-current so the skeleton follows the foreground colour and works
// in both light and dark schemes (see globals.css). No clock read anywhere — a
// new Date() here would reintroduce the prerender error the boundary exists to
// contain.
const Line = ({ className }) => (
  <div className={`rounded bg-current/10 ${className}`} />
);

export const ContentSkeleton = () => (
  <div className="w-full animate-pulse" aria-hidden="true">
    {/* Mirrors <Hero>. Its height comes from this padding, since the real hero
        image is absolutely positioned with `fill`. */}
    <section className="container relative">
      <div className="relative z-10 md:max-w-lg px-10 py-20 md:px-10 md:py-40">
        <Line className="mb-4 h-8 w-3/4" />
        <Line className="mb-2 h-4 w-full" />
        <Line className="h-4 w-5/6" />
      </div>
    </section>

    {/* Mirrors <Duplex>. The image column is an approximation: real Duplex
        images are sized from Contentful asset dimensions, so an exact reserve
        is not possible without fetching the entry first. */}
    <section className="grid grid-cols-1 md:grid-cols-2 gap-12 p-6 mt-12">
      <div className="flex flex-col justify-center">
        <Line className="mb-4 h-7 w-2/3" />
        <Line className="mb-2 h-4 w-full" />
        <Line className="h-4 w-4/5" />
      </div>

      <Line className="aspect-4/3 w-full" />
    </section>
  </div>
);

export default ContentSkeleton;
