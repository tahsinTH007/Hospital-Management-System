import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

export type Role =
  | "all"
  | "admin"
  | "doctor"
  | "nurse"
  | "pharmacist"
  | "lab_tech"
  | "patient";

export const checkRole = (allowedRoles: Role) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userRole = (session.user as any).role;

      if (!allowedRoles.includes(userRole)) {
        return res
          .status(403)
          .json({ message: "Forbidden: Insufficient Permissions" });
      }

      (req as any).user = session.user;

      next();
    } catch (error) {
      console.error("Error checking role:", error);
      res.status(500).json({ message: "Server error" });
    }
  };
};
