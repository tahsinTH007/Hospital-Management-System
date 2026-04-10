import mongoose from "mongoose";
import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    // await step.run("send-notification", async () => {
    //   await notifyUsers(
    //     aiAssignment.doctorId,
    //     aiAssignment.nurseId,
    //     "Patient Assigned",
    //     `You have been assigned to a new patient: ${updatedPatient?.name}`,
    //     `/patient/${patientId}`,
    //     "assignment",
    //   );
    // });

    return { success: true, aiAssignment, updatedPatient };
  },
);
