import mongoose from "mongoose";
import type { Request, Response } from "express";
import { logActivity } from "../lib/activity.ts";
import { inngest } from "../inngest/client.ts";
import { auth } from "../lib/auth.ts";
import { ensurePolarCustomer, polarClient } from "../lib/polar.ts";

const userCollection = () => mongoose.connection.collection("user");

const toObjectId = (id: string) =>
  mongoose.Types.ObjectId.isValid(id) && id.length === 24
    ? new mongoose.Types.ObjectId(id)
    : id;

/** Fields a staff member may edit through PUT /users/update/:id. */
const EDITABLE_FIELDS = [
  "name",
  "email",
  "image",
  "specialization",
  "department",
  "gender",
  "bloodgroup",
  "medicalHistory",
  "age",
  "status",
  "prescriptions",
  "appointments",
] as const;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;
    if (currentUser.id !== id && currentUser.role === "patient") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await userCollection().findOne(
      { _id: toObjectId(id as string) as mongoose.Types.ObjectId },
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
    const currentUser = (req as any).user;
    const { role, password, ...body } = req.body ?? {};

    const existingUser = await userCollection().findOne({
      _id: toObjectId(id as string) as mongoose.Types.ObjectId,
    });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isAdmin = currentUser.role === "admin";

    // Only admins may change roles or edit other admins.
    if (!isAdmin && existingUser.role === "admin" && existingUser._id.toString() !== currentUser.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (role !== undefined && role !== existingUser.role && !isAdmin) {
      return res.status(403).json({ message: "Only admins can change roles" });
    }

    const updatePayload: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined && body[field] !== null) {
        updatePayload[field] = body[field];
      }
    }
    if (isAdmin && role !== undefined) {
      updatePayload.role = role;
    }

    if (Object.keys(updatePayload).length > 0) {
      await userCollection().updateOne(
        { _id: existingUser._id },
        { $set: { ...updatePayload, updatedAt: new Date() } },
      );
    }

    // Passwords live in Better Auth's account table – hash and store them
    // through its own context so login keeps working.
    if (typeof password === "string" && password.length > 0) {
      const ctx = await auth.$context;
      const hash = await ctx.password.hash(password);
      await ctx.internalAdapter.updatePassword(existingUser._id.toString(), hash);
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("notify_user_updated");
    }
    await logActivity(currentUser.id, "Updated User", `User updated: ${id}`);

    const updatedUser = await userCollection().findOne(
      { _id: existingUser._id },
      { projection: { password: 0 } },
    );
    res.json({
      message: "User updated successfully",
      updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const fetchAllUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    const role = req.query.role as string;
    const search = (req.query.search as string | undefined)?.trim();

    if (role && role !== "all") {
      filter.role = role;
    }
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: pattern }, { email: pattern }];
    }

    const collection = userCollection();

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
    const { admissionReason } = req.body ?? {};
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
    res.status(502).json({
      message:
        "Patient saved, but the admission workflow could not be queued (Inngest unreachable). Check INNGEST_* configuration.",
    });
  }
};

export const getPolarPortalLink = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUser = (req as any).user;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    if (currentUser.role !== "admin" && currentUser.id !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await userCollection().findOne(
      { _id: toObjectId(userId as string) as mongoose.Types.ObjectId },
      { projection: { email: 1, name: 1 } },
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await ensurePolarCustomer({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });
    const result = await polarClient.customerSessions.create({
      externalCustomerId: user._id.toString(),
    });
    res.json({ polarPortalUrl: result.customerPortalUrl });
  } catch (error) {
    console.error("Error fetching Polar portal link:", error);
    res.status(500).json({ message: "Server error" });
  }
};
