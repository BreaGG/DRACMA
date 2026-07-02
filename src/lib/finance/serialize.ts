import type { ProjectionInput } from "./types";

/**
 * JSON-safe form of ProjectionInput so a server component can hand the full
 * engine input to client components (the scenario simulator runs the pure
 * engine in the browser for instant feedback).
 */
export interface SerializedProjectionInput {
  startMonth: { year: number; month: number };
  startingCashCents: number;
  startingSavingsCents: number;
  otherAssetsCents: number;
  incomes: Array<{
    name: string;
    amountCents: number;
    frequency: "MONTHLY" | "WEEKLY" | "YEARLY" | "ONE_TIME";
    paymentDay: number;
    startDate: string;
    endDate: string | null;
  }>;
  expenses: Array<{
    name: string;
    amountCents: number;
    frequency: "MONTHLY" | "WEEKLY" | "YEARLY" | "ONE_TIME";
    paymentDay: number;
    startDate: string;
    endDate: string | null;
    kind: "FIXED" | "VARIABLE";
    essential: boolean;
  }>;
  debts: Array<{
    name: string;
    balanceCents: number;
    interestRateBps: number;
    monthlyPaymentCents: number;
    paymentDay: number;
    status: "ACTIVE" | "PAID" | "PAUSED";
  }>;
  installmentPlans: Array<{
    name: string;
    totalAmountCents: number;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    payments: Array<{
      sequence: number;
      dueDate: string;
      amountCents: number;
      status: "PENDING" | "PAID";
    }>;
  }>;
  savingsGoals: Array<{
    name: string;
    targetCents: number;
    currentCents: number;
    monthlyContributionCents: number;
    status: "ACTIVE" | "COMPLETED" | "PAUSED";
  }>;
}

export function serializeInput(input: ProjectionInput): SerializedProjectionInput {
  return {
    startMonth: input.startMonth,
    startingCashCents: input.startingCashCents,
    startingSavingsCents: input.startingSavingsCents,
    otherAssetsCents: input.otherAssetsCents,
    incomes: input.incomes.map((i) => ({
      name: i.name,
      amountCents: i.amountCents,
      frequency: i.frequency,
      paymentDay: i.paymentDay,
      startDate: i.startDate.toISOString(),
      endDate: i.endDate ? i.endDate.toISOString() : null,
    })),
    expenses: input.expenses.map((e) => ({
      name: e.name,
      amountCents: e.amountCents,
      frequency: e.frequency,
      paymentDay: e.paymentDay,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate ? e.endDate.toISOString() : null,
      kind: e.kind,
      essential: e.essential,
    })),
    debts: input.debts.map((d) => ({
      name: d.name,
      balanceCents: d.balanceCents,
      interestRateBps: d.interestRateBps,
      monthlyPaymentCents: d.monthlyPaymentCents,
      paymentDay: d.paymentDay,
      status: d.status,
    })),
    installmentPlans: input.installmentPlans.map((p) => ({
      name: p.name,
      totalAmountCents: p.totalAmountCents,
      status: p.status,
      payments: p.payments.map((pp) => ({
        sequence: pp.sequence,
        dueDate: pp.dueDate.toISOString(),
        amountCents: pp.amountCents,
        status: pp.status,
      })),
    })),
    savingsGoals: input.savingsGoals.map((g) => ({
      name: g.name,
      targetCents: g.targetCents,
      currentCents: g.currentCents,
      monthlyContributionCents: g.monthlyContributionCents,
      status: g.status,
    })),
  };
}

export function deserializeInput(input: SerializedProjectionInput): ProjectionInput {
  return {
    startMonth: input.startMonth,
    startingCashCents: input.startingCashCents,
    startingSavingsCents: input.startingSavingsCents,
    otherAssetsCents: input.otherAssetsCents,
    incomes: input.incomes.map((i) => ({
      ...i,
      startDate: new Date(i.startDate),
      endDate: i.endDate ? new Date(i.endDate) : null,
    })),
    expenses: input.expenses.map((e) => ({
      ...e,
      startDate: new Date(e.startDate),
      endDate: e.endDate ? new Date(e.endDate) : null,
    })),
    debts: input.debts.map((d) => ({ ...d })),
    installmentPlans: input.installmentPlans.map((p) => ({
      ...p,
      payments: p.payments.map((pp) => ({ ...pp, dueDate: new Date(pp.dueDate) })),
    })),
    savingsGoals: input.savingsGoals.map((g) => ({ ...g })),
  };
}
