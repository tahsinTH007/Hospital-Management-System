import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/types";
import Loader from "@/components/global/Loader";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { useEffect } from "react";
import { toast } from "sonner";
import { getRouteConfig, navConfig } from "@/components/navigation/nav-config";
import Header from "@/components/navigation/Header";
import { getHomePath } from "@/lib/routing";

const ALL_NAV_ITEMS = [
  ...navConfig.navMain,
  ...navConfig.navAdmin,
  ...navConfig.navSecondary,
];

const Layout = () => {
  const { data: session, isPending } = authClient.useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = session?.user;
  const userRole = (user?.role as Role) || "patient";

  useEffect(() => {
    if (isPending || !user) return;

    const currentRouteConfig = getRouteConfig(pathname, ALL_NAV_ITEMS);
    if (!currentRouteConfig) return;

    if (!currentRouteConfig.allowedRoles.includes(userRole)) {
      // Patients simply land on their profile instead of the staff dashboard.
      if (!(userRole === "patient" && pathname === "/dashboard")) {
        toast.error("You don't have access to that page");
      }
      navigate(getHomePath(user), { replace: true });
    }
  }, [pathname, userRole, isPending, navigate, user]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Initializing MedFlow..." />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-card/50 min-w-0">
        <Header />
        <main className="px-4 my-4 min-w-0">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
