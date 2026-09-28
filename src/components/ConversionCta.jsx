"use client";

import React from "react";
import { useOptimizationActions } from "@contentful/optimization-nextjs/client";

// A conversion event, so experiment reporting has something to measure against.
//
// Entry views and clicks are tracked automatically by <OptimizedEntry> via the
// `trackEntryInteraction` config on the binding. That covers exposure, but an
// experiment also needs a business outcome, which is what trackEvent() is for.
//
// Lives in its own Client Component because Hero renders as a Server Component
// on the published path (ADR 0002) and must not gain hooks. Rendering a Client
// Component from an RSC is fine; adding a hook to a shared module is not.
export const ConversionCta = ({
  label = "Request a demo",
  eventName = "demo_cta_click",
}) => {
  const { trackEvent } = useOptimizationActions();

  const handleClick = () => {
    console.log("event tracked");
    void trackEvent({
      event: eventName,
      properties: {
        label,
        path: window.location.pathname,
      },
    });
  };

  return (
    <button
      type="button"
      className="btn bg-black cursor-pointer"
      onClick={handleClick}
    >
      {label}
    </button>
  );
};

export default ConversionCta;
