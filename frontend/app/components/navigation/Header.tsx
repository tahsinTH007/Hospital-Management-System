import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "react-router";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import Notifications from "./Notifications";
import { getPageTitle } from "./nav-config";
import { cn, getInitials, humanize } from "@/lib/utils";

const Header = () => {
  const { pathname } = useLocation();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <header className="flex h-16 items-center gap-2 border-b w-full px-3">
      <SidebarTrigger className="size-9" />
      <Separator orientation="vertical" className="hidden sm:block" />
      <div className="flex justify-between items-center w-full min-w-0 gap-2">
        <div className="flex flex-col space-y-0.5 min-w-0">
          <h1 className="font-bold text-lg truncate">{getPageTitle(pathname)}</h1>
          <p className="text-sm text-muted-foreground truncate hidden sm:block">
            Welcome back, {user?.role === "doctor" ? "Dr. " : ""}
            {user?.name}
          </p>
        </div>
        <div className="flex gap-1 sm:gap-2 items-center shrink-0">
          <ThemeToggle />
          {user && <Notifications user={user} />}
          <Separator orientation="vertical" className="hidden sm:block" />
          {user && (
            <Link
              to={`/profile/${user.id}`}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "flex items-center gap-2 rounded-lg px-2 py-6",
              )}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback className="rounded-lg text-primary">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              <div className="hidden md:grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {humanize(user.role)}
                </span>
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
