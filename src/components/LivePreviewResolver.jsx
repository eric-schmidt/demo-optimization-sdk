"use client";

import React from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { OptimizedEntry } from "@contentful/optimization-nextjs/client";
import { ComponentMap } from "@/src/components/ComponentMap";

// Client-side resolver used on the draft path. Subscribes to Live Preview
// once per entry and passes the updated fields down to the mapped component.
// Only imported from routes that have already checked draftMode(); the
// published path uses <ComponentResolver> and ships no Live Preview JS.
//
// This path needs its own <OptimizedEntry> — the published path's wrapper never
// runs here, so without this an editor previewing a variant would silently see
// baseline content. The live-updated entry becomes the baseline so editor edits
// and variant resolution compose instead of overwriting each other, and
// liveUpdates re-resolves when profile or preview state changes mid-session.
//
// The /client component is used rather than the bound one from
// src/lib/optimization.js because only it accepts per-entry liveUpdates. It
// reads context from the <OptimizationRoot> mounted in the root layout.
export const LivePreviewResolver = ({ entry }) => {
  const liveEntry = useContentfulLiveUpdates(entry);

  const contentTypeId = entry.sys.contentType.sys.id;
  const Component = ComponentMap[contentTypeId];

  if (!Component) {
    return null;
  }

  return (
    <OptimizedEntry className="w-full" baselineEntry={liveEntry} liveUpdates>
      {(resolved) => (
        <Component fields={resolved.fields} contentTypeId={contentTypeId} />
      )}
    </OptimizedEntry>
  );
};
