"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { expenseSchema } from "@/lib/validators";
import { failure, toCents, toDate, toDateOrNull, type ActionResult } from "./helpers";

function mapExpense(data: ReturnType<typeof expenseSchema.parse>) {
  return {
    name: data.name,
    amountCents: toCents(data.amount),
    kind: data.kind,
    frequency: data.frequency,
    paymentDay: data.paymentDay,
    accountId: data.accountId || null,
    categoryId: data.categoryId || null,
    isEssential: data.isEssential,
    startDate: toDate(data.startDate),
    endDate: toDateOrNull(data.endDate),
    notes: data.notes ?? null,
  };
}

export async function createExpense(values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = expenseSchema.parse(values);
    await db.expense.create({ data: { userId, ...mapExpense(data) } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateExpense(id: string, values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = expenseSchema.parse(values);
    await db.expense.update({ where: { id, userId }, data: mapExpense(data) });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.expense.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
