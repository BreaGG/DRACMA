import type { CalendarEvent, MonthRef, ProjectionInput } from "./types";
import { compareMonthRef, dateAtClampedDay, monthRefOf } from "./dates";
import { occurrencesInMonth } from "./recurrence";
import { pendingPayments } from "./installments";

/** Expand every expected money movement of a month into calendar events. */
export function eventsForMonth(input: ProjectionInput, ref: MonthRef): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const income of input.incomes) {
    for (const date of occurrencesInMonth(income, ref)) {
      events.push({ date, name: income.name, amountCents: income.amountCents, kind: "income" });
    }
  }

  for (const expense of input.expenses) {
    for (const date of occurrencesInMonth(expense, ref)) {
      events.push({
        date,
        name: expense.name,
        amountCents: expense.amountCents,
        kind: expense.kind === "FIXED" ? "fixed-expense" : "variable-expense",
      });
    }
  }

  for (const debt of input.debts) {
    if (debt.status !== "ACTIVE" || debt.balanceCents <= 0) continue;
    events.push({
      date: dateAtClampedDay(ref.year, ref.month, debt.paymentDay),
      name: debt.name,
      amountCents: Math.min(debt.monthlyPaymentCents, debt.balanceCents),
      kind: "debt-payment",
    });
  }

  for (const plan of input.installmentPlans) {
    if (plan.status !== "ACTIVE") continue;
    for (const payment of pendingPayments(plan)) {
      if (compareMonthRef(monthRefOf(payment.dueDate), ref) === 0) {
        events.push({
          date: payment.dueDate,
          name: `${plan.name} (${payment.sequence}/${plan.payments.length})`,
          amountCents: payment.amountCents,
          kind: "installment",
        });
      }
    }
  }

  for (const goal of input.savingsGoals) {
    if (goal.status !== "ACTIVE" || goal.monthlyContributionCents <= 0) continue;
    if (goal.currentCents >= goal.targetCents) continue;
    events.push({
      date: dateAtClampedDay(ref.year, ref.month, 1),
      name: `Savings: ${goal.name}`,
      amountCents: Math.min(goal.monthlyContributionCents, goal.targetCents - goal.currentCents),
      kind: "savings-contribution",
    });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}
