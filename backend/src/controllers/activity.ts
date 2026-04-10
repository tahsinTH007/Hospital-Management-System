import type { Request, Response } from "express";
import ActivityLog from "../models/activityLog";
import { logActivity } from "../lib/activity";
import mongoose from "mongoose";

export const addActivityLog = async (req: Request, res: Response) => {
  try {
    const { userId, action, details } = req.body;
    await logActivity(userId, action, details);
    res.status(201).json({ message: "Activity logged successfully" });
  } catch (error) {
    console.error("Error adding activity log:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalLogs = await ActivityLog.countDocuments();

    const collection = mongoose.connection.collection("user");
    const users = await collection.find().toArray();

    const userMap = new Map<string, any>();
    users.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    const logsWithUserDetails = logs.map((log) => {
      const user = userMap.get(log.user.toString());
      return {
        ...log,
        user: user ? user : null,
      };
    });

    const totalPages = Math.ceil(totalLogs / limit);

    res.json({
      res: logsWithUserDetails,
      pagination: {
        currentPage: page,
        totalPages,
        totalData: totalLogs,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
