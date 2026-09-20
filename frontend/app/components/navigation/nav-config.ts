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
  ShieldCheck,
} from "lucide-react";
import { humanize } from "@/lib/utils";

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
        { title: "Activities Log", url: "/activities-log", allowedRoles: ["admin"] },
      ],
    },
    {
      title: "Administrators",
      url: "/admins",
      icon: ShieldCheck,
      allowedRoles: ["admin"],
      items: [{ title: "All Administrators", url: "/admins" }],
    },
    {
      title: "Patients",
      url: "/patients",
      icon: Users,
      allowedRoles: ["admin", "doctor", "nurse"],
      items: [{ title: "All Patients", url: "/patients" }],
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
      allowedRoles: ["admin"],
      items: [{ title: "Financial History", url: "/financial-history" }],
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

/** Routes that exist today; everything else in the nav is "coming soon". */
export const IMPLEMENTED_ROUTES = new Set([
  "/dashboard",
  "/activities-log",
  "/admins",
  "/patients",
  "/nurses",
  "/doctors",
  "/financial-history",
]);

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

const ALL_ITEMS = [
  ...navConfig.navMain,
  ...navConfig.navAdmin,
  ...navConfig.navSecondary,
];

/** Human readable page title for the header, derived from the navigation. */
export function getPageTitle(pathname: string) {
  if (pathname.startsWith("/profile/")) return "Profile";
  if (pathname === "/dashboard") return "Dashboard";
  const config = getRouteConfig(pathname, ALL_ITEMS);
  if (config) return config.title;
  return humanize(pathname.split("/").filter(Boolean).pop() ?? "") || "MedFlow";
}
