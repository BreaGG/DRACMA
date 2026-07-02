import "server-only";
import { db } from "@/lib/db";
import type {
  DebtItem,
  ExpenseItem,
  IncomeItem,
  InstallmentPlanItem,
  ProjectionInput,
  SavingsGoalItem,
} from "@/lib/finance";
import { availableCash, otherAssets, totalSavings } from "@/lib/finance";
import type { AccountLike } from "@/lib/finance/networth";

export interface FinanceData {
  input: ProjectionInput;
  accounts: AccountLike[];
  currency: string;
}

/**
 * Load everything the projection engine needs for a user and map the
 * Prisma rows onto the pure engine's domain types.
 */
export async function loadFinanceData(
  userId: string,
  startMonth?: { year: number; month: number }
): Promise<FinanceData> {
  const [user, accounts, incomes, expenses, debts, plans, goals] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { currency: true } }),
    db.account.findMany({ where: { userId } }),
    db.incomeSource.findMany({ where: { userId } }),
    db.expense.findMany({ where: { userId } }),
    db.debt.findMany({ where: { userId } }),
    db.installmentPlan.findMany({
      where: { userId },
      include: { payments: { orderBy: { sequence: "asc" } } },
    }),
    db.savingsGoal.findMany({ where: { userId } }),
  ]);

  const now = new Date();
  const start = startMonth ?? {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
  };

  const accountLikes: AccountLike[] = accounts.map((a) => ({
    balanceCents: a.balanceCents,
    countsAsCash: a.countsAsCash,
    countsAsSavings: a.countsAsSavings,
    inNetWorth: a.inNetWorth,
  }));

  const incomeItems: IncomeItem[] = incomes.map((i) => ({
    id: i.id,
    name: i.name,
    amountCents: i.amountCents,
    frequency: i.frequency,
    paymentDay: i.paymentDay,
    startDate: i.startDate,
    endDate: i.endDate,
  }));

  const expenseItems: ExpenseItem[] = expenses.map((e) => ({
    id: e.id,
    name: e.name,
    amountCents: e.amountCents,
    frequency: e.frequency,
    paymentDay: e.paymentDay,
    startDate: e.startDate,
    endDate: e.endDate,
    kind: e.kind,
    essential: e.isEssential,
  }));

  const debtItems: DebtItem[] = debts.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    balanceCents: d.balanceCents,
    interestRateBps: d.interestRateBps,
    monthlyPaymentCents: d.monthlyPaymentCents,
    paymentDay: d.paymentDay,
    status: d.status,
  }));

  const planItems: InstallmentPlanItem[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    provider: p.provider,
    totalAmountCents: p.totalAmountCents,
    status: p.status,
    payments: p.payments.map((pp) => ({
      sequence: pp.sequence,
      dueDate: pp.dueDate,
      amountCents: pp.amountCents,
      status: pp.status,
    })),
  }));

  const goalItems: SavingsGoalItem[] = goals.map((g) => ({
    id: g.id,
    name: g.name,
    targetCents: g.targetCents,
    currentCents: g.currentCents,
    monthlyContributionCents: g.monthlyContributionCents,
    targetDate: g.targetDate,
    status: g.status,
  }));

  return {
    input: {
      startMonth: start,
      startingCashCents: availableCash(accountLikes),
      startingSavingsCents: totalSavings(accountLikes),
      otherAssetsCents: otherAssets(accountLikes),
      incomes: incomeItems,
      expenses: expenseItems,
      debts: debtItems,
      installmentPlans: planItems,
      savingsGoals: goalItems,
    },
    accounts: accountLikes,
    currency: user.currency,
  };
}
