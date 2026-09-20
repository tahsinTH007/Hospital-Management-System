import type {
  PaginatedResponse,
  Role,
  User,
  LabResult,
  ActivityLog,
  Invoice,
  BillingStats,
  NotificationsResponse,
} from "@/types";
import { API_URL } from "./config";

export { API_URL };

/** fetch() wrapper: always sends the session cookie and surfaces API errors. */
const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // non-JSON error body
    }
    const error = new Error(message) as Error & { status: number };
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
};

const toQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

// ---------------------------------------------------------------- users

export const getUsers = (params: {
  role: Role;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<User>> =>
  request(
    `/users${toQuery({
      role: params.role,
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      search: params.search?.trim(),
    })}`,
  );

export const getUserById = (userId: string): Promise<User> =>
  request(`/users/profile/${userId}`);

interface UpdateUserParams {
  userId: string;
  userData: Partial<User> & Record<string, unknown>;
}

export const updateUser = ({ userId, userData }: UpdateUserParams) =>
  request<{ message: string; updatedUser: User }>(`/users/update/${userId}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });

export const triggerAdmission = ({
  patientId,
  admissionReason,
}: {
  patientId: string;
  admissionReason: string;
}) =>
  request<{ message: string }>(`/users/${patientId}/admit`, {
    method: "POST",
    body: JSON.stringify({ admissionReason }),
  });

export const polarPortalLink = (userId: string) =>
  request<{ polarPortalUrl: string }>(`/users/polar-portal/${userId}`);

// ------------------------------------------------------- activity logs

export const createActivityLog = (data: { action: string; details?: string }) =>
  request<{ message: string }>(`/activity-logs/create`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getActivityLogs = (params: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<ActivityLog>> =>
  request(
    `/activity-logs${toQuery({
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    })}`,
  );

// --------------------------------------------------------- lab results

export const getPatientLabResults = (patientId: string): Promise<LabResult[]> =>
  request(`/lab-results/patient/${patientId}`);

export const updateLabResult = ({
  id,
  data,
}: {
  id: string;
  data: { doctorNotes?: string; status?: string };
}) =>
  request<LabResult>(`/lab-results/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const createLabResult = (data: {
  patientId: string;
  testType: string;
  bodyPart: string;
  imageUrl: string;
}) =>
  request<LabResult>(`/lab-results`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteFile = ({ file }: { file: string }) =>
  request<{ message: string }>(`/uploadthing/delete`, {
    method: "DELETE",
    body: JSON.stringify({ fileUrl: file }),
  });

// ------------------------------------------------------------ invoices

const nullOn404 = async <T>(promise: Promise<T>): Promise<T | null> => {
  try {
    return await promise;
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
};

/** Active (unpaid) invoice of a patient; null when there is none. */
export const getActiveInvoice = (patientId: string) =>
  nullOn404(request<Invoice>(`/invoices/active/${patientId}`));

export const getMyActiveInvoice = () =>
  nullOn404(request<Invoice>(`/invoices/my-active-invoice`));

export const createCheckoutSession = (invoiceId: string) =>
  request<{ checkoutUrl: string }>(`/invoices/${invoiceId}/checkout`, {
    method: "POST",
  });

export const getBillingHistory = (userId: string): Promise<Invoice[]> =>
  request(`/invoices/history/${userId}`);

export const getAllInvoices = (params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Invoice>> =>
  request(
    `/invoices${toQuery({
      page: params?.page ?? 1,
      limit: params?.limit ?? 10,
    })}`,
  );

export const getBillingStats = (year?: number): Promise<BillingStats> =>
  request(`/invoices/stats${toQuery({ year })}`);

// ------------------------------------------------------- notifications

export const fetchNotifications = (): Promise<NotificationsResponse> =>
  request(`/notifications`);

export const markAsRead = (id: string) =>
  request<{ message: string }>(`/notifications/${id}/read`, { method: "POST" });

export const markAllAsRead = () =>
  request<{ message: string }>(`/notifications/read-all`, { method: "POST" });

// -------------------------------------------------------------- health

export interface Health {
  status: "ok" | "degraded";
  /** "connected" or the connection error. */
  database: string;
  /** Socket.IO available (false on Vercel Functions). */
  realtime: boolean;
  /** Backend runs in demo mode: every visitor is signed in as the admin. */
  demo: boolean;
  timestamp: string;
}

export const getHealth = (): Promise<Health> => request(`/health`);
