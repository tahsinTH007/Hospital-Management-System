import express from "express";
import { requireAuth } from "../middleware/auth";
import { getUserById } from "../controllers/user";

const userRouter = express.Router();

userRouter.get("/profile/:id", requireAuth, getUserById);

export default userRouter;
