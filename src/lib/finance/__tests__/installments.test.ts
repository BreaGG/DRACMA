import { describe, expect, it } from "vitest";
import {
  generateInstallmentSchedule,
  installmentsDueInMonth,
  remainingBalance,
  totalInstallmentDebt,
} from "../installments";
import type { InstallmentPlanItem } from "../types";

describe("generateInstallmentSchedule (PayPal Pay in 3)", () => {
  it("splits €900 into 3 payments of €300 one month apart", () => {
    const schedule = generateInstallmentSchedule(90_000, 3, new Date(Date.UTC(2026, 6, 15)));
    expect(schedule).toHaveLength(3);
    expect(schedule.map((p) => p.amountCents)).toEqual([30_000, 30_000, 30_000]);
    expect(schedule.map((p) => p.dueDate.toISOString().slice(0, 10))).toEqual([
      "2026-07-15",
      "2026-08-15",
      "2026-09-15",
    ]);
    expect(schedule.map((p) => p.sequence)).toEqual([1, 2, 3]);
  });

  it("absorbs rounding in the first payment so the total is exact", () => {
    const schedule = generateInstallmentSchedule(10_000, 3, new Date(Date.UTC(2026, 0, 5)));
    expect(schedule.map((p) => p.amountCents)).toEqual([3_334, 3_333, 3_333]);
    expect(schedule.reduce((s, p) => s + p.amountCents, 0)).toBe(10_000);
  });

  it("clamps due dates for short months (Jan 31 -> Feb 28)", () => {
    const schedule = generateInstallmentSchedule(30_000, 3, new Date(Date.UTC(2026, 0, 31)));
    expect(schedule.map((p) => p.dueDate.toISOString().slice(0, 10))).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("crosses year boundaries", () => {
    const schedule = generateInstallmentSchedule(30_000, 3, new Date(Date.UTC(2026, 11, 10)));
    expect(schedule.map((p) => p.dueDate.toISOString().slice(0, 10))).toEqual([
      "2026-12-10",
      "2027-01-10",
      "2027-02-10",
    ]);
  });

  it("rejects a zero installment count", () => {
    expect(() => generateInstallmentSchedule(10_000, 0, new Date())).toThrow();
  });
});

describe("remaining balance and due amounts", () => {
  const plan: InstallmentPlanItem = {
    name: "Laptop",
    totalAmountCents: 90_000,
    status: "ACTIVE",
    payments: [
      { sequence: 1, dueDate: new Date(Date.UTC(2026, 6, 15)), amountCents: 30_000, status: "PAID" },
      { sequence: 2, dueDate: new Date(Date.UTC(2026, 7, 15)), amountCents: 30_000, status: "PENDING" },
      { sequence: 3, dueDate: new Date(Date.UTC(2026, 8, 15)), amountCents: 30_000, status: "PENDING" },
    ],
  };

  it("computes remaining balance from pending payments (€300 paid -> €600 left)", () => {
    expect(remainingBalance(plan)).toBe(60_000);
  });

  it("finds payments due in a month", () => {
    const due = installmentsDueInMonth([plan], { year: 2026, month: 8 });
    expect(due.totalCents).toBe(30_000);
    expect(due.payments[0].planName).toBe("Laptop");
  });

  it("ignores non-active plans in totals", () => {
    const cancelled = { ...plan, status: "CANCELLED" as const };
    expect(totalInstallmentDebt([plan, cancelled])).toBe(60_000);
  });
});
