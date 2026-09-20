import { Router } from "express";
import { requireAuth } from "../middleware/auth.ts";
import {
  createCheckoutSession,
  getMyActiveInvoice,
  getActiveInvoiceForPatient,
  getBillingHistory,
  allBilling,
  billingStats,
} from "../controllers/invoice.ts";
import { checkRole } from "../middleware/checkRole.ts";

const invoiceRouter = Router();

invoiceRouter.get("/", requireAuth, checkRole(["admin"]), allBilling);
invoiceRouter.get("/stats", requireAuth, checkRole(["admin", "doctor"]), billingStats);
invoiceRouter.get(
  "/my-active-invoice",
  requireAuth,
  checkRole(["patient"]),
  getMyActiveInvoice,
);
invoiceRouter.get("/active/:patientId", requireAuth, getActiveInvoiceForPatient);
invoiceRouter.get("/history/:id", requireAuth, getBillingHistory);
invoiceRouter.post("/:id/checkout", requireAuth, createCheckoutSession);

export default invoiceRouter;
