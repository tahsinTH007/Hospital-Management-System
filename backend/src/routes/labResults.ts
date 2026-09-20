import { Router } from "express";
import { requireAuth } from "../middleware/auth.ts";
import { checkRole } from "../middleware/checkRole.ts";
import {
  createLabResult,
  getPatientLabResults,
  updateLabResult,
} from "../controllers/labResults.ts";

const labResultsRouter = Router();

labResultsRouter.post(
  "/",
  requireAuth,
  checkRole(["admin", "doctor", "lab_tech"]),
  createLabResult,
);

// Staff can read any patient; a patient can only read their own results
// (enforced inside the controller).
labResultsRouter.get("/patient/:patientId", requireAuth, getPatientLabResults);

labResultsRouter.put(
  "/:id",
  requireAuth,
  checkRole(["admin", "doctor", "lab_tech"]),
  updateLabResult,
);

export default labResultsRouter;
