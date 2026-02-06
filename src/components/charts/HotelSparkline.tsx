"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

interface HotelSparklineProps {
  data: Array<{ checkedAt: string; avgPrice: number }>;
}

const formatter = (value: number) => `$${value.toFixed(0)}`;

export function HotelSparkline({ data }: HotelSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
        <defs>
          <linearGradient id="hotelGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1f7a8c" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#1f7a8c" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          formatter={(value: number) => formatter(Number(value))}
          labelFormatter={(label: string) =>
            new Date(label).toLocaleDateString("en", { month: "short", day: "numeric" })
          }
          contentStyle={{ borderRadius: 12, borderColor: "#d2d5da" }}
        />
        <Area
          type="monotone"
          dataKey="avgPrice"
          stroke="#1f7a8c"
          strokeWidth={2}
          fill="url(#hotelGradient)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
