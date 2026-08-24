// Reader for the third-party identity cookie used to alias the Contentful
// profile. See src/components/IdentifyThirdParty.jsx for how the value is used.
//
// Stands in for whatever real system owns the known-user id — a CDP, a loyalty
// platform, an auth session. The only contract this app depends on is "a cookie
// containing an id we can hand to identify()".

export const THIRD_PARTY_COOKIE = "thirdPartyData";

const readRawCookie = (name) => {
  if (typeof document === "undefined") return undefined;

  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));

  return match?.slice(name.length + 1);
};

// Extract the id from the thirdPartyData cookie.
//
// Tolerant of both shapes a real integration tends to produce:
//   thirdPartyData=abc-123
//   thirdPartyData=%7B%22id%22%3A%22abc-123%22%7D   -> {"id":"abc-123"}
//
// Returns null for anything missing or unparseable rather than throwing. A bad
// cookie must not be able to break the render, and null simply means "no known
// user to alias", which is the common case.
export const readThirdPartyId = () => {
  const raw = readRawCookie(THIRD_PARTY_COOKIE);

  if (!raw) return null;

  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }

  decoded = decoded.trim();

  if (!decoded) return null;

  // JSON object form.
  if (decoded.startsWith("{")) {
    try {
      const parsed = JSON.parse(decoded);
      const id = parsed?.id ?? parsed?.userId ?? parsed?.profileId;
      return typeof id === "string" && id.trim() ? id.trim() : null;
    } catch {
      return null;
    }
  }

  // Bare string form.
  return decoded;
};
