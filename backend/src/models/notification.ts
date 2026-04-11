import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: "system" | "assignment" | "lab_result" | "alert";
  isRead: boolean;
  link?: string;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "user" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["system", "assignment", "lab_result", "alert"],
      default: "system",
    },
    isRead: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model<INotification>(
  "Notification",
  NotificationSchema,
);
