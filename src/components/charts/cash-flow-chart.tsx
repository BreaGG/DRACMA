"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_PROPS, ChartLegend, ChartTooltip, euroTick, GRID_PROPS } from "./chart-bits";

export interface CashFlowPoint {
  label: string;
  income: number; // cents
  expenses: number; // cents (all outflows)
}

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={2}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={euroTick} width={52} />
          <Tooltip content={ChartTooltip} cursor={{ fill: "var(--ghost)" }} />
          <Bar
            dataKey="income"
            name="Income"
            fill="var(--chart-income)"
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="var(--chart-expense)"
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { label: "Income", color: "var(--chart-income)", mark: "rect" },
          { label: "Expenses", color: "var(--chart-expense)", mark: "rect" },
        ]}
      />
    </div>
  );
}
