const clean = (value?: string) => (value ?? "").trim().replace(/\/+$/, "");

/**
 * FRONTEND_URL may hold a comma separated list so local, preview and
 * production origins can all be trusted at once, e.g.
 * "http://localhost:5173,https://medflow.vercel.app".
 */
export const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map(clean)
  .filter(Boolean);

/** First configured origin – used when we have to build absolute links. */
export const FRONTEND_URL = ALLOWED_ORIGINS[0] ?? "http://localhost:5173";

export const BETTER_AUTH_URL = clean(process.env.BETTER_AUTH_URL) || "http://localhost:5000";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** True when running as a Vercel Function (no long-lived server / sockets). */
export const IS_SERVERLESS = Boolean(process.env.VERCEL);

/**
 * Set CROSS_SITE_COOKIES=true when the frontend calls the API on a different
 * site (no proxy in between) so the session cookie can be sent cross-site.
 */
export const CROSS_SITE_COOKIES = process.env.CROSS_SITE_COOKIES === "true";

/**
 * Demo mode (ON unless DEMO_MODE=false): every visitor is signed in
 * automatically as the admin account (see lib/adminAccount.ts) and background
 * jobs run inline when Inngest is unreachable, so the app can be shown
 * without a login step or workflow infrastructure.
 */
export const DEMO_MODE = process.env.DEMO_MODE !== "false";
