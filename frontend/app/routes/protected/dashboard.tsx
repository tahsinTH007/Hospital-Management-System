import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { getUsers } from "@/lib/api";
import Loader from "@/components/global/Loader";
import { useNavigate } from "react-router";
import type { Role } from "@/types";
import QuickActions from "@/components/dashboard/QuickActions";
import StatsCards from "@/components/global/StatsCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import ActiveAssignmentsBoard from "@/components/dashboard/ActiveAssignmentsBoard";

export function meta() {
  return [{ title: "Dashboard" }];
}

export default function HMSDashboard() {
  const { data: session, isPending: isAuthLoading } = authClient.useSession();
  const navigate = useNavigate();
  const user = session?.user;

  if (user?.role === "patient") {
    navigate(`/profile/${session?.user.id}`);
  }

  const { data: userData, isLoading: isDataLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: () => getUsers({ role: "patient", limit: 100 }),
  });

  if (isAuthLoading || isDataLoading)
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader label="Preparing Dashboard..." />
      </div>
    );

  const isAdmin = user?.role === "admin";
  const isMedicalStaff = ["doctor", "nurse"].includes(user?.role || "");

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

      <StatsCards data={userData?.res || []} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {isAdmin && (
            <section className="card p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold mb-6">Revenue Overview</h3>
              <RevenueChart />
            </section>
          )}
        </div>
        {isAdmin && (
          <div className="lg:col-span-4 space-y-8">
            <section className="card p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
              <RecentActivity />
            </section>
          </div>
        )}
      </div>
      <section className="card p-6 rounded-xl shadow-sm">
        <ActiveAssignmentsBoard />
      </section>
    </div>
  );
}
