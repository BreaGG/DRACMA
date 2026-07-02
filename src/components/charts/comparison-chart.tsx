"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_PROPS, ChartLegend, ChartTooltip, euroTick, GRID_PROPS } from "./chart-bits";

export interface ComparisonPoint {
  label: string;
  base: number; // cents
  scenario: number; // cents
}

/**
 * Emphasis form: the scenario is the story (accent), the current path is
 * context (de-emphasis gray).
 */
export function ComparisonChart({
  data,
  height = 260,
}: {
  data: ComparisonPoint[];
  height?: number;
}) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={euroTick} width={52} />
          <Tooltip
            content={ChartTooltip}
            cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="base"
            name="Current path"
            stroke="var(--muted-foreground)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
          />
          <Line
            type="monotone"
            dataKey="scenario"
            name="Scenario"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
          />
        </LineChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { label: "Current path", color: "var(--muted-foreground)", mark: "line" },
          { label: "Scenario", color: "var(--accent)", mark: "line" },
        ]}
      />
    </div>
  );
}
