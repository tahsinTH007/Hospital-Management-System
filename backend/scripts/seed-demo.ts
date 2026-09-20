/**
 * Loads a realistic demo dataset into every collection:
 * users (admin, doctors, nurses, lab tech, pharmacist, patients) with login
 * credentials, invoices, lab results, notifications and activity logs.
 *
 *   bun run seed:demo
 *
 * Re-runnable: demo users are matched by email and updated (passwords of
 * existing users are left untouched); generated records carry `seed: "demo"`
 * and are replaced on every run. Set DEMO_PASSWORD to change the shared
 * password (default "medflow123").
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.ts";
import { auth } from "../src/lib/auth.ts";

const SEED = "demo";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "medflow123";
const YEAR = new Date().getFullYear();

const { ObjectId } = mongoose.Types;
const users = () => mongoose.connection.collection("user");

const daysAgo = (days: number, hour = 9, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const onDate = (month: number, day: number, hour = 10) =>
  new Date(YEAR, month - 1, day, hour, 0, 0, 0);

// ---------------------------------------------------------------- users

interface UserSpec {
  name: string;
  email: string;
  username: string;
  role: "admin" | "doctor" | "nurse" | "lab_tech" | "pharmacist" | "patient";
  status: string;
  createdDaysAgo?: number;
  fields?: Record<string, unknown>;
}

const STAFF: UserSpec[] = [
  { name: "Amina Khan", email: "amina.khan@medflow.com", username: "amina.khan", role: "admin", status: "active", createdDaysAgo: 120 },

  { name: "Grace Hopper", email: "grace.hopper@medflow.com", username: "grace.hopper", role: "doctor", status: "active", createdDaysAgo: 110, fields: { specialization: "Cardiology", department: "Cardiology Wing A" } },
  { name: "Alan Turing", email: "alan.turing@medflow.com", username: "alan.turing", role: "doctor", status: "active", createdDaysAgo: 100, fields: { specialization: "Neurology", department: "Neurology Ward" } },
  { name: "Ada Lovelace", email: "ada.lovelace@medflow.com", username: "ada.lovelace", role: "doctor", status: "active", createdDaysAgo: 95, fields: { specialization: "Pediatrics", department: "Pediatrics" } },
  { name: "Rosalind Franklin", email: "rosalind.franklin@medflow.com", username: "rosalind.franklin", role: "doctor", status: "on_leave", createdDaysAgo: 80, fields: { specialization: "Dermatology", department: "Dermatology Clinic" } },
  { name: "Jonas Salk", email: "jonas.salk@medflow.com", username: "jonas.salk", role: "doctor", status: "active", createdDaysAgo: 20, fields: { specialization: "General", department: "General Medicine" } },

  { name: "Florence Nightingale", email: "florence.nightingale@medflow.com", username: "florence.nightingale", role: "nurse", status: "active", createdDaysAgo: 105, fields: { department: "ICU" } },
  { name: "Mary Seacole", email: "mary.seacole@medflow.com", username: "mary.seacole", role: "nurse", status: "active", createdDaysAgo: 90, fields: { department: "Emergency" } },
  { name: "Clara Barton", email: "clara.barton@medflow.com", username: "clara.barton", role: "nurse", status: "active", createdDaysAgo: 60, fields: { department: "Pediatrics" } },
  { name: "Edith Cavell", email: "edith.cavell@medflow.com", username: "edith.cavell", role: "nurse", status: "on_leave", createdDaysAgo: 15, fields: { department: "Cardiology Wing A" } },

  { name: "Ravi Patel", email: "ravi.patel@medflow.com", username: "ravi.patel", role: "lab_tech", status: "active", createdDaysAgo: 70, fields: { department: "Radiology Lab" } },
  { name: "Nadia Rahman", email: "nadia.rahman@medflow.com", username: "nadia.rahman", role: "pharmacist", status: "active", createdDaysAgo: 65, fields: { department: "Pharmacy" } },
];

const PATIENTS: UserSpec[] = [
  { name: "John Carter", email: "john.carter@medflow.com", username: "john.carter", role: "patient", status: "admitted", createdDaysAgo: 3, fields: { age: "45", gender: "Male", bloodgroup: "O+", medicalHistory: "Hypertension, family history of coronary artery disease", admissionReason: "Acute chest pain with shortness of breath" } },
  { name: "Maria Gonzalez", email: "maria.gonzalez@medflow.com", username: "maria.gonzalez", role: "patient", status: "admitted", createdDaysAgo: 5, fields: { age: "62", gender: "Female", bloodgroup: "A+", medicalHistory: "Type 2 diabetes, recurrent headaches", admissionReason: "Sudden severe headache and dizziness" } },
  { name: "Liam O'Brien", email: "liam.obrien@medflow.com", username: "liam.obrien", role: "patient", status: "admitted", createdDaysAgo: 2, fields: { age: "8", gender: "Male", bloodgroup: "B+", medicalHistory: "Asthma since age 4", admissionReason: "Asthma exacerbation not responding to inhaler" } },
  { name: "Fatima Rahman", email: "fatima.rahman@medflow.com", username: "fatima.rahman", role: "patient", status: "admitted", createdDaysAgo: 6, fields: { age: "34", gender: "Female", bloodgroup: "AB-", medicalHistory: "Migraine with aura", admissionReason: "Migraine with visual disturbance lasting over 24h" } },
  { name: "David Kim", email: "david.kim@medflow.com", username: "david.kim", role: "patient", status: "in_treatment", createdDaysAgo: 12, fields: { age: "51", gender: "Male", bloodgroup: "O-", medicalHistory: "Right knee osteoarthritis", admissionReason: "Post-operative care after knee replacement" } },
  { name: "Sophie Dubois", email: "sophie.dubois@medflow.com", username: "sophie.dubois", role: "patient", status: "in_treatment", createdDaysAgo: 9, fields: { age: "29", gender: "Female", bloodgroup: "A-", medicalHistory: "Chronic eczema, penicillin allergy", admissionReason: "Severe eczema flare with secondary infection" } },
  { name: "Ahmed Hassan", email: "ahmed.hassan@medflow.com", username: "ahmed.hassan", role: "patient", status: "observation", createdDaysAgo: 1, fields: { age: "70", gender: "Male", bloodgroup: "B-", medicalHistory: "Osteoporosis", admissionReason: "Fall at home, left knee and hip pain" } },
  { name: "Emily Chen", email: "emily.chen@medflow.com", username: "emily.chen", role: "patient", status: "discharged", createdDaysAgo: 45, fields: { age: "41", gender: "Female", bloodgroup: "O+", medicalHistory: "Appendectomy (recovered)" } },
  { name: "Carlos Silva", email: "carlos.silva@medflow.com", username: "carlos.silva", role: "patient", status: "discharged", createdDaysAgo: 38, fields: { age: "55", gender: "Male", bloodgroup: "AB+", medicalHistory: "Arrhythmia, on beta blockers" } },
  { name: "Priya Sharma", email: "priya.sharma@medflow.com", username: "priya.sharma", role: "patient", status: "follow_up", createdDaysAgo: 30, fields: { age: "23", gender: "Female", bloodgroup: "B+", medicalHistory: "Left wrist fracture (healing)" } },
];

interface SeededUser {
  id: string;
  name: string;
  email: string;
}

const byEmail = new Map<string, SeededUser>();

const upsertUser = async (spec: UserSpec): Promise<SeededUser> => {
  let doc = await users().findOne({ email: spec.email });

  if (!doc) {
    const result = await auth.api.signUpEmail({
      body: {
        name: spec.name,
        email: spec.email,
        password: DEMO_PASSWORD,
        username: spec.username,
      } as any,
    });
    doc = await users().findOne({ _id: new ObjectId(result.user.id) });
  }

  await users().updateOne(
    { _id: doc!._id },
    {
      $set: {
        name: spec.name,
        role: spec.role,
        status: spec.status,
        emailVerified: true,
        seed: SEED,
        ...(spec.createdDaysAgo !== undefined && { createdAt: daysAgo(spec.createdDaysAgo) }),
        ...spec.fields,
      },
    },
  );

  const seeded = { id: doc!._id.toString(), name: spec.name, email: spec.email };
  byEmail.set(spec.email, seeded);
  return seeded;
};

const u = (email: string) => {
  const found = byEmail.get(email);
  if (!found) throw new Error(`Unknown seeded user ${email}`);
  return found;
};

// ------------------------------------------------------------- content

const XRAY_IMAGES = {
  chestNormal: "https://upload.wikimedia.org/wikipedia/commons/a/a1/Normal_posteroanterior_%28PA%29_chest_radiograph_%28X-ray%29.jpg",
  chestMediastinum: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Mediastinal_structures_on_chest_X-ray.jpg",
  hand: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Bones_of_a_hand._Radiograph%2C_1900-1904._Wellcome_L0026317.jpg",
  kneeAngles: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Radiograph_with_knee_angles.jpg",
  kneeOsgood: "https://upload.wikimedia.org/wikipedia/commons/5/51/Radiograph_of_human_knee_with_Osgood%E2%80%93Schlatter_disease.png",
  skull: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Lateral_projectional_radiograph_scan_of_skull.jpg",
};

const DISCLAIMER =
  "Disclaimer: AI-generated preliminary analysis. It must be reviewed and confirmed by a qualified radiologist before any clinical decision.";

const analysis = (findings: string, abnormalities: string, summary: string) =>
  `1. Key Findings\n${findings}\n\n2. Potential Abnormalities\n${abnormalities}\n\n3. Summary\n${summary}\n\n${DISCLAIMER}`;

const main = async () => {
  await connectDB();
  const db = mongoose.connection;

  // Primary admin (created by seed:admin); create it if it is missing but
  // never touch its password here.
  const admin = await users().findOne({ role: "admin", username: "tahsin" });
  if (admin) {
    byEmail.set("tahsin@medflow.com", { id: admin._id.toString(), name: admin.name, email: admin.email });
  } else {
    await upsertUser({ name: "Tahsin Hassan", email: "tahsin@medflow.com", username: "tahsin", role: "admin", status: "active", createdDaysAgo: 150 });
  }
  const adminUser = byEmail.get("tahsin@medflow.com")!;

  console.log("👩‍⚕️ Staff...");
  for (const spec of STAFF) await upsertUser(spec);
  console.log("🧑‍🤝‍🧑 Patients...");
  for (const spec of PATIENTS) await upsertUser(spec);

  // AI triage assignments for admitted / in-treatment patients.
  const assign = async (
    patientEmail: string,
    doctorEmail: string,
    nurseEmail: string,
    reasoning: string,
  ) => {
    const doctor = u(doctorEmail);
    const nurse = u(nurseEmail);
    await users().updateOne(
      { _id: new ObjectId(u(patientEmail).id) },
      {
        $set: {
          assignedDoctorId: doctor.id,
          assignedDoctorName: doctor.name,
          assignedNurseId: nurse.id,
          assignedNurseName: nurse.name,
          triageReasoning: reasoning,
        },
      },
    );
  };
  await assign("john.carter@medflow.com", "grace.hopper@medflow.com", "florence.nightingale@medflow.com",
    "Acute chest pain with hypertension and a family history of coronary disease points to a cardiac cause; Dr. Hopper (Cardiology) is the best match and ICU nurse Nightingale can provide continuous cardiac monitoring.");
  await assign("maria.gonzalez@medflow.com", "alan.turing@medflow.com", "mary.seacole@medflow.com",
    "Sudden severe headache with dizziness in a diabetic patient warrants urgent neurological assessment; Dr. Turing (Neurology) with emergency nurse Seacole for close observation.");
  await assign("liam.obrien@medflow.com", "ada.lovelace@medflow.com", "clara.barton@medflow.com",
    "Paediatric asthma exacerbation not responding to bronchodilators; Dr. Lovelace (Pediatrics) supported by paediatric nurse Barton.");
  await assign("fatima.rahman@medflow.com", "alan.turing@medflow.com", "mary.seacole@medflow.com",
    "Prolonged migraine with aura requires neurological evaluation to rule out secondary causes; Dr. Turing (Neurology) is available.");
  await assign("david.kim@medflow.com", "jonas.salk@medflow.com", "florence.nightingale@medflow.com",
    "Post-operative knee replacement care is best handled by general medicine with ICU nursing support for early mobilisation and pain control.");
  await assign("sophie.dubois@medflow.com", "rosalind.franklin@medflow.com", "clara.barton@medflow.com",
    "Severe eczema flare with secondary infection needs dermatology input; note the penicillin allergy when selecting antibiotics.");
  await assign("ahmed.hassan@medflow.com", "jonas.salk@medflow.com", "mary.seacole@medflow.com",
    "Elderly patient with osteoporosis after a fall; general medicine review with emergency nursing while imaging rules out fractures.");

  // ---------------------------------------------------------- invoices
  console.log("🧾 Invoices...");
  const invoices = db.collection("invoices");
  await invoices.deleteMany({ seed: SEED });

  const item = (description: string, unitPrice: number, quantity = 1) => ({
    description,
    quantity,
    unitPrice,
    totalPrice: unitPrice * quantity,
  });
  const invoice = (
    patientEmail: string,
    status: "draft" | "pending_payment" | "paid",
    items: ReturnType<typeof item>[],
    createdAt: Date,
    updatedAt = createdAt,
    polarCheckoutId?: string,
  ) => ({
    patientId: u(patientEmail).id,
    status,
    items,
    totalAmount: items.reduce((sum, i) => sum + i.totalPrice, 0),
    ...(polarCheckoutId && { polarCheckoutId }),
    createdAt,
    updatedAt,
    seed: SEED,
  });

  await invoices.insertMany([
    // paid – spread over the year so the revenue chart has data
    invoice("emily.chen@medflow.com", "paid", [item("Consultation", 8000), item("Radiology: Abdomen X-Ray Analysis", 15000), item("Lab work: CBC", 4500)], onDate(1, 14), onDate(1, 16), "chk_demo_emily_jan"),
    invoice("carlos.silva@medflow.com", "paid", [item("Consultation", 8000), item("ECG", 6000)], onDate(2, 3), onDate(2, 4), "chk_demo_carlos_feb"),
    invoice("priya.sharma@medflow.com", "paid", [item("Radiology: Left Wrist X-Ray Analysis", 15000), item("Cast application", 12000)], onDate(3, 9), onDate(3, 10), "chk_demo_priya_mar"),
    invoice("david.kim@medflow.com", "paid", [item("Consultation", 8000), item("Radiology: Right Knee X-Ray Analysis", 15000)], onDate(4, 21), onDate(4, 22), "chk_demo_david_apr"),
    invoice("maria.gonzalez@medflow.com", "paid", [item("Consultation", 8000), item("Lab work: HbA1c", 5500)], onDate(5, 6), onDate(5, 6), "chk_demo_maria_may"),
    invoice("john.carter@medflow.com", "paid", [item("Consultation", 8000)], onDate(6, 18), onDate(6, 19), "chk_demo_john_jun"),
    invoice("ahmed.hassan@medflow.com", "paid", [item("Consultation", 8000), item("Bone density scan", 22000)], onDate(7, 2), onDate(7, 3), "chk_demo_ahmed_jul"),
    invoice("sophie.dubois@medflow.com", "paid", [item("Dermatology consultation", 9500), item("Lab work: skin swab culture", 3800)], onDate(8, 12), onDate(8, 13), "chk_demo_sophie_aug"),
    invoice("emily.chen@medflow.com", "paid", [item("Follow-up consultation", 5000)], onDate(9, 2), onDate(9, 2), "chk_demo_emily_sep"),
    // awaiting payment
    invoice("carlos.silva@medflow.com", "pending_payment", [item("Cardiology follow-up", 9500), item("24h Holter monitoring", 18000)], daysAgo(4), daysAgo(3), "chk_demo_carlos_pending"),
    // open drafts for current inpatients
    invoice("john.carter@medflow.com", "draft", [item("Radiology: Chest X-Ray Analysis", 15000), item("Lab work: Troponin", 6500)], daysAgo(3), daysAgo(2)),
    invoice("maria.gonzalez@medflow.com", "draft", [item("Radiology: Skull X-Ray Analysis", 15000), item("Lab work: CBC", 4500)], daysAgo(5), daysAgo(4)),
    invoice("liam.obrien@medflow.com", "draft", [item("Radiology: Chest X-Ray Analysis", 15000), item("Nebuliser therapy", 3000, 3)], daysAgo(2), daysAgo(1)),
    invoice("fatima.rahman@medflow.com", "draft", [item("Radiology: Skull X-Ray Analysis", 15000)], daysAgo(6), daysAgo(6)),
    invoice("ahmed.hassan@medflow.com", "draft", [item("Radiology: Left Knee X-Ray Analysis", 15000)], daysAgo(1), daysAgo(1)),
  ]);

  // ------------------------------------------------------- lab results
  console.log("🩻 Lab results...");
  const labResults = db.collection("labresults");
  await labResults.deleteMany({ seed: SEED });

  const labResult = (
    patientEmail: string,
    uploadedByEmail: string,
    bodyPart: string,
    imageUrl: string,
    status: "pending" | "analyzed" | "reviewed",
    aiAnalysis: string,
    doctorNotes: string | undefined,
    createdAt: Date,
  ) => ({
    patient: new ObjectId(u(patientEmail).id),
    uploadedBy: u(uploadedByEmail).id,
    testType: "X-Ray",
    bodyPart,
    imageUrl,
    aiAnalysis,
    ...(doctorNotes && { doctorNotes }),
    status,
    createdAt,
    updatedAt: createdAt,
    seed: SEED,
  });

  await labResults.insertMany([
    labResult("john.carter@medflow.com", "ravi.patel@medflow.com", "Chest (PA)", XRAY_IMAGES.chestNormal, "analyzed",
      analysis(
        "Cardiac silhouette within normal limits (cardiothoracic ratio < 0.5). Lungs are clear bilaterally with no focal consolidation, effusion or pneumothorax. Costophrenic angles are sharp.",
        "No acute cardiopulmonary abnormality identified. Mild aortic unfolding consistent with age.",
        "Normal PA chest radiograph. Chest pain is unlikely to be of pulmonary origin; cardiac work-up should continue.",
      ), undefined, daysAgo(2, 14)),
    labResult("liam.obrien@medflow.com", "ravi.patel@medflow.com", "Chest (PA)", XRAY_IMAGES.chestMediastinum, "pending",
      "Pending Analysis...", undefined, daysAgo(0, 8, 30)),
    labResult("fatima.rahman@medflow.com", "alan.turing@medflow.com", "Skull (lateral)", XRAY_IMAGES.skull, "reviewed",
      analysis(
        "Calvarium is intact with normal thickness. Sella turcica is of normal size and configuration. No lytic or sclerotic lesions.",
        "No fracture, mass effect or abnormal calcification identified.",
        "Normal lateral skull radiograph. Findings do not explain the presenting symptoms; MRI is the preferred modality for migraine with aura if red flags persist.",
      ), "Agree with AI read: no bony abnormality. Neurological exam unremarkable. Continue migraine prophylaxis and arrange outpatient MRI.", daysAgo(5, 11)),
    labResult("priya.sharma@medflow.com", "ravi.patel@medflow.com", "Left Wrist", XRAY_IMAGES.hand, "reviewed",
      analysis(
        "Bony alignment is maintained. A healing distal radius fracture line is visible with surrounding callus formation. Carpal bones appear intact.",
        "Healing fracture without displacement; no new fracture lines.",
        "Satisfactory healing of the distal radius fracture. Clinical correlation and repeat imaging in 4 weeks recommended.",
      ), "Fracture uniting well. Cast removed, wrist splint for 2 more weeks, physiotherapy referral made.", daysAgo(25, 10)),
    labResult("david.kim@medflow.com", "jonas.salk@medflow.com", "Right Knee", XRAY_IMAGES.kneeAngles, "reviewed",
      analysis(
        "Total knee arthroplasty components are well seated with expected alignment. No periprosthetic lucency or fracture.",
        "No evidence of loosening, dislocation or infection-related changes.",
        "Post-operative appearance of a right total knee replacement with satisfactory positioning.",
      ), "Components well aligned. Weight bearing as tolerated, continue DVT prophylaxis, review in clinic in 6 weeks.", daysAgo(10, 15)),
    labResult("ahmed.hassan@medflow.com", "ravi.patel@medflow.com", "Left Knee", XRAY_IMAGES.kneeOsgood, "analyzed",
      analysis(
        "Mild joint space narrowing of the medial compartment. Diffuse osteopenia in keeping with known osteoporosis. Tibial tubercle irregularity, likely chronic.",
        "No acute fracture or dislocation. Small suprapatellar effusion cannot be excluded.",
        "No acute traumatic injury identified. Degenerative and osteopenic changes; correlate with hip imaging given the mechanism of injury.",
      ), undefined, daysAgo(0, 12)),
  ]);

  // ------------------------------------------------------ notifications
  console.log("🔔 Notifications...");
  const notifications = db.collection("notifications");
  await notifications.deleteMany({ seed: SEED });

  const notify = (
    userEmail: string,
    type: "system" | "assignment" | "lab_result" | "alert",
    title: string,
    message: string,
    link: string,
    createdAt: Date,
    isRead = false,
  ) => ({
    user: new ObjectId(u(userEmail).id),
    title,
    message,
    type,
    isRead,
    link,
    createdAt,
    updatedAt: createdAt,
    seed: SEED,
  });
  const profileLink = (email: string) => `/profile/${u(email).id}`;

  await notifications.insertMany([
    notify("tahsin@medflow.com", "system", "Demo data loaded", "Sample staff, patients, invoices and lab results are ready to explore.", "/dashboard", daysAgo(0, 8)),
    notify("tahsin@medflow.com", "alert", "Invoice awaiting payment", "Carlos Silva has an invoice of $275.00 pending payment for 3 days.", "/financial-history", daysAgo(1, 9), true),

    notify("grace.hopper@medflow.com", "assignment", "Patient Assigned", "You have been assigned to a new patient: John Carter", profileLink("john.carter@medflow.com"), daysAgo(3, 10)),
    notify("grace.hopper@medflow.com", "lab_result", "Lab Result Analyzed", "The X-Ray (Chest (PA)) for John Carter has been analyzed.", profileLink("john.carter@medflow.com"), daysAgo(2, 14, 20)),
    notify("grace.hopper@medflow.com", "system", "Welcome to MedFlow", "Your cardiology account is active. Review your assigned patients on the dashboard.", "/dashboard", daysAgo(110), true),

    notify("alan.turing@medflow.com", "assignment", "Patient Assigned", "You have been assigned to a new patient: Maria Gonzalez", profileLink("maria.gonzalez@medflow.com"), daysAgo(5, 10), true),
    notify("alan.turing@medflow.com", "assignment", "Patient Assigned", "You have been assigned to a new patient: Fatima Rahman", profileLink("fatima.rahman@medflow.com"), daysAgo(6, 9)),
    notify("alan.turing@medflow.com", "lab_result", "Lab Result Analyzed", "The X-Ray (Skull (lateral)) for Fatima Rahman has been analyzed.", profileLink("fatima.rahman@medflow.com"), daysAgo(5, 11, 15), true),

    notify("ada.lovelace@medflow.com", "assignment", "Patient Assigned", "You have been assigned to a new patient: Liam O'Brien", profileLink("liam.obrien@medflow.com"), daysAgo(2, 9)),
    notify("jonas.salk@medflow.com", "assignment", "Patient Assigned", "You have been assigned to a new patient: Ahmed Hassan", profileLink("ahmed.hassan@medflow.com"), daysAgo(1, 9)),
    notify("jonas.salk@medflow.com", "lab_result", "Lab Result Analyzed", "The X-Ray (Left Knee) for Ahmed Hassan has been analyzed.", profileLink("ahmed.hassan@medflow.com"), daysAgo(0, 12, 10)),

    notify("florence.nightingale@medflow.com", "assignment", "Patient Assigned", "You have been assigned to a new patient: John Carter", profileLink("john.carter@medflow.com"), daysAgo(3, 10)),
    notify("mary.seacole@medflow.com", "assignment", "Patient Assigned", "You have been assigned to a new patient: Ahmed Hassan", profileLink("ahmed.hassan@medflow.com"), daysAgo(1, 9)),
    notify("clara.barton@medflow.com", "assignment", "Patient Assigned", "You have been assigned to a new patient: Liam O'Brien", profileLink("liam.obrien@medflow.com"), daysAgo(2, 9)),

    notify("john.carter@medflow.com", "lab_result", "Your X-ray has been analyzed", "Your chest X-ray results are available in your profile.", profileLink("john.carter@medflow.com"), daysAgo(2, 14, 30)),
    notify("priya.sharma@medflow.com", "system", "Follow-up reminder", "Your wrist review appointment is due in 4 weeks.", profileLink("priya.sharma@medflow.com"), daysAgo(3, 8), true),
    notify("carlos.silva@medflow.com", "alert", "Invoice awaiting payment", "An invoice of $275.00 is ready for payment in your profile.", profileLink("carlos.silva@medflow.com"), daysAgo(3, 9)),
  ]);

  // ----------------------------------------------------- activity logs
  console.log("📝 Activity logs...");
  const activityLogs = db.collection("activitylogs");
  await activityLogs.deleteMany({ seed: SEED });

  const log = (userEmail: string, action: string, details: string, createdAt: Date) => ({
    user: new ObjectId(u(userEmail).id),
    action,
    details,
    createdAt,
    updatedAt: createdAt,
    seed: SEED,
  });

  await activityLogs.insertMany([
    log("tahsin@medflow.com", "create", "Doctor account created for Grace Hopper", daysAgo(110, 9)),
    log("tahsin@medflow.com", "create", "Doctor account created for Alan Turing", daysAgo(100, 9, 30)),
    log("tahsin@medflow.com", "create", "Nurse account created for Florence Nightingale", daysAgo(105, 10)),
    log("tahsin@medflow.com", "create", "Lab technician account created for Ravi Patel", daysAgo(70, 11)),
    log("amina.khan@medflow.com", "create", "Nurse account created for Edith Cavell", daysAgo(15, 9)),
    log("amina.khan@medflow.com", "Updated User", `User updated: ${u("rosalind.franklin@medflow.com").id}`, daysAgo(14, 16)),
    log("amina.khan@medflow.com", "create", "Doctor account created for Jonas Salk", daysAgo(20, 9)),

    log("grace.hopper@medflow.com", "create", "Patient account created for John Carter", daysAgo(3, 9, 45)),
    log("grace.hopper@medflow.com", "Admitted Patient", `Admitted patient ${u("john.carter@medflow.com").id}`, daysAgo(3, 9, 50)),
    log("ravi.patel@medflow.com", "Uploaded Lab Result", "Uploaded X-Ray for Chest (PA)", daysAgo(2, 14)),
    log("mary.seacole@medflow.com", "create", "Patient account created for Maria Gonzalez", daysAgo(5, 9, 10)),
    log("mary.seacole@medflow.com", "Admitted Patient", `Admitted patient ${u("maria.gonzalez@medflow.com").id}`, daysAgo(5, 9, 15)),
    log("alan.turing@medflow.com", "Uploaded Lab Result", "Uploaded X-Ray for Skull (lateral)", daysAgo(5, 11)),
    log("alan.turing@medflow.com", "Updated Lab Result", "Updated lab result with status reviewed", daysAgo(5, 15)),
    log("clara.barton@medflow.com", "create", "Patient account created for Liam O'Brien", daysAgo(2, 8, 40)),
    log("clara.barton@medflow.com", "Admitted Patient", `Admitted patient ${u("liam.obrien@medflow.com").id}`, daysAgo(2, 8, 45)),
    log("ravi.patel@medflow.com", "Uploaded Lab Result", "Uploaded X-Ray for Chest (PA)", daysAgo(0, 8, 30)),
    log("jonas.salk@medflow.com", "Updated Lab Result", "Updated lab result with status reviewed", daysAgo(10, 15, 30)),
    log("ravi.patel@medflow.com", "Uploaded Lab Result", "Uploaded X-Ray for Left Wrist", daysAgo(25, 10)),
    log("jonas.salk@medflow.com", "Updated Lab Result", "Updated lab result with status reviewed", daysAgo(24, 9)),
    log("mary.seacole@medflow.com", "create", "Patient account created for Ahmed Hassan", daysAgo(1, 8, 50)),
    log("mary.seacole@medflow.com", "Admitted Patient", `Admitted patient ${u("ahmed.hassan@medflow.com").id}`, daysAgo(1, 8, 55)),
    log("ravi.patel@medflow.com", "Uploaded Lab Result", "Uploaded X-Ray for Left Knee", daysAgo(0, 12)),
    log("tahsin@medflow.com", "Updated User", `User updated: ${u("emily.chen@medflow.com").id}`, daysAgo(40, 13)),
    log("tahsin@medflow.com", "Updated User", `User updated: ${u("carlos.silva@medflow.com").id}`, daysAgo(33, 13, 20)),
  ]);

  const counts = {
    users: await users().countDocuments(),
    invoices: await invoices.countDocuments(),
    labResults: await labResults.countDocuments(),
    notifications: await notifications.countDocuments(),
    activityLogs: await activityLogs.countDocuments(),
  };
  console.log("\n✅ Demo data ready:", counts);
  console.log(`   Staff & patient password: ${DEMO_PASSWORD} (admin ${adminUser.email} unchanged)`);
};

main()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit();
  });
