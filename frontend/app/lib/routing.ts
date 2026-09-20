import type { Role } from "@/types";

interface MinimalUser {
  id: string;
  role?: string | null;
}

/** Where a user lands after login / when they hit a page they may not see. */
export const getHomePath = (user?: MinimalUser | null) => {
  if (!user) return "/login";
  return (user.role as Role) === "patient" ? `/profile/${user.id}` : "/dashboard";
};
