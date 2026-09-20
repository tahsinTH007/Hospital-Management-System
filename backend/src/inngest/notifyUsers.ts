import mongoose from "mongoose";
import Notification from "../models/notification.ts";

type NotificationType = "system" | "assignment" | "lab_result" | "alert";

/**
 * Creates one notification per recipient. Empty / invalid ids (e.g. a patient
 * who was never assigned a doctor) are skipped instead of crashing the job.
 */
export const notifyUsers = async (
  recipientIds: Array<string | null | undefined>,
  title: string,
  message: string,
  link: string,
  type: NotificationType,
) => {
  const recipients = [...new Set(recipientIds)].filter(
    (id): id is string =>
      typeof id === "string" && mongoose.Types.ObjectId.isValid(id),
  );

  if (recipients.length === 0) return;

  await Notification.insertMany(
    recipients.map((user) => ({ user, title, message, type, link })),
  );
};
