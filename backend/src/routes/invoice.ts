import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getMyActiveInvoice } from "../controllers/invoice";
import { checkRole } from "../middleware/checkRole";

const invoiceRouter = Router();

invoiceRouter.get(
  "/my-active-invoice",
  requireAuth,
  checkRole(["patient"]),
  getMyActiveInvoice,
);

export default invoiceRouter;
