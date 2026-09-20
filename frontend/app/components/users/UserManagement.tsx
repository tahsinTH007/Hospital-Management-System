import { authClient } from "@/lib/auth-client";
import type { Role, User } from "@/types";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActivityLog, getUsers } from "@/lib/api";
import Loader from "@/components/global/Loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_CONFIG } from "./statusBadge";
import { toast } from "sonner";
import GlobalSearch from "@/components/global/GlobalSearch";
import CustomPagination from "@/components/global/CustomPagination";
import CreateUserModal from "./CreateUserModal";
import { useSocketEvents } from "@/lib/socket";
import { DetailsSheet } from "./DetailsSheet";
import StatsCards from "@/components/global/StatsCards";
import { useDebounce } from "@/hooks/use-debounce";
import { getInitials } from "@/lib/utils";

interface UserManagementProps {
  role: Role;
  title: string;
  description: string;
}

const UserManagement = ({ role, title, description }: UserManagementProps) => {
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const isAdmin = session?.user.role === "admin";

  // Searching is done server-side across all pages – start from page 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["users", role, page, debouncedSearch],
    queryFn: () => getUsers({ role, page, limit: 10, search: debouncedSearch }),
    placeholderData: (previousData) => previousData,
  });

  const users = data?.res || [];
  const pagination = data?.pagination;

  useSocketEvents(["notify_user_updated", "notify_user_created"], refetch);

  const activityMutation = useMutation({
    mutationFn: createActivityLog,
    onError: (error) => {
      console.error("Activity Log Error:", error);
    },
  });

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: ["users"] });

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsSheetOpen(true);
  };

  const banUser = async (user: User) => {
    try {
      setBusyUserId(user._id);
      const { error } = user.banned
        ? await authClient.admin.unbanUser({ userId: user._id })
        : await authClient.admin.banUser({ userId: user._id });
      if (error) throw new Error(error.message);
      toast.success(
        user.banned ? "User has been unbanned." : "User has been banned.",
      );
      activityMutation.mutate({
        action: user.banned ? "unban" : "ban",
        details: `${user.banned ? "Unbanned" : "Banned"} ${user.name} (${user.email})`,
      });
      invalidateUsers();
    } catch (error) {
      console.error("Error banning/unbanning user:", error);
      toast.error(
        error instanceof Error ? error.message : "An error occurred. Please try again.",
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const deleteUser = async (user: User) => {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    try {
      setBusyUserId(user._id);
      const { error } = await authClient.admin.removeUser({ userId: user._id });
      if (error) throw new Error(error.message);
      toast.success("User has been deleted.");
      activityMutation.mutate({
        action: "delete",
        details: `Deleted ${user.name} (${user.email})`,
      });
      invalidateUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(
        error instanceof Error ? error.message : "An error occurred. Please try again.",
      );
    } finally {
      setBusyUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader label={`Loading ${title}...`} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <h1 className="text-xl font-bold text-destructive">
          Failed to load data. Please refresh.
        </h1>
      </div>
    );
  }

  const columnCount =
    3 + (role === "doctor" ? 1 : 0) + (role === "patient" ? 3 : 0) + 1;

  return (
    <div className="space-y-6">
      <StatsCards data={users} role={role} />

      <DetailsSheet
        user={selectedUser}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
      <Card className="card shadow-sm">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <GlobalSearch search={search} setSearch={setSearch} title={title} />
            <CreateUserModal role={role} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-zinc-300 dark:border-zinc-700 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  {role === "doctor" && <TableHead>Specialization</TableHead>}
                  {role === "patient" && (
                    <>
                      <TableHead>Age</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Blood Group</TableHead>
                    </>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columnCount}
                      className="text-center h-24 text-muted-foreground"
                    >
                      {debouncedSearch
                        ? `No ${title.toLowerCase()} match "${debouncedSearch}".`
                        : "No records found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const config =
                      STATUS_CONFIG[user.status] || STATUS_CONFIG["active"]!;
                    const Icon = config.icon;
                    const isBusy = busyUserId === user._id;
                    const isSelf = session?.user.id === user._id;

                    return (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.image ?? undefined} />
                              <AvatarFallback>
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="whitespace-nowrap">{user.name}</span>
                            {user.banned && (
                              <Badge variant="destructive" className="text-[10px]">
                                Banned
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>

                        {role === "doctor" && (
                          <TableCell>
                            <Badge variant="secondary">
                              {user.specialization || "General"}
                            </Badge>
                          </TableCell>
                        )}
                        {role === "patient" && (
                          <>
                            <TableCell>{user.age || "N/A"}</TableCell>
                            <TableCell>{user.gender || "N/A"}</TableCell>
                            <TableCell>
                              {user.bloodgroup ? (
                                <Badge
                                  variant="outline"
                                  className="text-red-600 border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300"
                                >
                                  {user.bloodgroup}
                                </Badge>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`gap-1.5 whitespace-nowrap ${config.color}`}
                          >
                            {Icon && <Icon size={12} />}
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewUser(user)}
                            >
                              View
                            </Button>
                            <CreateUserModal
                              role={role}
                              user={user}
                              loading={isBusy}
                            />
                            {isAdmin && !isSelf && (
                              <>
                                <Button
                                  onClick={() => banUser(user)}
                                  variant="outline"
                                  size="sm"
                                  disabled={isBusy}
                                >
                                  {user.banned ? "Unban" : "Ban"}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteUser(user)}
                                  disabled={isBusy}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <CustomPagination
              loading={isLoading}
              totalPages={pagination?.totalPages || 0}
              currentPage={pagination?.currentPage || 0}
              setPage={setPage}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
