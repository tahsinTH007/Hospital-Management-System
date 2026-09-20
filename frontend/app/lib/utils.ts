import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Grace Hopper" -> "GH"; falls back to "?" for empty names. */
export function getInitials(name?: string | null) {
  const initials = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
  return initials || "?";
}

/** Amounts are stored in cents. */
export function formatMoney(cents: number | undefined | null) {
  return `$${((cents ?? 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "in_treatment" -> "In treatment" */
export function humanize(value?: string | null) {
  if (!value) return "";
  const text = value.replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
