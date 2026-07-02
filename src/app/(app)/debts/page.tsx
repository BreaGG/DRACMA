import type { Metadata } from "next";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { DebtsClient } from "./debts-client";

export const metadata: Metadata = { title: "Debts & loans" };

export default async function DebtsPage() {
  const userId = await requireUserId();
  const [debts, plans, accounts] = await Promise.all([
    db.debt.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { balanceCents: "desc" }],
    }),
    db.installmentPlan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { payments: { orderBy: { sequence: "asc" } } },
    }),
    db.account.findMany({ where: { userId }, select: { id: true, name: true } }),
  ]);

  return (
    <DebtsClient
      debts={debts.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        originalAmountCents: d.originalAmountCents,
        balanceCents: d.balanceCents,
        interestRateBps: d.interestRateBps,
        monthlyPaymentCents: d.monthlyPaymentCents,
        paymentDay: d.paymentDay,
        startDate: d.startDate.toISOString().slice(0, 10),
        expectedEndDate: d.expectedEndDate ? d.expectedEndDate.toISOString().slice(0, 10) : null,
        lender: d.lender,
        accountId: d.accountId,
        notes: d.notes,
        status: d.status,
      }))}
      plans={plans.map((p) => ({
        id: p.id,
        name: p.name,
        provider: p.provider,
        totalAmountCents: p.totalAmountCents,
        installmentCount: p.installmentCount,
        status: p.status,
        payments: p.payments.map((pp) => ({
          sequence: pp.sequence,
          dueDate: pp.dueDate.toISOString().slice(0, 10),
          amountCents: pp.amountCents,
          status: pp.status,
        })),
      }))}
      accounts={accounts}
    />
  );
}
