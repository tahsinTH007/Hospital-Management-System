import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getAllInvoices, getBillingStats, polarPortalLink } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  CheckCircle2,
  ExternalLink,
  DollarSign,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import GlobalSearch from "@/components/global/GlobalSearch";
import { toast } from "sonner";
import { formatMoney, getInitials } from "@/lib/utils";

export function meta() {
  return [{ title: "Financial History | MedFlow AI" }];
}

const FinancialHistory = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["all-invoices", page],
    queryFn: () => getAllInvoices({ page, limit: 10 }),
    placeholderData: (previousData) => previousData,
  });

  const { data: stats } = useQuery({
    queryKey: ["billing-stats"],
    queryFn: () => getBillingStats(),
  });

  const getPolarPortalLink = useMutation({
    mutationFn: polarPortalLink,
    onSuccess: (data) => {
      window.open(data.polarPortalUrl, "_blank", "noopener");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to open the Polar portal");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader label="Loading Financial Records..." />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="p-10 text-center text-destructive font-bold">
        Error loading financial history.
      </div>
    );
  }

  const invoices = data?.res || [];
  const pagination = data?.pagination;
  const openInvoices = (stats?.pending.count ?? 0) + (stats?.draft.count ?? 0);

  const filteredInvoices = invoices.filter((inv) =>
    (inv.user?.name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 gap-1">
            <CheckCircle2 size={12} /> Paid
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100 gap-1">
            <Clock size={12} /> Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Receipt size={12} /> Draft
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Revenue Ledger
          </h1>
          <p className="text-slate-500 font-medium">
            Detailed tracking of all hospital financial transactions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-xl border-none shadow-lg shadow-blue-500/20 bg-linear-to-br from-blue-600 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/20 rounded-xl">
                <DollarSign size={20} />
              </div>
              <Badge className="bg-white/20 text-white border-none">
                {stats?.totalInvoices ?? 0} invoices
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-blue-100 text-sm font-medium">Total Billed</p>
              <h3 className="text-2xl font-black mt-1">
                {formatMoney(stats?.totalBilled)}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="card shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start text-emerald-600">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-slate-500 text-sm font-medium">
                Successfully Paid
              </p>
              <h3 className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
                {formatMoney(stats?.paid.amount)}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {stats?.paid.count ?? 0} {stats?.paid.count === 1 ? "invoice" : "invoices"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="card shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start text-amber-600">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                <Clock size={20} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-slate-500 text-sm font-medium">
                Awaiting Payment
              </p>
              <h3 className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
                {formatMoney(
                  (stats?.pending.amount ?? 0) + (stats?.draft.amount ?? 0),
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {openInvoices} open {openInvoices === 1 ? "invoice" : "invoices"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="card shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Recent Invoices</CardTitle>
            <CardDescription>
              Every invoice raised for a patient, newest first.
            </CardDescription>
          </div>
          <GlobalSearch
            search={search}
            setSearch={setSearch}
            title="patients on this page"
          />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-75 pl-6 font-bold">Patient</TableHead>
                  <TableHead className="font-bold text-center">Amount</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="font-bold text-center">Date</TableHead>
                  <TableHead className="text-right pr-6 font-bold">
                    Polar Reference
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-40 text-center text-slate-400 italic"
                    >
                      No invoices found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => (
                    <TableRow
                      key={inv._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-slate-100 dark:border-slate-800">
                            <AvatarImage src={inv.user?.image ?? undefined} />
                            <AvatarFallback className="font-bold text-xs bg-blue-50 text-blue-600">
                              {getInitials(inv.user?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {inv.user?.name ?? "Deleted patient"}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate max-w-45">
                              {inv.user?.email ?? inv.patientId}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-900 dark:text-white">
                        {formatMoney(inv.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(inv.status)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-500">
                        {inv.createdAt
                          ? format(new Date(inv.createdAt), "MMM dd, yyyy")
                          : "---"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {inv.polarCheckoutId && inv.user ? (
                          <div className="flex items-center justify-end gap-2 text-[11px] font-mono text-slate-400">
                            <span>{inv.polarCheckoutId.slice(0, 8)}...</span>
                            <Button
                              size="icon"
                              variant="outline"
                              title="Open customer portal"
                              disabled={getPolarPortalLink.isPending}
                              onClick={() =>
                                getPolarPortalLink.mutate(inv.user!._id)
                              }
                            >
                              <ExternalLink size={14} />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Not processed
                          </span>
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
    </div>
  );
};

export default FinancialHistory;
