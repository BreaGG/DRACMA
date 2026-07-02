import type {
  FinanceFrequency,
  MonthProjection,
  ProjectionInput,
  ProjectionResult,
} from "./types";
import { addMonths, monthStart } from "./dates";
import { generateInstallmentSchedule } from "./installments";
import { projectMonths } from "./projection";

/**
 * A scenario is a list of hypothetical changes applied on top of the user's
 * real financial data. Changes reference months as offsets from the
 * projection start (0 = current month) so scenarios stay valid over time.
 */
export type ScenarioChange =
  | {
      type: "ADD_EXPENSE";
      name: string;
      amountCents: number;
      frequency: FinanceFrequency;
      paymentDay: number;
      startMonthOffset: number;
      kind: "FIXED" | "VARIABLE";
    }
  | { type: "REMOVE_EXPENSE"; name: string }
  | { type: "CHANGE_EXPENSE_AMOUNT"; name: string; newAmountCents: number }
  | {
      type: "ADD_INCOME";
      name: string;
      amountCents: number;
      frequency: FinanceFrequency;
      paymentDay: number;
      startMonthOffset: number;
    }
  | { type: "CHANGE_INCOME_AMOUNT"; name: string; newAmountCents: number }
  | { type: "EXTRA_INCOME_ONCE"; name: string; amountCents: number; monthOffset: number }
  | {
      type: "ADD_DEBT";
      name: string;
      principalCents: number;
      interestRateBps: number;
      monthlyPaymentCents: number;
      paymentDay: number;
    }
  | {
      type: "ADD_INSTALLMENT_PLAN";
      name: string;
      totalAmountCents: number;
      installmentCount: number;
      firstPaymentMonthOffset: number;
      paymentDay: number;
    }
  | { type: "PAY_OFF_DEBT"; debtName: string }
  | { type: "CHANGE_SAVINGS_CONTRIBUTION"; goalName: string; newMonthlyCents: number };

export const SCENARIO_CHANGE_TYPES = [
  "ADD_EXPENSE",
  "REMOVE_EXPENSE",
  "CHANGE_EXPENSE_AMOUNT",
  "ADD_INCOME",
  "CHANGE_INCOME_AMOUNT",
  "EXTRA_INCOME_ONCE",
  "ADD_DEBT",
  "ADD_INSTALLMENT_PLAN",
  "PAY_OFF_DEBT",
  "CHANGE_SAVINGS_CONTRIBUTION",
] as const;

