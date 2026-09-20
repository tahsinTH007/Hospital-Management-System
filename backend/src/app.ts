import "dotenv/config";
import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { serve } from "inngest/express";
import { createRouteHandler } from "uploadthing/express";

import { connectDB } from "./config/db.ts";
import { ALLOWED_ORIGINS, DEMO_MODE, IS_PRODUCTION, IS_SERVERLESS } from "./config/env.ts";
import { auth } from "./lib/auth.ts";
import { demoSession } from "./middleware/demoSession.ts";
import { uploadRouter } from "./lib/uploadthing.ts";
import { inngest } from "./inngest/client.ts";
import {
  admitPatient,
  analyzeXRayJob,
  addChargeToInvoice,
} from "./inngest/functions.ts";
import userRouter from "./routes/user.ts";
import activityLogRouter from "./routes/activity.ts";
import notificationRouter from "./routes/notification.ts";
import labResultsRouter from "./routes/labResults.ts";
import invoiceRouter from "./routes/invoice.ts";
import uploadthingRouter from "./routes/uploadthing.ts";

const app: Application = express();

// Behind Vercel / any reverse proxy so `req.secure`, protocol and client IP
// are derived from X-Forwarded-* headers.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(cookieParser());

if (!IS_PRODUCTION) {
  app.use(morgan("dev"));
}

// Make sure the database is reachable before any handler runs. The
// connection is cached, so this is a no-op after the first request.
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello from the backend!");
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    realtime: !IS_SERVERLESS,
    demo: DEMO_MODE,
    timestamp: new Date().toISOString(),
  });
});

// Demo mode: visitors without a session become the admin (no-op otherwise).
// Must run before Better Auth so its endpoints see the injected cookie too.
app.use(demoSession);

// Better Auth reads the raw request body itself, so it is mounted before the
// JSON body parser (as its Express integration docs require).
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/me", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  res.json(session);
});

app.use("/api/users", userRouter);
app.use("/api/activity-logs", activityLogRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/lab-results", labResultsRouter);
app.use("/api/invoices", invoiceRouter);

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [admitPatient, analyzeXRayJob, addChargeToInvoice],
  }),
);

app.use("/api/uploadthing/delete", uploadthingRouter);
app.use("/api/uploadthing", createRouteHandler({ router: uploadRouter }));

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err?.message || "Internal server error",
    stack: IS_PRODUCTION ? undefined : err?.stack,
  });
});

// Vercel's zero-config Express support picks this default export up and runs
// the app as a single Function. Locally, `src/server.ts` wraps it in an HTTP
// server with Socket.IO.
export default app;
