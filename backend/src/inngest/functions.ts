import mongoose from "mongoose";
import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { notifyUsers } from "./notifyUsers";
import labResults from "../models/labResults";
import invoice from "../models/invoice";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY!);

export const admitPatient = inngest.createFunction(
  {
    id: "admit-patient",
    triggers: {
      event: "patient/admitted",
    },
  },
  async ({ event, step }) => {
    const { patientId, admissionReason } = event.data;

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
      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
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
      return JSON.parse(cleanJson);
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
        aiAssignment.doctorId,
        aiAssignment.nurseId,
        "Patient Assigned",
        `You have been assigned to a new patient: ${updatedPatient?.name}`,
        `/patient/${patientId}`,
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

    const imageBase64 = await step.run("fetch-image", async () => {
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString("base64");
    });

    const aiAnalysis = await step.run("call-gemini", async () => {
      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
      });

      const prompt = `You are an expert AI radiologist. Analyze this ${bodyPart} x-ray image. Provide a structured response: \n1. Key Findings\n2. Potential Abnormalities\n3. Summary.\nKeep it clinical, concise, and end with a disclaimer.`;

      const imageParts = [
        {
          inlineData: {
            data: imageBase64,
            mimeType: "image/jpeg",
          },
        },
      ];

      const result = await model.generateContent([prompt, ...imageParts]);
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

      const resultWithPatient = {
        ...updatedLabResult,
        patient: patient || null,
      };

      return resultWithPatient;
    });

    await step.run("send-notification", async () => {
      await notifyUsers(
        updatedLab?.patient?.assignedDoctorId.toString() || "",
        updatedLab?.patient?.assignedNurseId.toString() || "",
        "Lab Result Analyzed",
        `Your lab result for ${updatedLab?.testType} has been analyzed.`,
        `/patients`,
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

    let inv = await invoice.findOne({ patientId, status: "draft" });
    await step.run("create invoice", async () => {
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
    });

    return { success: true, invoiceId: inv?._id.toString() };
  },
);
