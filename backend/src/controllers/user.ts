import mongoose from "mongoose";
import type { Request, Response } from "express";
import { logActivity } from "../lib/activity";
import { inngest } from "../inngest/client";
import { auth, polarClient } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;
    if (currentUser.id !== id && currentUser.role === "patient") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const queryId =
      id?.length === 24 ? new mongoose.Types.ObjectId(id as string) : id;
    const collection = mongoose.connection.collection("user");
    const user = await collection.findOne(
      { _id: queryId as mongoose.Types.ObjectId },
      { projection: { password: 0 } },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, password, ...customFields } = req.body;

    const queryId =
      id?.length === 24 ? new mongoose.Types.ObjectId(id as string) : id;
    const collection = mongoose.connection.collection("user");

    const existingUser = await collection.findOne({
      _id: queryId as mongoose.Types.ObjectId,
    });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatePayload = {
      name,
      email,
      role,
      ...customFields,
    };

    Object.keys(updatePayload).forEach(
      (key) =>
        (updatePayload[key] === undefined || updatePayload[key] === null) &&
        delete updatePayload[key],
    );

    const result = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id as string) },
      { $set: updatePayload },
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const io = req.app.get("io");
    if (io && result.modifiedCount > 0) {
      io.emit("notify_user_updated");
    }
    await logActivity(
      (req as any).user.id,
      "Updated User",
      `User updated: ${id}`,
    );
    res.json({
      message: "User updated successfully",
      updatedUser: result,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const fetchAllUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;
    const filter: any = {};
    const role = req.query.role as string;

    if (role && role !== "all" && role !== "") {
      filter.role = role;
    }

    const collection = mongoose.connection.collection("user");

    const totalUsers = await collection.countDocuments(filter);
    const users = await collection
      .find(filter, {
        projection: {
          password: 0,
          headers: 0,
          emailVerified: 0,
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    res.json({
      res: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalData: totalUsers,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const admitPatient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { admissionReason } = req.body;
    await inngest.send({
      name: "patient/admitted",
      data: { patientId: id, admissionReason },
    });
    await logActivity(
      (req as any).user.id,
      "Admitted Patient",
      `Admitted patient ${id}`,
    );
    res.json({ message: "Patient admission requested successfully" });
  } catch (error) {
    console.error("Error admitting patient:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPolarPortalLink = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const result = await polarClient.customerSessions.create({
      externalCustomerId: userId as string,
    });
    res.json({ polarPortalUrl: result.customerPortalUrl });
  } catch (error) {
    console.error("Error fetching Polar portal link:", error);
    res.status(500).json({ message: "Server error" });
  }
};
