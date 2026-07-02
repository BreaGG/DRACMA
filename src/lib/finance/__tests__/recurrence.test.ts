import { describe, expect, it } from "vitest";
import {
  amountInMonth,
  normalizedMonthlyAmount,
  occurrencesInMonth,
  remainingInMonth,
  totalInMonth,
} from "../recurrence";
import type { RecurringItem } from "../types";

const monthly = (over?: Partial<RecurringItem>): RecurringItem => ({
  name: "Salary",
  amountCents: 200_000,
  frequency: "MONTHLY",
  paymentDay: 28,
  startDate: new Date(Date.UTC(2025, 0, 1)),
  ...over,
});

describe("monthly recurrence", () => {
  it("occurs once a month on the payment day", () => {
    const dates = occurrencesInMonth(monthly(), { year: 2026, month: 7 });
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual(["2026-07-28"]);
    expect(amountInMonth(monthly(), { year: 2026, month: 7 })).toBe(200_000);
  });

  it("clamps day 31 in shorter months", () => {
    const item = monthly({ paymentDay: 31 });
    const feb = occurrencesInMonth(item, { year: 2026, month: 2 });
    expect(feb[0].toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("does not occur before startDate or after endDate", () => {
    const item = monthly({
      startDate: new Date(Date.UTC(2026, 2, 1)),
      endDate: new Date(Date.UTC(2026, 5, 30)),
    });
    expect(amountInMonth(item, { year: 2026, month: 2 })).toBe(0);
    expect(amountInMonth(item, { year: 2026, month: 3 })).toBe(200_000);
    expect(amountInMonth(item, { year: 2026, month: 6 })).toBe(200_000);
    expect(amountInMonth(item, { year: 2026, month: 7 })).toBe(0);
  });

  it("respects a mid-month startDate in the same month", () => {
    const item = monthly({ paymentDay: 5, startDate: new Date(Date.UTC(2026, 6, 10)) });
    expect(amountInMonth(item, { year: 2026, month: 7 })).toBe(0);
    expect(amountInMonth(item, { year: 2026, month: 8 })).toBe(200_000);
  });
});

describe("weekly recurrence", () => {
  it("expands to actual weekly occurrences anchored at startDate", () => {
    const item: RecurringItem = {
      name: "Weekly groceries",
      amountCents: 5_000,
      frequency: "WEEKLY",
      paymentDay: 1,
      startDate: new Date(Date.UTC(2026, 6, 6)), // Monday 6 July 2026
    };
    const july = occurrencesInMonth(item, { year: 2026, month: 7 });
    expect(july.map((d) => d.getUTCDate())).toEqual([6, 13, 20, 27]);
    // August 2026 has 5 Mondays anchored on the same cadence: 3,10,17,24,31
    const august = occurrencesInMonth(item, { year: 2026, month: 8 });
    expect(august).toHaveLength(5);
    expect(amountInMonth(item, { year: 2026, month: 8 })).toBe(25_000);
  });
});

describe("yearly and one-time recurrence", () => {
  it("yearly occurs only in the anniversary month", () => {
    const item: RecurringItem = {
      name: "Insurance",
      amountCents: 40_000,
      frequency: "YEARLY",
      paymentDay: 10,
      startDate: new Date(Date.UTC(2025, 8, 10)), // September
    };
    expect(amountInMonth(item, { year: 2026, month: 9 })).toBe(40_000);
    expect(amountInMonth(item, { year: 2026, month: 8 })).toBe(0);
  });

  it("one-time occurs exactly once", () => {
    const item: RecurringItem = {
      name: "Tax refund",
      amountCents: 35_000,
      frequency: "ONE_TIME",
      paymentDay: 1,
      startDate: new Date(Date.UTC(2026, 7, 20)),
    };
    expect(amountInMonth(item, { year: 2026, month: 8 })).toBe(35_000);
    expect(amountInMonth(item, { year: 2026, month: 9 })).toBe(0);
  });
});

describe("aggregation helpers", () => {
  it("totals multiple items for a month", () => {
    const items = [monthly(), monthly({ name: "Side gig", amountCents: 30_000, paymentDay: 15 })];
    expect(totalInMonth(items, { year: 2026, month: 7 })).toBe(230_000);
  });

  it("computes remaining amounts after a given date", () => {
    const items = [
      monthly({ name: "Rent", amountCents: 85_000, paymentDay: 1 }),
      monthly({ name: "Gym", amountCents: 4_500, paymentDay: 20 }),
    ];
    const left = remainingInMonth(items, { year: 2026, month: 7 }, new Date(Date.UTC(2026, 6, 10)));
    expect(left).toBe(4_500); // rent already paid on the 1st
  });

  it("normalizes weekly and yearly to monthly averages", () => {
    expect(normalizedMonthlyAmount(monthly())).toBe(200_000);
    expect(
      normalizedMonthlyAmount({ ...monthly(), frequency: "WEEKLY", amountCents: 1_200 })
    ).toBe(5_200);
    expect(
      normalizedMonthlyAmount({ ...monthly(), frequency: "YEARLY", amountCents: 12_000 })
    ).toBe(1_000);
    expect(normalizedMonthlyAmount({ ...monthly(), frequency: "ONE_TIME" })).toBe(0);
  });
});
