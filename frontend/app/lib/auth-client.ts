import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { polarClient } from "@polar-sh/better-auth/client";
import { API_BASE_URL } from "./config";

export const authClient = createAuthClient({
  // Empty API_BASE_URL means "same origin" – Better Auth then uses
  // window.location.origin in the browser.
  baseURL: API_BASE_URL || undefined,
  plugins: [adminClient(), polarClient()],
});

export type Session = typeof authClient.$Infer.Session;
