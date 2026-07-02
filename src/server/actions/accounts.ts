"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { accountSchema } from "@/lib/validators";
import { failure, toCents, type ActionResult } from "./helpers";

export async function createAccount(values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = accountSchema.parse(values);
    await db.account.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        balanceCents: toCents(data.balance),
        currency: data.currency,
        notes: data.notes ?? null,
        countsAsCash: data.countsAsCash,
        countsAsSavings: data.countsAsSavings,
        inNetWorth: data.inNetWorth,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateAccount(id: string, values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = accountSchema.parse(values);
    await db.account.update({
      where: { id, userId },
      data: {
        name: data.name,
        type: data.type,
        balanceCents: toCents(data.balance),
        currency: data.currency,
        notes: data.notes ?? null,
        countsAsCash: data.countsAsCash,
        countsAsSavings: data.countsAsSavings,
        inNetWorth: data.inNetWorth,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.account.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
