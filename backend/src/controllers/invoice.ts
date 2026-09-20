import type { Request, Response } from "express";
import mongoose from "mongoose";
import invoice from "../models/invoice.ts";
import { ensurePolarCustomer, polarClient } from "../lib/polar.ts";
import { FRONTEND_URL } from "../config/env.ts";

const isStaff = (user: any) =>
  ["admin", "doctor", "nurse", "lab_tech", "pharmacist"].includes(user?.role);

const canAccessPatientBilling = (currentUser: any, patientId: string) =>
  isStaff(currentUser) || currentUser?.id === patientId;

const findActiveInvoice = (patientId: string) =>
  invoice.findOne({
    patientId,
    status: { $in: ["draft", "pending_payment"] },
  });

export const getMyActiveInvoice = async (req: Request, res: Response) => {
  try {
    const activeInvoice = await findActiveInvoice((req as any).user.id);
    if (!activeInvoice) {
      return res.status(404).json({ message: "No active invoice found" });
    }
    res.status(200).json(activeInvoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/** Active (unpaid) invoice of a given patient – for the patient or staff. */
export const getActiveInvoiceForPatient = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.patientId as string;
    if (!canAccessPatientBilling((req as any).user, patientId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const activeInvoice = await findActiveInvoice(patientId);
    if (!activeInvoice) {
      return res.status(404).json({ message: "No active invoice found" });
    }
    res.status(200).json(activeInvoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBillingHistory = async (req: Request, res: Response) => {
  try {
    const patientId = (req.params.id as string) || (req as any).user.id;
    if (!canAccessPatientBilling((req as any).user, patientId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const history = await invoice
      .find({ patientId, status: "paid" })
      .sort({ updatedAt: -1 });
    res.status(200).json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const allBilling = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const billings = await invoice
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await invoice.countDocuments();

    const patientIds = [...new Set(billings.map((b) => b.patientId))]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const users = await mongoose.connection
      .collection("user")
      .find(
        { _id: { $in: patientIds } },
        { projection: { password: 0, headers: 0, emailVerified: 0 } },
      )
      .toArray();

    const userMap = new Map<string, any>();
    users.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    const billingsWithUser = billings.map((billing) => ({
      ...billing,
      user: userMap.get(billing.patientId.toString()) || null,
    }));

    res.json({
      res: billingsWithUser,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalData: count,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching billing history:", error);
    res.status(500).json({ message: "Failed to fetch billing history" });
  }
};

/**
 * Aggregated numbers for the finance dashboard: totals across ALL invoices
 * (not just one page) and paid revenue per month for the requested year.
 */
export const billingStats = async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const [totals, monthly] = await Promise.all([
      invoice.aggregate<{ _id: string; count: number; amount: number }>([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$totalAmount" },
          },
        },
      ]),
      invoice.aggregate<{ _id: number; amount: number }>([
        { $match: { status: "paid", updatedAt: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: { $month: "$updatedAt" },
            amount: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);

    const byStatus = Object.fromEntries(
      totals.map((t) => [t._id, { count: t.count, amount: t.amount }]),
    ) as Record<string, { count: number; amount: number }>;

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      amount: monthly.find((m) => m._id === i + 1)?.amount ?? 0,
    }));

    res.json({
      year,
      totalBilled: totals.reduce((sum, t) => sum + t.amount, 0),
      totalInvoices: totals.reduce((sum, t) => sum + t.count, 0),
      paid: byStatus.paid ?? { count: 0, amount: 0 },
      pending: byStatus.pending_payment ?? { count: 0, amount: 0 },
      draft: byStatus.draft ?? { count: 0, amount: 0 },
      monthlyRevenue,
    });
  } catch (error) {
    console.error("Error computing billing stats:", error);
    res.status(500).json({ message: "Failed to compute billing stats" });
  }
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const currentUser = (req as any).user;
    const userInvoice = await invoice.findById(id);
    if (!userInvoice || userInvoice.status === "paid") {
      return res
        .status(400)
        .json({ message: "Invalid or already paid invoice" });
    }
    if (!canAccessPatientBilling(currentUser, userInvoice.patientId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (!process.env.POLAR_PRODUCT_ID) {
      return res.status(500).json({ message: "Billing is not configured" });
    }

    // The Polar customer is always the patient, even when an admin starts
    // the checkout on their behalf.
    const patient = await mongoose.connection.collection("user").findOne(
      { _id: new mongoose.Types.ObjectId(userInvoice.patientId) },
      { projection: { email: 1, name: 1 } },
    );
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    await ensurePolarCustomer({
      id: userInvoice.patientId,
      email: patient.email,
      name: patient.name,
    });

    const checkout = await polarClient.checkouts.create({
      externalCustomerId: userInvoice.patientId,
      products: [process.env.POLAR_PRODUCT_ID],
      prices: {
        [process.env.POLAR_PRODUCT_ID]: [
          {
            amountType: "fixed",
            priceAmount: userInvoice.totalAmount,
            priceCurrency: "usd",
          },
        ],
      },
      metadata: {
        hospitalInvoiceId: userInvoice._id.toString(),
        patientId: userInvoice.patientId,
      },
      successUrl: `${FRONTEND_URL}/profile/${userInvoice.patientId}?checkout_id={CHECKOUT_ID}`,
      returnUrl: `${FRONTEND_URL}/profile/${userInvoice.patientId}`,
    });

    userInvoice.status = "pending_payment";
    userInvoice.polarCheckoutId = checkout.id;
    await userInvoice.save();

    res.json({ checkoutUrl: checkout.url });
  } catch (error) {
    console.error("Polar Checkout Error:", error);
    res.status(500).json({ message: "Failed to generate payment link" });
  }
};
