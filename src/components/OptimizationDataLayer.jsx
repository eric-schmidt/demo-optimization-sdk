"use client";

import { useEffect } from "react";
import { useOptimizationContext } from "@contentful/optimization-nextjs/client";

// Forwards Optimization SDK state to window.dataLayer for Google Tag Manager.
// Renders nothing.
//
// GTM used to need its own Ninetailed plugin. There is no equivalent in this
// SDK — checked: the suite is nine packages (runtimes plus the preview panel)
// with no plugin family, and no reference to dataLayer, Tag Manager, or a
// "destination" concept anywhere in it, including the latest release. Streams
// are the sanctioned integration point; the React README documents this exact
// pattern under "Provider-managed state subscriptions". So the subscriptions
// below are idiomatic, and only the payload shape is ours to define.
//
// That documented hook is `onStatesReady` on the provider, which is not reachable
// here: it is absent from the App Router root's prop surface, and being a
// function it could not cross the RSC boundary from the server binding anyway.
// Subscribing from a Client Component inside the root is the equivalent.
//
// No GTM container is loaded. Pushes land in window.dataLayer where they are
// inspectable from the console, and any GTM snippet added later picks up the
// existing queue automatically.
const pushToDataLayer = (payload) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
};

export const OptimizationDataLayer = () => {
  // Context rather than useOptimization(), which throws during render when the
  // SDK is not ready yet:
  //
  //   if (!sdk) throw Error("ContentfulOptimization SDK is unavailable.")
  //
  // A `if (!sdk) return` guard after that call is unreachable. Today the server
  // handoff seeds a snapshot runtime so the value is present on first render and
  // the throw never fires, but that is a property of this route's configuration,
  // not of the hook — a route without a handoff would crash the tree. Context
  // exposes the same instance and lets this component wait instead.
  const { sdk, error } = useOptimizationContext();

  useEffect(() => {
    if (error) {
      console.error(
        "[OptimizationDataLayer] Optimization SDK failed to initialize; " +
          "not forwarding to the dataLayer:",
        error,
      );
      return;
    }

    const states = sdk?.states;

    // Not an error — the SDK has not finished initializing. This effect re-runs
    // when it has.
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
  }, [sdk, error]);

  return null;
};