/** Apply scenario changes to a projection input, returning a new input (pure). */
export function applyScenario(
  input: ProjectionInput,
  changes: ScenarioChange[]
): ProjectionInput {
  const next: ProjectionInput = {
    ...input,
    incomes: input.incomes.map((x) => ({ ...x })),
    expenses: input.expenses.map((x) => ({ ...x })),
    debts: input.debts.map((x) => ({ ...x })),
    installmentPlans: input.installmentPlans.map((p) => ({
      ...p,
      payments: p.payments.map((pp) => ({ ...pp })),
    })),
    savingsGoals: input.savingsGoals.map((x) => ({ ...x })),
  };

  for (const change of changes) {
    switch (change.type) {
      case "ADD_EXPENSE": {
        const start = addMonths(next.startMonth, change.startMonthOffset);
        next.expenses.push({
          name: change.name,
          amountCents: change.amountCents,
          frequency: change.frequency,
          paymentDay: change.paymentDay,
          startDate: monthStart(start),
          kind: change.kind,
          essential: false,
        });
        break;
      }
      case "REMOVE_EXPENSE":
        next.expenses = next.expenses.filter((e) => e.name !== change.name);
        break;
      case "CHANGE_EXPENSE_AMOUNT":
        for (const e of next.expenses) {
          if (e.name === change.name) e.amountCents = change.newAmountCents;
        }
        break;
      case "ADD_INCOME": {
        const start = addMonths(next.startMonth, change.startMonthOffset);
        next.incomes.push({
          name: change.name,
          amountCents: change.amountCents,
          frequency: change.frequency,
          paymentDay: change.paymentDay,
          startDate: monthStart(start),
        });
        break;
      }
      case "CHANGE_INCOME_AMOUNT":
        for (const inc of next.incomes) {
          if (inc.name === change.name) inc.amountCents = change.newAmountCents;
        }
        break;
      case "EXTRA_INCOME_ONCE": {
        const when = addMonths(next.startMonth, change.monthOffset);
        next.incomes.push({
          name: change.name,
          amountCents: change.amountCents,
          frequency: "ONE_TIME",
          paymentDay: 15,
          startDate: new Date(Date.UTC(when.year, when.month - 1, 15)),
        });
        break;
      }
      case "ADD_DEBT":
        next.debts.push({
          name: change.name,
          balanceCents: change.principalCents,
          interestRateBps: change.interestRateBps,
          monthlyPaymentCents: change.monthlyPaymentCents,
          paymentDay: change.paymentDay,
          status: "ACTIVE",
        });
        break;
      case "ADD_INSTALLMENT_PLAN": {
        const first = addMonths(next.startMonth, change.firstPaymentMonthOffset);
        next.installmentPlans.push({
          name: change.name,
          totalAmountCents: change.totalAmountCents,
          status: "ACTIVE",
          payments: generateInstallmentSchedule(
            change.totalAmountCents,
            change.installmentCount,
            new Date(Date.UTC(first.year, first.month - 1, change.paymentDay))
          ),
        });
        break;
      }
      case "PAY_OFF_DEBT":
        for (const d of next.debts) {
          if (d.name === change.debtName) {
            // Lump-sum payoff: cash drops by the remaining balance immediately.
            next.startingCashCents -= d.balanceCents;
            d.balanceCents = 0;
            d.status = "PAID";
          }
        }
        break;
      case "CHANGE_SAVINGS_CONTRIBUTION":
        for (const g of next.savingsGoals) {
          if (g.name === change.goalName) g.monthlyContributionCents = change.newMonthlyCents;
        }
        break;
    }
  }

  return next;
}

export interface MonthComparison {
  key: string;
  base: MonthProjection;
  scenario: MonthProjection;
  endingBalanceDeltaCents: number;
  totalDebtDeltaCents: number;
  totalSavingsDeltaCents: number;
  netWorthDeltaCents: number;
  netCashFlowDeltaCents: number;
}

export interface ScenarioComparison {
  months: MonthComparison[];
  base: ProjectionResult;
  scenario: ProjectionResult;
  /** Deltas at the end of the horizon. */
  final: {
    endingBalanceDeltaCents: number;
    totalDebtDeltaCents: number;
    totalSavingsDeltaCents: number;
    netWorthDeltaCents: number;
  };
}

/** Run base + scenario projections over the same horizon and diff them. */
export function compareScenario(
  input: ProjectionInput,
  changes: ScenarioChange[],
  monthCount: number
): ScenarioComparison {
  const base = projectMonths(input, monthCount);
  const scenario = projectMonths(applyScenario(input, changes), monthCount);

  const months: MonthComparison[] = base.months.map((b, i) => {
    const s = scenario.months[i];
    return {
      key: b.key,
      base: b,
      scenario: s,
      endingBalanceDeltaCents: s.endingBalanceCents - b.endingBalanceCents,
      totalDebtDeltaCents: s.totalDebtCents - b.totalDebtCents,
      totalSavingsDeltaCents: s.totalSavingsCents - b.totalSavingsCents,
      netWorthDeltaCents: s.netWorthCents - b.netWorthCents,
      netCashFlowDeltaCents: s.netCashFlowCents - b.netCashFlowCents,
    };
  });

  const last = months[months.length - 1];
  return {
    months,
    base,
    scenario,
    final: {
      endingBalanceDeltaCents: last?.endingBalanceDeltaCents ?? 0,
      totalDebtDeltaCents: last?.totalDebtDeltaCents ?? 0,
      totalSavingsDeltaCents: last?.totalSavingsDeltaCents ?? 0,
      netWorthDeltaCents: last?.netWorthDeltaCents ?? 0,
    },
  };
}
