"use client";

import { type ReactNode } from "react";
import { useClientReady } from "@/hooks/useClientReady";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface FlightTrendChartProps {
  data: Array<{
    checkedAt: string;
    price: number;
  }>;
}

const formatLabel = (value: string) =>
  new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });

const currencyFormatter = (value: number) => `$${value.toFixed(0)}`;

export function FlightTrendChart({ data }: FlightTrendChartProps) {
  const mounted = useClientReady();

  if (!mounted) {
    return <div className="h-[360px]" />;
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis
          dataKey="checkedAt"
          tickFormatter={formatLabel}
          stroke="var(--muted)"
          fontSize={12}
          tickLine={false}
        />
        <YAxis
          domain={["auto", "auto"]}
          stroke="var(--muted)"
          fontSize={12}
          tickFormatter={currencyFormatter}
          tickLine={false}
          width={60}
        />
        <Tooltip
          formatter={(value: number | undefined) =>
            currencyFormatter(Number(value ?? 0))
          }

          labelFormatter={(label: ReactNode) =>
            typeof label === "string" ? `Checked ${formatLabel(label)}` : ""
          }
          contentStyle={{
            borderRadius: 16,
            borderColor: "var(--card-border)",
            backgroundColor: "var(--card)",
            color: "var(--foreground)",
            boxShadow: "var(--shadow-soft)",
          }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="var(--chart-line)"
          strokeWidth={3}
          dot={{ r: 3, strokeWidth: 1, stroke: "var(--chart-line)" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
