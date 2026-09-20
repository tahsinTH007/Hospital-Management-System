import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import {
  getUserById,
  getActiveInvoice,
  createCheckoutSession,
  getBillingHistory,
} from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  User,
  CreditCard,
  Receipt,
  History,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { STATUS_CONFIG } from "@/components/users/statusBadge";
import Loader from "@/components/global/Loader";
import { formatMoney, getInitials } from "@/lib/utils";
import type { Invoice } from "@/types";

export function meta() {
  return [{ title: "Profile | MedFlow AI" }];
}

const STAFF_ROLES = ["admin", "doctor", "nurse", "lab_tech", "pharmacist"];

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const loggedInUser = session?.user;

  const targetUserId = id || loggedInUser?.id;
  const isViewingOwnProfile = loggedInUser?.id === targetUserId;
  const isStaff = STAFF_ROLES.includes(loggedInUser?.role ?? "");
  const canSeeBilling = isViewingOwnProfile || isStaff;

  const {
    data: profileUser,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery({
    queryKey: ["user", targetUserId],
    queryFn: () => getUserById(targetUserId!),
    enabled: !!targetUserId,
  });

  const isPatient = profileUser?.role === "patient";
  const isDischarged = profileUser?.status === "discharged";
  const billingEnabled = !!targetUserId && isPatient && canSeeBilling;

  const { data: invoice } = useQuery({
    queryKey: ["active-invoice", targetUserId],
    queryFn: () => getActiveInvoice(targetUserId!),
    enabled: billingEnabled,
  });

  const { data: billingHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["billing-history", targetUserId],
    queryFn: () => getBillingHistory(targetUserId!),
    enabled: billingEnabled,
  });

  // Back from Polar checkout: the webhook marks the invoice as paid, so
  // refresh the billing data and drop the query param.
  const checkoutId = searchParams.get("checkout_id");
  useEffect(() => {
    if (!checkoutId) return;
    toast.success("Payment received. Your invoice will update shortly.");
    queryClient.invalidateQueries({ queryKey: ["active-invoice", targetUserId] });
    queryClient.invalidateQueries({ queryKey: ["billing-history", targetUserId] });
    setSearchParams({}, { replace: true });
  }, [checkoutId, queryClient, setSearchParams, targetUserId]);

  const checkoutMutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to start checkout");
    },
  });

  if (sessionLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader label="Loading profile..." />
      </div>
    );
  }

  if (profileError || !profileUser) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-destructive font-bold">
        User not found or you don't have access to this profile.
      </div>
    );
  }

  const statusConf =
    STATUS_CONFIG[profileUser.status] || STATUS_CONFIG["active"]!;

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-6 pb-20">
      <h1 className="text-3xl font-bold tracking-tight">
        {isViewingOwnProfile ? "My Profile" : `${profileUser.name}'s Profile`}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* --- LEFT COLUMN: IDENTITY --- */}
        <Card className="col-span-1 card shadow-sm h-min">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
              <AvatarImage src={profileUser.image ?? undefined} />
              <AvatarFallback className="text-2xl bg-blue-100 text-blue-700">
                {getInitials(profileUser.name)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">{profileUser.name}</h2>
            <p className="text-sm text-slate-500 mb-4 break-all">
              {profileUser.email}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {profileUser.role.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className={statusConf.color}>
                {statusConf.label}
              </Badge>
            </div>
          </CardContent>
        </Card>
        {/* --- RIGHT COLUMN: DETAILS & BILLING --- */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <Card className="card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                {isPatient ? "Medical Context" : "Professional Info"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-4 text-sm">
              {isPatient ? (
                <>
                  <DetailItem label="Age" value={profileUser.age} />
                  <DetailItem label="Blood Group" value={profileUser.bloodgroup} />
                  <DetailItem label="Gender" value={profileUser.gender} />
                  <DetailItem
                    label="Assigned Doctor"
                    value={profileUser.assignedDoctorName}
                  />
                  <div className="col-span-2">
                    <DetailItem
                      label="Medical History"
                      value={profileUser.medicalHistory || "Clean record"}
                    />
                  </div>
                </>
              ) : (
                <>
                  <DetailItem label="Department" value={profileUser.department} />
                  <DetailItem
                    label="Specialization"
                    value={profileUser.specialization}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {isPatient && profileUser.triageReasoning && (
            <Card className="card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  AI Triage Summary
                </CardTitle>
                <CardDescription>
                  Generated when the patient was admitted.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {profileUser.triageReasoning}
              </CardContent>
            </Card>
          )}

          {billingEnabled && (
            <Card className="card shadow-sm overflow-hidden border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-base">Current Balance</CardTitle>
                      <CardDescription className="text-xs">
                        Active hospitalization charges
                      </CardDescription>
                    </div>
                  </div>
                  {invoice && (
                    <span className="text-xl font-black">
                      {formatMoney(invoice.totalAmount)}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {!invoice ? (
                  <p className="text-center text-slate-500 text-sm py-2">
                    No active charges.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {invoice.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex justify-between gap-4 text-xs text-slate-500 dark:text-slate-400"
                        >
                          <span>{item.description}</span>
                          <span>{formatMoney(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                    {invoice.status === "pending_payment" && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        A checkout is in progress for this invoice.
                      </p>
                    )}
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={!isDischarged || checkoutMutation.isPending}
                      onClick={() => checkoutMutation.mutate(invoice._id)}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                      )}
                      {isDischarged
                        ? "Pay and Complete Checkout"
                        : "Payment available after discharge"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {billingEnabled && (
            <Card className="card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-slate-400" />
                  Billing History
                </CardTitle>
                <CardDescription>
                  Records of previously settled invoices.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin h-5 w-5 text-slate-300" />
                  </div>
                ) : !billingHistory || billingHistory.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-4 italic border border-dashed rounded-lg">
                    No previous payments found.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {billingHistory.map((pastInv: Invoice) => (
                      <div
                        key={pastInv._id}
                        className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 shrink-0">
                            <CheckCircle2 size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold">
                              {formatMoney(pastInv.totalAmount)}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                              Paid on{" "}
                              {new Date(pastInv.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 truncate text-right">
                          {pastInv.items.map((i) => i.description).join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="text-slate-400 text-[11px] uppercase font-bold tracking-wider">
        {label}
      </span>
      <p className="font-semibold text-slate-800 dark:text-slate-200">
        {value || "N/A"}
      </p>
    </div>
  );
}

export default Profile;
