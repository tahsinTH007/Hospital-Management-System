import * as z from "zod";

export const loginSchema = z.object({
  // Either the account email or the username.
  identifier: z.string().trim().min(1, "Enter your email or username"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});
