"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { transactionSchema } from "@/lib/validators";
import { failure, toCents, toDate, type ActionResult } from "./helpers";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Balance effects per transaction type (amount is always positive):
 * - INCOME: account +amount
 * - EXPENSE: account -amount
 * - TRANSFER: account -amount, toAccount +amount
 * - DEBT_PAYMENT: account -amount, debt balance -amount (logged as DebtPayment)
 * - SAVINGS_CONTRIBUTION: account -amount, goal current +amount
 *   (optionally toAccount +amount when contributing into a savings account)
 */
async function applyEffects(
  tx: Tx,
  userId: string,
  t: {
    type: string;
    amountCents: number;
    accountId: string;
    toAccountId: string | null;
    debtId: string | null;
    savingsGoalId: string | null;
    date: Date;
  },
  direction: 1 | -1
) {
  const amount = t.amountCents * direction;
  const inc = (accountId: string, cents: number) =>
    tx.account.update({
      where: { id: accountId, userId },
      data: { balanceCents: { increment: cents } },
    });

  switch (t.type) {
    case "INCOME":
      await inc(t.accountId, amount);
      break;
    case "EXPENSE":
      await inc(t.accountId, -amount);
      break;
    case "TRANSFER":
      await inc(t.accountId, -amount);
      if (t.toAccountId) await inc(t.toAccountId, amount);
      break;
    case "DEBT_PAYMENT": {
      await inc(t.accountId, -amount);
      if (t.debtId) {
        const debt = await tx.debt.findUniqueOrThrow({ where: { id: t.debtId, userId } });
        const newBalance = Math.max(0, debt.balanceCents - amount);
        await tx.debt.update({
          where: { id: t.debtId, userId },
          data: {
            balanceCents: newBalance,
            status: newBalance === 0 ? "PAID" : direction === 1 ? debt.status : "ACTIVE",
          },
        });
      }
      break;
    }
    case "SAVINGS_CONTRIBUTION":
      await inc(t.accountId, -amount);
      if (t.toAccountId) await inc(t.toAccountId, amount);
      if (t.savingsGoalId) {
        await tx.savingsGoal.update({
          where: { id: t.savingsGoalId, userId },
          data: { currentCents: { increment: amount } },
        });
      }
      break;
  }
}

export async function createTransaction(values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = transactionSchema.parse(values);
    const record = {
      type: data.type,
      amountCents: toCents(data.amount),
      accountId: data.accountId,
      toAccountId: data.toAccountId || null,
      debtId: data.debtId || null,
      savingsGoalId: data.savingsGoalId || null,
      date: toDate(data.date),
    };

    await db.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId,
          ...record,
          categoryId: data.categoryId || null,
          description: data.description,
          notes: data.notes ?? null,
        },
      });
      await applyEffects(tx, userId, record, 1);
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Deleting a transaction reverses its balance effects. */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.$transaction(async (tx) => {
      const t = await tx.transaction.findUniqueOrThrow({ where: { id, userId } });
      await applyEffects(tx, userId, t, -1);
      await tx.transaction.delete({ where: { id, userId } });
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
