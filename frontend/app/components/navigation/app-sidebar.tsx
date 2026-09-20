import { Link, useLocation } from "react-router";
import { Activity, ChevronRight } from "lucide-react";

import { NavUser } from "@/components/navigation/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/types";
import { IMPLEMENTED_ROUTES, navConfig, type NavItem } from "./nav-config";
import { humanize } from "@/lib/utils";

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  if (items.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const subItems = item.items ?? [];
          const isActive =
            item.url === pathname || subItems.some((s) => s.url === pathname);

          // Leaf entry without sub items.
          if (subItems.length === 0) {
            const soon = !IMPLEMENTED_ROUTES.has(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  size="lg"
                  asChild
                  className="group-data-[collapsible=icon]:justify-center!"
                >
                  <Link to={item.url}>
                    {item.icon && <item.icon />}
                    <span className="group-data-[collapsible=icon]:hidden">
                      {item.title}
                    </span>
                    {soon && <SoonBadge />}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    size="lg"
                    className="group-data-[collapsible=icon]:justify-center!"
                  >
                    {item.icon && <item.icon />}
                    <span className="group-data-[collapsible=icon]:hidden">
                      {item.title}
                    </span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {subItems.map((subItem) => {
                      const soon = !IMPLEMENTED_ROUTES.has(subItem.url);
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === subItem.url}
                            className="my-1"
                          >
                            <Link to={subItem.url}>
                              <span>{subItem.title}</span>
                              {soon && <SoonBadge />}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

const SoonBadge = () => (
  <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
    Soon
  </span>
);

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation();
  const { data: session } = authClient.useSession();
  const userRole = (session?.user?.role as Role) || "patient";

  // Keep only the groups AND sub items this role is allowed to open.
  const filterNav = (items: NavItem[]) =>
    items
      .filter((item) => item.allowedRoles.includes(userRole))
      .map((item) => ({
        ...item,
        items: item.items?.filter(
          (sub) => !sub.allowedRoles || sub.allowedRoles.includes(userRole),
        ),
      }));

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-2!"
            >
              <Link to={userRole === "patient" && session ? `/profile/${session.user.id}` : "/dashboard"}>
                <div className="bg-primary text-white flex aspect-square size-8 items-center justify-center rounded-lg shadow-blue-500/30">
                  <Activity className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-bold text-slate-800 dark:text-slate-100">
                    MedFlow AI
                  </span>
                  <span className="truncate text-xs text-slate-500">
                    {humanize(userRole)} Portal
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Platform" items={filterNav(navConfig.navMain)} pathname={pathname} />
        <NavGroup label="Administration" items={filterNav(navConfig.navAdmin)} pathname={pathname} />
        <NavGroup label="Help" items={filterNav(navConfig.navSecondary)} pathname={pathname} />
      </SidebarContent>
      {session?.user && (
        <SidebarFooter>
          <NavUser user={session.user} />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
