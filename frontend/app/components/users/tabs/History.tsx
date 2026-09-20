import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Sparkles, Stethoscope, UserCheck } from "lucide-react";
import type { User as UserType } from "@/types";

export default function History({ user }: { user: UserType }) {
  const hasTriage = Boolean(user.triageReasoning);

  return (
    <div className="space-y-4">
      <Card className="bg-linear-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-100 dark:border-indigo-900 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-base text-indigo-900 dark:text-indigo-300">
              AI Triage Summary
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasTriage ? (
            <>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {user.triageReasoning}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 rounded-md bg-white/60 dark:bg-slate-900/40 p-2">
                  <Stethoscope className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    {user.assignedDoctorName || "No doctor assigned"}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-white/60 dark:bg-slate-900/40 p-2">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    {user.assignedNurseName || "No nurse assigned"}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              No AI triage has been run for this patient yet. Triage runs
              automatically when a patient is admitted.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" /> Patient Records
        </h3>
        <div className="p-4 rounded-lg border bg-white dark:bg-slate-900 text-sm shadow-sm space-y-2">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
              Medical history
            </span>
            <p>{user.medicalHistory || "No medical history recorded."}</p>
          </div>
          {user.admissionReason && (
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                Reason for admission
              </span>
              <p>{user.admissionReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
