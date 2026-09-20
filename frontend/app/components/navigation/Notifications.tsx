import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, UserPlus, Activity, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchNotifications, markAllAsRead, markAsRead } from "@/lib/api";
import type { Notification } from "@/types";

export default function Notifications({ user }: { user: { id: string } }) {
  const queryClient = useQueryClient();
  const queryKey = ["notifications", user.id];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: fetchNotifications,
    refetchInterval: 60 * 1000,
  });

  const notifications: Notification[] = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const readMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: invalidate,
  });

  const readAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: invalidate,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return <UserPlus className="h-4 w-4 text-indigo-500" />;
      case "lab_result":
        return <Activity className="h-4 w-4 text-blue-500" />;
      case "alert":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="size-[1.2rem] text-slate-600 dark:text-slate-300" />

          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[calc(100vw-2rem)] sm:w-80 p-0 shadow-xl rounded-xl"
      >
        <DropdownMenuLabel className="p-4 pb-2 flex justify-between items-center">
          <span className="font-bold">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center">
              <Bell className="h-8 w-8 text-slate-200 dark:text-slate-700 mb-2" />
              You're all caught up!
            </div>
          ) : (
            <DropdownMenuGroup>
              {notifications.map((notif) => (
                <DropdownMenuItem
                  key={notif._id}
                  className={cn(
                    "p-4 border-b last:border-0 cursor-pointer focus:bg-slate-50 dark:focus:bg-slate-900 transition-colors",
                    !notif.isRead ? "bg-indigo-50/30 dark:bg-indigo-950/20" : "",
                  )}
                  onClick={() => {
                    if (!notif.isRead) readMutation.mutate(notif._id);
                  }}
                  asChild
                >
                  <Link
                    to={notif.link || "#"}
                    className="flex items-start gap-3 w-full"
                  >
                    <div className="mt-1 bg-white dark:bg-slate-800 p-2 rounded-full border shadow-sm shrink-0">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold leading-tight",
                          !notif.isRead
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-700 dark:text-slate-300",
                        )}
                      >
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        {new Date(notif.createdAt).toLocaleDateString()} •{" "}
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <div className="h-2 w-2 bg-indigo-600 rounded-full mt-2 shrink-0" />
                    )}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}
        </div>
        {unreadCount > 0 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-xs text-indigo-600 hover:text-indigo-700 h-8"
                onClick={() => readAllMutation.mutate()}
                disabled={readAllMutation.isPending}
              >
                Mark all as read
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
