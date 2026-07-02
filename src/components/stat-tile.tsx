import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/finance/money";

/**
 * Stat tile: label + value (+ optional delta vs a named period, colored by
 * direction x whether up is good) + optional hint line.
 */
export function StatTile({
  label,
  valueCents,
  hint,
  deltaCents,
  deltaLabel,
  upIsGood = true,
  tone,
  className,
}: {
  label: string;
  valueCents: number;
  hint?: string;
  deltaCents?: number;
  deltaLabel?: string;
  upIsGood?: boolean;
  /** Force the value color (e.g. negative balance shown in negative tone). */
  tone?: "default" | "positive" | "negative";
  className?: string;
}) {
  const valueTone =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : "text-foreground";

  let deltaEl = null;
  if (deltaCents !== undefined && deltaCents !== 0) {
    const good = deltaCents > 0 === upIsGood;
    deltaEl = (
      <span className={cn("text-xs font-medium", good ? "text-positive" : "text-negative")}>
        {deltaCents > 0 ? "+" : "−"}
        {formatCents(Math.abs(deltaCents))}
        {deltaLabel ? <span className="ml-1 font-normal text-muted-foreground">{deltaLabel}</span> : null}
      </span>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-surface p-5", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 text-2xl font-semibold tracking-tight", valueTone)}>
        {formatCents(valueCents)}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        {deltaEl}
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}
