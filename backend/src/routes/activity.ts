import express from "express";

const activityLogRouter = express.Router();

import { requireAuth } from "../middleware/auth";
import { addActivityLog, getActivityLogs } from "../controllers/activity";
import { checkRole } from "../middleware/checkRole";

activityLogRouter.get("/", requireAuth, checkRole(["admin"]), getActivityLogs);
activityLogRouter.post("/create", requireAuth, addActivityLog);

export default activityLogRouter;
