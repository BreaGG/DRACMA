"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { debtSchema } from "@/lib/validators";
import { failure, toCents, toDate, toDateOrNull, type ActionResult } from "./helpers";

function mapDebt(data: ReturnType<typeof debtSchema.parse>) {
  return {
    name: data.name,
    type: data.type,
    originalAmountCents: toCents(data.originalAmount),
    balanceCents: toCents(data.balance),
    interestRateBps: Math.round(data.interestRatePct * 100),
    monthlyPaymentCents: toCents(data.monthlyPayment),
    paymentDay: data.paymentDay,
    startDate: toDate(data.startDate),
    expectedEndDate: toDateOrNull(data.expectedEndDate),
    lender: data.lender ?? null,
    accountId: data.accountId || null,
    notes: data.notes ?? null,
    status: data.status,
  };
}

export async function createDebt(values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = debtSchema.parse(values);
    await db.debt.create({ data: { userId, ...mapDebt(data) } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateDebt(id: string, values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = debtSchema.parse(values);
    await db.debt.update({ where: { id, userId }, data: mapDebt(data) });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteDebt(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.debt.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Record a manual debt payment: reduces the balance and logs a DebtPayment. */
export async function recordDebtPayment(
  debtId: string,
  amountEuros: number
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const amountCents = toCents(amountEuros);
    if (amountCents <= 0) return { ok: false, error: "Amount must be positive" };

    const debt = await db.debt.findUniqueOrThrow({ where: { id: debtId, userId } });
    const applied = Math.min(amountCents, debt.balanceCents);
    const newBalance = debt.balanceCents - applied;

    await db.$transaction([
      db.debtPayment.create({
        data: {
          debtId,
          date: new Date(),
          amountCents: applied,
          principalCents: applied,
        },
      }),
      db.debt.update({
        where: { id: debtId, userId },
        data: { balanceCents: newBalance, status: newBalance === 0 ? "PAID" : debt.status },
      }),
    ]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
