import type {
  DebtMonthDetail,
  MonthProjection,
  ProjectionInput,
  ProjectionResult,
} from "./types";
import { addMonths, monthKey } from "./dates";
import { totalInMonth } from "./recurrence";
import { amortizeOneMonth } from "./loans";
import { installmentsDueInMonth } from "./installments";

/**
 * Project the user's finances month by month.
 *
 * Assumptions (documented in the README):
 * - Recurring income/expenses expand to their actual occurrences per calendar month.
 * - VARIABLE expenses are flat monthly estimates.
 * - Debts amortize with monthly interest = balance * annualRate / 12; interest is
 *   paid first, the remainder reduces principal; the last payment is capped.
 * - PAUSED debts keep their balance but receive no payments.
 * - Pending installment payments (Pay in 3 / BNPL) hit cash in their due month.
 * - Savings contributions move money from cash to savings (net worth neutral)
 *   and stop when a goal reaches its target.
 * - Ending cash = starting cash + income - expenses - debt payments
 *   - installments - savings contributions.
 * - Net worth = cash + savings + other assets - total debt.
 */
export function projectMonths(input: ProjectionInput, monthCount: number): ProjectionResult {
  const months: MonthProjection[] = [];
  const debtPayoffMonth: Record<string, string> = {};
  const goalCompletionMonth: Record<string, string> = {};
  let firstNegativeMonth: string | null = null;

  let cash = input.startingCashCents;
  let savings = input.startingSavingsCents;

  // Mutable copies of evolving state.
  const debts = input.debts.map((d) => ({ ...d }));
  const goals = input.savingsGoals.map((g) => ({ ...g }));

  for (let i = 0; i < monthCount; i++) {
    const ref = addMonths(input.startMonth, i);
    const key = monthKey(ref);
    const startingBalance = cash;

    const income = totalInMonth(input.incomes, ref);
    const fixedExpenses = totalInMonth(
      input.expenses.filter((e) => e.kind === "FIXED"),
      ref
    );
    const variableExpenses = totalInMonth(
      input.expenses.filter((e) => e.kind === "VARIABLE"),
      ref
    );

    // --- Debts (loans, cards...) ---
    const debtDetails: DebtMonthDetail[] = [];
    let debtPayments = 0;
    for (const debt of debts) {
      if (debt.status === "PAID" || debt.balanceCents <= 0) continue;
      if (debt.status === "PAUSED") {
        debtDetails.push({
          name: debt.name,
          paymentCents: 0,
          interestCents: 0,
          principalCents: 0,
          endingBalanceCents: debt.balanceCents,
        });
        continue;
      }
      const step = amortizeOneMonth(
        debt.balanceCents,
        debt.interestRateBps,
        debt.monthlyPaymentCents
      );
      debt.balanceCents = step.endingBalanceCents;
      debtPayments += step.paymentCents;
      debtDetails.push({ name: debt.name, ...step });
      if (step.endingBalanceCents <= 0 && !(debt.name in debtPayoffMonth)) {
        debtPayoffMonth[debt.name] = key;
        debt.status = "PAID";
      }
    }

    // --- Installment plans (Pay in 3, BNPL) ---
    const installments = installmentsDueInMonth(input.installmentPlans, ref);

    // --- Savings goals ---
    let savingsContributions = 0;
    for (const goal of goals) {
      if (goal.status !== "ACTIVE") continue;
      const remaining = Math.max(0, goal.targetCents - goal.currentCents);
      if (remaining === 0) continue;
      const contribution = Math.min(goal.monthlyContributionCents, remaining);
      goal.currentCents += contribution;
      savingsContributions += contribution;
      if (goal.currentCents >= goal.targetCents && !(goal.name in goalCompletionMonth)) {
        goalCompletionMonth[goal.name] = key;
      }
    }

    const outflows =
      fixedExpenses +
      variableExpenses +
      debtPayments +
      installments.totalCents +
      savingsContributions;
    const netCashFlow = income - outflows;
    cash = startingBalance + netCashFlow;
    savings += savingsContributions;

    // Remaining installment debt after this month's due payments.
    const remainingInstallmentDebt = input.installmentPlans
      .filter((p) => p.status === "ACTIVE")
      .flatMap((p) => p.payments)
      .filter(
        (p) =>
          p.status === "PENDING" &&
          monthKey({
            year: p.dueDate.getUTCFullYear(),
            month: p.dueDate.getUTCMonth() + 1,
          }) > key
      )
      .reduce((sum, p) => sum + p.amountCents, 0);

    const totalDebt =
      debts.reduce((sum, d) => sum + Math.max(0, d.balanceCents), 0) + remainingInstallmentDebt;
    const netWorth = cash + savings + input.otherAssetsCents - totalDebt;

    if (cash < 0 && firstNegativeMonth === null) firstNegativeMonth = key;

    months.push({
      key,
      year: ref.year,
      month: ref.month,
      startingBalanceCents: startingBalance,
      incomeCents: income,
      fixedExpensesCents: fixedExpenses,
      variableExpensesCents: variableExpenses,
      debtPaymentsCents: debtPayments,
      installmentPaymentsCents: installments.totalCents,
      savingsContributionsCents: savingsContributions,
      netCashFlowCents: netCashFlow,
      endingBalanceCents: cash,
      totalDebtCents: totalDebt,
      totalSavingsCents: savings,
      netWorthCents: netWorth,
      debtDetails,
    });
  }

  return { months, debtPayoffMonth, goalCompletionMonth, firstNegativeMonth };
}

/**
 * Disposable income for a month: income minus hard obligations
 * (fixed expenses, debt payments, installments, planned savings).
 * Variable spending is what disposable income gets spent on, so it is excluded.
 */
export function disposableIncomeForMonth(projection: MonthProjection): number {
  return (
    projection.incomeCents -
    projection.fixedExpensesCents -
    projection.debtPaymentsCents -
    projection.installmentPaymentsCents -
    projection.savingsContributionsCents
  );
}
