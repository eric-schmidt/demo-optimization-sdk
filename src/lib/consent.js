// OneTrust consent bridge.
//
// The Optimization SDK has two independent permissions, and this module is the
// single place that maps OneTrust's cookie categories onto them:
//
//   events      -> may emit personalization / analytics events   (C0002 Performance)
//   persistence -> may durably store the profile id for
//                  cross-session continuity                     (C0003 Functional)
//
// Deliberately free of framework imports. The server binding in
// src/lib/optimization.js and the browser sync in
// src/components/OneTrustConsentSync.jsx both resolve consent through this
// file, so the two halves of the SDK cannot drift apart.

export const OPTANON_COOKIE = "OptanonConsent";

// Which OneTrust category governs which SDK permission.
export const CONSENT_GROUPS = {
  events: "C0002",
  persistence: "C0003",
};

// Granted on both axes.
//
// DEMO DEFAULT: this app ships no OneTrust script, so the cookie never exists
// and a fail-closed default would make personalization permanently invisible.
// One rule keeps the cookie path and the event path consistent:
//
//   OneTrust absent entirely -> fail open (this value)
//   OneTrust present         -> trust it exactly, including denials
//
// A production deployment must invert this and default to denied.
const FAIL_OPEN = { events: true, persistence: true };

const GROUPS_PREFIX = "groups=";

// Pull the `groups` segment out of an OptanonConsent value and turn it into a
// lookup of category id -> granted.
//
// The cookie is a URL-encoded query string; the segment we want looks like
//   groups=C0001%3A1%2CC0002%3A1%2CC0003%3A0
// which decodes to
//   groups=C0001:1,C0002:1,C0003:0
// where 1 means the category is active and 0 means it is not.
//
// Returns null rather than an empty Map when there is nothing to read: callers
// have to tell "OneTrust said nothing" apart from "OneTrust said no".
export const parseOptanonGroups = (rawValue) => {
  if (!rawValue) return null;

  let decoded;
  try {
    decoded = decodeURIComponent(rawValue);
  } catch {
    // Malformed percent-encoding. Treated as absent rather than thrown, because
    // this runs inside a consent resolver on the request path — throwing here
    // would fail the whole render over a cosmetic cookie problem.
    return null;
  }

  const segment = decoded
    .split("&")
    .find((part) => part.startsWith(GROUPS_PREFIX));

  if (!segment) return null;

  const groups = new Map();
  for (const pair of segment.slice(GROUPS_PREFIX.length).split(",")) {
    const [id, value] = pair.split(":");
    if (id) {
      groups.set(id.trim(), value?.trim() === "1");
    }
  }

  return groups.size > 0 ? groups : null;
};

// Resolve consent from a raw OptanonConsent cookie value. Used by the server
// binding, where the cookie is the only signal available.
//
// Once a groups list exists it is authoritative: a category that is absent from
// it is a denial, not an unknown. That matches the browser event below, whose
// payload lists active categories only.
export const resolveConsentFromOptanon = (rawValue) => {
  const groups = parseOptanonGroups(rawValue);

  if (!groups) return FAIL_OPEN;

  return {
    events: groups.get(CONSENT_GROUPS.events) === true,
    persistence: groups.get(CONSENT_GROUPS.persistence) === true,
  };
};

// Resolve consent from the array of active category ids carried by OneTrust's
// `OneTrustGroupsUpdated` event (`event.detail`), e.g. ["C0001", "C0002"].
//
// A genuine OneTrust event always contains at least C0001 (Strictly Necessary,
// always active), so an empty or non-array payload means something malformed
// rather than a real rejection, and falls back to the same fail-open default.
export const resolveConsentFromActiveGroups = (activeGroups) => {
  if (!Array.isArray(activeGroups) || activeGroups.length === 0) {
    return FAIL_OPEN;
  }

  const active = new Set(activeGroups);

  return {
    events: active.has(CONSENT_GROUPS.events),
    persistence: active.has(CONSENT_GROUPS.persistence),
  };
};

// Read the raw cookie value in the browser. Returns undefined on the server so
// callers can share one code path; decoding is left to parseOptanonGroups.
export const readOptanonCookieFromDocument = () => {
  if (typeof document === "undefined") return undefined;

  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${OPTANON_COOKIE}=`));

  return match?.slice(OPTANON_COOKIE.length + 1);
};
