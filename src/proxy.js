import { createNextjsOptimizationContextHandler } from "@contentful/optimization-nextjs/request-handler";

// Forwards sanitized request context (URL, headers, cookies) to Server
// Components so the request-personalized runtime can resolve variants before
// markup is sent. Next.js 16 names this file `proxy` and expects a `proxy`
// export; Next.js 13-15 used `middleware`/`middleware` with the same body.
//
// This boundary is required, not optional — the request family depends on it
// for the forwarded request URL.
export const proxy = createNextjsOptimizationContextHandler();

export const config = {
  // Must cover every personalized route — /[slug] in this app. `api` is
  // excluded so the Draft Mode and revalidation webhook endpoints are not
  // intercepted.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
