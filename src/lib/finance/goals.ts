import type { MonthRef, SavingsGoalItem } from "./types";
import { addMonths, compareMonthRef, monthKey, monthRefOf } from "./dates";

export interface GoalProjection {
  progressPct: number;
  remainingCents: number;
  /** Months needed at the current contribution pace; null if pace is 0. */
  monthsToTarget: number | null;
  /** Month key ("YYYY-MM") when the goal completes at the current pace. */
  estimatedCompletionKey: string | null;
  /** Whether the current pace reaches the target by targetDate (null if no date). */
  onTrack: boolean | null;
  /** Monthly contribution required to hit targetDate; null if no date or already met. */
  requiredMonthlyCents: number | null;
  /** Month-by-month projected balance, starting from `fromMonth`. */
  schedule: { key: string; balanceCents: number }[];
}

/** Project a savings goal month by month from a given month. */
export function projectGoal(
  goal: SavingsGoalItem,
  fromMonth: MonthRef,
  horizonMonths: number = 60
): GoalProjection {
  const remaining = Math.max(0, goal.targetCents - goal.currentCents);
  const progressPct =
    goal.targetCents > 0
      ? Math.min(100, Math.round((goal.currentCents / goal.targetCents) * 100))
      : 0;

  const pace = goal.status === "ACTIVE" ? goal.monthlyContributionCents : 0;
  const monthsToTarget =
    remaining === 0 ? 0 : pace > 0 ? Math.ceil(remaining / pace) : null;

  const estimatedCompletionKey =
    monthsToTarget === null
      ? null
      : monthKey(addMonths(fromMonth, Math.max(0, monthsToTarget - 1)));

  let onTrack: boolean | null = null;
  let requiredMonthlyCents: number | null = null;
  if (goal.targetDate && remaining > 0) {
    const targetRef = monthRefOf(goal.targetDate);
    const monthsAvailable = Math.max(0, compareMonthRef(targetRef, fromMonth) + 1);
    onTrack = monthsToTarget !== null && monthsToTarget <= monthsAvailable;
    requiredMonthlyCents =
      monthsAvailable > 0 ? Math.ceil(remaining / monthsAvailable) : remaining;
  }

  const schedule: { key: string; balanceCents: number }[] = [];
  let balance = goal.currentCents;
  for (let i = 0; i < horizonMonths; i++) {
    balance = Math.min(goal.targetCents, balance + pace);
    schedule.push({ key: monthKey(addMonths(fromMonth, i)), balanceCents: balance });
    if (balance >= goal.targetCents) break;
  }

  return {
    progressPct,
    remainingCents: remaining,
    monthsToTarget,
    estimatedCompletionKey,
    onTrack,
    requiredMonthlyCents,
    schedule,
  };
}
