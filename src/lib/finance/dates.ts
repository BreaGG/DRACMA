import type { MonthRef } from "./types";

/** Number of days in a month (month is 1-12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Build a UTC date clamping the day to the month length (e.g. day 31 in February -> 28/29). */
export function dateAtClampedDay(year: number, month: number, day: number): Date {
  const clamped = Math.min(Math.max(1, day), daysInMonth(year, month));
  return new Date(Date.UTC(year, month - 1, clamped));
}

export function monthKey({ year, month }: MonthRef): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function addMonths(ref: MonthRef, count: number): MonthRef {
  const zeroBased = ref.year * 12 + (ref.month - 1) + count;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

export function monthRefOf(date: Date): MonthRef {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function compareMonthRef(a: MonthRef, b: MonthRef): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function monthStart({ year, month }: MonthRef): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

export function monthEnd({ year, month }: MonthRef): Date {
  return new Date(Date.UTC(year, month - 1, daysInMonth(year, month), 23, 59, 59, 999));
}

export function monthLabel(ref: MonthRef, locale: string = "en-GB"): string {
  return monthStart(ref).toLocaleDateString(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Difference in whole months between two month refs (b - a). */
export function monthsBetween(a: MonthRef, b: MonthRef): number {
  return compareMonthRef(b, a);
}
