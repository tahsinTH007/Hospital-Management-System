import express from "express";

import {
  fetchAllUsers,
  getUserById,
  updateUser,
  admitPatient,
  getPolarPortalLink,
} from "../controllers/user.ts";
import { requireAuth } from "../middleware/auth.ts";
import { checkRole } from "../middleware/checkRole.ts";

const userRouter = express.Router();

userRouter.get(
  "/",
  requireAuth,
  checkRole(["admin", "doctor", "nurse"]),
  fetchAllUsers,
);
userRouter.put(
  "/update/:id",
  requireAuth,
  checkRole(["admin", "doctor", "nurse"]),
  updateUser,
);

userRouter.get("/profile/:id", requireAuth, getUserById);
userRouter.post(
  "/:id/admit",
  requireAuth,
  checkRole(["admin", "doctor", "nurse"]),
  admitPatient,
);

userRouter.get("/polar-portal/:userId", requireAuth, getPolarPortalLink);

export default userRouter;
