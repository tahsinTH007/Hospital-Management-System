export type Role =
  | "all"
  | "admin"
  | "doctor"
  | "nurse"
  | "pharmacist"
  | "lab_tech"
  | "patient";

export type PatientStatus =
  | "admitted"
  | "in_treatment"
  | "observation"
  | "discharged"
  | "follow_up"
  | "deceased";

export type StaffStatus = "active" | "on_leave" | "suspended" | "resigned";

export type UserStatus = PatientStatus | StaffStatus;

export interface LabResult {
  _id: string;
  patientId: string;
  testType: string;
  bodyPart: string;
  imageUrl: string;
  aiAnalysis: string;
  status: "pending" | "analyzed" | "reviewed";
  doctorNotes: string;
  createdAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  image?: string | null;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  status: UserStatus;
  banned: boolean;
  specialization?: string;
  gender?: string;
  bloodgroup?: string;
  medicalHistory?: string;
  age?: string;
  department?: string;
  labResults?: LabResult[];
  prescriptions?: string[];
  appointmentsXRay?: string[];
  assignedDoctorId?: string | null;
  assignedNurseId?: string | null;
  triageReasoning?: string;
  assignedDoctorName?: string;
  assignedNurseName?: string;
}

export interface PaginatedResponse<T> {
  res: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalData: number;
    limit: number;
  };
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "system" | "assignment" | "lab_result" | "alert";
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface WebPushSubscription {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface ActivityLog {
  _id: string;
  user: User;
  action: string;
  details?: string;
  createdAt: Date;
}

export interface invoice {
  _id: string;
  user: User;
  polarCheckoutId?: string;
  status: "draft" | "pending_payment" | "paid";
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  createdAt: Date;
}

export interface appointment {
  _id: string;
  patientId: string;
  doctorId: string;
  nurseId?: string;
  date: Date;
  time: string;
  reason: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "in-progress";
  isVirtual: boolean;
  meetingId: string;
  createdAt: Date;
}
