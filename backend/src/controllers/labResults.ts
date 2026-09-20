import type { Request, Response } from "express";
import LabResult from "../models/labResults.ts";
import { dispatchJobs } from "../inngest/dispatch.ts";
import { logActivity } from "../lib/activity.ts";

const XRAY_PRICE_IN_CENTS = 15000;

export const createLabResult = async (req: Request, res: Response) => {
  try {
    const { patientId, testType, bodyPart, imageUrl } = req.body ?? {};
    const currentUserId = (req as any).user?.id;

    if (!patientId || !imageUrl) {
      return res
        .status(400)
        .json({ message: "patientId and imageUrl are required" });
    }

    const newLabResult = await LabResult.create({
      patient: patientId,
      testType: testType || "X-Ray",
      bodyPart,
      imageUrl,
      status: "pending",
      uploadedBy: currentUserId,
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("lab_result_added");
    }

    if (newLabResult.testType === "X-Ray") {
      try {
        await dispatchJobs([
          {
            name: "labResult/created",
            data: {
              labResultId: newLabResult._id.toString(),
              // Validated above; the model type marks it optional.
              imageUrl: newLabResult.imageUrl as string,
              bodyPart: newLabResult.bodyPart,
            },
          },
          {
            name: "billing/charge.added",
            data: {
              patientId: newLabResult.patient.toString(),
              description: `Radiology: ${newLabResult.bodyPart} X-Ray Analysis`,
              priceInCents: XRAY_PRICE_IN_CENTS,
            },
          },
        ]);
      } catch (error) {
        // The result is saved either way; a failed analysis just stays
        // "pending", exactly as when a queued job fails later.
        console.error("X-ray analysis could not be run:", error);
      }
    }

    await logActivity(
      currentUserId,
      "Uploaded Lab Result",
      `Uploaded ${newLabResult.testType} for ${bodyPart}`,
    );
    res.status(201).json(newLabResult);
  } catch (error) {
    console.error("Error creating lab result:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPatientLabResults = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const currentUser = (req as any).user;
    if (currentUser.role === "patient" && currentUser.id !== patientId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const results = await LabResult.find({ patient: patientId }).sort({
      createdAt: -1,
    });
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching lab results:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateLabResult = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { aiAnalysis, doctorNotes, status } = req.body ?? {};
    const updatedResult = await LabResult.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(aiAnalysis && { aiAnalysis }),
          ...(doctorNotes !== undefined && { doctorNotes }),
          ...(status && { status }),
        },
      },
      { new: true },
    );

    if (!updatedResult) {
      return res.status(404).json({ message: "Lab result not found" });
    }
    const io = req.app.get("io");
    if (io) {
      io.emit("lab_result_updated", updatedResult);
    }
    await logActivity(
      (req as any).user.id,
      "Updated Lab Result",
      `Updated lab result ${id} with status ${status || "N/A"}`,
    );
    res.status(200).json(updatedResult);
  } catch (error) {
    console.error("Error updating lab result:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
