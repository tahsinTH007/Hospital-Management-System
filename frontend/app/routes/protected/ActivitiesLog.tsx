import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActivityLogs } from "@/lib/api";
import CustomPagination from "@/components/global/CustomPagination";
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
import { format } from "date-fns";
import GlobalSearch from "@/components/global/GlobalSearch";
import { getInitials } from "@/lib/utils";

export function meta() {
  return [{ title: "System Activities | MedFlow AI" }];
}
const ActivitiesLog = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["activities-log", page],
    queryFn: () => getActivityLogs({ page, limit }),
    placeholderData: (previousData) => previousData,
  });

  if (isLoading)
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader label="Fetching logs..." />
      </div>
    );

  if (isError) {
    return (
      <div className="p-8 text-center text-destructive font-bold">
        Error loading activity logs.
      </div>
    );
  }

  const logs = data?.res || [];
  const pagination = data?.pagination;

  const filteredLogs = logs.filter((log) =>
    `${log.action} ${log.details ?? ""} ${log.user?.name ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <Card className="card shadow-sm border-none">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="font-bold text-xl">System Activities</CardTitle>
          <CardDescription>
            A history of all actions performed by hospital staff.
          </CardDescription>
        </div>
        <GlobalSearch
          search={search}
          setSearch={setSearch}
          title="this page"
        />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center h-24 text-muted-foreground"
                  >
                    No activity logs found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={log.user?.image ?? undefined} />
                          <AvatarFallback>
                            {getInitials(log.user?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">
                            {log.user?.name ?? "Deleted user"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {log.user?.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="capitalize text-[10px]"
                      >
                        {log.user?.role?.replace("_", " ") ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500 truncate max-w-50 block">
                        {log.details || "---"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {format(
                        new Date(log.createdAt),
                        "MMM dd, yyyy - hh:mm a",
                      )}
                    </TableCell>
                  </TableRow>
                ))
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
  );
};

export default ActivitiesLog;
