import express from "express";
import { requireAuth } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import { addActivityLog, getActivityLogs } from "../controllers/activity";

const activityLogRouter = express.Router();

activityLogRouter.get("/", requireAuth, checkRole(["admin"]), getActivityLogs);
activityLogRouter.get("/create", requireAuth, addActivityLog);

export default activityLogRouter;
