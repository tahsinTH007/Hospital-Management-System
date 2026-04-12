import type { Request, Response } from "express";
import invoice from "../models/invoice";

export const getMyActiveInvoice = async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;

    const activeInvoice = await invoice.findOne({
      patientId: currentUserId,
      status: { $in: ["draft", "pending_payment"] },
    });

    if (!activeInvoice) {
      return res.status(404).json({ message: "No active invoice found" });
    }

    res.status(200).json(activeInvoice);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
