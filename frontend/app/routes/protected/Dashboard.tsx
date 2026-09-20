import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router";
import { authClient } from "@/lib/auth-client";
import { getUsers } from "@/lib/api";
import Loader from "@/components/global/Loader";
import type { Role } from "@/types";
import QuickActions from "@/components/dashboard/QuickActions";
import StatsCards from "@/components/global/StatsCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import ActiveAssignmentsBoard from "@/components/dashboard/ActiveAssignmentsBoard";
import { getHomePath } from "@/lib/routing";

export function meta() {
  return [{ title: "Dashboard | MedFlow AI" }];
}

export default function HMSDashboard() {
  const { data: session, isPending: isAuthLoading } = authClient.useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";
  const canListPatients = ["admin", "doctor", "nurse"].includes(user?.role ?? "");

  const { data: userData, isLoading: isDataLoading } = useQuery({
    queryKey: ["users", "patient", "dashboard"],
    queryFn: () => getUsers({ role: "patient", limit: 100 }),
    enabled: canListPatients,
  });

  if (isAuthLoading || (canListPatients && isDataLoading)) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center">
        <Loader label="Preparing Dashboard..." />
      </div>
    );
  }

  // Patients have no dashboard – their profile is their home page.
  if (user?.role === "patient") {
    return <Navigate to={getHomePath(user)} replace />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            MedFlow Dashboard
          </h1>
          <p className="text-slate-500 font-medium">
            Welcome back, {user?.name}. Here's what's happening today.
          </p>
        </div>
        <QuickActions role={user?.role as Role} />
      </div>

      <StatsCards data={userData?.res || []} role="patient" />

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 card p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold mb-6">Revenue Overview</h3>
            <RevenueChart />
          </section>
          <section className="lg:col-span-4 card p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
            <RecentActivity />
          </section>
        </div>
      )}

      <section className="card p-6 rounded-xl shadow-sm">
        <ActiveAssignmentsBoard />
      </section>
    </div>
  );
}
