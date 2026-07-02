import type { InstallmentPaymentItem, InstallmentPlanItem, MonthRef } from "./types";
import { compareMonthRef, dateAtClampedDay, monthRefOf } from "./dates";

/**
 * Generate an installment schedule (e.g. PayPal Pay in 3).
 *
 * Splits `totalAmountCents` into `count` payments one month apart starting at
 * `firstPaymentDate`. Rounding differences are absorbed by the first payment
 * so the schedule always sums exactly to the total (PayPal-style).
 */
export function generateInstallmentSchedule(
  totalAmountCents: number,
  count: number,
  firstPaymentDate: Date
): InstallmentPaymentItem[] {
  if (count < 1) throw new Error("Installment count must be >= 1");
  const base = Math.floor(totalAmountCents / count);
  const remainder = totalAmountCents - base * count;
  const firstRef = monthRefOf(firstPaymentDate);
  const day = firstPaymentDate.getUTCDate();

  return Array.from({ length: count }, (_, i) => {
    const zero = firstRef.year * 12 + (firstRef.month - 1) + i;
    const year = Math.floor(zero / 12);
    const month = (zero % 12) + 1;
    return {
      sequence: i + 1,
      dueDate: dateAtClampedDay(year, month, day),
      amountCents: i === 0 ? base + remainder : base,
      status: "PENDING" as const,
    };
  });
}

export function pendingPayments(plan: InstallmentPlanItem): InstallmentPaymentItem[] {
  return plan.payments.filter((p) => p.status === "PENDING");
}

export function remainingBalance(plan: InstallmentPlanItem): number {
  return pendingPayments(plan).reduce((sum, p) => sum + p.amountCents, 0);
}

/** Sum of pending installment payments due in a given month across plans. */
export function installmentsDueInMonth(
  plans: InstallmentPlanItem[],
  ref: MonthRef
): { totalCents: number; payments: { planName: string; payment: InstallmentPaymentItem }[] } {
  const payments: { planName: string; payment: InstallmentPaymentItem }[] = [];
  for (const plan of plans) {
    if (plan.status !== "ACTIVE") continue;
    for (const payment of pendingPayments(plan)) {
      if (compareMonthRef(monthRefOf(payment.dueDate), ref) === 0) {
        payments.push({ planName: plan.name, payment });
      }
    }
  }
  return {
    totalCents: payments.reduce((sum, p) => sum + p.payment.amountCents, 0),
    payments,
  };
}

/** Total remaining installment debt across active plans. */
export function totalInstallmentDebt(plans: InstallmentPlanItem[]): number {
  return plans
    .filter((p) => p.status === "ACTIVE")
    .reduce((sum, plan) => sum + remainingBalance(plan), 0);
}
