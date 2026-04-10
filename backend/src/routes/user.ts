import express from "express";
import { requireAuth } from "../middleware/auth";
import { fetchAllUsers, getUserById, updateUser } from "../controllers/user";
import { checkRole } from "../middleware/checkRole";

const userRouter = express.Router();

userRouter.get(
  "/",
  requireAuth,
  checkRole(["admin", "doctor", "nurse"]),
  fetchAllUsers,
);

userRouter.get("/profile/:id", requireAuth, getUserById);

userRouter.put(
  "/update/:id",
  requireAuth,
  checkRole(["admin", "doctor", "nurse"]),
  updateUser,
);

export default userRouter;
