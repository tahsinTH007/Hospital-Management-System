import { DEMO_MODE } from "../config/env.ts";
import { inngest } from "./client.ts";
import {
  type AddChargeData,
  type AdmitPatientData,
  type AnalyzeXRayData,
  type JobStep,
  runAddCharge,
  runAdmitPatient,
  runAnalyzeXRay,
} from "./functions.ts";

export type JobEvent =
  | { name: "patient/admitted"; data: AdmitPatientData }
  | { name: "labResult/created"; data: AnalyzeXRayData }
  | { name: "billing/charge.added"; data: AddChargeData };

// Executes each step immediately – no retries or memoisation, which is fine
// for a demo without an Inngest server.
const inlineStep = {
  run: (_id: unknown, fn: () => unknown) => Promise.resolve(fn()),
} as unknown as JobStep;

const runInline = async (event: JobEvent) => {
  switch (event.name) {
    case "patient/admitted":
      return runAdmitPatient(event.data, inlineStep);
    case "labResult/created":
      return runAnalyzeXRay(event.data, inlineStep);
    case "billing/charge.added":
      return runAddCharge(event.data, inlineStep);
  }
};

/**
 * Queues background jobs on Inngest. In demo mode, when the event cannot be
 * sent (no dev server running locally, no INNGEST_* keys in production), the
 * jobs run inline instead – the request takes longer but the result is there
 * as soon as it returns.
 */
export const dispatchJobs = async (events: JobEvent | JobEvent[]) => {
  const list = Array.isArray(events) ? events : [events];

  try {
    await inngest.send(list);
    return;
  } catch (error) {
    if (!DEMO_MODE) throw error;
    console.warn(
      `Inngest unreachable (${(error as Error).message}); running ${list.length} job(s) inline`,
    );
  }

  for (const event of list) {
    await runInline(event);
  }
};
