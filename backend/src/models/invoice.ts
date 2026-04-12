import mongoose, { Schema, Document } from "mongoose";

export interface IInvoice extends Document {
  patientId: string;
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

const InvoiceSchema = new Schema(
  {
    patientId: { type: String, required: true },
    polarCheckoutId: { type: String },
    status: {
      type: String,
      enum: ["draft", "pending_payment", "paid"],
      default: "draft",
    },
    items: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        totalPrice: Number,
      },
    ],
    totalAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IInvoice>("Invoice", InvoiceSchema);
