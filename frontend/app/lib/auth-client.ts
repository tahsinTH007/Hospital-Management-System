import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
// import { polarClient } from "@polar-sh/better-auth/client";

export const authClient = createAuthClient({
  baseURL: "http://localhost:5000",
  //   plugins: [adminClient(), polarClient()],
  plugins: [adminClient()],
});
