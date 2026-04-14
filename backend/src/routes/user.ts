import express from "express";

const userRouter = express.Router();

import {
  fetchAllUsers,
  getUserById,
  updateUser,
  admitPatient,
  getPolarPortalLink,
} from "../controllers/user";
import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";

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
