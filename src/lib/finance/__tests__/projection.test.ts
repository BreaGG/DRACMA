import { describe, expect, it } from "vitest";
import { disposableIncomeForMonth, projectMonths } from "../projection";
import { generateInstallmentSchedule } from "../installments";
import type { ProjectionInput } from "../types";

/**
 * Base fixture: €2,000 salary, €800 rent, €300 variable food estimate,
 * a €3,000 interest-free loan at €250/month, a Pay-in-3 with 2 pending
 * €300 payments (Aug + Sep), and a savings goal at €200/month.
 */
function baseInput(): ProjectionInput {
  return {
    startMonth: { year: 2026, month: 7 },
    startingCashCents: 150_000,
    startingSavingsCents: 100_000,
    otherAssetsCents: 0,
    incomes: [
      {
        name: "Salary",
        amountCents: 200_000,
        frequency: "MONTHLY",
        paymentDay: 28,
        startDate: new Date(Date.UTC(2025, 0, 1)),
      },
    ],
    expenses: [
      {
        name: "Rent",
        amountCents: 80_000,
        frequency: "MONTHLY",
        paymentDay: 1,
        startDate: new Date(Date.UTC(2025, 0, 1)),
        kind: "FIXED",
        essential: true,
      },
      {
        name: "Food",
        amountCents: 30_000,
        frequency: "MONTHLY",
        paymentDay: 15,
        startDate: new Date(Date.UTC(2025, 0, 1)),
        kind: "VARIABLE",
        essential: true,
      },
    ],
    debts: [
      {
        name: "Bank loan",
        balanceCents: 300_000,
        interestRateBps: 0,
        monthlyPaymentCents: 25_000,
        paymentDay: 5,
        status: "ACTIVE",
      },
    ],
    installmentPlans: [
      {
        name: "Laptop",
        totalAmountCents: 90_000,
        status: "ACTIVE",
        payments: [
          { sequence: 1, dueDate: new Date(Date.UTC(2026, 6, 1)), amountCents: 30_000, status: "PAID" },
          { sequence: 2, dueDate: new Date(Date.UTC(2026, 7, 15)), amountCents: 30_000, status: "PENDING" },
          { sequence: 3, dueDate: new Date(Date.UTC(2026, 8, 15)), amountCents: 30_000, status: "PENDING" },
        ],
      },
    ],
    savingsGoals: [
      {
        name: "Emergency fund",
        targetCents: 300_000,
        currentCents: 100_000,
        monthlyContributionCents: 20_000,
        status: "ACTIVE",
      },
    ],
  };
}

describe("projectMonths — cash flow", () => {
  it("computes the first month's flows and ending balance", () => {
    const [july] = projectMonths(baseInput(), 1).months;
    expect(july.key).toBe("2026-07");
    expect(july.incomeCents).toBe(200_000);
    expect(july.fixedExpensesCents).toBe(80_000);
    expect(july.variableExpensesCents).toBe(30_000);
    expect(july.debtPaymentsCents).toBe(25_000);
    expect(july.installmentPaymentsCents).toBe(0); // July installment already paid
    expect(july.savingsContributionsCents).toBe(20_000);
    expect(july.netCashFlowCents).toBe(45_000);
    expect(july.endingBalanceCents).toBe(195_000);
  });

  it("includes pending installments in their due months", () => {
    const months = projectMonths(baseInput(), 3).months;
    expect(months[1].installmentPaymentsCents).toBe(30_000); // Aug
    expect(months[2].installmentPaymentsCents).toBe(30_000); // Sep
  });

  it("chains ending balance into the next month's starting balance", () => {
    const months = projectMonths(baseInput(), 6).months;
    for (let i = 1; i < months.length; i++) {
      expect(months[i].startingBalanceCents).toBe(months[i - 1].endingBalanceCents);
    }
  });
});

describe("projectMonths — debt evolution", () => {
  it("amortizes the loan and records the payoff month", () => {
    const result = projectMonths(baseInput(), 14);
    // €3,000 at €250/month -> 12 months, paid off in June 2027.
    expect(result.debtPayoffMonth["Bank loan"]).toBe("2027-06");
    const last = result.months[13];
    expect(last.debtDetails.length).toBe(0);
    expect(last.totalDebtCents).toBe(0);
  });

  it("counts pending installments as debt until paid", () => {
    const months = projectMonths(baseInput(), 3).months;
    // After July: loan 2750 + installments 600 pending.
    expect(months[0].totalDebtCents).toBe(275_000 + 60_000);
    // After August: loan 2500 + one €300 installment left.
    expect(months[1].totalDebtCents).toBe(250_000 + 30_000);
    // After September: loan 2250, no installments.
    expect(months[2].totalDebtCents).toBe(225_000);
  });

  it("keeps paused debts frozen", () => {
    const input = baseInput();
    input.debts[0].status = "PAUSED";
    const months = projectMonths(input, 3).months;
    expect(months[2].debtDetails[0].endingBalanceCents).toBe(300_000);
    expect(months.every((m) => m.debtPaymentsCents === 0)).toBe(true);
  });
});

describe("projectMonths — savings evolution", () => {
  it("grows savings by the contribution and stops at the target", () => {
    const result = projectMonths(baseInput(), 12);
    // €1,000 in goal, €3,000 target, €200/month -> completes in 10 months (Apr 2027).
    expect(result.goalCompletionMonth["Emergency fund"]).toBe("2027-04");
    const months = result.months;
    expect(months[0].totalSavingsCents).toBe(120_000);
    expect(months[9].totalSavingsCents).toBe(300_000);
    expect(months[10].savingsContributionsCents).toBe(0);
    expect(months[11].totalSavingsCents).toBe(300_000);
  });
});

describe("projectMonths — net worth and warnings", () => {
  it("computes net worth as cash + savings + other assets - debt", () => {
    const [july] = projectMonths(baseInput(), 1).months;
    expect(july.netWorthCents).toBe(
      july.endingBalanceCents + july.totalSavingsCents - july.totalDebtCents
    );
  });

  it("flags the first month with a negative projected balance", () => {
    const input = baseInput();
    input.startingCashCents = 10_000; // not enough cushion
    input.expenses[0].amountCents = 200_000; // rent eats the whole salary
    const result = projectMonths(input, 6);
    expect(result.firstNegativeMonth).toBe("2026-07");
  });

  it("is deterministic", () => {
    const a = projectMonths(baseInput(), 24);
    const b = projectMonths(baseInput(), 24);
    expect(a).toEqual(b);
  });
});

describe("disposable income", () => {
  it("excludes variable spending but includes all obligations", () => {
    const [july] = projectMonths(baseInput(), 1).months;
    // 2000 - 800 fixed - 250 loan - 0 installments - 200 savings = 750
    expect(disposableIncomeForMonth(july)).toBe(75_000);
  });
});

describe("scenario building blocks used by the simulator", () => {
  it("a new Pay-in-3 purchase spreads over the right months", () => {
    const input = baseInput();
    input.installmentPlans.push({
      name: "New bike",
      totalAmountCents: 60_000,
      status: "ACTIVE",
      payments: generateInstallmentSchedule(60_000, 3, new Date(Date.UTC(2026, 7, 1))),
    });
    const months = projectMonths(input, 4).months;
    expect(months[1].installmentPaymentsCents).toBe(30_000 + 20_000);
    expect(months[2].installmentPaymentsCents).toBe(30_000 + 20_000);
    expect(months[3].installmentPaymentsCents).toBe(20_000);
  });
});
