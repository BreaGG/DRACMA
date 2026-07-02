import { describe, expect, it } from "vitest";
import { projectGoal } from "../goals";
import type { SavingsGoalItem } from "../types";

const goal = (over?: Partial<SavingsGoalItem>): SavingsGoalItem => ({
  name: "Emergency fund",
  targetCents: 300_000,
  currentCents: 90_000,
  monthlyContributionCents: 30_000,
  status: "ACTIVE",
  ...over,
});

describe("projectGoal", () => {
  it("computes progress and remaining", () => {
    const p = projectGoal(goal(), { year: 2026, month: 7 });
    expect(p.progressPct).toBe(30);
    expect(p.remainingCents).toBe(210_000);
  });

  it("estimates completion at the current pace", () => {
    const p = projectGoal(goal(), { year: 2026, month: 7 });
    expect(p.monthsToTarget).toBe(7);
    expect(p.estimatedCompletionKey).toBe("2027-01");
    expect(p.schedule[p.schedule.length - 1].balanceCents).toBe(300_000);
  });

  it("reports null completion when the pace is zero", () => {
    const p = projectGoal(goal({ monthlyContributionCents: 0 }), { year: 2026, month: 7 });
    expect(p.monthsToTarget).toBeNull();
    expect(p.estimatedCompletionKey).toBeNull();
  });

  it("checks whether the pace hits the target date", () => {
    const onTrack = projectGoal(
      goal({ targetDate: new Date(Date.UTC(2027, 5, 30)) }),
      { year: 2026, month: 7 }
    );
    expect(onTrack.onTrack).toBe(true);

    const behind = projectGoal(
      goal({ targetDate: new Date(Date.UTC(2026, 9, 31)) }),
      { year: 2026, month: 7 }
    );
    expect(behind.onTrack).toBe(false);
    // 210,000 remaining over Jul-Oct (4 months) -> 52,500/month required.
    expect(behind.requiredMonthlyCents).toBe(52_500);
  });

  it("caps the schedule at the target", () => {
    const p = projectGoal(goal({ currentCents: 290_000 }), { year: 2026, month: 7 });
    expect(p.schedule).toEqual([{ key: "2026-07", balanceCents: 300_000 }]);
  });
});
