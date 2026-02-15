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
  currencyCode?: string;
}

const formatLabel = (value: string) =>
  new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });

const formatCurrency = (value: number, currencyCode: string) => {
  const formatted = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
  return `${formatted} ${currencyCode}`;
};

export function FlightTrendChart({ data, currencyCode = "CAD" }: FlightTrendChartProps) {
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
          tickFormatter={(value: number) => formatCurrency(Number(value ?? 0), currencyCode)}
          tickLine={false}
          width={96}
        />
        <Tooltip
          formatter={(value: number | undefined) =>
            formatCurrency(Number(value ?? 0), currencyCode)
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
