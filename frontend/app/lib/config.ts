const trimSlash = (value: string) => value.replace(/\/+$/, "");

/**
 * Origin of the backend API, WITHOUT a trailing slash and without `/api`.
 *
 * - Leave `VITE_API_URL` empty to call the API on the same origin (`/api/...`):
 *   the Vite dev server proxies it to the backend and, on Vercel, the
 *   `/api/*` route in `vercel.json` proxies it to `BACKEND_URL`. Same-origin
 *   keeps the auth cookie first-party, which works in every browser.
 * - Set `VITE_API_URL=https://api.example.com` to call the backend directly
 *   (the backend then needs `CROSS_SITE_COOKIES=true`).
 */
export const API_BASE_URL = trimSlash(import.meta.env.VITE_API_URL ?? "");

export const API_URL = `${API_BASE_URL}/api`;

/**
 * Socket.IO needs a long-lived server, so it always talks to the backend
 * directly. Falls back to the API origin, or localhost in development. When
 * nothing is configured (e.g. backend on Vercel Functions) real-time updates
 * are disabled and the UI relies on refetching.
 */
export const SOCKET_URL = trimSlash(
  import.meta.env.VITE_SOCKET_URL ??
    (API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5000" : "")),
);

export const REALTIME_ENABLED = SOCKET_URL.length > 0;
