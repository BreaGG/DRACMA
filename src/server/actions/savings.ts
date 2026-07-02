"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { savingsGoalSchema } from "@/lib/validators";
import { failure, toCents, toDateOrNull, type ActionResult } from "./helpers";

function mapGoal(data: ReturnType<typeof savingsGoalSchema.parse>) {
  return {
    name: data.name,
    targetCents: toCents(data.target),
    currentCents: toCents(data.current),
    monthlyContributionCents: toCents(data.monthlyContribution),
    targetDate: toDateOrNull(data.targetDate),
    priority: data.priority,
    accountId: data.accountId || null,
    notes: data.notes ?? null,
    status: data.status,
  };
}

export async function createSavingsGoal(values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = savingsGoalSchema.parse(values);
    await db.savingsGoal.create({ data: { userId, ...mapGoal(data) } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateSavingsGoal(id: string, values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = savingsGoalSchema.parse(values);
    await db.savingsGoal.update({ where: { id, userId }, data: mapGoal(data) });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteSavingsGoal(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.savingsGoal.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
