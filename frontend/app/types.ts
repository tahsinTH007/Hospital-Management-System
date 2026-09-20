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
  patient: string;
  uploadedBy?: string;
  testType: string;
  bodyPart: string;
  imageUrl: string;
  aiAnalysis: string;
  status: "pending" | "analyzed" | "reviewed";
  doctorNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  image?: string | null;
  role: Role;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
  status: UserStatus;
  banned?: boolean;
  specialization?: string;
  gender?: string;
  bloodgroup?: string;
  medicalHistory?: string;
  age?: string;
  department?: string;
  prescriptions?: string[];
  appointments?: string[];
  admissionReason?: string;
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

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface ActivityLog {
  _id: string;
  user: User | null;
  action: string;
  details?: string;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  _id: string;
  patientId: string;
  /** Populated by the admin ledger endpoint only. */
  user?: User | null;
  polarCheckoutId?: string;
  status: "draft" | "pending_payment" | "paid";
  items: InvoiceItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillingStats {
  year: number;
  totalBilled: number;
  totalInvoices: number;
  paid: { count: number; amount: number };
  pending: { count: number; amount: number };
  draft: { count: number; amount: number };
  monthlyRevenue: Array<{ month: number; amount: number }>;
}

export interface Appointment {
  _id: string;
  patientId: string;
  doctorId: string;
  nurseId?: string;
  date: string;
  time: string;
  reason: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "in-progress";
  isVirtual: boolean;
  meetingId: string;
  createdAt: string;
}
