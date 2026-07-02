import type { DebtItem } from "./types";

export interface LoanMonthStep {
  /** 1-based month index from the start of the projection. */
  monthIndex: number;
  paymentCents: number;
  interestCents: number;
  principalCents: number;
  endingBalanceCents: number;
}

export interface LoanProjection {
  steps: LoanMonthStep[];
  /** Months until fully paid; null if the payment never amortizes the loan. */
  monthsToPayoff: number | null;
  totalInterestCents: number;
}

/**
 * Project a loan month by month with simple monthly compounding:
 * monthly interest = balance * annualRate / 12, payment covers interest first.
 * Deterministic and independent of calendar dates.
 */
export function projectLoan(
  balanceCents: number,
  interestRateBps: number,
  monthlyPaymentCents: number,
  maxMonths: number = 600
): LoanProjection {
  const steps: LoanMonthStep[] = [];
  let balance = Math.max(0, Math.round(balanceCents));
  let totalInterest = 0;
  const monthlyRate = interestRateBps / 10_000 / 12;

  for (let i = 1; i <= maxMonths && balance > 0; i++) {
    const interest = Math.round(balance * monthlyRate);
    if (monthlyPaymentCents <= interest && monthlyRate > 0) {
      // Payment does not cover interest: the loan never amortizes.
      return { steps, monthsToPayoff: null, totalInterestCents: totalInterest };
    }
    const payment = Math.min(monthlyPaymentCents, balance + interest);
    const principal = payment - interest;
    balance -= principal;
    totalInterest += interest;
    steps.push({
      monthIndex: i,
      paymentCents: payment,
      interestCents: interest,
      principalCents: principal,
      endingBalanceCents: balance,
    });
  }

  return {
    steps,
    monthsToPayoff: balance <= 0 ? steps.length : null,
    totalInterestCents: totalInterest,
  };
}

/** One month of amortization for a debt; returns the applied payment split. */
export function amortizeOneMonth(
  balanceCents: number,
  interestRateBps: number,
  monthlyPaymentCents: number
): { paymentCents: number; interestCents: number; principalCents: number; endingBalanceCents: number } {
  if (balanceCents <= 0) {
    return { paymentCents: 0, interestCents: 0, principalCents: 0, endingBalanceCents: 0 };
  }
  const interest = Math.round((balanceCents * interestRateBps) / 10_000 / 12);
  const payment = Math.min(monthlyPaymentCents, balanceCents + interest);
  const principal = Math.max(0, payment - interest);
  return {
    paymentCents: payment,
    interestCents: interest,
    principalCents: principal,
    endingBalanceCents: balanceCents - principal,
  };
}

export function totalLoanDebt(debts: DebtItem[]): number {
  return debts
    .filter((d) => d.status !== "PAID")
    .reduce((sum, d) => sum + d.balanceCents, 0);
}
