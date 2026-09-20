import type { Request, Response } from "express";
import ActivityLog from "../models/activityLog.ts";
import { logActivity } from "../lib/activity.ts";
import mongoose from "mongoose";

export const addActivityLog = async (req: Request, res: Response) => {
  try {
    const { action, details } = req.body ?? {};
    if (!action || typeof action !== "string") {
      return res.status(400).json({ message: "action is required" });
    }
    // Always attribute the entry to the authenticated user – never trust a
    // user id coming from the request body.
    await logActivity((req as any).user.id, action, details ?? "");
    res.status(201).json({ message: "Activity logged successfully" });
  } catch (error) {
    console.error("Error adding activity log:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalLogs = await ActivityLog.countDocuments();

    // Only load the users that appear on this page instead of the whole table.
    const userIds = [
      ...new Set(logs.map((log) => log.user?.toString()).filter(Boolean)),
    ].map((id) => new mongoose.Types.ObjectId(id as string));
    const users = await mongoose.connection
      .collection("user")
      .find(
        { _id: { $in: userIds } },
        { projection: { password: 0, headers: 0, emailVerified: 0 } },
      )
      .toArray();

    const userMap = new Map<string, any>();
    users.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    const logsWithUserDetails = logs.map((log) => ({
      ...log,
      user: (log.user && userMap.get(log.user.toString())) || null,
    }));

    res.json({
      res: logsWithUserDetails,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLogs / limit),
        totalData: totalLogs,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
