import { describe, expect, it } from "vitest";
import { applyScenario, compareScenario } from "../scenario";
import type { ProjectionInput } from "../types";

function baseInput(): ProjectionInput {
  return {
    startMonth: { year: 2026, month: 7 },
    startingCashCents: 200_000,
    startingSavingsCents: 0,
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
    ],
    debts: [
      {
        name: "Loan",
        balanceCents: 100_000,
        interestRateBps: 0,
        monthlyPaymentCents: 10_000,
        paymentDay: 5,
        status: "ACTIVE",
      },
    ],
    installmentPlans: [],
    savingsGoals: [
      {
        name: "Travel",
        targetCents: 500_000,
        currentCents: 0,
        monthlyContributionCents: 10_000,
        status: "ACTIVE",
      },
    ],
  };
}

describe("applyScenario", () => {
  it("does not mutate the base input", () => {
    const input = baseInput();
    const snapshot = JSON.stringify(input);
    applyScenario(input, [
      { type: "ADD_EXPENSE", name: "Gym", amountCents: 5_000, frequency: "MONTHLY", paymentDay: 3, startMonthOffset: 0, kind: "FIXED" },
      { type: "PAY_OFF_DEBT", debtName: "Loan" },
      { type: "CHANGE_INCOME_AMOUNT", name: "Salary", newAmountCents: 1 },
    ]);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("pays off a debt with a lump sum from cash", () => {
    const next = applyScenario(baseInput(), [{ type: "PAY_OFF_DEBT", debtName: "Loan" }]);
    expect(next.startingCashCents).toBe(100_000);
    expect(next.debts[0].balanceCents).toBe(0);
    expect(next.debts[0].status).toBe("PAID");
  });

  it("adds an installment plan with a generated schedule", () => {
    const next = applyScenario(baseInput(), [
      {
        type: "ADD_INSTALLMENT_PLAN",
        name: "Phone",
        totalAmountCents: 90_000,
        installmentCount: 3,
        firstPaymentMonthOffset: 1,
        paymentDay: 10,
      },
    ]);
    expect(next.installmentPlans).toHaveLength(1);
    expect(next.installmentPlans[0].payments.map((p) => p.dueDate.toISOString().slice(0, 10))).toEqual(
      ["2026-08-10", "2026-09-10", "2026-10-10"]
    );
  });
});

describe("compareScenario", () => {
  it("a new monthly expense lowers ending balance cumulatively", () => {
    const cmp = compareScenario(
      baseInput(),
      [{ type: "ADD_EXPENSE", name: "New subscription", amountCents: 2_000, frequency: "MONTHLY", paymentDay: 1, startMonthOffset: 0, kind: "FIXED" }],
      6
    );
    expect(cmp.months[0].endingBalanceDeltaCents).toBe(-2_000);
    expect(cmp.months[5].endingBalanceDeltaCents).toBe(-12_000);
    expect(cmp.final.endingBalanceDeltaCents).toBe(-12_000);
    // Debt and savings paths are untouched by a plain expense.
    expect(cmp.final.totalDebtDeltaCents).toBe(0);
    expect(cmp.final.totalSavingsDeltaCents).toBe(0);
  });

  it("a salary raise improves cash flow and net worth", () => {
    const cmp = compareScenario(
      baseInput(),
      [{ type: "CHANGE_INCOME_AMOUNT", name: "Salary", newAmountCents: 220_000 }],
      12
    );
    expect(cmp.months[0].netCashFlowDeltaCents).toBe(20_000);
    expect(cmp.final.netWorthDeltaCents).toBe(240_000);
  });

  it("increasing savings contributions moves cash into savings, net worth neutral", () => {
    const cmp = compareScenario(
      baseInput(),
      [{ type: "CHANGE_SAVINGS_CONTRIBUTION", goalName: "Travel", newMonthlyCents: 30_000 }],
      6
    );
    expect(cmp.final.totalSavingsDeltaCents).toBe(120_000);
    expect(cmp.final.endingBalanceDeltaCents).toBe(-120_000);
    expect(cmp.final.netWorthDeltaCents).toBe(0);
  });

  it("early debt payoff removes future payments and interest", () => {
    const input = baseInput();
    input.debts[0].interestRateBps = 1200; // 1% monthly
    const cmp = compareScenario(input, [{ type: "PAY_OFF_DEBT", debtName: "Loan" }], 12);
    // While the base loan is still being repaid, the scenario carries less debt.
    expect(cmp.months[0].totalDebtDeltaCents).toBeLessThan(0);
    // By the end both are debt-free, but avoided interest means higher net worth.
    expect(cmp.final.totalDebtDeltaCents).toBe(0);
    expect(cmp.final.netWorthDeltaCents).toBeGreaterThan(0);
  });

  it("a Pay-in-3 purchase affects exactly its three months of cash flow", () => {
    const cmp = compareScenario(
      baseInput(),
      [
        {
          type: "ADD_INSTALLMENT_PLAN",
          name: "Laptop",
          totalAmountCents: 90_000,
          installmentCount: 3,
          firstPaymentMonthOffset: 0,
          paymentDay: 15,
        },
      ],
      6
    );
    expect(cmp.months.map((m) => m.netCashFlowDeltaCents)).toEqual([
      -30_000, -30_000, -30_000, 0, 0, 0,
    ]);
    expect(cmp.final.endingBalanceDeltaCents).toBe(-90_000);
  });
});
