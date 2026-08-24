"use client";

import { useEffect } from "react";
import { useOptimization } from "@contentful/optimization-nextjs/client";

// Forwards Optimization SDK state to window.dataLayer for Google Tag Manager.
// Renders nothing.
//
// GTM used to need its own Ninetailed plugin; it does not any more. The SDK
// exposes observable state streams, so forwarding is a subscription.
//
// Note this cannot use the provider's `onStatesReady` hook, which would
// otherwise be the natural place: that option is absent from the App Router
// server binding, and being a function it could not cross the RSC boundary
// anyway. Subscribing from a Client Component inside the root is the path that
// works.
//
// No GTM container is loaded. Pushes land in window.dataLayer where they are
// inspectable from the console, and any GTM snippet added later picks up the
// existing queue automatically.
const pushToDataLayer = (payload) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
};

export const OptimizationDataLayer = () => {
  const sdk = useOptimization();

  useEffect(() => {
    const states = sdk?.states;

    if (!states) return;

    // selectedOptimizations re-emits on profile, consent, and preview changes,
    // so the same exposure would be pushed repeatedly without this.
    const seenExposures = new Set();

    const subscriptions = [
      // Variant exposure — the signal GTM actually wants for experiment and
      // audience reporting. There is no audienceId on a selection: the payload
      // is experience + variant only.
      states.selectedOptimizations.subscribe((selections) => {
        if (!selections) return;

        for (const selection of selections) {
          const { experienceId, variantIndex, variants, sticky } =
            selection ?? {};

          if (!experienceId) continue;

          const key = `${experienceId}:${variantIndex}`;

          if (seenExposures.has(key)) continue;

          seenExposures.add(key);

          pushToDataLayer({
            event: "ctfl_optimization_exposure",
            experienceId,
            variantIndex,
            variants,
            sticky: sticky ?? false,
          });
        }
      }),

      // Raw event feed: page, identify, track, and interaction events.
      states.eventStream.subscribe((event) => {
        if (!event) return;

        pushToDataLayer({
          event: "ctfl_optimization_event",
          eventType: event.type,
          payload: event,
        });
      }),
    ];

    return () => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    };
  }, [sdk]);

  return null;
};
