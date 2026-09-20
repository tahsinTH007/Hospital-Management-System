import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getBillingStats } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function RevenueChart() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["billing-stats"],
    queryFn: () => getBillingStats(),
  });

  const chartData = useMemo(
    () =>
      MONTHS.map((name, index) => ({
        name,
        total: (data?.monthlyRevenue[index]?.amount ?? 0) / 100,
      })),
    [data],
  );

  if (isLoading)
    return (
      <div className="h-75 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (isError)
    return (
      <div className="h-75 flex items-center justify-center text-destructive">
        Error loading chart
      </div>
    );

  const hasRevenue = chartData.some((d) => d.total > 0);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Paid invoices per month · {data?.year} ·{" "}
        <span className="font-semibold text-foreground">
          {formatMoney(data?.paid.amount)} collected
        </span>
      </p>
      <div className="h-75 w-full">
        {!hasRevenue ? (
          <div className="h-full flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            No paid invoices in {data?.year} yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="name"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)" }}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)" }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                labelStyle={{ color: "var(--popover-foreground)" }}
                formatter={(value) => [
                  `$${Number(value ?? 0).toFixed(2)}`,
                  "Revenue",
                ]}
              />
              <Bar
                dataKey="total"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
