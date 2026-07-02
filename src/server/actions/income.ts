"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { incomeSchema } from "@/lib/validators";
import { failure, toCents, toDate, toDateOrNull, type ActionResult } from "./helpers";

function mapIncome(data: ReturnType<typeof incomeSchema.parse>) {
  return {
    name: data.name,
    amountCents: toCents(data.amount),
    frequency: data.frequency,
    paymentDay: data.paymentDay,
    accountId: data.accountId || null,
    categoryId: data.categoryId || null,
    startDate: toDate(data.startDate),
    endDate: toDateOrNull(data.endDate),
    notes: data.notes ?? null,
  };
}

export async function createIncome(values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = incomeSchema.parse(values);
    await db.incomeSource.create({ data: { userId, ...mapIncome(data) } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateIncome(id: string, values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = incomeSchema.parse(values);
    await db.incomeSource.update({ where: { id, userId }, data: mapIncome(data) });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteIncome(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.incomeSource.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
