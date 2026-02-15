"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { TooltipProps } from "recharts";

interface HotelSparklineProps {
  data: Array<{ checkedAt: string; avgPrice: number }>;
  currencyCode?: string;
}

const formatCurrency = (value: number, currencyCode: string) => {
  const formatted = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
  return `${formatted} ${currencyCode}`;
};

const buildTooltipFormatter = (currencyCode: string): TooltipProps<number, string>["formatter"] =>
  (value) => formatCurrency(Number(value ?? 0), currencyCode);

const formatTooltipDate = (value?: string) => {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleDateString("en", { month: "short", day: "numeric" });
};

const tooltipLabelFormatter: TooltipProps<number, string>["labelFormatter"] = (_label, payload) => {
  const row = payload?.[0]?.payload as { checkedAt?: string } | undefined;
  return formatTooltipDate(row?.checkedAt);
};

export function HotelSparkline({ data, currencyCode = "CAD" }: HotelSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
        <defs>
          <linearGradient id="hotelGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-line)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--chart-line)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          formatter={buildTooltipFormatter(currencyCode)}
          labelFormatter={tooltipLabelFormatter}
          contentStyle={{
            borderRadius: 12,
            borderColor: "var(--card-border)",
            backgroundColor: "var(--card)",
            color: "var(--foreground)",
            boxShadow: "var(--shadow-soft)",
          }}
        />
        <XAxis dataKey="checkedAt" hide />
        <Area
          type="monotone"
          dataKey="avgPrice"
          stroke="var(--chart-line)"
          strokeWidth={2}
          fill="url(#hotelGradient)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
