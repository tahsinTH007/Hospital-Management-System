import mongoose from "mongoose";
import { inngest } from "./client.ts";
import { NonRetriableError } from "inngest";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { notifyUsers } from "./notifyUsers.ts";
import labResults from "../models/labResults.ts";
import invoice from "../models/invoice.ts";
import { connectDB } from "../config/db.ts";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

let genAI: GoogleGenerativeAI | null = null;
const getGenAI = () => {
  if (!process.env.GEMINI_KEY) {
    throw new NonRetriableError("GEMINI_KEY is not configured");
  }
  genAI ??= new GoogleGenerativeAI(process.env.GEMINI_KEY);
  return genAI;
};

export const admitPatient = inngest.createFunction(
  {
    id: "admit-patient",
    triggers: {
      event: "patient/admitted",
    },
  },
  async ({ event, step }) => {
    const { patientId, admissionReason } = event.data;
    await connectDB();
    const collection = mongoose.connection.collection("user");

    const data = await step.run("fetch-hospital-data", async () => {
      const patient = await collection.findOne({
        _id: new mongoose.Types.ObjectId(patientId),
      });
      const doctors = await collection
        .find({ role: "doctor", status: "active" })
        .toArray();
      const nurses = await collection
        .find({ role: "nurse", status: "active" })
        .toArray();
      return { patient, doctors, nurses };
    });

    if (
      !data.patient ||
      data.doctors.length === 0 ||
      data.nurses.length === 0
    ) {
      throw new NonRetriableError(
        "Missing patient or active staff to complete triage.",
      );
    }

    const aiAssignment = await step.run("ai-triage", async () => {
      const model = getGenAI().getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: "application/json" },
      });

      const patientDataStr = `Age: ${data.patient!.age}, Gender: ${data.patient!.gender}, History: ${data.patient!.medicalHistory}. Issue: ${admissionReason}`;

      const doctorDataStr = data.doctors
        .map(
          (d) =>
            `ID: ${d._id.toString()}, Name: ${d.name}, Spec: ${d.specialization}, Dept: ${d.department}`,
        )
        .join("\n");

      const nurseDataStr = data.nurses
        .map(
          (n) =>
            `ID: ${n._id.toString()}, Name: ${n.name}, Dept: ${n.department}`,
        )
        .join("\n");

      const prompt = `
        You are an expert Hospital Triage AI. Match this patient with the best Doctor and Nurse.
        PATIENT: ${patientDataStr}
        AVAILABLE DOCTORS: ${doctorDataStr}
        AVAILABLE NURSES: ${nurseDataStr}

        Respond ONLY with a valid JSON object:
        {
          "doctorId": "id",
          "doctorName": "name",
          "nurseId": "id",
          "nurseName": "name",
          "reasoning": "Clinical reasoning for this assignment."
        }
      `;

      const result = await model.generateContent(prompt);

      const text = result.response.text();
      const cleanJson = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleanJson);

      // Never trust ids the model invented – they must be real staff members.
      const doctor = data.doctors.find((d) => d._id.toString() === parsed.doctorId);
      const nurse = data.nurses.find((n) => n._id.toString() === parsed.nurseId);
      if (!doctor || !nurse) {
        throw new Error("AI triage returned unknown staff ids");
      }
      return {
        doctorId: doctor._id.toString(),
        doctorName: doctor.name as string,
        nurseId: nurse._id.toString(),
        nurseName: nurse.name as string,
        reasoning: String(parsed.reasoning ?? ""),
      };
    });

    const updatedPatient = await step.run("update-database", async () => {
      const updatePayload = {
        status: "admitted",
        admissionReason,
        assignedDoctorId: aiAssignment.doctorId,
        assignedDoctorName: aiAssignment.doctorName,
        assignedNurseId: aiAssignment.nurseId,
        assignedNurseName: aiAssignment.nurseName,
        triageReasoning: aiAssignment.reasoning,
      };
      await collection.updateOne(
        { _id: new mongoose.Types.ObjectId(patientId) },
        { $set: updatePayload },
      );
      return await collection.findOne({
        _id: new mongoose.Types.ObjectId(patientId),
      });
    });

    await step.run("send-notification", async () => {
      await notifyUsers(
        [aiAssignment.doctorId, aiAssignment.nurseId],
        "Patient Assigned",
        `You have been assigned to a new patient: ${updatedPatient?.name}`,
        `/profile/${patientId}`,
        "assignment",
      );
    });
    return { success: true, aiAssignment, updatedPatient };
  },
);

export const analyzeXRayJob = inngest.createFunction(
  {
    id: "analyze-xray",
    triggers: {
      event: "labResult/created",
    },
  },
  async ({ event, step }) => {
    const { labResultId, imageUrl, bodyPart } = event.data;
    await connectDB();

    // Fetch + analyse in one step so the (large) base64 image never has to be
    // stored as step output.
    const aiAnalysis = await step.run("call-gemini", async () => {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Could not download image (${response.status})`);
      }
      const mimeType =
        response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      const imageBase64 = Buffer.from(await response.arrayBuffer()).toString(
        "base64",
      );

      const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL });

      const prompt = `You are an expert AI radiologist. Analyze this ${bodyPart} x-ray image. Provide a structured response: \n1. Key Findings\n2. Potential Abnormalities\n3. Summary.\nKeep it clinical, concise, and end with a disclaimer.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: imageBase64, mimeType } },
      ]);
      return result.response.text();
    });

    const updatedLab = await step.run("update-db", async () => {
      const updatedLabResult = await labResults
        .findByIdAndUpdate(
          labResultId,
          { aiAnalysis, status: "analyzed" },
          { new: true },
        )
        .lean();

      if (!updatedLabResult) {
        throw new NonRetriableError("Lab result not found");
      }

      const patient = await mongoose.connection
        .collection("user")
        .findOne(
          { _id: new mongoose.Types.ObjectId(updatedLabResult.patient) },
          { projection: { password: 0, emailVerified: 0 } },
        );

      return { ...updatedLabResult, patient: patient || null };
    });

    await step.run("send-notification", async () => {
      const patient = updatedLab.patient;
      await notifyUsers(
        [
          patient?.assignedDoctorId?.toString(),
          patient?.assignedNurseId?.toString(),
          patient?._id?.toString(),
        ],
        "Lab Result Analyzed",
        `The ${updatedLab.testType} (${bodyPart}) for ${patient?.name ?? "a patient"} has been analyzed.`,
        patient ? `/profile/${patient._id.toString()}` : "/patients",
        "lab_result",
      );
    });
  },
);

export const addChargeToInvoice = inngest.createFunction(
  {
    id: "add-medical-charge",
    triggers: {
      event: "billing/charge.added",
    },
  },
  async ({ event, step }) => {
    const { patientId, description, priceInCents } = event.data;
    if (!patientId || !priceInCents) {
      throw new NonRetriableError("Missing required charge information.");
    }
    await connectDB();

    const invoiceId = await step.run("add-charge-to-draft-invoice", async () => {
      let inv = await invoice.findOne({ patientId, status: "draft" });
      if (!inv) {
        inv = new invoice({ patientId, items: [], totalAmount: 0 });
      }

      inv.items.push({
        description,
        quantity: 1,
        unitPrice: priceInCents,
        totalPrice: priceInCents,
      });
      inv.totalAmount += priceInCents;
      await inv.save();
      return inv._id.toString();
    });

    return { success: true, invoiceId };
  },
);
