"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_PROPS, ChartTooltip, euroTick, GRID_PROPS } from "./chart-bits";

export interface TrendPoint {
  label: string;
  value: number; // cents
}

/**
 * Single-series trend (debt evolution, savings evolution, net worth).
 * Area wash at 10% opacity, 2px line, end markers with a surface ring.
 * Single series -> no legend box; the card title names it.
 */
export function TrendChart({
  data,
  name,
  color,
  height = 220,
}: {
  data: TrendPoint[];
  name: string;
  color: string; // CSS var reference, e.g. "var(--chart-debt)"
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="label" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} tickFormatter={euroTick} width={52} />
        <Tooltip
          content={ChartTooltip}
          cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          name={name}
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={0.1}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)", fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
