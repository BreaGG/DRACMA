import { describe, expect, it } from "vitest";
import { amortizeOneMonth, projectLoan, totalLoanDebt } from "../loans";

describe("projectLoan", () => {
  it("pays off an interest-free loan in balance/payment months", () => {
    const result = projectLoan(120_000, 0, 20_000);
    expect(result.monthsToPayoff).toBe(6);
    expect(result.totalInterestCents).toBe(0);
    expect(result.steps[5].endingBalanceCents).toBe(0);
    expect(result.steps.every((s) => s.paymentCents === 20_000)).toBe(true);
  });

  it("caps the final payment at the remaining balance", () => {
    const result = projectLoan(50_000, 0, 20_000);
    expect(result.monthsToPayoff).toBe(3);
    expect(result.steps[2].paymentCents).toBe(10_000);
  });

  it("applies monthly interest before principal", () => {
    // €10,000 at 12% annual -> 1% monthly. First month interest = €100.
    const result = projectLoan(1_000_000, 1200, 100_000);
    expect(result.steps[0].interestCents).toBe(10_000);
    expect(result.steps[0].principalCents).toBe(90_000);
    expect(result.steps[0].endingBalanceCents).toBe(910_000);
    expect(result.monthsToPayoff).toBe(11);
    expect(result.totalInterestCents).toBeGreaterThan(0);
  });

  it("flags loans whose payment never covers interest", () => {
    // €10,000 at 12% annual: interest is €100/month, payment of €50 never amortizes.
    const result = projectLoan(1_000_000, 1200, 5_000);
    expect(result.monthsToPayoff).toBeNull();
  });
});

describe("amortizeOneMonth", () => {
  it("splits a payment into interest and principal", () => {
    const step = amortizeOneMonth(600_000, 600, 30_000);
    expect(step.interestCents).toBe(3_000); // 6%/12 of €6,000
    expect(step.principalCents).toBe(27_000);
    expect(step.endingBalanceCents).toBe(573_000);
  });

  it("returns zeros for an already-paid debt", () => {
    expect(amortizeOneMonth(0, 600, 30_000).paymentCents).toBe(0);
  });
});

describe("totalLoanDebt", () => {
  it("sums balances of non-paid debts", () => {
    expect(
      totalLoanDebt([
        { name: "A", balanceCents: 100, interestRateBps: 0, monthlyPaymentCents: 10, paymentDay: 1, status: "ACTIVE" },
        { name: "B", balanceCents: 200, interestRateBps: 0, monthlyPaymentCents: 10, paymentDay: 1, status: "PAUSED" },
        { name: "C", balanceCents: 300, interestRateBps: 0, monthlyPaymentCents: 10, paymentDay: 1, status: "PAID" },
      ])
    ).toBe(300);
  });
});
