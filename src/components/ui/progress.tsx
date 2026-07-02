import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  tone?: "accent" | "savings" | "positive";
}

/** Meter: filled track carries the value; the unfilled track is a lighter step of the same hue. */
export function Progress({ value, tone = "accent", className, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    tone === "savings"
      ? "var(--chart-savings)"
      : tone === "positive"
        ? "var(--positive)"
        : "var(--accent)";
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full", className)}
      style={{ backgroundColor: `color-mix(in oklab, ${color} 18%, var(--surface))` }}
      {...props}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
