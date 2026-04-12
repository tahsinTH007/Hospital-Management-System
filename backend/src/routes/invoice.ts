import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { allBilling, getBillingHistory, getMyActiveInvoice } from "../controllers/invoice";
import { checkRole } from "../middleware/checkRole";

const invoiceRouter = Router();

invoiceRouter.get(
  "/my-active-invoice",
  requireAuth,
  checkRole(["patient"]),
  getMyActiveInvoice,
);

invoiceRouter.get("/", requireAuth, checkRole(["admin"]), allBilling);

invoiceRouter.get("/history", requireAuth, getBillingHistory);

export default invoiceRouter;
