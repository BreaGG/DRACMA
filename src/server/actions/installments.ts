"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { installmentPlanSchema } from "@/lib/validators";
import { generateInstallmentSchedule } from "@/lib/finance";
import { failure, toCents, toDate, type ActionResult } from "./helpers";

/**
 * Create an installment plan (e.g. PayPal Pay in 3) and generate its
 * payment schedule. Installments already paid (paidInstallments) are
 * marked PAID starting from the first one.
 */
export async function createInstallmentPlan(values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = installmentPlanSchema.parse(values);
    const totalCents = toCents(data.totalAmount);
    const schedule = generateInstallmentSchedule(
      totalCents,
      data.installmentCount,
      toDate(data.firstPaymentDate)
    );
    const paidCount = Math.min(data.paidInstallments, data.installmentCount);

    await db.installmentPlan.create({
      data: {
        userId,
        name: data.name,
        provider: data.provider,
        totalAmountCents: totalCents,
        installmentCount: data.installmentCount,
        installmentAmountCents: schedule[schedule.length - 1].amountCents,
        firstPaymentDate: toDate(data.firstPaymentDate),
        accountId: data.accountId || null,
        notes: data.notes ?? null,
        status: paidCount >= data.installmentCount ? "COMPLETED" : "ACTIVE",
        payments: {
          create: schedule.map((p) => ({
            sequence: p.sequence,
            dueDate: p.dueDate,
            amountCents: p.amountCents,
            status: p.sequence <= paidCount ? "PAID" : "PENDING",
            paidAt: p.sequence <= paidCount ? p.dueDate : null,
          })),
        },
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteInstallmentPlan(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.installmentPlan.delete({ where: { id, userId } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Mark the next pending installment of a plan as paid. */
export async function payNextInstallment(planId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const plan = await db.installmentPlan.findUniqueOrThrow({
      where: { id: planId, userId },
      include: { payments: { orderBy: { sequence: "asc" } } },
    });
    const next = plan.payments.find((p) => p.status === "PENDING");
    if (!next) return { ok: false, error: "All installments are already paid" };

    const remaining = plan.payments.filter(
      (p) => p.status === "PENDING" && p.id !== next.id
    ).length;

    await db.$transaction([
      db.installmentPayment.update({
        where: { id: next.id },
        data: { status: "PAID", paidAt: new Date() },
      }),
      db.installmentPlan.update({
        where: { id: planId, userId },
        data: { status: remaining === 0 ? "COMPLETED" : "ACTIVE" },
      }),
    ]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
