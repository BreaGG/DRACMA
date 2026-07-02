"use client";

import * as React from "react";
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
  fixed: number; // cents — fixed expenses
  variable: number; // cents — variable spending estimate
  debt: number; // cents — debt/loan payments + installments
}

interface SegmentShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: Record<string, unknown>;
}

/**
 * Stacked-bar segment with the dataviz spacers: a 2px surface gap below the
 * segment above it, and a 4px rounded data-end on the topmost non-zero
 * segment (square at the baseline).
 */
function makeStackSegment(keysAbove: string[]) {
  return function StackSegment({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill,
    payload,
  }: SegmentShapeProps) {
    if (height <= 0 || width <= 0) return <g />;
    const hasSegmentAbove = keysAbove.some((key) => Number(payload?.[key] ?? 0) > 0);
    if (hasSegmentAbove) {
      const gap = Math.min(2, height);
      return <rect x={x} y={y + gap} width={width} height={height - gap} fill={fill} />;
    }
    const r = Math.min(4, width / 2, height);
    const d = [
      `M${x},${y + height}`,
      `L${x},${y + r}`,
      `Q${x},${y} ${x + r},${y}`,
      `L${x + width - r},${y}`,
      `Q${x + width},${y} ${x + width},${y + r}`,
      `L${x + width},${y + height}`,
      "Z",
    ].join(" ");
    return <path d={d} fill={fill} />;
  };
}

const FixedSegment = makeStackSegment(["variable", "debt"]);
const VariableSegment = makeStackSegment(["debt"]);
const DebtSegment = makeStackSegment([]);

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={2}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={euroTick} width={52} />
          <Tooltip content={ChartTooltip} cursor={{ fill: "var(--ghost)" }} />
          {/* Own stackId so Recharts orders this slot before the outflow stack. */}
          <Bar
            dataKey="income"
            name="Income"
            stackId="in"
            fill="var(--chart-income)"
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="fixed"
            name="Fixed expenses"
            stackId="out"
            fill="var(--chart-expense)"
            maxBarSize={24}
            shape={FixedSegment}
          />
          <Bar
            dataKey="variable"
            name="Variable expenses"
            stackId="out"
            fill="var(--chart-expense-variable)"
            maxBarSize={24}
            shape={VariableSegment}
          />
          <Bar
            dataKey="debt"
            name="Debts & loans"
            stackId="out"
            fill="var(--chart-debt)"
            maxBarSize={24}
            shape={DebtSegment}
          />
        </BarChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { label: "Income", color: "var(--chart-income)", mark: "rect" },
          { label: "Fixed expenses", color: "var(--chart-expense)", mark: "rect" },
          { label: "Variable expenses", color: "var(--chart-expense-variable)", mark: "rect" },
          { label: "Debts & loans", color: "var(--chart-debt)", mark: "rect" },
        ]}
      />
    </div>
  );
}
