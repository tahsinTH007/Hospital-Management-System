import type { Role } from "@/types";
import {
  LayoutDashboard,
  Users,
  ClipboardPlus,
  Stethoscope,
  Pill,
  FlaskConical,
  FileText,
  Settings2,
  LifeBuoy,
  Send,
  ReceiptCent,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon?: any;
  allowedRoles: Role[];
  items?: {
    title: string;
    url: string;
    allowedRoles?: Role[];
  }[];
}

export const navConfig: {
  navMain: NavItem[];
  navAdmin: NavItem[];
  navSecondary: NavItem[];
} = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      allowedRoles: ["admin", "doctor", "nurse", "pharmacist", "lab_tech"],
      items: [
        { title: "Overview", url: "/dashboard" },
        { title: "Activities Log", url: "/activities-log" },
      ],
    },
    {
      title: "Administrators",
      url: "/admins",
      icon: Users,
      allowedRoles: ["admin"],
      items: [
        { title: "All Administrators", url: "/admins" },
        // { title: "Admissions", url: "/patients/admissions" },
        // { title: "Registration", url: "/patients/new" },
      ],
    },
    {
      title: "Patients",
      url: "/patients",
      icon: Users,
      allowedRoles: ["admin", "doctor", "nurse"],
      items: [
        { title: "All Patients", url: "/patients" },
        // { title: "Admissions", url: "/patients/admissions" },
        // { title: "Registration", url: "/patients/new" },
      ],
    },
    {
      title: "Nursing Station",
      url: "/nursing",
      icon: ClipboardPlus,
      allowedRoles: ["admin"],
      items: [{ title: "Nurses", url: "/nurses" }],
    },
    {
      title: "Doctors",
      url: "/doctors",
      icon: Stethoscope,
      allowedRoles: ["admin", "doctor"],
      items: [{ title: "Doctors", url: "/doctors" }],
    },
    {
      title: "Pharmacy",
      url: "/pharmacy",
      icon: Pill,
      allowedRoles: ["admin", "pharmacist", "doctor"],
      items: [
        { title: "Dispense", url: "/pharmacy/dispense" },
        { title: "Inventory", url: "/pharmacy/inventory" },
        { title: "Prescriptions", url: "/pharmacy/prescriptions" },
      ],
    },
    {
      title: "Laboratory",
      url: "/lab",
      icon: FlaskConical,
      allowedRoles: ["admin", "lab_tech", "doctor"],
      items: [
        { title: "Test Requests", url: "/lab/requests" },
        { title: "Results Entry", url: "/lab/results" },
      ],
    },
    {
      title: "Financial Records",
      url: "/records",
      icon: ReceiptCent,
      allowedRoles: ["admin", "doctor"],
      items: [{ title: "History", url: "/financial-history" }],
    },
    {
      title: "Appointments",
      url: "/appointments",
      icon: FileText,
      allowedRoles: ["admin", "doctor", "nurse", "patient"],
      items: [{ title: "Telemedicine", url: "/telemedicine" }],
    },
  ],
  navAdmin: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      allowedRoles: ["admin"],
      items: [
        { title: "General", url: "/settings/general" },
        { title: "Roles & Permissions", url: "/settings/roles" },
        { title: "Billing", url: "/settings/billing" },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "/support",
      icon: LifeBuoy,
      allowedRoles: ["admin", "doctor", "nurse", "pharmacist", "lab_tech"],
    },
    {
      title: "Feedback",
      url: "/feedback",
      icon: Send,
      allowedRoles: ["admin", "doctor", "nurse", "pharmacist", "lab_tech"],
    },
  ],
};

export function getRouteConfig(path: string, items: NavItem[]): NavItem | null {
  for (const item of items) {
    if (item.url === path) return item;
    if (item.items) {
      const found = item.items.find((sub) => sub.url === path);
      if (found)
        return {
          ...found,
          allowedRoles: found.allowedRoles || item.allowedRoles,
        } as NavItem;
    }
  }
  return null;
}
