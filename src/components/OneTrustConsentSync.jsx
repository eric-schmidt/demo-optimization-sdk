"use client";

import { useEffect } from "react";
import { useOptimizationActions } from "@contentful/optimization-nextjs/client";
import {
  readOptanonCookieFromDocument,
  resolveConsentFromActiveGroups,
  resolveConsentFromOptanon,
} from "@/src/lib/consent";

// Browser half of the OneTrust consent bridge. Renders nothing.
//
// Needed because consent has to be resolved twice. The server binding in
// src/lib/optimization.js reads OptanonConsent per request, but its
// `clientDefaults` are static config and cannot read a cookie — so the browser
// SDK starts fail-closed and would stay there. This component reconciles it.
//
// Must be mounted inside <OptimizationRoot> (see PersonalizationBoundary):
// useOptimizationActions() needs that context, and the root does not exist in
// the app's root layout.
export const OneTrustConsentSync = () => {
  const { setConsent } = useOptimizationActions();

  useEffect(() => {
    // Reconcile immediately on mount. Until this runs the browser SDK is
    // fail-closed, which is why `allowedEventTypes: ["page"]` on the binding
    // keeps the initial page event from being dropped in the gap.
    setConsent(resolveConsentFromOptanon(readOptanonCookieFromDocument()));

    // OneTrust fires this whenever consent becomes available or changes, so a
    // visitor updating their preferences takes effect without a reload.
    // `event.detail` is the array of *active* category ids, e.g. ["C0001","C0002"].
    const handleGroupsUpdated = (event) => {
      setConsent(resolveConsentFromActiveGroups(event.detail));
    };

    window.addEventListener("OneTrustGroupsUpdated", handleGroupsUpdated);

    return () => {
      window.removeEventListener("OneTrustGroupsUpdated", handleGroupsUpdated);
    };
  }, [setConsent]);

  return null;
};
