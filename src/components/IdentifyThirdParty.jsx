"use client";

import { useEffect, useRef } from "react";
import {
  useConsentState,
  useOptimizationActions,
} from "@contentful/optimization-nextjs/client";
import { THIRD_PARTY_COOKIE, readThirdPartyId } from "@/src/lib/thirdPartyData";

// Aliases the anonymous Contentful profile onto a known-user id read from the
// `thirdPartyData` cookie. Renders nothing.
//
// Two things that are easy to get wrong here:
//
// 1. This *is* the alias. The Optimization SDK has no `alias()` call — you
//    express aliasing as an identify() against the profile that already exists,
//    and the SDK stitches the two together behind its own `ctfl-opt-aid` cookie.
//
// 2. This is where persistence consent (C0003 Functional) actually bites. With
//    persistence denied the stitch is session-only, so the alias will not
//    survive a browser restart. That is correct behaviour, not a bug — do not
//    "fix" it by forcing persistence on.
//
// Gated on consent because `identify` was deliberately removed from
// `allowedEventTypes` in src/lib/optimization.js: sending a third-party id
// before consent is exactly what the privacy gate exists to prevent.
export const IdentifyThirdParty = () => {
  const consent = useConsentState();
  const { identifyUser } = useOptimizationActions();

  // Consent state re-emits, and identifyUser is not guaranteed to be a stable
  // reference, so without this the effect would re-alias on every re-run.
  const aliasedId = useRef(null);

  useEffect(() => {
    // Undefined means "no decision yet", false means denied — neither may alias.
    if (!consent) return;

    const userId = readThirdPartyId();

    if (!userId || aliasedId.current === userId) return;

    aliasedId.current = userId;

    void identifyUser({
      userId,
      traits: { source: THIRD_PARTY_COOKIE },
    });
  }, [consent, identifyUser]);

  return null;
};
