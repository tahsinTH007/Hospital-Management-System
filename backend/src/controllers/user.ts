import type { Request, Response } from "express";
import mongoose from "mongoose";

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
