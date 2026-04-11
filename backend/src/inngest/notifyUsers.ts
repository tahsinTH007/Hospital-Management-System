import Notification from "../models/notification";

export const notifyUsers = async (
  doctorId: string,
  nurseId: string,
  title: string,
  message: string,
  link: string,
  type: "system" | "assignment" | "lab_result" | "alert",
) => {
  await Notification.create({
    user: doctorId,
    title,
    message,
    type,
    link,
  });

  await Notification.create({
    user: nurseId,
    title,
    message,
    type,
    link,
  });
};
