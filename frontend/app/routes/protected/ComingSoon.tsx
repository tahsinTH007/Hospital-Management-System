import { Link, useLocation } from "react-router";
import { Construction, Home, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navConfig } from "@/components/navigation/nav-config";
import { authClient } from "@/lib/auth-client";
import { getHomePath } from "@/lib/routing";

export function meta() {
  return [{ title: "Coming soon | MedFlow AI" }];
}

const ALL_NAV_ITEMS = [
  ...navConfig.navMain,
  ...navConfig.navAdmin,
  ...navConfig.navSecondary,
];

/** Finds the navigation entry (group + sub item) that points at `pathname`. */
const findNavEntry = (pathname: string) => {
  for (const item of ALL_NAV_ITEMS) {
    if (item.url === pathname) return { group: item.title, title: item.title };
    const sub = item.items?.find((s) => s.url === pathname);
    if (sub) return { group: item.title, title: sub.title };
  }
  return null;
};

const ComingSoon = () => {
  const { pathname } = useLocation();
  const { data: session } = authClient.useSession();
  const entry = findNavEntry(pathname);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center space-y-6 card p-10 rounded-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {entry ? (
            <Construction className="h-8 w-8" />
          ) : (
            <SearchX className="h-8 w-8" />
          )}
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">
            {entry ? `${entry.title} is coming soon` : "Page not found"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {entry
              ? `The ${entry.group} module is on the roadmap and not available yet.`
              : "The page you are looking for does not exist or has moved."}
          </p>
        </div>
        <Button asChild>
          <Link to={getHomePath(session?.user)}>
            <Home className="h-4 w-4" /> Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ComingSoon;
