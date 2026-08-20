import chalk from "chalk";
import React from "react";
import { ComponentMap } from "@/src/components/ComponentMap";
import { OptimizedEntry } from "@/src/lib/optimization";

// Server-rendered resolver used on the published path. No Live Preview
// subscription — data comes from the cached Delivery API fetch.
//
// <OptimizedEntry> resolves the entry against this visitor's selected
// optimizations before the markup is built, so no baseline content flashes.
// Wrapping here rather than inside the leaves keeps every mapped component a
// plain props-in/JSX-out function and makes anything added to ComponentMap
// personalizable automatically. Resolution falls back to the baseline entry
// whenever nothing matches — that is a normal outcome, not an error.
export const ComponentResolver = ({ entry }) => {
  const contentTypeId = entry.sys.contentType.sys.id;
  const Component = ComponentMap[contentTypeId];

  if (!Component) {
    console.log(chalk.red(`No Mapping for: ${contentTypeId}`));
    return null;
  }

  return (
    <OptimizedEntry className="w-full" baselineEntry={entry}>
      {(resolved) => (
        <Component fields={resolved.fields} contentTypeId={contentTypeId} />
      )}
    </OptimizedEntry>
  );
};
