import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createCheckoutSession,
  getMyActiveInvoice,
  getBillingHistory,
  allBilling,
} from "../controllers/invoice";
import { checkRole } from "../middleware/checkRole";

const invoiceRouter = Router();

invoiceRouter.get(
  "/my-active-invoice",
  requireAuth,
  checkRole(["patient"]),
  getMyActiveInvoice,
);
invoiceRouter.get("/", requireAuth, checkRole(["admin"]), allBilling);
invoiceRouter.get("/history/:id", requireAuth, getBillingHistory);
invoiceRouter.post("/:id/checkout", requireAuth, createCheckoutSession);

export default invoiceRouter;
