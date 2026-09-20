import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.ts";
import { ADMIN_ACCOUNT, upsertAdminAccount } from "../lib/adminAccount.ts";
import { DEMO_MODE } from "../config/env.ts";

type DemoSession = Awaited<ReturnType<typeof auth.api.getSession>>;

interface DemoCookies {
  /** Full Set-Cookie strings from the sign-in response (for the browser). */
  setCookie: string[];
  /** "name=value" pairs only, for the Cookie request header. */
  cookie: string;
}

// Inngest calls this server-to-server and verifies its own signature; it must
// never get a session injected.
const SKIP = /^\/api\/inngest(\/|$)/;

let cached: DemoCookies | null = null;
let pending: Promise<DemoCookies> | null = null;

const signInAsAdmin = async (): Promise<DemoCookies> => {
  const { headers } = await auth.api.signInUsername({
    body: {
      username: ADMIN_ACCOUNT.username,
      password: ADMIN_ACCOUNT.password,
    },
    returnHeaders: true,
  });
  const setCookie = headers.getSetCookie();
  if (setCookie.length === 0) {
    throw new Error("Demo sign-in returned no session cookie");
  }
  return {
    setCookie,
    cookie: setCookie.map((c) => c.split(";")[0]!.trim()).join("; "),
  };
};

const sessionFromCookie = (cookie: string) =>
  auth.api.getSession({ headers: new Headers({ cookie }) });

/**
 * Signs in as the admin account (creating it – or resetting its password –
 * when the credentials do not work) and caches the resulting cookies. The
 * cache is re-validated on every use, so a session revoked by "sign out" is
 * simply replaced.
 */
const getDemoCookies = async (): Promise<{
  cookies: DemoCookies;
  session: DemoSession;
}> => {
  if (cached) {
    const session = await sessionFromCookie(cached.cookie);
    if (session) return { cookies: cached, session };
    cached = null;
  }

  pending ??= (async () => {
    try {
      return await signInAsAdmin();
    } catch (error) {
      console.warn(
        `Demo sign-in failed (${(error as Error).message}); (re)creating the admin account`,
      );
      await upsertAdminAccount();
      return signInAsAdmin();
    }
  })();

  try {
    cached = await pending;
  } finally {
    pending = null;
  }

  const session = await sessionFromCookie(cached.cookie);
  if (!session) {
    throw new Error("Demo session could not be established");
  }
  return { cookies: cached, session };
};

const withoutAuthCookies = (header: string | undefined) =>
  (header ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !part.includes("better-auth."))
    .join("; ");

/**
 * Demo mode: requests without a valid session get the admin's session cookie
 * injected before Better Auth and the API routes see them, and the cookie is
 * also sent back so the browser keeps it. Everything downstream – Better
 * Auth endpoints (including the admin plugin), requireAuth and checkRole –
 * therefore behaves exactly as if the admin had signed in.
 */
export const demoSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!DEMO_MODE || SKIP.test(req.path)) return next();

  try {
    const existing = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (existing) {
      (req as any).session = existing;
      return next();
    }

    const { cookies, session } = await getDemoCookies();
    const rest = withoutAuthCookies(req.headers.cookie);
    req.headers.cookie = rest ? `${rest}; ${cookies.cookie}` : cookies.cookie;
    res.setHeader("Set-Cookie", cookies.setCookie);
    (req as any).session = session;
    next();
  } catch (error) {
    next(error);
  }
};
