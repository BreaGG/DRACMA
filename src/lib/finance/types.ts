/**
 * Domain types for the pure finance engine.
 *
 * These types are intentionally independent from Prisma so every calculation
 * can run without a database (unit tests, scenario simulations, previews).
 * All amounts are integer cents. All month references use { year, month }
 * with month in 1-12.
 */

export type FinanceFrequency = "MONTHLY" | "WEEKLY" | "YEARLY" | "ONE_TIME";

export interface MonthRef {
  year: number;
  /** 1-12 */
  month: number;
}

export interface RecurringItem {
  id?: string;
  name: string;
  amountCents: number;
  frequency: FinanceFrequency;
  /** Day of month for MONTHLY / YEARLY items (clamped to month length). */
  paymentDay: number;
  /** Anchor date. For ONE_TIME this is the single occurrence date. */
  startDate: Date;
  endDate?: Date | null;
}

export interface IncomeItem extends RecurringItem {
  category?: string;
}

export interface ExpenseItem extends RecurringItem {
  kind: "FIXED" | "VARIABLE";
  essential: boolean;
  category?: string;
}

export interface DebtItem {
  id?: string;
  name: string;
  type?: string;
  balanceCents: number;
  /** Annual interest rate in basis points (350 = 3.50%). */
  interestRateBps: number;
  monthlyPaymentCents: number;
  paymentDay: number;
  status: "ACTIVE" | "PAID" | "PAUSED";
}

export interface InstallmentPaymentItem {
  sequence: number;
  dueDate: Date;
  amountCents: number;
  status: "PENDING" | "PAID";
}

export interface InstallmentPlanItem {
  id?: string;
  name: string;
  provider?: string;
  totalAmountCents: number;
  payments: InstallmentPaymentItem[];
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export interface SavingsGoalItem {
  id?: string;
  name: string;
  targetCents: number;
  currentCents: number;
  monthlyContributionCents: number;
  targetDate?: Date | null;
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
}

/** Everything the projection engine needs about the user's finances. */
export interface ProjectionInput {
  /** First projected month (usually the current month). */
  startMonth: MonthRef;
  /** Sum of balances of accounts that count as available cash. */
  startingCashCents: number;
  /** Sum of balances of accounts that count as savings. */
  startingSavingsCents: number;
  /** Net-worth assets that are neither cash nor savings (e.g. investments). */
  otherAssetsCents: number;
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  debts: DebtItem[];
  installmentPlans: InstallmentPlanItem[];
  savingsGoals: SavingsGoalItem[];
}

export interface DebtMonthDetail {
  name: string;
  paymentCents: number;
  interestCents: number;
  principalCents: number;
  endingBalanceCents: number;
}

export interface MonthProjection {
  /** "YYYY-MM" */
  key: string;
  year: number;
  month: number;
  startingBalanceCents: number;
  incomeCents: number;
  fixedExpensesCents: number;
  variableExpensesCents: number;
  debtPaymentsCents: number;
  installmentPaymentsCents: number;
  savingsContributionsCents: number;
  /** income - all outflows (savings contributions count as outflow of cash). */
  netCashFlowCents: number;
  endingBalanceCents: number;
  /** Remaining debt (loans + pending installments) at month end. */
  totalDebtCents: number;
  /** Savings balance at month end. */
  totalSavingsCents: number;
  netWorthCents: number;
  debtDetails: DebtMonthDetail[];
}

export interface ProjectionResult {
  months: MonthProjection[];
  /** Month key in which each debt reaches zero, if within the horizon. */
  debtPayoffMonth: Record<string, string>;
  /** Month key in which each savings goal reaches its target, if within horizon. */
  goalCompletionMonth: Record<string, string>;
  /** First month with a negative ending balance, if any. */
  firstNegativeMonth: string | null;
}

export interface CalendarEvent {
  date: Date;
  name: string;
  amountCents: number;
  kind:
    | "income"
    | "fixed-expense"
    | "variable-expense"
    | "debt-payment"
    | "installment"
    | "savings-contribution";
}

export interface Insight {
  severity: "positive" | "info" | "warning";
  message: string;
}
