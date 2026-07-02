import type { MonthRef, RecurringItem } from "./types";
import { dateAtClampedDay, monthEnd, monthStart } from "./dates";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Dates on which a recurring item occurs within a given month.
 *
 * Rules (deterministic):
 * - MONTHLY: once, on paymentDay (clamped to month length), if within [startDate, endDate].
 * - WEEKLY:  every 7 days anchored at startDate; all occurrences inside the month.
 * - YEARLY:  once a year in startDate's month, on paymentDay.
 * - ONE_TIME: exactly on startDate.
 */
export function occurrencesInMonth(item: RecurringItem, ref: MonthRef): Date[] {
  const start = monthStart(ref);
  const end = monthEnd(ref);
  const from = item.startDate;
  const until = item.endDate ?? null;

  const within = (d: Date) =>
    d.getTime() >= start.getTime() &&
    d.getTime() <= end.getTime() &&
    d.getTime() >= atMidnightUTC(from).getTime() &&
    (until === null || d.getTime() <= monthEndOf(until).getTime());

  switch (item.frequency) {
    case "ONE_TIME": {
      const d = atMidnightUTC(from);
      return d.getTime() >= start.getTime() && d.getTime() <= end.getTime() ? [d] : [];
    }
    case "MONTHLY": {
      const d = dateAtClampedDay(ref.year, ref.month, item.paymentDay);
      return within(d) ? [d] : [];
    }
    case "YEARLY": {
      if (from.getUTCMonth() + 1 !== ref.month) return [];
      const d = dateAtClampedDay(ref.year, ref.month, item.paymentDay || from.getUTCDate());
      return within(d) ? [d] : [];
    }
    case "WEEKLY": {
      const anchor = atMidnightUTC(from);
      // Jump close to the month start instead of iterating week by week from anchor.
      const weeksToStart = Math.max(
        0,
        Math.floor((start.getTime() - anchor.getTime()) / (7 * DAY_MS))
      );
      const out: Date[] = [];
      let t = anchor.getTime() + weeksToStart * 7 * DAY_MS;
      while (t <= end.getTime()) {
        const d = new Date(t);
        if (within(d)) out.push(d);
        t += 7 * DAY_MS;
      }
      return out;
    }
  }
}

/** Total cents an item produces within a month. */
export function amountInMonth(item: RecurringItem, ref: MonthRef): number {
  return occurrencesInMonth(item, ref).length * item.amountCents;
}

/** Total cents for a list of items within a month. */
export function totalInMonth(items: RecurringItem[], ref: MonthRef): number {
  return items.reduce((sum, item) => sum + amountInMonth(item, ref), 0);
}

/**
 * Total cents still due within the month strictly after `fromDate`
 * (used for "you have €X of fixed expenses left this month").
 */
export function remainingInMonth(
  items: RecurringItem[],
  ref: MonthRef,
  fromDate: Date
): number {
  const cutoff = atMidnightUTC(fromDate).getTime();
  return items.reduce(
    (sum, item) =>
      sum +
      occurrencesInMonth(item, ref)
        .filter((d) => d.getTime() > cutoff)
        .reduce((s) => s + item.amountCents, 0),
    0
  );
}

/** Normalized average monthly amount (for ratios, e.g. fixed expenses vs income). */
export function normalizedMonthlyAmount(item: RecurringItem): number {
  switch (item.frequency) {
    case "MONTHLY":
      return item.amountCents;
    case "WEEKLY":
      return Math.round((item.amountCents * 52) / 12);
    case "YEARLY":
      return Math.round(item.amountCents / 12);
    case "ONE_TIME":
      return 0;
  }
}

function atMidnightUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function monthEndOf(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}
