"use client";

import * as React from "react";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatCents, formatCentsCompact } from "@/lib/finance/money";

/** Shared axis/grid styling per the dataviz spec: hairline, recessive. */
export const AXIS_PROPS = {
  stroke: "var(--baseline)",
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  tickLine: false as const,
  axisLine: { stroke: "var(--baseline)", strokeWidth: 1 },
};

export const GRID_PROPS = {
  stroke: "var(--grid)",
  strokeWidth: 1,
  vertical: false,
};

export function euroTick(cents: number): string {
  return formatCentsCompact(cents);
}

/**
 * Custom tooltip: value leads (strong), label follows; series keyed with a
 * short line of its color. React escapes all strings (no innerHTML).
 */
export function ChartTooltip({
  active,
  payload,
  label,
}: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-md">
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-0.5 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-semibold tabular-nums">
              {formatCents(Number(entry.value ?? 0))}
            </span>
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Legend: swatch mirrors the mark (rect for bars/areas, line for lines). */
export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; mark: "rect" | "line" }[];
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs text-secondary-foreground">
          {item.mark === "rect" ? (
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: item.color }} />
          ) : (
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: item.color }} />
          )}
          {item.label}
        </div>
      ))}
    </div>
  );
}
