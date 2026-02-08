"use client";

import { useEffect, useState, type ReactNode } from "react";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[360px]" />;
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <CartesianGrid stroke="rgba(15,65,81,0.08)" strokeDasharray="3 3" />
        <XAxis
          dataKey="checkedAt"
          tickFormatter={formatLabel}
          stroke="#8795a1"
          fontSize={12}
          tickLine={false}
        />
        <YAxis
          domain={["auto", "auto"]}
          stroke="#8795a1"
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
          contentStyle={{ borderRadius: 16, borderColor: "#d2d5da" }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#1f7a8c"
          strokeWidth={3}
          dot={{ r: 3, strokeWidth: 1, stroke: "#1f7a8c" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
