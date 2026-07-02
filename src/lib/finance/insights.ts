import type { Insight, MonthRef, ProjectionInput, ProjectionResult } from "./types";
import { monthLabel } from "./dates";
import { formatCents } from "./money";
import { normalizedMonthlyAmount, remainingInMonth } from "./recurrence";
import { eventsForMonth } from "./calendar";
import { disposableIncomeForMonth } from "./projection";

/**
 * Generate plain-language insights from the current state and projection.
 * Pure and deterministic given (input, projection, today).
 */
export function generateInsights(
  input: ProjectionInput,
  projection: ProjectionResult,
  today: Date,
  currency: string = "EUR"
): Insight[] {
  const insights: Insight[] = [];
  const fmt = (cents: number) => formatCents(cents, currency);
  const current = projection.months[0];
  if (!current) return insights;
  const ref: MonthRef = { year: current.year, month: current.month };

  // Fixed expenses remaining this month.
  const fixedLeft = remainingInMonth(
    input.expenses.filter((e) => e.kind === "FIXED"),
    ref,
    today
  );
  if (fixedLeft > 0) {
    insights.push({
      severity: "info",
      message: `You still have ${fmt(fixedLeft)} of fixed expenses left this month.`,
    });
  }

  // Next large upcoming payment.
  const upcoming = eventsForMonth(input, ref)
    .filter((e) => e.kind !== "income" && e.date.getTime() > today.getTime())
    .sort((a, b) => b.amountCents - a.amountCents);
  if (upcoming.length > 0) {
    const biggest = upcoming[0];
    insights.push({
      severity: "info",
      message: `Your next large payment is ${biggest.name} (${fmt(biggest.amountCents)}) on day ${biggest.date.getUTCDate()}.`,
    });
  }

  // Debt decrease this month.
  const principalThisMonth = current.debtDetails.reduce((s, d) => s + d.principalCents, 0);
  if (principalThisMonth > 0) {
    insights.push({
      severity: "positive",
      message: `Your debt will decrease by ${fmt(principalThisMonth)} this month.`,
    });
  }

  // Projected negative balance.
  if (projection.firstNegativeMonth) {
    const m = projection.months.find((x) => x.key === projection.firstNegativeMonth);
    if (m) {
      insights.push({
        severity: "warning",
        message: `Your projected balance goes negative in ${monthLabel({ year: m.year, month: m.month })} (${fmt(m.endingBalanceCents)}).`,
      });
    }
  }

  // Savings headroom.
  const disposable = disposableIncomeForMonth(current);
  const headroom = disposable - current.variableExpensesCents;
  if (headroom > 5000) {
    insights.push({
      severity: "positive",
      message: `Based on your forecast you could save up to ${fmt(headroom)} more this month.`,
    });
  } else if (headroom < 0) {
    insights.push({
      severity: "warning",
      message: `Your estimated variable spending exceeds your disposable income by ${fmt(-headroom)} this month.`,
    });
  }

  // Installment plans affecting future months.
  for (const plan of input.installmentPlans) {
    if (plan.status !== "ACTIVE") continue;
    const pending = plan.payments.filter((p) => p.status === "PENDING");
    const futureMonths = new Set(
      pending
        .filter((p) => p.dueDate.getTime() > today.getTime())
        .map((p) => `${p.dueDate.getUTCFullYear()}-${p.dueDate.getUTCMonth() + 1}`)
    );
    if (futureMonths.size > 0) {
      insights.push({
        severity: "info",
        message: `"${plan.name}" still affects your next ${futureMonths.size} month${futureMonths.size > 1 ? "s" : ""} (${fmt(pending.reduce((s, p) => s + p.amountCents, 0))} pending).`,
      });
    }
  }

  // Fixed expenses as share of income.
  const monthlyIncome = input.incomes.reduce((s, i) => s + normalizedMonthlyAmount(i), 0);
  const monthlyFixed = input.expenses
    .filter((e) => e.kind === "FIXED")
    .reduce((s, e) => s + normalizedMonthlyAmount(e), 0);
  if (monthlyIncome > 0 && monthlyFixed > 0) {
    const pct = Math.round((monthlyFixed / monthlyIncome) * 100);
    insights.push({
      severity: pct > 50 ? "warning" : "info",
      message: `Your fixed expenses represent ${pct}% of your income.`,
    });
  }

  // Debt payoff milestones within the horizon.
  for (const [debtName, key] of Object.entries(projection.debtPayoffMonth)) {
    const m = projection.months.find((x) => x.key === key);
    if (m) {
      insights.push({
        severity: "positive",
        message: `"${debtName}" will be fully paid off in ${monthLabel({ year: m.year, month: m.month })}.`,
      });
    }
  }

  // Net worth trend across the horizon.
  const last = projection.months[projection.months.length - 1];
  if (projection.months.length > 1 && last) {
    const delta = last.netWorthCents - current.netWorthCents;
    if (delta > 0) {
      insights.push({
        severity: "positive",
        message: `If you continue like this, your net worth grows by ${fmt(delta)} over the next ${projection.months.length} months.`,
      });
    } else if (delta < 0) {
      insights.push({
        severity: "warning",
        message: `On the current path your net worth drops by ${fmt(-delta)} over the next ${projection.months.length} months.`,
      });
    }
  }

  const order = { warning: 0, positive: 1, info: 2 } as const;
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}
