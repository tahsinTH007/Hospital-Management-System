import express from "express";

import { requireAuth } from "../middleware/auth.ts";
import { addActivityLog, getActivityLogs } from "../controllers/activity.ts";
import { checkRole } from "../middleware/checkRole.ts";

const activityLogRouter = express.Router();

activityLogRouter.get("/", requireAuth, checkRole(["admin"]), getActivityLogs);
activityLogRouter.post("/create", requireAuth, addActivityLog);

export default activityLogRouter;
