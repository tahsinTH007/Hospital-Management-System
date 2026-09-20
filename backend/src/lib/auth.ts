import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin, username } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { checkout, polar, portal, usage, webhooks } from "@polar-sh/better-auth";
import invoice from "../models/invoice.ts";
import { polarClient } from "./polar.ts";
import {
  ALLOWED_ORIGINS,
  BETTER_AUTH_URL,
  CROSS_SITE_COOKIES,
  FRONTEND_URL,
} from "../config/env.ts";

const mongoUri = process.env.MONGO_URI?.trim();
if (!mongoUri) {
  throw new Error("MONGO_URI is not set");
}

// The MongoDB driver connects lazily on first use, so this is serverless-safe.
const client = new MongoClient(mongoUri);
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db),
  baseURL: BETTER_AUTH_URL,
  trustedOrigins: ALLOWED_ORIGINS,
  emailAndPassword: {
    enabled: true,
    // Staff accounts are created by admins; keep the rule in sync with the
    // frontend user form (create-user-schema.ts).
    minPasswordLength: 6,
  },
  advanced: CROSS_SITE_COOKIES
    ? {
        defaultCookieAttributes: {
          sameSite: "none",
          secure: true,
          partitioned: true,
        },
      }
    : undefined,
  plugins: [
    // Lets staff sign in with a username as well as their email.
    username({ minUsernameLength: 3 }),
    admin({
      defaultRole: "patient",
      adminRoles: ["admin"],
    }),
    polar({
      client: polarClient,
      // Never block account creation on Polar – customers are created lazily
      // (see ensurePolarCustomer) only when a patient actually gets billed.
      createCustomerOnSignUp: false,
      use: [
        checkout({
          authenticatedUsersOnly: true,
        }),
        portal({
          returnUrl: `${FRONTEND_URL}/dashboard`,
        }),
        usage(),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET ?? "",
          onPayload: async ({ data, type }) => {
            if (type === "order.paid" && data.paid) {
              const invoiceId = data.metadata?.hospitalInvoiceId;
              if (invoiceId) {
                await invoice.findByIdAndUpdate(invoiceId, {
                  status: "paid",
                });
                console.log(
                  `✅ Invoice ${invoiceId} marked as PAID via Polar!`,
                );
              }
            }
          },
        }),
      ],
    }),
  ],
  user: {
    additionalFields: {
      specialization: {
        type: "string",
        required: false,
      },
      department: {
        type: "string",
        required: false,
      },
      gender: {
        type: "string",
        required: false,
      },
      bloodgroup: {
        type: "string",
        required: false,
      },
      medicalHistory: {
        type: "string",
        required: false,
      },
      age: {
        type: "string",
        required: false,
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "active",
      },
      prescriptions: {
        type: "string[]",
        required: false,
      },
      appointments: {
        type: "string[]",
      },
    },
  },
});
