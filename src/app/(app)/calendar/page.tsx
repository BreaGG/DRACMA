import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUserId } from "@/auth";
import { loadFinanceData } from "@/server/finance-data";
import {
  addMonths,
  daysInMonth,
  eventsForMonth,
  formatCents,
  monthLabel,
  type CalendarEvent,
} from "@/lib/finance";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendar" };

const KIND_STYLES: Record<CalendarEvent["kind"], { dot: string; label: string }> = {
  income: { dot: "bg-chart-income", label: "Income" },
  "fixed-expense": { dot: "bg-chart-expense", label: "Fixed expense" },
  "variable-expense": { dot: "bg-chart-expense/60", label: "Variable estimate" },
  "debt-payment": { dot: "bg-chart-debt", label: "Debt payment" },
  installment: { dot: "bg-chart-debt", label: "Installment" },
  "savings-contribution": { dot: "bg-chart-savings", label: "Savings" },
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const now = new Date();
  const year = Number.parseInt(params.y ?? "", 10) || now.getUTCFullYear();
  const month = Number.parseInt(params.m ?? "", 10) || now.getUTCMonth() + 1;
  const ref = { year, month };

  const { input, currency } = await loadFinanceData(userId, ref);
  const events = eventsForMonth(input, ref);

  const byDay = new Map<number, CalendarEvent[]>();
  for (const event of events) {
    const day = event.date.getUTCDate();
    byDay.set(day, [...(byDay.get(day) ?? []), event]);
  }

  const totalDays = daysInMonth(year, month);
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0
  const prev = addMonths(ref, -1);
  const next = addMonths(ref, 1);
  const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;

  const totalOut = events
    .filter((e) => e.kind !== "income")
    .reduce((s, e) => s + e.amountCents, 0);
  const totalIn = events
    .filter((e) => e.kind === "income")
    .reduce((s, e) => s + e.amountCents, 0);

  // Days with an unusually heavy outflow get flagged.
  const dayTotals = [...byDay.entries()].map(([day, list]) => ({
    day,
    out: list.filter((e) => e.kind !== "income").reduce((s, e) => s + e.amountCents, 0),
  }));
  const heavyThreshold = Math.max(20_000, totalOut / 4);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Financial calendar"
        description={`Expected in: ${formatCents(totalIn, currency)} · out: ${formatCents(totalOut, currency)} this month`}
        action={
          <div className="flex items-center gap-1">
            <Link
              href={`/calendar?y=${prev.year}&m=${prev.month}`}
              className="rounded-md border border-border bg-surface p-2 hover:bg-ghost"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="min-w-32 px-2 text-center text-sm font-medium">
              {monthLabel(ref)}
            </span>
            <Link
              href={`/calendar?y=${next.year}&m=${next.month}`}
              className="rounded-md border border-border bg-surface p-2 hover:bg-ghost"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
        {Object.entries(KIND_STYLES).map(([kind, style]) => (
          <div key={kind} className="flex items-center gap-1.5 text-xs text-secondary-foreground">
            <span className={cn("h-2 w-2 rounded-full", style.dot)} />
            {style.label}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-7 border-b border-border">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-24 border-b border-r border-border bg-ghost/50" />
          ))}
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
            const dayEvents = byDay.get(day) ?? [];
            const isToday = isCurrentMonth && day === now.getUTCDate();
            const dayOut = dayTotals.find((d) => d.day === day)?.out ?? 0;
            const heavy = dayOut >= heavyThreshold && dayOut > 0;
            return (
              <div
                key={day}
                className={cn(
                  "min-h-24 border-b border-r border-border p-1.5 [&:nth-child(7n)]:border-r-0",
                  heavy && "bg-negative/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday ? "bg-accent font-semibold text-accent-foreground" : "text-secondary-foreground"
                    )}
                  >
                    {day}
                  </span>
                  {heavy ? (
                    <span className="text-[10px] font-medium text-negative">heavy</span>
                  ) : null}
                </div>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-1 truncate text-[11px] leading-4"
                      title={`${event.name}: ${formatCents(event.amountCents, currency)}`}
                    >
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", KIND_STYLES[event.kind].dot)} />
                      <span className="truncate text-secondary-foreground">{event.name}</span>
                      <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                        {formatCents(event.amountCents, currency).replace(/,00\s?€/, "€")}
                      </span>
                    </li>
                  ))}
                  {dayEvents.length > 3 ? (
                    <li className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* List view (table twin of the grid) */}
      <div className="mt-6 rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-secondary-foreground">
          All movements in {monthLabel(ref)}
        </div>
        <ul className="divide-y divide-border px-5">
          {events.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              Nothing expected this month.
            </li>
          ) : (
            events.map((event, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-12 text-xs tabular-nums text-muted-foreground">
                    {event.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })}
                  </span>
                  <span className={cn("h-2 w-2 rounded-full", KIND_STYLES[event.kind].dot)} />
                  <span>{event.name}</span>
                </div>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    event.kind === "income" ? "text-positive" : "text-foreground"
                  )}
                >
                  {event.kind === "income" ? "+" : "−"}
                  {formatCents(event.amountCents, currency)}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
